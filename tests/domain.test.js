import test from 'node:test';
import assert from 'node:assert/strict';
import { validCPF, totals, businessDate, brand } from '../src/domain.js';
test('CPF verifica tamanho, repetição e dígitos', () => {
  assert.equal(validCPF('529.982.247-25'), true);
  for (const value of ['11111111111', '52998224724', '', '123'])
    assert.equal(validCPF(value), false);
});
test('troca de modalidade recalcula desconto e total', () => {
  const products = [
    { id: 1, price: 100 },
    { id: 2, price: 250 },
  ];
  const config = { pix: 5, debit: 0 };
  assert.deepEqual(totals({ 1: 2, 2: 1 }, products, 'pix', config), {
    subtotal: 450,
    shipping: 0,
    discount: 22.5,
    total: 427.5,
  });
  assert.equal(totals({ 1: 2, 2: 1 }, products, 'debit', config).total, 450);
  assert.equal(totals({}, products, 'pix', config).total, 0);
});
test('vencimento pula o fim de semana', () => {
  assert.equal(businessDate(new Date(2026, 10, 13, 12), 3).getDay(), 3);
  assert.equal(businessDate(new Date(2026, 10, 13, 12), 3).getDate(), 18);
});
test('bandeiras suportadas e desconhecidas', () => {
  assert.equal(brand('4111111111111111'), 'Visa');
  assert.equal(brand('5555555555554444'), 'Mastercard');
  assert.equal(brand('378282246310005'), 'Amex');
  assert.equal(brand('6363680000000000'), 'Elo');
  assert.equal(brand('9999999999999999'), '');
});
