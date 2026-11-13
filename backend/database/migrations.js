import { seedProducts, legacyPricesCents } from './seed.js';

export function initializeDatabase(db) {
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS schema_migrations(version TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS pix_orders(id TEXT NOT NULL, session_id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(session_id,id));
    CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY, data TEXT NOT NULL, price_cents INTEGER NOT NULL CHECK(price_cents>=0));
    CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS cart_items(session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE, product_id INTEGER NOT NULL REFERENCES products(id), quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99), PRIMARY KEY(session_id,product_id));`);
  const insert = db.prepare('INSERT OR IGNORE INTO products VALUES(?,?,?)');
  for (const p of seedProducts) insert.run(p.id, JSON.stringify(p), Math.round(p.price * 100));
  // One-time migration of the original demo prices; retain custom prices and order snapshots.
  if (
    !db.prepare('SELECT version FROM schema_migrations WHERE version=?').get('sandbox-prices-v1')
  ) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const update = db.prepare(
        "UPDATE products SET price_cents=?,data=json_set(data,'$.price',?,'$.old',?,'$.tag',?) WHERE id=? AND price_cents=? AND json_extract(data,'$.name')=?",
      );
      for (const p of seedProducts)
        update.run(
          Math.round(p.price * 100),
          p.price,
          p.old,
          p.tag,
          p.id,
          legacyPricesCents[p.id - 1],
          p.name,
        );
      db.prepare('INSERT INTO schema_migrations VALUES(?)').run('sandbox-prices-v1');
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}
