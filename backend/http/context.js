import { ApiError } from '../errors/api-error.js';
export function createContext(request) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  };
  return {
    request,
    url: new URL(request.url),
    headers,
    params: {},
    session: null,
    json: (body, status = 200) => new Response(JSON.stringify(body), { status, headers }),
    binary: (bytes, type) => new Response(bytes, { headers: { ...headers, 'Content-Type': type } }),
    async body() {
      if (!request.headers.get('content-type')?.startsWith('application/json'))
        throw new ApiError(415, 'Envie application/json.');
      const text = await request.text();
      if (Buffer.byteLength(text) > 4096)
        throw new ApiError(413, 'Corpo da requisição muito grande.');
      try {
        const value = JSON.parse(text);
        if (!value || Array.isArray(value) || typeof value !== 'object') throw Error();
        return value;
      } catch {
        throw new ApiError(400, 'JSON inválido.');
      }
    },
  };
}
