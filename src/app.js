import { createViews, status } from './views.js';
import { $, escapeHtml as esc, toast, go, btn, showDialog } from './ui.js';
import { api } from './api.js';
import { money, validCPF, totals, businessDate, brand } from './domain.js';
import { art } from './art.js';
// Server-backed catalog and cart request state.
let products = [],
  catalogItems = [],
  catalogBusy = false,
  catalogError = '',
  apiReady = false,
  apiError = '',
  cartBusy = false,
  searchVersion = 0;
// Accounts and non-PIX orders are still stored locally for the demo.
const initial = {
  cart: {},
  user: null,
  addresses: [],
  cards: [],
  orders: [],
  config: { pix: 5, debit: 0, boleto: 0, threshold: 1500, minutes: 15 },
};
let state;
try {
  state = { ...initial, ...JSON.parse(localStorage.getItem('vendeletro') || '{}') };
} catch {
  state = structuredClone(initial);
}
let pixConfig = { enabled: false, discount: 5, minutes: 15 },
  pixChecking = false,
  pixBusy = false;
let query = '',
  category = 'Todos',
  sort = 'featured',
  method = 'pix',
  checkoutStep = 1,
  checkout = {},
  register = false,
  returnTo = '',
  activeOrder = null;
const save = () => localStorage.setItem('vendeletro', JSON.stringify({ ...state, cart: {} }));
const count = () => Object.values(state.cart).reduce((a, b) => a + b, 0);

function render() {
  const { header, footer, catalog, cart, auth, checkoutView, orders, orderView, account, admin } =
    createViews({
      state,
      products,
      catalogItems,
      catalogBusy,
      catalogError,
      query,
      category,
      sort,
      method,
      checkoutStep,
      checkout,
      register,
      count,
      btn,
      go,
      setReturnTo: (value) => {
        returnTo = value;
      },
      setActiveOrder: (value) => {
        activeOrder = value;
      },
    });
  const route = (location.hash.slice(1) || 'catalog').split('/')[0];
  const screens = {
    catalog,
    cart,
    auth,
    checkout: checkoutView,
    orders,
    order: orderView,
    account,
    admin,
  };
  const loadingView = () => /* HTML */ `
    <section class="empty panel">
      <h2>${apiError ? 'Não foi possível conectar à loja' : 'Carregando sua loja…'}</h2>
      <p>${esc(apiError || 'Buscando produtos e seu carrinho.')}</p>
      ${apiError ? btn('Tentar novamente', 'retry-api') : ''}
    </section>
  `;
  const screen = apiReady ? screens[route] || catalog : loadingView;
  $('#app').innerHTML = header() + `<main>${screen()}</main>` + footer();
  bind();
}

