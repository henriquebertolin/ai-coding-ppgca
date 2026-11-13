# VendEletro

Aplicação web baseada nas histórias de usuário do VendEletro. Catálogo, carrinho e pedidos PIX são persistidos em SQLite. O PIX usa a API Order do **PagBank sandbox**; login, cartões e boleto continuam demonstrativos.

## Executar

Requer **Node.js 24 ou superior**. Não é necessário instalar dependências para executar o app.

```sh
npm run dev
```

Abra http://127.0.0.1:5173. Frontend e API usam o mesmo servidor. Para encerrar, pressione **Ctrl+C** no terminal.

O servidor carrega o token de `.env`. Use `.env.example` como referência e configure `PAGBANK_TOKEN` somente com credenciais sandbox. Nunca publique `.env`. Para refletir alterações na configuração ou no código do backend, reinicie o servidor; para alterações do frontend, recarregue a página.

Contas demonstrativas: `cliente@demo.com` ou `admin@demo.com`, com senha `Demo1234`. Use dados fictícios.

## Estrutura

```text
.
├── server.js                   # Entrada do servidor e entrega dos arquivos estáticos
├── index.html                  # Página de entrada
├── backend/
│   ├── app.js                 # Montagem e injeção das dependências
│   ├── routes/                # Endpoints e métodos HTTP
│   ├── controllers/           # Entrada e resposta HTTP
│   ├── services/              # Regras de catálogo, carrinho, sessão e PIX
│   ├── repositories/          # SQL separado por entidade
│   ├── database/              # Conexão SQLite, esquema, migrações e seed
│   ├── integrations/          # Cliente externo do PagBank sandbox
│   ├── middleware/            # Sessão, origem e tratamento de erros
│   ├── http/                  # Contexto HTTP e execução das rotas
│   ├── mappers/               # Conversão de dados para a API e o PagBank
│   ├── validators/            # Validações do backend
│   └── errors/                # Erros da aplicação
├── src/
│   ├── app.js                 # Estado, eventos e coordenação dos fluxos
│   ├── api.js                 # Cliente HTTP do frontend
│   ├── domain.js              # CPF, valores, bandeiras, datas e status de pedidos
│   ├── ui.js                  # DOM, escape de HTML, botões, feedback e diálogos
│   ├── art.js                 # Ilustrações SVG
│   ├── views.js               # Composição das telas
│   ├── views/
│   │   ├── components.js      # Cabeçalho, rodapé e componentes compartilhados
│   │   ├── catalog.js         # Catálogo e produtos
│   │   ├── checkout.js        # Carrinho e etapas de checkout
│   │   ├── account.js         # Login, cadastro, conta e administração
│   │   └── orders.js          # Pedidos demonstrativos e PIX sandbox
│   ├── style.css              # Entrada dos estilos; mantém a ordem da cascata
│   └── styles/                # Base, catálogo, componentes, responsividade e PIX
├── tests/                     # Regras, API, SQLite, PIX, telas e arquivos estáticos
├── scripts/check.mjs          # Verificação de sintaxe de todos os módulos
├── data/                      # Banco local; ignorado pelo Git
├── docs/                      # Fluxos, API, configuração e documentos de referência
│   └── referencias/           # PDF das histórias e relatório de arquitetura
└── artigos/                   # Artigos fornecidos para consulta
```

## Dados

O banco é criado automaticamente em `data/vendeletro.sqlite`. Produtos, sessões, carrinhos e pedidos PIX ficam no servidor. Contas, endereços, cartões lembrados e pedidos simulados ainda usam LocalStorage do navegador.

O token fica no `.env`, fora do banco e do código do frontend. A organização dos arquivos não altera o banco ou pedidos existentes.

## Verificar

```sh
npm test
npm run check
npm run test:backend
npm run test:pix
```

São 26 testes, incluindo renderização das telas e entrega dos módulos/estilos em subpastas. Os testes de PIX usam respostas controladas, sem criar cobranças na conta. A validação de sintaxe percorre os diretórios automaticamente.

A configuração `.prettierrc.json` define o padrão de formatação para editores com suporte ao Prettier. A execução do projeto continua sem dependências externas.

## Documentação

- [Fluxos, telas e rastreabilidade](docs/fluxos-e-telas.md)
- [Organização das camadas do backend](backend/README.md)
- [API, arquitetura e persistência](docs/backend.md)
- [Configuração, cenários e limites do PIX sandbox](docs/pix-sandbox.md)
- [Relatório de arquitetura](docs/referencias/relatorio-henriquebertolin.pdf)

A autenticação é demonstrativa. Não há processamento de pagamentos de produção, reserva de estoque ou emissão de NF-e. A validação visual no navegador e a homologação com credenciais dependem do ambiente local do desenvolvedor.
