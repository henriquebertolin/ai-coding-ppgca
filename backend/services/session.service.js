import { randomBytes, createHash } from 'node:crypto';
const SESSION_LIFETIME = 30 * 86400000;
const digest = (token) => createHash('sha256').update(token).digest('hex');
export function createSessionService(sessionRepository) {
  return {
    resolve(rawToken) {
      const id = rawToken && /^[a-f0-9]{64}$/.test(rawToken) ? digest(rawToken) : null;
      if (id && sessionRepository.exists(id, Date.now())) return { id, newToken: null };
      const newToken = randomBytes(32).toString('hex'),
        newId = digest(newToken);
      sessionRepository.create(newId, Date.now() + SESSION_LIFETIME);
      return { id: newId, newToken };
    },
  };
}
