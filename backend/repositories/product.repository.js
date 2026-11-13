export function createProductRepository(db) {
  return {
    findAll: () =>
      db
        .prepare('SELECT * FROM products ORDER BY id')
        .all()
        .map((row) => ({ ...JSON.parse(row.data), price: row.price_cents / 100 })),
  };
}
