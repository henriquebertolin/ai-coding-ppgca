import { money, totals } from '../domain.js';
import { escapeHtml as esc } from '../ui.js';

export function createComponents({ state, products, query, category, method, count, btn }) {
  function header() {
    return /* HTML */ `<div class="announcement">
        Seu próximo upgrade começa aqui. <span>Até 10x sem juros no cartão</span>
        <span>✦ Tecnologia que conecta.</span>
      </div>
      <header>
        <a class="brand" href="#catalog"
          ><i>v<span>e</span></i
          >VendEletro<span class="brand-dot">.</span></a
        >
        <form id="search" role="search">
          <span>⌕</span
          ><input
            aria-label="Buscar produtos"
            name="q"
            placeholder="O que você está procurando?"
            value="${esc(query)}"
          /><button aria-label="Buscar">↵</button>
        </form>
        <div class="header-actions">
          <a href="#account"
            ><span class="line-icon">♙</span
            ><span
              >Olá, ${esc(state.user?.name.split(' ')[0] || 'visitante')}<b
                >${state.user ? 'Minha conta' : 'Entre ou cadastre-se'}</b
              ></span
            ></a
          ><a href="#cart" aria-label="Carrinho com ${count()} itens" class="cart-link"
            ><span class="line-icon">♧</span
            ><span>Carrinho<b>${count()} ${count() === 1 ? 'item' : 'itens'}</b></span
            ><em>${count()}</em></a
          >
        </div>
      </header>
      <nav class="main-nav">
        <div>
          ${['Todos', 'Smartphones', 'Laptops', 'Acessórios'].map((c, i) => /* HTML */ `<button class="${category === c ? 'active' : ''}" data-category="${c}">${i === 0 ? '☰ Todas as categorias' : c}</button>`).join('')}
        </div>
        <a href="#orders">Meus pedidos ↗</a>
      </nav>`;
  }

  function footer() {
    return /* HTML */ `<footer>
      <a class="brand" href="#catalog">VendEletro.</a
      ><span>Tecnologia para o seu próximo passo.</span
      ><small>Protótipo demonstrativo · Nenhum pagamento real é processado</small
      ><a href="#admin">Administração</a>
    </footer>`;
  }

  function summary(action = '') {
    const t = totals(state.cart, products, method, state.config);
    return /* HTML */ `<aside class="summary">
      <h3>Resumo da compra</h3>
      ${Object.entries(state.cart)
        .map(([id, q]) => {
          let p = products.find((p) => p.id === +id);
          return /* HTML */ `<div class="summary-item">
            <span>${q}× ${p.name}</span><b>${money(p.price * q)}</b>
          </div>`;
        })
        .join('')}
      <hr />
      <div><span>Subtotal</span><b>${money(t.subtotal)}</b></div>
      <div><span>Frete demonstrativo</span><b>Grátis</b></div>
      <div class="discount">
        <span>Desconto ${method.toUpperCase()}</span><b>− ${money(t.discount)}</b>
      </div>
      <div class="total"><span>Total</span><b>${money(t.total)}</b></div>
      ${action}
      <p class="secure">♧ Ambiente de demonstração · Sem cobrança</p>
    </aside>`;
  }

  function title(k, t, p = '') {
    return /* HTML */ `<div class="page-title">
      <a href="#catalog">Início</a><span> / ${k}</span>
      <h1>${t}</h1>
      ${p ? /* HTML */ `<p>${p}</p>` : ''}
    </div>`;
  }

  function empty(t, p) {
    return /* HTML */ `<section class="empty panel">
      <div>◇</div>
      <h2>${t}</h2>
      <p>${p}</p>
      <a class="primary" href="#catalog">Explorar produtos ↗</a>
    </section>`;
  }

  function field(label, name, type = 'text', value = '', required = true, extra = '') {
    return /* HTML */ `<label class="field"
      >${label}<input
        name="${name}"
        type="${type}"
        value="${esc(value)}"
        ${required ? 'required' : ''}
        ${extra}
    /></label>`;
  }

  const addressFields = (prefix = '', a = {}) =>
    /* HTML */ `<div class="form-grid">
      ${field('CEP', prefix + 'cep', 'text', a.cep || '', true, 'pattern="[0-9]{5}-?[0-9]{3}" placeholder="99000-000"')}${field('Rua', prefix + 'street', 'text', a.street || '')}${field('Número', prefix + 'number', 'text', a.number || '')}${field('Complemento (opcional)', prefix + 'extra', 'text', a.extra || '', false)}${field('Bairro', prefix + 'district', 'text', a.district || '')}${field('Cidade', prefix + 'city', 'text', a.city || '')}${field('Estado (UF)', prefix + 'uf', 'text', a.uf || '', true, 'pattern="[A-Za-z]{2}" maxlength="2" placeholder="RS"')}
    </div>`;

  function loginPrompt() {
    return /* HTML */ `<section class="empty panel">
      <h2>Entre para continuar</h2>
      <p>Seus pedidos e endereços ficam na sua conta.</p>
      <a class="primary" href="#auth">Entrar ou criar conta</a>
    </section>`;
  }
  return { header, footer, summary, title, empty, field, addressFields, loginPrompt };
}
