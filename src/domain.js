export const money = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function validCPF(value) {
  const n = value.replace(/\D/g, '');
  if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false;
  return [9, 10].every((len) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(n[i]) * (len + 1 - i);
    return ((sum * 10) % 11) % 10 === Number(n[len]);
  });
}
export function totals(cart, products, method, config) {
  const subtotal = Object.entries(cart).reduce(
    (s, [id, q]) => s + (products.find((p) => p.id === +id)?.price || 0) * q,
    0,
  );
  const discount = (subtotal * (config[method] || 0)) / 100;
  return { subtotal, discount, shipping: 0, total: subtotal - discount };
}
export function businessDate(date, days) {
  const d = new Date(date);
  while (days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) days--;
  }
  return d;
}
export function brand(n) {
  n = n.replace(/\D/g, '');
  return /^4/.test(n)
    ? 'Visa'
    : /^(5[1-5]|2[2-7])/.test(n)
      ? 'Mastercard'
      : /^3[47]/.test(n)
        ? 'Amex'
        : /^(636368|438935|504175|50|60|65)/.test(n)
          ? 'Elo'
          : '';
}

export function orderStatus(o) {
  if (o.status === 'pending' && o.method === 'pix' && Date.now() > o.expires) return 'PIX expirado';
  if (o.status === 'pending' && o.method === 'boleto' && Date.now() > o.expires) return 'Cancelado';
  return {
    creating: 'Resposta pendente',
    expired: 'PIX expirado',
    declined: 'Pagamento recusado',
    pending: 'Aguardando pagamento',
    paid: 'Pagamento confirmado',
    cancelled: 'Cancelado',
  }[o.status];
}