// Bind forms again after replacing the screen markup.
function bind() {
  const search = $('#search');
  search.onsubmit = (e) => {
    e.preventDefault();
    query = new FormData(search).get('q').trim();
    go('catalog');
    refreshCatalog();
  };
  $('#sort')?.addEventListener('change', (e) => {
    sort = e.target.value;
    refreshCatalog();
  });
  $('#auth-form')?.addEventListener('submit', submitAuth);
  $('#checkout-form')?.addEventListener('submit', submitCheckout);
  $('#address-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    state.addresses.push(Object.fromEntries(new FormData(e.target)));
    localStorage.setItem('addresses:' + state.user.email, JSON.stringify(state.addresses));
    save();
    render();
    toast('Endereço salvo com sucesso');
  });
  $('#admin-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    state.config = Object.fromEntries([...new FormData(e.target)].map(([k, v]) => [k, Number(v)]));
    state.config.pix = pixConfig.discount;
    state.config.minutes = pixConfig.minutes;
    save();
    render();
    toast('Configurações salvas. PIX é configurado no servidor.');
  });
  $('#different')?.addEventListener('change', (e) => {
    $('#billing').hidden = !e.target.checked;
    $('#billing')
      .querySelectorAll('input')
      .forEach((i) => (i.required = e.target.checked && !i.name.endsWith('extra')));
  });
  if ($('#billing')?.hidden)
    $('#billing')
      .querySelectorAll('input')
      .forEach((i) => (i.required = false));
  document.querySelectorAll('[name="method"]').forEach(
    (el) =>
      (el.onchange = () => {
        method = el.value;
        render();
      }),
  );
  $('#saved-card')?.addEventListener('change', (e) => {
    $('#new-card').hidden = !!e.target.value;
    $('#new-card')
      .querySelectorAll('input')
      .forEach((i) => (i.required = !e.target.value));
  });
}
// Demo account flow.
async function submitAuth(e) {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const error = (m) => ($('.form-error').textContent = m);
  const users = JSON.parse(localStorage.getItem('vendeletro-users') || '[]');
  if (register) {
    if (f.password !== f.confirm) return error('As senhas não coincidem.');
    if (
      users.some((u) => u.email === f.email) ||
      ['cliente@demo.com', 'admin@demo.com'].includes(f.email)
    )
      return error('Este e-mail já está em uso.');
    const digest = await hashPassword(f.password);
    users.push({
      name: f.name,
      email: f.email,
      password: digest,
      phone: f.phone,
      birth: f.birth,
      role: 'customer',
    });
    localStorage.setItem('vendeletro-users', JSON.stringify(users));
    state.user = { name: f.name, email: f.email, role: 'customer' };
  } else {
    const demo =
      ['cliente@demo.com', 'admin@demo.com'].includes(f.email) && f.password === 'Demo1234';
    const u = users.find((u) => u.email === f.email && u.password);
    if (!demo && (!u || u.password !== (await hashPassword(f.password))))
      return error('E-mail ou senha incorretos.');
    state.user = demo
      ? {
          name: f.email.startsWith('admin') ? 'Admin Demo' : 'Cliente Demo',
          email: f.email,
          role: f.email.startsWith('admin') ? 'admin' : 'customer',
        }
      : { name: u.name, email: u.email, role: u.role };
  }
  state.addresses = JSON.parse(localStorage.getItem('addresses:' + state.user.email) || '[]');
  state.cards = JSON.parse(localStorage.getItem('cards:' + state.user.email) || '[]');
  save();
  go(returnTo || 'account');
  returnTo = '';
  toast('Tudo certo! Você entrou na sua conta.');
}
async function hashPassword(v) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
// Checkout validation and simulated card/boleto flows.
function submitCheckout(e) {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const error = (m) => ($('.form-error').textContent = m);
  if (checkoutStep === 1) {
    if (!validCPF(f.cpf)) return error('CPF inválido. Confira os dígitos verificadores.');
    checkout.cpf = f.cpf;
    checkout.address = Object.fromEntries(
      Object.entries(f).filter(([k]) => k !== 'cpf' && !k.startsWith('billing_')),
    );
    checkout.different = $('#different').checked;
    checkout.billing = checkout.different
      ? Object.fromEntries(
          Object.entries(f)
            .filter(([k]) => k.startsWith('billing_'))
            .map(([k, v]) => [k.slice(8), v]),
        )
      : checkout.address;
    state.addresses = [
      checkout.address,
      ...state.addresses.filter(
        (a) => a.cep !== checkout.address.cep || a.number !== checkout.address.number,
      ),
    ];
    localStorage.setItem('addresses:' + state.user.email, JSON.stringify(state.addresses));
    save();
    checkoutStep = 2;
    render();
  } else if (checkoutStep === 2) {
    if (['credit', 'debit'].includes(method)) {
      let b = f.savedCard ? state.cards.find((c) => c.id === f.savedCard)?.brand : brand(f.card);
      if (
        !(
          method === 'credit' ? ['Visa', 'Mastercard', 'Amex'] : ['Visa', 'Mastercard', 'Elo']
        ).includes(b)
      )
        return error('Bandeira não aceita para esta modalidade.');
      if (!f.savedCard) {
        const n = f.card.replace(/\D/g, '');
        if (n.length < 13 || n.length > 19) return error('Confira o número do cartão de teste.');
        const [m, y] = f.expiry.split('/').map(Number);
        if (new Date(2000 + y, m, 1) <= new Date()) return error('O cartão está vencido.');
        checkout.cardMeta = { id: crypto.randomUUID(), brand: b, last4: n.slice(-4) };
      }
      checkout.saveCard = !!f.saveCard;
      checkout.installments = Number(f.installments || 1);
    }
    checkoutStep = 3;
    render();
  } else {
    const b = e.target.querySelector('button:not([type="button"])');
    b.disabled = true;
    b.innerHTML = '<span class="loading"></span> Processando pedido';
    setTimeout(placeOrder, 650);
  }
}
async function placeOrder() {
  if (method === 'pix') {
    await createSandboxPix();
    return;
  }
  if (['credit', 'debit'].includes(method)) {
    showDialog(
      /* HTML */ `<h2>Resposta do pagamento de teste</h2>
        <p>Escolha uma resposta para validar a interface de pagamento.</p>
        ${btn('Simular aprovação', 'approve-payment')}${btn('Simular recusa', 'decline-payment', 'secondary')}`,
    );
    return;
  }
  continueOrder();
}
function continueOrder() {
  if (
    method === 'credit' &&
    totals(state.cart, products, method, state.config).total > state.config.threshold
  ) {
    showDialog(
      /* HTML */ `<h2>Verificação adicional</h2>
        <p>
          Esta compra ultrapassa ${money(state.config.threshold)}. Em produção, o banco solicitará
          autenticação 3D Secure.
        </p>
        <p>Simulação da interface, sem comunicação bancária.</p>
        ${btn('Concluir verificação de teste', 'verify')}${btn('Voltar ao pagamento', 'cancel-verify', 'secondary')}`,
    );
    return;
  }
  finishOrder();
}
async function finishOrder() {
  const o = {
    id: Date.now().toString(36).toUpperCase(),
    user: state.user.email,
    created: Date.now(),
    ...totals(state.cart, products, method, state.config),
    method,
    items: Object.entries(state.cart).map(([id, qty]) => ({
      ...products.find((p) => p.id === +id),
      qty,
    })),
    address: checkout.address,
    billing: checkout.billing,
    cpf: checkout.cpf,
    status: ['credit', 'debit'].includes(method) ? 'paid' : 'pending',
    expires: Date.now() + state.config.minutes * 60000,
    due: businessDate(new Date(), 3).toISOString(),
    installments: checkout.installments || 1,
  };
  if (method === 'boleto') o.expires = businessDate(new Date(o.due), 2).getTime();
  try {
    await mutateCart('/api/cart', 'DELETE');
  } catch (error) {
    toast(error.message);
    checkoutStep = 3;
    render();
    return;
  }
  if (checkout.saveCard && method === 'credit' && checkout.cardMeta) {
    state.cards.push(checkout.cardMeta);
    localStorage.setItem('cards:' + state.user.email, JSON.stringify(state.cards));
  }
  state.orders.unshift(o);
  state.cart = {};
  save();
  checkoutStep = 1;
  checkout = {};
  go('order/' + o.id);
  toast('Pedido de demonstração criado');
}

