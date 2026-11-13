import { money } from '../domain.js';
import { art } from '../art.js';
import { escapeHtml as esc } from '../ui.js';

export function createCatalogViews({
  state,
  catalogItems,
  catalogBusy,
  catalogError,
  query,
  category,
  sort,
  btn,
}) {
  function catalog() {
    const list = catalogItems;
    return `${
      !query && category === 'Todos'
        ? /* HTML */ `<section class="hero">
              <div class="hero-copy">
                <div class="eyebrow"><span></span> CONECTE-SE AO NOVO</div>
                <h1>Seu mundo.<br />Um upgrade <em>de cada vez.</em></h1>
                <p>
                  Encontre a tecnologia que acompanha você.<br />Preços fictícios reduzidos para
                  testar o PIX sandbox.
                </p>
                <button class="primary" data-action="offers">
                  Explorar ofertas <span>↗</span>
                </button>
                <div class="hero-proof">
                  <span>✧ Produtos originais</span><span>✓ Compra segura</span>
                </div>
              </div>
              <div class="hero-art">
                <div class="orbit orbit-one"></div>
                <div class="orbit orbit-two"></div>
                <div class="hero-label">ESCOLHAS QUE CONECTAM</div>
                <div class="hero-laptop">${art('laptop')}</div>
                <div class="hero-phone">${art('phone')}</div>
                <div class="hero-headphones">${art('headphones', '#c6c2ae')}</div>
                <div class="floating-note">
                  <span>✦</span>
                  <div>Mais tecnologia.<b>Mais possibilidades.</b></div>
                </div>
                <span class="hero-edition">CURADORIA VENDELETRO / 2026</span>
              </div>
            </section>
            <section class="benefits">
              <div>
                <i>♧</i
                ><span
                  ><b>Entrega para todo o Brasil</b><small>Seu upgrade chega até você</small></span
                >
              </div>
              <div>
                <i>▤</i
                ><span><b>Até 10x sem juros</b><small>Mais liberdade para escolher</small></span>
              </div>
              <div>
                <i>◇</i
                ><span
                  ><b>${state.config.pix}% de desconto no PIX</b
                  ><small>Economia em cada escolha</small></span
                >
              </div>
              <div>
                <i>♙</i
                ><span
                  ><b>Compra com confiança</b><small>Produtos originais e com garantia</small></span
                >
              </div>
            </section>`
        : ''
    }<section id="offers" class="catalog-section"><div class="section-top"><div><div class="eyebrow">SEU PRÓXIMO FAVORITO</div><h2>${query ? `Resultados para “${esc(query)}”` : category === 'Todos' ? 'Tecnologia que combina com você' : category}<span class="green-dot">.</span></h2><p>${query ? `${list.length} produtos encontrados` : 'Escolhidos a dedo. Prontos para fazer parte do seu dia.'}</p></div><label class="sort">Ordenar por <select id="sort" aria-label="Ordenar produtos"><option value="featured" ${sort === 'featured' ? 'selected' : ''}>Destaques</option><option value="price" ${sort === 'price' ? 'selected' : ''}>Menor preço</option><option value="price-desc" ${sort === 'price-desc' ? 'selected' : ''}>Maior preço</option></select></label></div><div class="filters">${['Todos', 'Smartphones', 'Laptops', 'Acessórios'].map((c) => /* HTML */ `<button data-category="${c}" class="${category === c ? 'selected' : ''}">${c === 'Todos' ? 'Todos os produtos' : c}</button>`).join('')}<span>${list.length} produtos</span></div><div class="product-grid">${
      catalogBusy
        ? '<p role="status">Buscando produtos…</p>'
        : catalogError
          ? /* HTML */ `<div class="empty">
              <h2>Falha ao buscar produtos</h2>
              <p>${esc(catalogError)}</p>
              ${btn('Tentar novamente', 'retry-catalog')}
            </div>`
          : list
              .map(
                (p) =>
                  /* HTML */ `<article class="product-card">
                    <button
                      class="product-image"
                      data-detail="${p.id}"
                      aria-label="Ver detalhes de ${p.name}"
                    >
                      <span class="badge">${p.tag}</span>${art(p.type, p.color)}<span
                        class="image-arrow"
                        >↗</span
                      >
                    </button>
                    <div class="product-info">
                      <span class="product-category">${p.category}</span
                      ><button class="product-title" data-detail="${p.id}">${p.name}</button>
                      <p>${p.spec}</p>
                      <div class="rating">★★★★★ <span>4,9</span></div>
                      <del>${money(p.old)}</del>
                      <h3>
                        ${money(p.price * (1 - state.config.pix / 100))}<small> no PIX</small>
                      </h3>
                      <p class="installment">ou ${money(p.price)} em até 10x sem juros</p>
                      <button class="add-button" data-add="${p.id}">
                        Adicionar ao carrinho <span>+</span>
                      </button>
                    </div>
                  </article>`,
              )
              .join('') ||
            /* HTML */ `<div class="empty">
              <div>⌕</div>
              <h2>Nenhum produto encontrado</h2>
              <p>Tente outro nome ou explore todas as categorias.</p>
              ${btn('Limpar busca', 'clear')}
            </div>`
    }</div></section><section class="bottom-banner"><div><span class="eyebrow">ESCOLHA DO SEU JEITO</span><h2>Grandes ideias merecem<br>a tecnologia certa.</h2></div><p>Do primeiro clique ao próximo projeto.<br>Conte com a VendEletro para ir além.</p><button class="secondary" data-category="Laptops">Encontre seu laptop ↗</button></section>`;
  }
  return { catalog };
}
