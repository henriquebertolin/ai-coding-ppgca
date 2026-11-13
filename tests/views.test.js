import test from 'node:test';
import assert from 'node:assert/strict';
import { createViews } from '../src/views.js';
import { btn } from '../src/ui.js';
import { seedProducts } from '../backend/database/seed.js';
import { Readable } from 'node:stream';
import { createApp } from '../server.js';

function context(overrides = {}) {
  return {
    state: {
      user: { name: 'Cliente Teste', email: 'test@example.com', role: 'admin' },
      cart: { 1: 1 },
      addresses: [],
      cards: [],
      orders: [],
      config: { pix: 5, debit: 0, boleto: 0, threshold: 1500, minutes: 15 },
    },
    products: seedProducts,
    catalogItems: seedProducts,
    catalogBusy: false,
    catalogError: '',
    query: '',
    category: 'Todos',
    sort: 'featured',
    method: 'pix',
    checkoutStep: 1,
    checkout: {
      address: { street: 'Rua Teste', number: '1', city: 'Passo Fundo', uf: 'RS' },
      cpf: '52998224725',
    },
    register: false,
    count: () => 1,
    btn,
    go: () => {},
    setReturnTo: () => {},
    setActiveOrder: () => {},
    ...overrides,
  };
}

test('telas extraídas renderizam catálogo, conta, carrinho e etapas de checkout', () => {
  for (const method of ['pix', 'credit', 'debit', 'boleto']) {
    for (const checkoutStep of [1, 2, 3]) {
      const views = createViews(context({ method, checkoutStep }));
      for (const name of [
        'header',
        'footer',
        'catalog',
        'cart',
        'auth',
        'checkoutView',
        'orders',
        'account',
        'admin',
      ]) {
        assert.equal(typeof views[name](), 'string', name);
      }
    }
  }
});

test('checkout visitante preserva destino de retorno ao abrir autenticação', () => {
  const options = context();
  options.state.user = null;
  let route, destination;
  options.go = (value) => {
    route = value;
  };
  options.setReturnTo = (value) => {
    destination = value;
  };
  assert.equal(createViews(options).checkoutView(), '');
  assert.equal(route, 'auth');
  assert.equal(destination, 'checkout');
});

test('tela PIX seleciona o pedido para consulta e mantém status do servidor', () => {
  const previousLocation = globalThis.location;
  try {
    globalThis.location = { hash: '#order/test-order' };
    const options = context();
    let selected;
    options.setActiveOrder = (value) => {
      selected = value;
    };
    options.state.orders = [
      {
        id: 'test-order',
        reference: 'vendeletro-test',
        sandboxPix: true,
        status: 'declined',
        expires: Date.now() + 60000,
        items: [],
        subtotal: 340,
        discount: 17,
        total: 323,
      },
    ];
    assert.match(createViews(options).orderView(), /Pagamento recusado/);
    assert.equal(selected, 'test-order');
  } finally {
    globalThis.location = previousLocation;
  }
});

test('servidor entrega módulos e estilos em subpastas sem expor backend ou banco', async () => {
  const server = createApp({ database: ':memory:' });
  try {
    for (const [url, expectedStatus] of [
      ['/src/views/catalog.js', 200],
      ['/src/styles/base.css', 200],
      ['/backend/mappers/pix.mapper.js', 404],
      ['/data/vendeletro.sqlite', 404],
    ]) {
      const result = await new Promise((resolve) => {
        const req = Readable.from([]);
        Object.assign(req, { url, method: 'GET', headers: { host: 'localhost' } });
        const res = {
          status: null,
          writeHead(status) {
            this.status = status;
            return this;
          },
          end(body) {
            resolve({ status: this.status, body });
          },
        };
        server.emit('request', req, res);
      });
      assert.equal(result.status, expectedStatus, url);
    }
  } finally {
    server.emit('close');
  }
});
