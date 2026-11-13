import { ApiError } from '../errors/api-error.js';
export function createCartService(cartRepository, catalogService) {
  const cart = (session) => {
    const items = cartRepository.findItems(session).map((i) => {
      const p = catalogService.findById(i.productId);
      return { ...i, product: p, lineTotalCents: Math.round(p.price * 100) * i.quantity };
    });
    return {
      items,
      itemCount: items.reduce((s, i) => s + i.quantity, 0),
      subtotalCents: items.reduce((s, i) => s + i.lineTotalCents, 0),
      currency: 'BRL',
    };
  };
  const quantity = (q) => {
    if (!Number.isInteger(q) || q < 1 || q > 99)
      throw new ApiError(422, 'A quantidade deve ser um inteiro entre 1 e 99.');
    return q;
  };
  return {
    get: cart,
    add: (session, id, q) => {
      catalogService.findById(id);
      quantity(q);
      const current =
        cartRepository.findItems(session).find((i) => i.productId === id)?.quantity || 0;
      cartRepository.setItem(session, id, quantity(current + q));
      return cart(session);
    },
    update: (session, id, q) => {
      catalogService.findById(id);
      quantity(q);
      if (!cartRepository.findItems(session).some((i) => i.productId === id))
        throw new ApiError(404, 'Item não está no carrinho.');
      cartRepository.setItem(session, id, q);
      return cart(session);
    },
    remove: (session, id) => {
      catalogService.findById(id);
      cartRepository.removeItem(session, id);
      return cart(session);
    },
    clear: (session) => {
      cartRepository.clear(session);
      return cart(session);
    },
  };
}
