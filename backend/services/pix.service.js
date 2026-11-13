import { ApiError } from '../errors/api-error.js';
import { validCPF } from '../validators/customer.js';
import { pagBankItems } from '../mappers/pix.mapper.js';
export function createPixService({
  cartRepository,
  pixRepository,
  cartService,
  gateway,
  config = {},
}) {
  const { discount = 5, minutes = 15 } = config;
  if (
    !Number.isFinite(discount) ||
    discount < 0 ||
    discount > 100 ||
    !Number.isInteger(minutes) ||
    minutes < 1 ||
    minutes > 1440
  )
    throw Error('Configuração PIX inválida.');
  const locks = new Set();
  const find = (session, id) => {
    const o = pixRepository.findById(session, id);
    if (!o) throw new ApiError(404, 'Pedido PIX não encontrado.');
    return o;
  };
  function accept(o, data) {
    if (!data.id || data.reference_id !== o.reference)
      throw new ApiError(502, 'Resposta de pedido inconsistente.');
    if (o.providerId && data.id !== o.providerId)
      throw new ApiError(502, 'Resposta de pedido inconsistente.');
    const paid = data.charges?.some(
      (c) =>
        c.status === 'PAID' && c.payment_method?.type === 'PIX' && c.amount?.value === o.totalCents,
    );
    if (data.charges?.some((c) => c.status === 'PAID') && !paid)
      throw new ApiError(502, 'Pagamento com valor ou modalidade inconsistente.');
    const declined = data.charges?.some(
      (c) =>
        c.status === 'DECLINED' &&
        c.payment_method?.type === 'PIX' &&
        c.amount?.value === o.totalCents,
    );
    const qr = data.qr_codes?.[0];
    if (
      !paid &&
      !declined &&
      (!qr?.text ||
        qr.amount?.value !== o.totalCents ||
        !Number.isFinite(Date.parse(qr.expiration_date)))
    )
      throw new ApiError(502, 'QR Code do PagBank inconsistente.');
    o.providerId = data.id;
    o.status = paid
      ? 'paid'
      : o.status === 'paid'
        ? 'paid'
        : declined
          ? 'declined'
          : Date.now() > Date.parse(qr.expiration_date)
            ? 'expired'
            : 'pending';
    if (qr) {
      o.code = qr.text;
      o.expires = Date.parse(qr.expiration_date);
      o.image = qr.links?.find((l) => l.rel === 'QRCODE.PNG')?.href || null;
    }
    o.checkedAt = Date.now();
    return o;
  }
  return {
    config: () => ({ enabled: gateway.enabled, environment: 'sandbox', discount, minutes }),
    list: (session) => pixRepository.findAll(session),
    create: async (session, b) => {
      if (!gateway.enabled)
        throw new ApiError(503, 'Configure PAGBANK_TOKEN no .env para habilitar o PIX sandbox.');
      if (!/^[a-f0-9-]{36}$/.test(b.key || ''))
        throw new ApiError(400, 'Chave do pedido inválida.');
      const id = b.key,
        lock = session;
      if (locks.has(lock)) throw new ApiError(409, 'Pedido em processamento. Aguarde.');
      locks.add(lock);
      try {
        let o = pixRepository.findById(session, id);
        if (o?.providerId) return o;
        if (o)
          throw new ApiError(
            409,
            'Resultado anterior indeterminado. Confira no portal PagBank antes de criar outra cobrança.',
          );
        if (pixRepository.findAll(session).some((p) => p.status === 'creating'))
          throw new ApiError(
            409,
            'Existe uma cobrança sem resposta confirmada. Confira no portal PagBank.',
          );
        const { name, email, cpf } = b.customer || {};
        if (
          typeof name !== 'string' ||
          name.trim().length < 3 ||
          name.length > 100 ||
          typeof email !== 'string' ||
          email.length > 150 ||
          !/^\S+@\S+\.\S+$/.test(email) ||
          typeof cpf !== 'string' ||
          !validCPF(cpf)
        )
          throw new ApiError(422, 'Informe nome, e-mail de teste e CPF válido.');
        const cart = cartService.get(session);
        if (!cart.items.length) throw new ApiError(422, 'Seu carrinho está vazio.');
        const discountCents = Math.round((cart.subtotalCents * discount) / 100),
          totalCents = cart.subtotalCents - discountCents;
        if (totalCents < 1) throw new ApiError(422, 'O total PIX deve ser maior que zero.');
        const reference = 'vendeletro-' + id,
          expires = Date.now() + minutes * 60000;
        const payload = {
          reference_id: reference,
          customer: { name: name.trim(), email, tax_id: cpf.replace(/\D/g, '') },
          items: pagBankItems(cart, totalCents),
          qr_codes: [
            { amount: { value: totalCents }, expiration_date: new Date(expires).toISOString() },
          ],
        };
        o = {
          id,
          reference,
          created: Date.now(),
          status: 'creating',
          subtotalCents: cart.subtotalCents,
          discountCents,
          totalCents,
          expires,
          items: cart.items.map((i) => ({
            id: i.productId,
            name: i.product.name,
            price: i.product.price,
            qty: i.quantity,
          })),
          payload,
        };
        pixRepository.save(session, o);
        const data = await gateway.create(payload, id);
        accept(o, data);
        pixRepository.save(session, o);
        // Preserve any quantities added while the provider request was in flight.
        for (const item of cart.items) {
          const current =
            cartRepository.findItems(session).find((i) => i.productId === item.productId)
              ?.quantity || 0;
          const remaining = current - item.quantity;
          if (remaining > 0) cartRepository.setItem(session, item.productId, remaining);
          else cartRepository.removeItem(session, item.productId);
        }
        return o;
      } finally {
        locks.delete(lock);
      }
    },
    get: async (session, id) => {
      const o = find(session, id);
      if (o.providerId) {
        accept(o, await gateway.get(o.providerId));
        pixRepository.save(session, o);
      }
      return o;
    },
    image: async (session, id) => {
      const o = find(session, id);
      if (!o.image) throw new ApiError(404, 'QR Code indisponível.');
      return gateway.image(o.image);
    },
  };
}
