import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRepository } from '../backend/repositories/index.js';
import { createApi } from '../backend/app.js';
import { createPagBank } from '../backend/integrations/pagbank.client.js';
function setup(t, { fail = false, enabled = true, declined = false } = {}) {
  const repo = createRepository(':memory:');
  t.after(() => repo.close());
  let payload,
    calls = 0,
    paid = false;
  const gateway = {
    enabled,
    create: async (p) => {
      calls++;
      payload = p;
      if (fail) throw Error('network');
      return response();
    },
    get: async () => response(),
    image: async () => new Uint8Array([1, 2, 3]),
  };
  function response() {
    return {
      id: 'ORDE_test',
      reference_id: payload.reference_id,
      qr_codes: declined
        ? []
        : [
            {
              text: 'sandbox-code',
              amount: payload.qr_codes[0].amount,
              expiration_date: payload.qr_codes[0].expiration_date,
              links: [
                { rel: 'QRCODE.PNG', href: 'https://sandbox.api.pagseguro.com/qrcode/test/png' },
              ],
            },
          ],
      charges: declined
        ? [
            {
              status: 'DECLINED',
              amount: payload.qr_codes[0].amount,
              payment_method: { type: 'PIX' },
            },
          ]
        : paid
          ? [
              {
                status: 'PAID',
                amount: payload.qr_codes[0].amount,
                payment_method: { type: 'PIX' },
              },
            ]
          : [],
    };
  }
  const api = createApi(repo, { gateway });
  let cookie = '';
  const request = async (url, method = 'GET', body, ownCookie = cookie) => {
    const r = await api(
      new Request('http://localhost' + url, {
        method,
        headers: { cookie: ownCookie, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
    );
    if (r.headers.get('set-cookie') && !ownCookie)
      cookie = r.headers.get('set-cookie').split(';')[0];
    return { status: r.status, body: await r.json() };
  };
  return { request, paid: () => (paid = true), calls: () => calls, payload: () => payload };
}
const customer = { name: 'Cliente Sandbox', email: 'cliente@example.com', cpf: '52998224725' };
test('PIX: valor no servidor, QR, idempotência, consulta, confirmação e isolamento', async (t) => {
  const f = setup(t);
  await f.request('/api/cart/items', 'POST', { productId: 1, quantity: 1 });
  const key = randomUUID();
  let r = await f.request('/api/pix', 'POST', { key, customer, total: 1 });
  assert.equal(r.status, 201);
  assert.equal(r.body.totalCents, 1900);
  assert.equal(f.payload().qr_codes[0].amount.value, 1900);
  assert.equal(f.payload().reference_id, 'vendeletro-' + key);
  assert.equal(f.payload().notification_urls, undefined);
  assert.equal(r.body.code, 'sandbox-code');
  assert.equal(r.body.payload, undefined);
  assert.equal(r.body.status, 'pending');
  assert.equal((await f.request('/api/cart')).body.itemCount, 0);
  await f.request('/api/pix', 'POST', { key, customer });
  assert.equal(f.calls(), 1);
  assert.equal(
    (await f.request('/api/pix/' + key, 'GET', undefined, 've_cart=' + 'a'.repeat(64))).status,
    404,
  );
  f.paid();
  r = await f.request('/api/pix/' + key);
  assert.equal(r.body.status, 'paid');
  assert.equal((await f.request('/api/pix')).body[0].status, 'paid');
});
test('PIX: token ausente e dados inválidos não criam cobrança', async (t) => {
  const f = setup(t);
  await f.request('/api/cart/items', 'POST', { productId: 1 });
  assert.equal(
    (
      await f.request('/api/pix', 'POST', {
        key: randomUUID(),
        customer: { ...customer, cpf: '11111111111' },
      })
    ).status,
    422,
  );
  assert.equal(f.calls(), 0);
  const off = setup(t, { enabled: false });
  assert.equal(
    (await off.request('/api/pix', 'POST', { key: randomUUID(), customer })).status,
    503,
  );
});
test('PIX: resultado incerto preserva carrinho e impede repetição automática', async (t) => {
  const f = setup(t, { fail: true });
  await f.request('/api/cart/items', 'POST', { productId: 1 });
  const key = randomUUID();
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.equal((await f.request('/api/pix', 'POST', { key, customer })).status, 500);
  } finally {
    console.error = originalError;
  }
  assert.equal((await f.request('/api/cart')).body.itemCount, 1);
  assert.equal((await f.request('/api/pix', 'POST', { key, customer })).status, 409);
  assert.equal((await f.request('/api/pix', 'POST', { key: randomUUID(), customer })).status, 409);
  assert.equal(f.calls(), 1);
});
test('gateway: usa exclusivamente sandbox e mantém token no header', async () => {
  const calls = [];
  const g = createPagBank({
    token: 'secret-test',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({ id: 'ORDE_test' }), { status: 201 });
    },
  });
  await g.create({ reference_id: 'vendeletro-test' }, 'key');
  assert.equal(calls[0].url, 'https://sandbox.api.pagseguro.com/orders');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer secret-test');
  assert.equal(calls[0].options.headers['x-idempotency-key'], 'key');
  assert.equal(calls[0].options.body.includes('secret-test'), false);
  await assert.rejects(g.image('https://evil.example/qrcode/test'), /Link de QR Code inválido/);
});
test('gateway: timeout e erro do provedor são apresentados sem token', async () => {
  const g = createPagBank({
    token: 'private-token',
    fetchImpl: async () => new Response('private-token', { status: 401 }),
  });
  await assert.rejects(
    g.get('ORDE_test'),
    (e) => e.status === 502 && !e.message.includes('private-token'),
  );
  const off = createPagBank({ token: '' });
  await assert.rejects(off.get('ORDE_test'), (e) => e.status === 503);
});

