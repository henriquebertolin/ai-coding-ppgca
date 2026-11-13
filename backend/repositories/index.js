import { openDatabase } from '../database/connection.js';
import { createProductRepository } from './product.repository.js';
import { createSessionRepository } from './session.repository.js';
import { createCartRepository } from './cart.repository.js';
import { createPixRepository } from './pix.repository.js';
export function createRepository(filename) {
  const db = openDatabase(filename);
  return {
    products: createProductRepository(db),
    sessions: createSessionRepository(db),
    cart: createCartRepository(db),
    pix: createPixRepository(db),
    close: () => db.close(),
  };
}