// Central event delegation for controls rendered by the view modules.
document.addEventListener('click', async (e) => {
  const el = e.target.closest('button,[data-category]');
  if (!el) return;
  const d = el.dataset;
  if (d.category) {
    category = d.category;
    query = '';
    go('catalog');
    refreshCatalog();
    return;
  }
  if (d.add || d.qty || d.remove) {
    if (cartBusy) return;
    try {
      if (d.add)
        await mutateCart('/api/cart/items', 'POST', { productId: Number(d.add), quantity: 1 });
      else if (d.remove) await mutateCart('/api/cart/items/' + d.remove, 'DELETE');
      else {
        const q = state.cart[d.qty] + Number(d.delta);
        await mutateCart(
          '/api/cart/items/' + d.qty,
          q <= 0 ? 'DELETE' : 'PATCH',
          q <= 0 ? undefined : { quantity: q },
        );
      }
      toast(d.add ? 'Produto adicionado ao carrinho' : 'Carrinho atualizado');
    } catch (error) {
      toast(error.message);
    }
    return;
  }
  if (d.cardRemove) {
    state.cards = state.cards.filter((c) => c.id !== d.cardRemove);
    localStorage.setItem('cards:' + state.user.email, JSON.stringify(state.cards));
    save();
    render();
    toast('Cartão removido');
    return;
  }
  if (d.detail) {
    const p = products.find((p) => p.id === +d.detail);
    showDialog(
      /* HTML */ `<div class="detail-art">${art(p.type, p.color)}</div>
        <span class="eyebrow">${p.category}</span>
        <h2>${p.name}</h2>
        <p>${p.spec}</p>
        <h3>${money(p.price * (1 - state.config.pix / 100))} no PIX</h3>
        <p>Ou ${money(p.price)} em até 10x sem juros. Produto original com garantia.</p>
        <button class="primary" data-add="${p.id}">Adicionar ao carrinho +</button>`,
    );
    return;
  }
  switch (d.action) {
    case 'offers':
      $('#offers').scrollIntoView({ behavior: 'smooth' });
      break;
    case 'retry-api':
      initialize();
      break;
    case 'retry-catalog':
      refreshCatalog();
      break;
    case 'clear':
      query = '';
      category = 'Todos';
      refreshCatalog();
      break;
    case 'checkout':
      checkoutStep = 1;
      if (state.user) go('checkout');
      else {
        returnTo = 'checkout';
        go('auth');
      }
      break;
    case 'toggle-auth':
      register = !register;
      render();
      break;
    case 'step-back':
      checkoutStep--;
      render();
      break;
    case 'logout':
      state.user = null;
      state.addresses = [];
      state.cards = [];
      checkout = {};
      save();
      go('catalog');
      break;
    case 'close':
      $('dialog').close();
      $('dialog').remove();
      break;
    case 'approve-payment':
      $('dialog')?.remove();
      continueOrder();
      break;
    case 'decline-payment':
      $('dialog')?.remove();
      checkoutStep = 2;
      render();
      $('.form-error').textContent =
        'Pagamento recusado. Escolha outra forma de pagamento ou revise os dados. Seu carrinho foi preservado.';
      break;
    case 'verify':
      $('dialog')?.remove();
      finishOrder();
      break;
    case 'cancel-verify':
      $('dialog')?.remove();
      checkoutStep = 2;
      render();
      break;
    case 'check-pix':
      checkSandboxPix(activeOrder, true);
      break;
    case 'copy-pix': {
      const o = state.orders.find((o) => o.id === activeOrder && o.sandboxPix);
      try {
        await navigator.clipboard.writeText(o.code);
        toast('Código PIX sandbox copiado');
      } catch {
        toast('Não foi possível copiar. Selecione o código exibido.');
      }
      break;
    }
    case 'copy':
      try {
        await navigator.clipboard.writeText('DEMONSTRACAO-NAO-PAGAVEL-' + activeOrder);
        toast('Código demonstrativo copiado');
      } catch {
        toast('Não foi possível copiar. Selecione o código exibido.');
      }
      break;
    case 'settle': {
      const o = state.orders.find((o) => o.id === activeOrder);
      if (status(o) === 'PIX expirado' || status(o) === 'Cancelado') return render();
      o.status = 'paid';
      save();
      render();
      toast('Pagamento simulado confirmado');
      break;
    }
    case 'renew-pix': {
      const o = state.orders.find((o) => o.id === activeOrder);
      const cart = Object.fromEntries(o.items.map((i) => [i.id, i.qty]));
      Object.assign(o, totals(cart, products, 'pix', state.config));
      o.items = o.items.map((i) => ({ ...i, price: products.find((p) => p.id === i.id).price }));
      o.expires = Date.now() + state.config.minutes * 60000;
      save();
      render();
      toast('Preços revalidados e novo código gerado');
      break;
    }
    case 'expire-boleto':
      state.orders.find((o) => o.id === activeOrder).status = 'cancelled';
      save();
      render();
      break;
  }
});
window.addEventListener('hashchange', () => {
  render();
  window.scrollTo(0, 0);
});
setInterval(() => {
  if (location.hash.startsWith('#order/')) {
    const o = state.orders.find((o) => o.id === activeOrder);
    if (o?.method === 'pix' && !o.sandboxPix && o.status === 'pending') {
      if (Date.now() > o.expires && $('#countdown')) render();
      else if ($('#countdown'))
        $('#countdown').textContent = Math.ceil((o.expires - Date.now()) / 1000) + ' s';
    }
  }
}, 1000);
initialize();

