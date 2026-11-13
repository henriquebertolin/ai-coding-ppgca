// Split a line only when necessary to express rounding in integer unit amounts.
// The sum sent to PagBank must equal exactly the discounted PIX amount.
export function pagBankItems(cart, totalCents) {
  let gross = 0,
    allocated = 0;
  return cart.items.flatMap((i) => {
    gross += i.lineTotalCents;
    const next = Math.round((gross * totalCents) / cart.subtotalCents);
    const line = next - allocated;
    allocated = next;
    const unit = Math.floor(line / i.quantity),
      remainder = line % i.quantity;
    return [
      [i.quantity - remainder, unit],
      [remainder, unit + 1],
    ]
      .filter(([quantity]) => quantity > 0)
      .map(([quantity, unit_amount], index) => ({
        reference_id: `vendeletro-product-${i.productId}-${index}`,
        name: i.product.name,
        quantity,
        unit_amount,
      }));
  });
}

export function toPixResponse(order) {
  const { payload, image, ...publicOrder } = order;
  return { ...publicOrder, qrImage: image ? `/api/pix/${order.id}/qr` : null };
}
