export function createSessionRepository(db) {
  return {
    exists: (id, now) =>
      !!db.prepare('SELECT id FROM sessions WHERE id=? AND expires>?').get(id, now),
    create: (id, expires) => {
      db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());
      db.prepare('INSERT INTO sessions VALUES(?,?)').run(id, expires);
    },
  };
}