// Synchronization with the catalog/cart APIs.
async function initialize() {
  apiError = '';
  apiReady = false;
  render();
  try {
    pixConfig = await api('/api/pix/config');
    state.config.pix = pixConfig.discount;
    state.config.minutes = pixConfig.minutes;
    const storedPix = await api('/api/pix');
    for (const o of storedPix) mergePix(o);
    const all = await api('/api/products');
    products = all.items;
    catalogItems = all.items;
    const cart = await api('/api/cart');
    applyCart(cart);
    apiReady = true;
    await refreshCatalog();
  } catch (error) {
    apiError = 'Servidor indisponível. Confira se o backend está em execução e tente novamente.';
    render();
  }
}
function applyCart(cart) {
  state.cart = Object.fromEntries(cart.items.map((i) => [i.productId, i.quantity]));
  for (const i of cart.items) {
    const index = products.findIndex((p) => p.id === i.productId);
    if (index >= 0) products[index] = i.product;
  }
  save();
}
async function refreshCatalog() {
  const version = ++searchVersion;
  catalogBusy = true;
  catalogError = '';
  render();
  try {
    const data = await api('/api/products?' + new URLSearchParams({ q: query, category, sort }));
    if (version === searchVersion) catalogItems = data.items;
  } catch (error) {
    if (version === searchVersion)
      catalogError = 'Não foi possível buscar produtos. Tente novamente.';
  } finally {
    if (version === searchVersion) {
      catalogBusy = false;
      render();
    }
  }
}
async function mutateCart(path, method, body) {
  cartBusy = true;
  document
    .querySelectorAll('[data-add],[data-qty],[data-remove]')
    .forEach((b) => (b.disabled = true));
  try {
    const cart = await api(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
    applyCart(cart);
  } finally {
    cartBusy = false;
    render();
  }
}

// PIX sandbox integration; payment status comes from the backend.
function mergePix(o) {
  const existing = state.orders.find((i) => i.id === o.id);
  const mapped = {
    ...o,
    sandboxPix: true,
    method: 'pix',
    user: existing?.user || state.user?.email,
    subtotal: o.subtotalCents / 100,
    discount: o.discountCents / 100,
    total: o.totalCents / 100,
  };
  if (existing) Object.assign(existing, mapped);
  else state.orders.unshift(mapped);
  save();
  return mapped;
}
async function createSandboxPix() {
  if (pixBusy) return;
  pixBusy = true;
  checkout.pixKey ??= crypto.randomUUID();
  try {
    const o = await api('/api/pix', {
      method: 'POST',
      body: JSON.stringify({
        key: checkout.pixKey,
        customer: { name: state.user.name, email: state.user.email, cpf: checkout.cpf },
      }),
    });
    mergePix(o);
    applyCart(await api('/api/cart'));
    checkoutStep = 1;
    checkout = {};
    go('order/' + o.id);
    render();
    toast('PIX sandbox criado pelo PagBank');
  } catch (error) {
    render();
    const target = $('.form-error');
    if (target) target.textContent = error.message;
    else toast(error.message);
  } finally {
    pixBusy = false;
  }
}

async function checkSandboxPix(id, manual = false) {
  if (pixChecking) return;
  pixChecking = true;
  const feedback = $('#pix-feedback');
  if (feedback) feedback.textContent = 'Consultando PagBank…';
  try {
    const o = await api('/api/pix/' + encodeURIComponent(id));
    mergePix(o);
    if (location.hash === '\x23order/' + id) render();
    if (manual)
      toast(
        o.status === 'paid' ? 'Pagamento confirmado no sandbox' : 'Status consultado no PagBank',
      );
  } catch (error) {
    if ($('#pix-feedback')) $('#pix-feedback').textContent = error.message;
  } finally {
    pixChecking = false;
  }
}
setInterval(() => {
  const o = state.orders.find((o) => o.id === location.hash.split('/')[1] && o.sandboxPix);
  if (
    apiReady &&
    location.hash.startsWith('#order/') &&
    o &&
    o.status === 'pending' &&
    !document.hidden
  )
    checkSandboxPix(o.id);
}, 15000);
