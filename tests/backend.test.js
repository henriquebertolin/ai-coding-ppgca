import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRepository } from '../backend/repositories/index.js';
import { createApi } from '../backend/app.js';
function client(api) {
  let cookie = '';
  return async (route, method = 'GET', data, extra = {}) => {
    const res = await api(
      new Request('http://localhost' + route, {
        method,
        headers: { ...(cookie ? { cookie } : {}), 'Content-Type': 'application/json', ...extra },
        ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
      }),
    );
    if (res.headers.get('set-cookie')) cookie = res.headers.get('set-cookie').split(';')[0];
    return { status: res.status, body: await res.json(), headers: res.headers };
  };
}
function fixture(t) {
  const repo = createRepository(':memory:');
  t.after(() => repo.close());
  return createApi(repo);
}
test('US-01: catálogo, busca sem acentos, categoria, ordenação e resultado vazio', async (t) => {
  const c = client(fixture(t));
  assert.equal((await c('/api/products')).body.total, 6);
  assert.equal((await c('/api/products?q=ruido')).body.items[0].id, 3);
  assert.equal((await c('/api/products?category=Laptops&sort=price')).body.items[0].id, 6);
  assert.equal((await c('/api/products?q=inexistente')).body.total, 0);
  assert.equal((await c('/api/products/1')).body.price, 20);
  assert.equal((await c('/api/products/999')).status, 404);
  assert.equal((await c('/api/products?sort=unknown')).status, 400);
});
test('US-02: adicionar, acumular, alterar e remover com subtotal do servidor', async (t) => {
  const c = client(fixture(t));
  const first = await c('/api/cart');
  assert.equal(first.body.itemCount, 0);
  assert.match(first.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/);
  let r = await c('/api/cart/items', 'POST', { productId: 1, quantity: 2, price: 1 });
  assert.equal(r.status, 201);
  assert.equal(r.body.subtotalCents, 4000);
  r = await c('/api/cart/items', 'POST', { productId: 1 });
  assert.equal(r.body.itemCount, 3);
  r = await c('/api/cart/items/1', 'PATCH', { quantity: 1 });
  assert.equal(r.body.subtotalCents, 2000);
  r = await c('/api/cart/items/1', 'DELETE');
  assert.deepEqual(r.body.items, []);
  assert.equal(r.body.subtotalCents, 0);
});
test('sessões de visitantes são isoladas e cookie desconhecido é substituído', async (t) => {
  const api = fixture(t),
    a = client(api),
    b = client(api);
  await a('/api/cart/items', 'POST', { productId: 2 });
  assert.equal((await b('/api/cart')).body.itemCount, 0);
  assert.equal((await a('/api/cart')).body.itemCount, 1);
  const r = await b('/api/cart', 'GET', undefined, { cookie: 've_cart=' + 'a'.repeat(64) });
  assert.equal(r.body.itemCount, 0);
  assert.ok(r.headers.get('set-cookie'));
});
test('quantidades e produtos inválidos não alteram o carrinho', async (t) => {
  const c = client(fixture(t));
  await c('/api/cart/items', 'POST', { productId: 1, quantity: 1 });
  for (const quantity of [0, -1, 1.5, 100, '2', null])
    assert.equal((await c('/api/cart/items/1', 'PATCH', { quantity })).status, 422);
  assert.equal((await c('/api/cart/items', 'POST', { productId: 999 })).status, 404);
  assert.equal((await c('/api/cart/items', 'POST', { productId: '1' })).status, 400);
  assert.equal((await c('/api/cart/items/2', 'PATCH', { quantity: 2 })).status, 404);
  assert.equal((await c('/api/cart')).body.itemCount, 1);
  assert.equal((await c('/api/cart', 'DELETE')).body.itemCount, 0);
});
test('recusa origem externa, corpo inválido e rotas desconhecidas', async (t) => {
  const api = fixture(t);
  const request = (body, headers = {}) =>
    api(
      new Request('http://localhost/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body,
      }),
    );
  assert.equal((await request('{}', { Origin: 'https://outro.example' })).status, 403);
  assert.equal((await request('{')).status, 400);
  assert.equal((await request('[]')).status, 400);
  assert.equal((await request('{}', { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await request(JSON.stringify({ q: 'a'.repeat(5000) }))).status, 413);
  assert.equal((await api(new Request('http://localhost/api/unknown'))).status, 404);
});
test('SQLite preserva catálogo e carrinho após reabertura', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'vendeletro-'));
  let repo;
  try {
    const file = path.join(dir, 'test.sqlite');
    repo = createRepository(file);
    let handler = createApi(repo);
    const a = client((req) => handler(req));
    await a('/api/cart/items', 'POST', { productId: 3, quantity: 2 });
    repo.close();
    repo = createRepository(file);
    handler = createApi(repo);
    assert.equal(repo.products.findAll().length, 6);
    const response = await a('/api/cart');
    assert.equal(response.body.itemCount, 2);
    assert.equal(response.body.subtotalCents, 2000);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('migração reduz preços originais, preserva preço personalizado e pedidos antigos', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'vendeletro-prices-'));
  let repo;
  try {
    const file = path.join(dir, 'test.sqlite');
    repo = createRepository(file);
    repo.pix.save('test-session', {
      id: 'old-order',
      totalCents: 408405,
      items: [{ price: 4299, qty: 1 }],
    });
    repo.close();
    repo = null;
    const db = new DatabaseSync(file);
    db.prepare('DELETE FROM schema_migrations WHERE version=?').run('sandbox-prices-v1');
    db.prepare(
      "UPDATE products SET price_cents=429900,data=json_set(data,'$.price',4299,'$.old',4999) WHERE id=1",
    ).run();
    db.prepare(
      "UPDATE products SET price_cents=555,data=json_set(data,'$.price',5.55) WHERE id=2",
    ).run();
    db.close();
    repo = createRepository(file);
    assert.equal(repo.products.findAll().find((p) => p.id === 1).price, 20);
    assert.equal(repo.products.findAll().find((p) => p.id === 2).price, 5.55);
    assert.equal(repo.pix.findById('test-session', 'old-order').totalCents, 408405);
    assert.equal(repo.pix.findById('test-session', 'old-order').items[0].price, 4299);
    repo.close();
    repo = createRepository(file);
    assert.equal(repo.products.findAll().find((p) => p.id === 2).price, 5.55);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
