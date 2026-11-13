import { ApiError } from '../errors/api-error.js';
export function validateOrigin(request, url) {
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(request.method))
    throw new ApiError(405, 'Método não permitido.');
  if (request.method === 'GET') return;
  const origin = request.headers.get('origin');
  if ((origin && origin !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site')
    throw new ApiError(403, 'Origem não permitida.');
}
