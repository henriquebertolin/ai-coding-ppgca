import { money } from '../domain.js';
import { escapeHtml as esc } from '../ui.js';
import { orderStatus as status } from '../domain.js';

export function createOrderViews({ state, btn, setActiveOrder, title, empty, loginPrompt }) {
  function orders() {
    return (
      title('Pedidos', 'Acompanhe suas escolhas') +
      (state.user
        ? state.orders.length
          ? /* HTML */ `<section class="panel">
              ${
                state.orders
                  .filter((o) => o.sandboxPix || o.user === state.user.email)
                  .map(
                    (o) =>
                      /* HTML */ `<a href="#order/${o.id}" class="order-row"
                        ><span
                          ><b>Pedido #${o.id}</b
                          ><small
                            >${new Date(o.created).toLocaleDateString('pt-BR')} · ${o.items.length}
                            produtos</small
                          ></span
                        ><span class="status">${status(o)}</span><b>${money(o.total)}</b
                        ><span>→</span></a
                      >`,
                  )
                  .join('') || '<p>Você ainda não tem pedidos nesta conta.</p>'
              }
            </section>`
          : empty(
              'Sua história começa com uma escolha',
              'Você ainda não tem pedidos. Explore o catálogo.',
            )
        : loginPrompt())
    );
  }

  function orderView() {
    const id = location.hash.split('/')[1];
    if (state.orders.some((o) => o.id === id && o.sandboxPix)) return sandboxPixView(id);
    let o = state.orders.find((o) => o.id === id && o.user === state.user?.email);
    if (!o) return title('Pedido', 'Pedido não encontrado') + loginPrompt();
    setActiveOrder(o.id);
    const expired = status(o) === 'PIX expirado';
    return (
      title(
        'Pedido',
        o.status === 'paid' ? 'Seu upgrade está confirmado!' : 'Pedido recebido',
        `Pedido #${o.id}`,
      ) +
      /* HTML */ `<div class="two-col">
        <section class="panel order-detail">
          <div class="success-icon">${o.status === 'paid' ? '✓' : '◷'}</div>
          <span class="status">${status(o)}</span>
          <h2>
            ${o.status === 'paid' ? 'Tudo certo com seu pedido' : expired ? 'O prazo deste PIX terminou' : 'Só falta o pagamento'}
          </h2>
          <p>Ambiente demonstrativo. Nenhuma cobrança ou nota fiscal real é emitida.</p>
          ${
            o.method === 'pix' && o.status === 'pending'
              ? expired
                ? /* HTML */ `<p>
                      A reserva simulada foi liberada. Ao gerar um novo código, os preços serão
                      revalidados.
                    </p>
                    ${btn('Revalidar e gerar novo PIX', 'renew-pix')}`
                : /* HTML */ `<div class="mock-qr" aria-label="Código ilustrativo, não pagável">
                      ${Array.from({ length: 81 }, (_, i) => /* HTML */ `<i class="${(i * 7 + (i % 3)) % 5 < 3 ? 'dark' : ''}"></i>`).join('')}
                    </div>
                    <p><b>PIX ilustrativo · não pagável</b></p>
                    <p>
                      Expira em
                      <span id="countdown"
                        >${Math.max(0, Math.ceil((o.expires - Date.now()) / 60000))} min</span
                      >
                    </p>
                    <code>DEMONSTRACAO-PIX-${o.id}</code
                    >${btn('Copiar código demonstrativo', 'copy', 'secondary')}${btn('Simular pagamento recebido', 'settle')}`
              : o.method === 'boleto' && o.status === 'pending'
                ? /* HTML */ `<p>Vencimento: ${new Date(o.due).toLocaleDateString('pt-BR')}</p>
                    <code>DEMO · ${o.id} · NÃO PAGÁVEL</code>
                    <p>Compensação em até 2 dias úteis após o pagamento.</p>
                    ${btn('Copiar linha demonstrativa', 'copy', 'secondary')}${btn('Simular compensação', 'settle')}${btn('Simular término sem compensação', 'expire-boleto', 'text-button')}`
                : o.status === 'paid'
                  ? /* HTML */ `<p>
                        Entrega: ${esc(o.address.street)}, ${esc(o.address.number)} ·
                        ${esc(o.address.city)}
                      </p>
                      <p>CPF de faturamento: ${esc(o.cpf)}</p>
                      <p>Faturamento: ${esc(o.billing.street)}, ${esc(o.billing.number)}</p>
                      <p class="info-box">
                        Em produção, o comprovante e a NF-e dependerão do gateway e do serviço
                        fiscal.
                      </p>`
                  : ''
          }<a class="back-link" href="#orders">Ver meus pedidos →</a>
        </section>
        <aside class="summary">
          <h3>Resumo do pedido</h3>
          ${o.items.map((i) => /* HTML */ `<div><span>${i.qty}× ${i.name}</span><b>${money(i.price * i.qty)}</b></div>`).join('')}
          <hr />
          <div><span>Subtotal</span><b>${money(o.subtotal)}</b></div>
          <div><span>Frete demonstrativo</span><b>Grátis</b></div>
          <div><span>Desconto</span><b>− ${money(o.discount)}</b></div>
          <div class="total"><span>Total</span><b>${money(o.total)}</b></div>
        </aside>
      </div>`
    );
  }

  function sandboxPixView(id) {
    const o = state.orders.find((o) => o.id === id && o.sandboxPix);
    setActiveOrder(id);
    const expired = o.status !== 'paid' && Date.now() > o.expires;
    return (
      title(
        'Pedido PIX sandbox',
        o.status === 'paid' ? 'Pagamento confirmado no sandbox' : 'Seu PIX de teste',
        `Referência ${o.reference}`,
      ) +
      /* HTML */ `<div class="two-col">
        <section class="panel order-detail">
          <span class="status"
            >${o.status === 'paid' ? 'Pagamento confirmado' : o.status === 'creating' ? 'Resposta pendente' : o.status === 'declined' ? 'Pagamento recusado' : expired ? 'PIX expirado' : 'Aguardando pagamento'}</span
          >
          <h2>PagBank · ambiente sandbox</h2>
          <p>Use apenas o simulador do PagBank. Não realize uma transferência real.</p>
          ${
            o.status === 'paid'
              ? '<div class="success-icon">✓</div><p>Confirmação obtida pela API do PagBank.</p>'
              : o.status === 'declined'
                ? '<p>O PagBank recusou este pagamento. No sandbox, a faixa de R$ 300,01 a R$ 400,00 simula recusa. Para testar aprovação automática, faça uma nova compra com total PIX de até R$ 100,00.</p><a href="#catalog" class="secondary">Voltar ao catálogo</a>'
                : o.status === 'creating'
                  ? '<p>Resultado da criação indeterminado. Confira a referência no portal PagBank antes de criar outra cobrança.</p>'
                  : expired
                    ? '<p>Este código expirou. Consulte o pagamento uma última vez antes de iniciar outra compra no catálogo.</p><a href="#catalog" class="secondary">Voltar ao catálogo</a>'
                    : /* HTML */ `<img
                          class="pix-qr"
                          src="${esc(o.qrImage || '')}"
                          alt="QR Code PIX sandbox"
                        />
                        <p>Validade: ${new Date(o.expires).toLocaleString('pt-BR')}</p>
                        <code class="pix-code">${esc(o.code)}</code
                        >${btn('Copiar PIX sandbox', 'copy-pix', 'secondary')}`
          }
          <p id="pix-feedback" role="status">
            ${o.checkedAt ? 'Última consulta: ' + new Date(o.checkedAt).toLocaleTimeString('pt-BR') : ''}
          </p>
          ${btn('Consultar pagamento', 'check-pix')}<a class="back-link" href="#orders"
            >Meus pedidos →</a
          >
        </section>
        <aside class="summary">
          <h3>Resumo validado no servidor</h3>
          ${o.items.map((i) => /* HTML */ `<div><span>${i.qty}× ${esc(i.name)}</span><b>${money(i.price * i.qty)}</b></div>`).join('')}
          <hr />
          <div><span>Subtotal</span><b>${money(o.subtotal)}</b></div>
          <div><span>Desconto PIX</span><b>− ${money(o.discount)}</b></div>
          <div><span>Frete demonstrativo</span><b>Grátis</b></div>
          <div class="total"><span>Total</span><b>${money(o.total)}</b></div>
          <p class="hint">Sem emissão de NF-e ou reserva de estoque.</p>
        </aside>
      </div>`
    );
  }
  return { orders, orderView, sandboxPixView };
}
