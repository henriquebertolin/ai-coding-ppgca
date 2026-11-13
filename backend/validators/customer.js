export function validCPF(value) {
  const n = value.replace(/\D/g, '');
  if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false;
  return [9, 10].every((len) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(n[i]) * (len + 1 - i);
    return ((sum * 10) % 11) % 10 === Number(n[len]);
  });
}
