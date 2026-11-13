# Backend — catálogo e carrinho

## Escopo e vínculo com os documentos

Implementa US-01/RF-UNI-01 (navegação e busca sem login) e US-02/RF-UNI-02 (adicionar, alterar e remover itens sem login), respeitando RN-UNI-01. É o primeiro incremento da arquitetura cliente-servidor e monólito modular em camadas descrita na seção 3 do relatório `relatorio-henriquebertolin.pdf`.

- Apresentação: `src/app.js`, cliente HTTP em `src/api.js`.
- Rotas e controllers: `backend/routes/` e `backend/controllers/`.
- API e adaptação HTTP: `backend/http/` e `server.js`.
- Montagem das dependências: `backend/app.js`. Veja o [guia das camadas](../backend/README.md).
- Aplicação: services por domínio em `backend/services/`.
- Dados: repositories em `backend/repositories/`; conexão e migrações em `backend/database/`.

Não é uma implementação integral do relatório. Os outros módulos, autenticação real, vinculação do carrinho ao cliente, estoque, pedidos, pagamentos, parâmetros comerciais e eventos permanecem para incrementos posteriores. O checkout existente continua demonstrativo.

## Execução

Requer Node.js 24 ou superior, com `node:sqlite`. Não precisa instalar dependências.

```sh
npm run dev
npm test
npm run test:backend
npm run check
```

Abrir http://127.0.0.1:5173. Se uma versão anterior estiver aberta no terminal, encerre e reinicie o servidor. `PORT` configura outra porta; padrão 5173, somente loopback. O banco é criado automaticamente em `data/vendeletro.sqlite`, com seis produtos de exemplo. O seed não sobrescreve produtos existentes. A pasta de dados está no `.gitignore` e não é servida por HTTP.

## Contrato HTTP

Todas as respostas são JSON. Erros retornam `{ "error": "mensagem" }`.

| Método | Rota | Entrada / retorno |
| --- | --- | --- |
| GET | `/api/products` | `q`, `category` e `sort` opcionais; retorna `{items,total}` |
| GET | `/api/products/:id` | Produto ou 404 |
| GET | `/api/cart` | Carrinho do visitante atual |
| POST | `/api/cart/items` | JSON `{productId:1,quantity:2}`; soma à quantidade existente, retorna 201 |
| PATCH | `/api/cart/items/:id` | JSON `{quantity:3}`; substitui a quantidade, retorna 404 se item ausente |
| DELETE | `/api/cart/items/:id` | Remove item; operação repetida mantém carrinho sem o item |
| DELETE | `/api/cart` | Esvazia o carrinho |

Categorias: `Todos`, `Smartphones`, `Laptops`, `Acessórios`. Ordenação: `featured`, `price`, `price-desc`. Busca de até 120 caracteres, sem distinguir maiúsculas/minúsculas e acentos. Ausência de resultados retorna 200 e lista vazia.

Carrinho retorna `{items,itemCount,subtotalCents,currency}`. Cada item inclui `productId`, `quantity`, `product` e `lineTotalCents`. Valores de linha e subtotal são inteiros em centavos; o preço do produto no DTO mantém reais para compatibilidade com a interface. O cliente não determina preços: enviar `price` não altera o subtotal. Quantidades devem ser inteiros de 1 a 99; a interface remove o item ao reduzir para zero. O limite 99 é uma decisão deste incremento, não um limite de estoque especificado no backlog.

Exemplo com cookie jar:

```sh
curl -c /tmp/ve-cookies http://127.0.0.1:5173/api/cart
curl -b /tmp/ve-cookies -c /tmp/ve-cookies \
  -H 'Content-Type: application/json' \
  -d '{"productId":1,"quantity":2}' \
  http://127.0.0.1:5173/api/cart/items
curl -b /tmp/ve-cookies http://127.0.0.1:5173/api/cart
```

O cookie `ve_cart` contém token aleatório de 256 bits, é `HttpOnly`, `SameSite=Lax`, expira em 30 dias e recebe `Secure` quando o URL da requisição é HTTPS. O banco guarda apenas o hash do token. Sem cookie válido, é criado outro carrinho. Visitantes de navegadores diferentes não compartilham dados. A conta demonstrativa não modifica o cookie, preservando o carrinho ao entrar/sair, mas ainda não existe sincronização por usuário entre dispositivos.

Requisições de alteração com `Origin` externo ou `Sec-Fetch-Site: cross-site` são recusadas. POST e PATCH exigem JSON; limite de corpo de 4 KiB. SQL usa parâmetros e restrições de integridade. O servidor serve apenas a página e arquivos JS/CSS de `src`, sem expor banco, código de backend ou documentos.

## Integração da interface

Inicialização carrega produtos e carrinho do servidor. Busca, filtros e ordenação chamam a API, com proteção contra respostas fora de ordem. Quantidades são confirmadas pelo backend antes de atualizar a interface. Botões são bloqueados durante alterações, com feedback de sucesso/erro. Falhas de conexão oferecem nova tentativa. O carrinho antigo do localStorage não é importado automaticamente: o backend passa a ser a fonte do carrinho.

Os dados demonstrativos de contas/pedidos permanecem locais. Finalizar um pedido de teste esvazia o carrinho pela API antes de registrar o pedido local; não há transação entre esses dois armazenamentos. Descontos, frete e total de checkout ainda são demonstrações locais: não representam uma cotação ou pedido autorizado pelo servidor.

## Validação

`npm test`: 10 testes aprovados, sendo 6 do backend e 4 das regras existentes. `npm run check`: todos os arquivos JavaScript passam na verificação de sintaxe. Os testes de API usam `Request`/`Response` reais sobre o handler, sem abrir portas; testam catálogo, busca, categorias, ordenação, carrinho, subtotal confiável, sessões, validações, origem, JSON e persistência SQLite após reabertura.

A validação visual e a validação HTTP por conexão externa ao processo continuam dependentes de um ambiente com navegador e conexões locais permitidas. Os testes não substituem carga/performance (HT-01) nem homologação de produção.

## Incremento PIX sandbox

O PIX possui criação e consulta via API Order, persistência de pedidos e QR Code retornado pelo PagBank. Veja [PIX sandbox](pix-sandbox.md) para configuração, endpoints, decisões e limites. Isso substitui o PIX ilustrativo para novos pedidos; cartões e boleto continuam demonstrativos. Desconto/prazo PIX pertencem agora ao servidor. São 15 testes automatizados (incluindo 5 novos testes de PIX/gateway).
