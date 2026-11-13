import { money, totals } from '../domain.js';
import { art } from '../art.js';
import { escapeHtml as esc } from '../ui.js';

export function createCheckoutViews({
  state,
  products,
  method,
  checkoutStep,
  checkout,
  count,
  btn,
  go,
  setReturnTo,
  title,
  empty,
  summary,
  field,
  addressFields,
}) {
  function cart() {
    return (
      title('Carrinho', 'Seu próximo upgrade', `${count()} itens no seu carrinho`) +
      (count()
        ? /* HTML */ `<div class="two-col">
            <section class="panel">
              ${Object.entries(state.cart)
                .map(([id, q]) => {
                  let p = products.find((p) => p.id === +id);
                  return /* HTML */ `<div class="cart-row">
                    <div class="cart-art">${art(p.type, p.color)}</div>
                    <div>
                      <h3>${p.name}</h3>
                      <p>${p.spec}</p>
                      <b>${money(p.price)}</b>
                    </div>
                    <div class="quantity">
                      <button data-qty="${id}" data-delta="-1" aria-label="Diminuir ${p.name}">
                        −</button
                      ><span>${q}</span
                      ><button data-qty="${id}" data-delta="1" aria-label="Aumentar ${p.name}">
                        +
                      </button>
                    </div>
                    <button class="text-button" data-remove="${id}">Remover</button>
                  </div>`;
                })
                .join('')}<a class="back-link" href="#catalog">← Continuar comprando</a>
            </section>
            ${summary(btn('Continuar para entrega →', 'checkout'))}
          </div>`
        : empty(
            'Seu carrinho está esperando por você',
            'Explore o catálogo e encontre seu próximo favorito.',
          ))
    );
  }

  function checkoutView() {
    if (!state.user) {
      setReturnTo('checkout');
      go('auth');
      return '';
    }
    if (!count()) return empty('Seu carrinho está vazio', 'Adicione produtos antes de continuar.');
    return (
      title('Checkout', 'Falta pouco para o seu upgrade') +
      /* HTML */ `<ol class="steps">
          ${['Identificação e entrega', 'Pagamento', 'Revisão'].map((s, i) => /* HTML */ `<li class="${checkoutStep === i + 1 ? 'current' : checkoutStep > i + 1 ? 'done' : ''}"><span>${checkoutStep > i + 1 ? '✓' : i + 1}</span>${s}</li>`).join('')}
        </ol>
        <div class="two-col">
          <section class="panel">
            <form id="checkout-form">
              ${
                checkoutStep === 1
                  ? /* HTML */ `<h2>Identificação e entrega</h2>
                      ${field('CPF para faturamento', 'cpf', 'text', checkout.cpf || '')}
                      <p class="hint">
                        O CPF é solicitado apenas para fechar a compra. Use dados de teste.
                      </p>
                      <h3>Endereço de entrega</h3>
                      ${addressFields('', checkout.address || state.addresses[0])}<label
                        class="checkbox"
                        ><input
                          type="checkbox"
                          id="different"
                          ${checkout.different ? 'checked' : ''}
                        />
                        Usar outro endereço de cobrança</label
                      >
                      <div id="billing" ${checkout.different ? '' : 'hidden'}>
                        ${addressFields('billing_', checkout.billing)}
                      </div>`
                  : checkoutStep === 2
                    ? paymentForm()
                    : /* HTML */ `<h2>Confira antes de confirmar</h2>
                        <div class="review">
                          <h3>Entrega</h3>
                          <p>
                            ${esc(checkout.address.street)}, ${esc(checkout.address.number)} ·
                            ${esc(checkout.address.city)}/${esc(checkout.address.uf)}
                          </p>
                          <h3>Faturamento</h3>
                          <p>CPF ${esc(checkout.cpf)}</p>
                          <p>
                            ${checkout.different ? esc(checkout.billing.street) + ', ' + esc(checkout.billing.number) : 'Mesmo endereço da entrega'}
                          </p>
                          <h3>Pagamento</h3>
                          <p>
                            ${{ pix: 'PIX', credit: `Crédito em ${checkout.installments || 1}x sem juros`, debit: 'Débito à vista', boleto: 'Boleto bancário' }[method]}
                          </p>
                          <p class="demo-note">
                            PIX é integrado ao sandbox PagBank. Use somente dados de teste. Demais
                            modalidades são simuladas; não há reserva de estoque ou emissão de NF-e.
                          </p>
                        </div>`
              }
              <p class="form-error" role="alert"></p>
              <div class="form-actions">
                ${checkoutStep > 1 ? btn('← Voltar', 'step-back', 'secondary') : '<a href="#cart">← Carrinho</a>'}<button
                  class="primary"
                >
                  ${checkoutStep === 3 ? (method === 'pix' ? 'Gerar PIX sandbox →' : 'Confirmar pedido de teste →') : 'Continuar →'}
                </button>
              </div>
            </form>
          </section>
          ${summary()}
        </div>`
    );
  }

  function paymentForm() {
    return /* HTML */ `<h2>Como você prefere pagar?</h2>
      <p>Escolha uma forma de pagamento para este pedido.</p>
      <div class="payment-options">
        ${[
          ['pix', '◇', 'PIX', `${state.config.pix}% de desconto`],
          ['credit', '▤', 'Crédito', 'Até 10x sem juros'],
          ['debit', '▤', 'Débito', 'À vista'],
          ['boleto', '▥', 'Boleto', '3 dias úteis'],
        ]
          .map(
            ([id, icon, name, desc]) =>
              /* HTML */ `<label class="payment-option ${method === id ? 'chosen' : ''}"
                ><input
                  type="radio"
                  name="method"
                  value="${id}"
                  ${method === id ? 'checked' : ''}
                /><span>${icon}</span><b>${name}<small>${desc}</small></b></label
              >`,
          )
          .join('')}
      </div>
      ${
        method === 'pix'
          ? '<div class="info-box">Preços reduzidos para testes. No sandbox, total PIX até R$ 100 é aprovado automaticamente; acima disso o resultado muda conforme as faixas do simulador. Não utilize dinheiro real.</div>'
          : method === 'boleto'
            ? '<div class="info-box">Vencimento em 3 dias úteis. A compensação pode levar até 2 dias úteis após o pagamento.</div>'
            : /* HTML */ `<div class="info-box">
                  Use apenas cartões fictícios. Crédito: Visa, Mastercard e Amex. Débito: Visa,
                  Mastercard e Elo.
                </div>
                ${
                  state.cards.length && method === 'credit'
                    ? /* HTML */ `<label class="field"
                        >Cartão<select name="savedCard" id="saved-card">
                          <option value="">Usar novo cartão</option>
                          ${state.cards.map((c) => /* HTML */ `<option value="${c.id}">${c.brand} •••• ${c.last4}</option>`).join('')}
                        </select></label
                      >`
                    : ''
                }
                <div id="new-card">
                  ${field('Nome no cartão', 'holder')}${field('Número de teste', 'card', 'text', '', true, 'inputmode="numeric" maxlength="23"')}${field('Validade (MM/AA)', 'expiry', 'text', '', true, 'pattern="(0[1-9]|1[0-2])/[0-9]{2}" placeholder="12/29"')}
                </div>
                ${field('Código de segurança (CVV)', 'cvv', 'password', '', true, 'pattern="[0-9]{3,4}" maxlength="4" inputmode="numeric"')}${
                  method === 'credit'
                    ? /* HTML */ `<label class="field"
                          >Parcelamento<select name="installments">
                            ${Array.from({ length: 10 }, (_, i) => /* HTML */ `<option value="${i + 1}">${i + 1}x de ${money(totals(state.cart, products, method, state.config).total / (i + 1))} sem juros</option>`).join('')}
                          </select></label
                        ><label class="checkbox"
                          ><input name="saveCard" type="checkbox" /> Lembrar bandeira e últimos 4
                          dígitos neste protótipo</label
                        >`
                    : ''
                }`
      }`;
  }
  return { cart, checkoutView, paymentForm };
}
