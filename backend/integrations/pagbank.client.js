import { ApiError } from '../errors/api-error.js';
export function createPagBank({ token = process.env.PAGBANK_TOKEN || '', fetchImpl = fetch } = {}) {
  const base = 'https://sandbox.api.pagseguro.com';
  async function call(route, options = {}) {
    if (!token)
      throw new ApiError(503, 'Configure PAGBANK_TOKEN no .env para habilitar o PIX sandbox.');
    let response;
    try {
      response = await fetchImpl(base + route, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
      });
    } catch {
      throw new ApiError(
        502,
        'PagBank indisponível ou sem resposta. Tente consultar o pedido antes de repetir.',
      );
    }
    if (!response.ok)
      throw new ApiError(
        502,
        `PagBank recusou a operação (HTTP ${response.status}). Confira credenciais e dados de teste.`,
      );
    return response;
  }
  return {
    enabled: !!token,
    create: async (payload, key) =>
      (
        await call('/orders', {
          method: 'POST',
          headers: { 'x-idempotency-key': key },
          body: JSON.stringify(payload),
        })
      ).json(),
    get: async (id) => {
      if (!/^ORDE_[A-Za-z0-9-]+$/.test(id))
        throw new ApiError(502, 'Identificador PagBank inválido.');
      return (await call('/orders/' + id)).json();
    },
    image: async (href) => {
      const url = new URL(href);
      if (url.origin !== base || !url.pathname.startsWith('/qrcode/'))
        throw new ApiError(502, 'Link de QR Code inválido.');
      const r = await call(url.pathname);
      if (!r.headers.get('content-type')?.startsWith('image/png'))
        throw new ApiError(502, 'Imagem de QR Code inválida.');
      return new Uint8Array(await r.arrayBuffer());
    },
  };
}
