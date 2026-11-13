export function createPixRepository(db) {
  return {
    findById: (session, id) => {
      const r = db
        .prepare('SELECT data FROM pix_orders WHERE session_id=? AND id=?')
        .get(session, id);
      return r ? JSON.parse(r.data) : null;
    },
    findAll: (session) =>
      db
        .prepare('SELECT data FROM pix_orders WHERE session_id=? ORDER BY rowid DESC')
        .all(session)
        .map((r) => JSON.parse(r.data)),
    save: (session, o) =>
      db
        .prepare(
          'INSERT INTO pix_orders VALUES(?,?,?) ON CONFLICT(session_id,id) DO UPDATE SET data=excluded.data',
        )
        .run(o.id, session, JSON.stringify(o)),
  };
}
