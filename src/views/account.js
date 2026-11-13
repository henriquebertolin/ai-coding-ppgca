import { escapeHtml as esc } from '../ui.js';

export function createAccountViews({
  state,
  register,
  btn,
  title,
  field,
  addressFields,
  loginPrompt,
}) {
  function auth() {
    return (
      title(
        'Minha conta',
        register ? 'Seu próximo passo começa aqui' : 'Que bom ter você por aqui',
      ) +
      /* HTML */ `<section class="auth panel">
        <div class="eyebrow">CONTA VENDELETRO</div>
        <h2>${register ? 'Crie sua conta' : 'Entre na sua conta'}</h2>
        <p>Seu carrinho continua aqui, esperando por você.</p>
        <form id="auth-form">
          ${register ? field('Nome completo', 'name') + field('Telefone', 'phone', 'tel') + field('Nascimento (opcional)', 'birth', 'date', '', false) : ''}${field('E-mail', 'email', 'email')}${field('Senha', 'password', 'password', '', true, 'minlength="8" autocomplete="current-password"')}${register ? field('Confirme sua senha', 'confirm', 'password') : ''}
          <p class="form-error" role="alert"></p>
          <button class="primary">${register ? 'Criar conta' : 'Entrar'}</button>
        </form>
        <button class="text-button" data-action="toggle-auth">
          ${register ? 'Já tenho uma conta' : 'Ainda não tenho conta · Cadastrar'}
        </button>
        <p class="demo-note">
          Demonstração: entre com cliente@demo.com ou admin@demo.com e senha Demo1234. Não use dados
          reais.
        </p>
      </section>`
    );
  }

  function account() {
    if (!state.user) return title('Conta', 'Minha conta') + loginPrompt();
    return (
      title('Conta', `Olá, ${esc(state.user.name)}`) +
      /* HTML */ `<div class="two-col">
        <section class="panel">
          <h2>Meus endereços</h2>
          ${state.addresses.map((a) => /* HTML */ `<div class="info-box">${esc(a.street)}, ${esc(a.number)} · ${esc(a.city)}/${esc(a.uf)} · ${esc(a.cep)}</div>`).join('') || '<p>Nenhum endereço cadastrado.</p>'}
          <details>
            <summary>+ Cadastrar endereço</summary>
            <form id="address-form">
              ${addressFields()}<button class="primary">Salvar endereço</button>
            </form>
          </details>
          <h2>Cartões lembrados</h2>
          ${state.cards.map((c) => /* HTML */ `<div class="order-row"><span>${c.brand} •••• ${c.last4}</span><button class="text-button" data-card-remove="${c.id}">Remover</button></div>`).join('') || '<p>Nenhum cartão lembrado.</p>'}
          <p class="hint">Apenas bandeira e últimos dígitos. Tokenização real depende do PSP.</p>
        </section>
        <aside class="panel">
          <h3>${esc(state.user.name)}</h3>
          <p>${esc(state.user.email)}</p>
          <a href="#orders" class="back-link">Meus pedidos →</a
          >${state.user.role === 'admin' ? '<a href="#admin" class="back-link">Configurações comerciais →</a>' : ''}${btn('Sair da conta', 'logout', 'secondary')}
        </aside>
      </div>`
    );
  }

  function admin() {
    if (state.user?.role !== 'admin')
      return (
        title('Administração', 'Acesso restrito') +
        /* HTML */ `<section class="empty panel">
          <h2>Esta área é exclusiva da administração</h2>
          <p>Use a conta administrativa de demonstração para configurar a loja.</p>
          <a class="primary" href="#auth">Entrar</a>
        </section>`
      );
    return (
      title(
        'Administração',
        'Configurações comerciais',
        'Alterações serão aplicadas a novos pedidos.',
      ) +
      /* HTML */ `<section class="panel admin-panel">
        <p class="info-box">
          Desconto e validade do PIX são definidos no .env do servidor. Controle de perfil
          demonstrativo no navegador. Em produção, a autorização deve ser aplicada pelo servidor.
        </p>
        <form id="admin-form">
          ${[
            ['pix', 'Desconto PIX (%)'],
            ['debit', 'Desconto débito (%)'],
            ['boleto', 'Desconto boleto (%)'],
            ['threshold', 'Limiar de 3D Secure (R$)'],
            ['minutes', 'Expiração do PIX (minutos)'],
          ]
            .map(([k, label]) =>
              field(
                label,
                k,
                'number',
                state.config[k],
                true,
                `min="${k === 'minutes' ? 1 : 0}" max="${['pix', 'debit', 'boleto'].includes(k) ? 100 : k === 'minutes' ? 1440 : 1000000}" step="${k === 'minutes' ? 1 : 0.01}" ${['pix', 'minutes'].includes(k) ? 'readonly' : ''}`,
              ),
            )
            .join('')}<button class="primary">Salvar configurações</button>
        </form>
      </section>`
    );
  }
  return { auth, account, admin };
}