test('pedido PagBank inclui produtos, quantidades e valores líquidos em centavos', async (t) => {
  const f = setup(t);
  await f.request('/api/cart/items', 'POST', { productId: 1, quantity: 2 });
  await f.request('/api/cart/items', 'POST', { productId: 3, quantity: 3 });
  const r = await f.request('/api/pix', 'POST', { key: randomUUID(), customer });
  assert.equal(r.status, 201);
  const payload = f.payload();
  assert.ok(payload.items.length >= 2);
  assert.equal(
    payload.items.filter((i) => i.name === 'iPhone 15').reduce((s, i) => s + i.quantity, 0),
    2,
  );
  assert.equal(
    payload.items.filter((i) => i.name === 'Sony WH-1000XM5').reduce((s, i) => s + i.quantity, 0),
    3,
  );
  for (const i of payload.items) {
    assert.ok(Number.isInteger(i.unit_amount));
    assert.ok(i.reference_id.startsWith('vendeletro-product-'));
  }
  assert.equal(
    payload.items.reduce((s, i) => s + i.quantity * i.unit_amount, 0),
    payload.qr_codes[0].amount.value,
  );
});

test('itens distribuem arredondamentos preservando valor e quantidade', async () => {
  const { pagBankItems } = await import('../backend/mappers/pix.mapper.js');
  const cart = {
    subtotalCents: 203,
    items: [
      { productId: 1, product: { name: 'A' }, quantity: 3, lineTotalCents: 102 },
      { productId: 2, product: { name: 'B' }, quantity: 1, lineTotalCents: 101 },
    ],
  };
  const items = pagBankItems(cart, 193);
  assert.equal(
    items.reduce((s, i) => s + i.quantity * i.unit_amount, 0),
    193,
  );
  assert.equal(
    items.reduce((s, i) => s + i.quantity, 0),
    4,
  );
  assert.ok(items.every((i) => Number.isInteger(i.unit_amount) && i.unit_amount >= 0));
});

test('proxy QR Code conserva PNG byte a byte na resposta HTTP', async () => {
  const { sendResponse } = await import('../server.js');
  const bytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 255, 128, 254]);
  let status, headers, body;
  await sendResponse(
    {
      writeHead: (s, h) => {
        status = s;
        headers = h;
      },
      end: (data) => {
        body = data;
      },
    },
    new Response(bytes, { headers: { 'Content-Type': 'image/png' } }),
  );
  assert.equal(status, 200);
  assert.equal(headers['content-type'], 'image/png');
  assert.deepEqual(body, Buffer.from(bytes));
});

test('gateway obtém bytes PNG usando autenticação somente no servidor', async () => {
  const bytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 255, 128]);
  let called = false;
  const gateway = createPagBank({
    token: 'test-token',
    fetchImpl: async (url, options) => {
      called = true;
      assert.equal(url, 'https://sandbox.api.pagseguro.com/qrcode/QRCO_test/png');
      assert.equal(options.headers.Authorization, 'Bearer test-token');
      return new Response(bytes, { headers: { 'Content-Type': 'image/png' } });
    },
  });
  assert.deepEqual(
    await gateway.image('https://sandbox.api.pagseguro.com/qrcode/QRCO_test/png'),
    bytes,
  );
  assert.equal(called, true);
});

test('catálogo de sandbox: uma unidade de cada produto fica abaixo de R$ 100 no PIX', async (t) => {
  const f = setup(t);
  const catalog = (await f.request('/api/products')).body.items;
  for (const p of catalog)
    await f.request('/api/cart/items', 'POST', { productId: p.id, quantity: 1 });
  const result = await f.request('/api/pix', 'POST', { key: randomUUID(), customer });
  assert.equal(result.status, 201);
  assert.equal(result.body.subtotalCents, 9500);
  assert.equal(result.body.totalCents, 9025);
  assert.ok(result.body.totalCents <= 10000);
});

test('PIX recusado pelo provedor não aparece como aguardando pagamento', async (t) => {
  const f = setup(t, { declined: true });
  await f.request('/api/cart/items', 'POST', { productId: 1, quantity: 17 });
  const result = await f.request('/api/pix', 'POST', { key: randomUUID(), customer });
  assert.equal(result.status, 201);
  assert.equal(result.body.totalCents, 32300);
  assert.equal(result.body.status, 'declined');
});
