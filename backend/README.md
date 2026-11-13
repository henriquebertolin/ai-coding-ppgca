# Organização do backend

O backend usa factories com injeção explícita de dependências e mantém os endpoints existentes. O frontend não foi alterado nesta reorganização.

```text
Requisição HTTP
  → middleware (origem e sessão)
  → routes (seleção do endpoint)
  → controller (leitura da entrada e montagem da resposta)
  → service (regras de negócio)
  → repository (SQLite) ou integration (PagBank)
```

## Responsabilidades

| Pasta / arquivo | Responsabilidade                                                                          |
| --------------- | ----------------------------------------------------------------------------------------- |
| `app.js`        | Cria e conecta services, repositories, controllers e rotas. É a raiz de composição.       |
| `routes/`       | Declara métodos, caminhos, controller e necessidade de sessão para cada endpoint.         |
| `controllers/`  | Lê parâmetros e JSON; chama o service e devolve JSON ou imagem. Não contém SQL.           |
| `services/`     | Regras de catálogo, carrinho, sessão e PIX. Não conhece `Request`/`Response`.             |
| `repositories/` | Consultas e alterações persistentes, separadas em produto, sessão, carrinho e pedido PIX. |
| `database/`     | Abre o SQLite, cria tabelas, aplica migrações e cadastra os produtos iniciais.            |
| `integrations/` | Comunicação autenticada com a API externa do PagBank sandbox.                             |
| `middleware/`   | Valida a origem, resolve cookies de sessão e padroniza erros.                             |
| `http/`         | Contexto da requisição, leitura de JSON e execução da rota.                               |
| `mappers/`      | Converte itens para o formato PagBank e remove campos internos das respostas PIX.         |
| `validators/`   | Validação de CPF do comprador no servidor, sem importar código do frontend.               |
| `errors/`       | Tipo de erro compartilhado entre as camadas.                                              |

## Exemplos de fluxo

`POST /api/cart/items`:

1. O middleware identifica a sessão pelo cookie.
2. O controller lê `productId` e `quantity` do JSON.
3. O service valida produto e quantidade e recalcula o carrinho.
4. Os repositories de produtos e carrinho acessam o SQLite.
5. O controller devolve o DTO do carrinho com status 201.

`POST /api/pix`:

1. O controller lê a chave do pedido e os dados do comprador.
2. O service verifica os dados, a idempotência, o carrinho e o total.
3. O mapper converte os itens para o contrato PagBank.
4. O repository salva a intenção e a integração cria a cobrança no sandbox.
5. O service confere a resposta e persiste o resultado.
6. O controller usa o mapper para devolver a resposta pública sem o payload interno.

## Dependências e testes

Repositories recebem uma conexão SQLite. Services recebem os repositories necessários; controllers recebem services. O cliente PagBank pode ser substituído por um objeto controlado nos testes através de `createApi(repositories, { gateway })`.

`repositories/index.js` reúne os repositories em uma única conexão, fechada por `close()`. O caminho do banco, as tabelas, os dados e o arquivo `.env` foram preservados. Não é necessário migrar manualmente o banco por causa desta separação de arquivos.

Na raiz do projeto:

```sh
npm run dev
npm test
npm run check
```

O servidor continua entregando frontend e API na porta 5173. Após a reorganização, reinicie o processo Node para carregar os novos imports. Os testes usam banco temporário ou em memória e não criam cobranças reais no PagBank.
