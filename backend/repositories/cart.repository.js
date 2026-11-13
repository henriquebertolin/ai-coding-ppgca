export function createCartRepository(db) {
  return {
    findItems: (id) =>
      db
        .prepare(
          'SELECT product_id AS productId, quantity FROM cart_items WHERE session_id=? ORDER BY product_id',
        )
        .all(id),
    setItem: (session, id, q) =>
      db
        .prepare(
          'INSERT INTO cart_items VALUES(?,?,?) ON CONFLICT(session_id,product_id) DO UPDATE SET quantity=excluded.quantity',
        )
        .run(session, id, q),
    removeItem: (session, id) =>
      db.prepare('DELETE FROM cart_items WHERE session_id=? AND product_id=?').run(session, id),
    clear: (session) => db.prepare('DELETE FROM cart_items WHERE session_id=?').run(session),
  };
}
