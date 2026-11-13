# PIX — PagBank sandbox

## Configurar e executar

1. Abra o arquivo `.env` na raiz. Ele foi criado com token vazio e está ignorado pelo Git.
2. Preencha `PAGBANK_TOKEN` com o token **sandbox** já existente. Não gere outro token na conta compartilhada. Não compartilhe esse arquivo.
3. Opcionalmente, configure `PAGBANK_PIX_DISCOUNT` (0–100; padrão 5) e `PAGBANK_PIX_MINUTES` (1–1440; padrão 15).
4. Reinicie com `npm run dev` e abra http://127.0.0.1:5173.
5. Adicione produtos, entre com uma conta demonstrativa, preencha CPF/endereço de teste, selecione PIX e confirme. O backend usa nome/e-mail da conta demonstrativa e o CPF fornecido como dados do comprador.

O e-mail da conta proprietária do token **não é necessário** para autenticar a API Order: usamos `Authorization: Bearer TOKEN`. O e-mail enviado no pedido é o do comprador de teste.

A URL do provedor é fixa: `https://sandbox.api.pagseguro.com`. Não existe opção de produção neste incremento. Sem token, gerar PIX retorna 503 e mantém o carrinho.

## Funcionalidade

- `GET /api/pix/config`: disponibilidade e parâmetros públicos, sem expor token.
- `POST /api/pix`: `{key: UUID, customer:{name,email,cpf}}`. Cria PIX do carrinho atual. Desconto, subtotal e valor em centavos calculados no servidor; qualquer total fornecido pelo cliente é ignorado.
- `GET /api/pix`: pedidos do visitante atual, incluindo solicitações com resultado indeterminado.
- `GET /api/pix/:id`: consulta o pedido correspondente na API PagBank e salva o status no SQLite.
- `GET /api/pix/:id/qr`: imagem PNG do QR Code, obtida no backend com o token, somente do host sandbox autorizado.

A tela mostra QR Code e copia e cola retornados pelo PagBank. Consulta automática a cada 15 segundos enquanto a página está visível, além de botão manual. Confirmação exige resposta `PAID`, modalidade PIX e valor correspondente. O código e a expiração são retornados pelo provedor. Após expiração, a consulta continua disponível para verificar eventual liquidação.

Não são configurados webhooks ou alteradas preferências da conta. O status é obtido por consulta ao pedido, sem depender de uma URL pública. Referências começam com `vendeletro-` e usam UUID, com chave de idempotência por criação. Repetir uma chave com pedido já criado devolve o mesmo pedido.

A intenção é salva antes da chamada externa. Em timeout, queda de conexão ou resposta inconsistente, a intenção fica como `creating`: a aplicação bloqueia nova criação nessa sessão para evitar duplicidade. Confira a referência no portal PagBank; a reconciliação de intenções sem ID remoto é manual neste incremento. Não apague dados nem use outra sessão para contornar a verificação sem conferir o portal.

## Testar

```sh
npm test
npm run test:pix
npm run check
```

Os testes usam respostas controladas do provedor: valor confiável, código, status pendente/pago, idempotência local, isolamento entre sessões, CPF inválido, token ausente, falhas, URL sandbox e proteção do token. Nenhuma credencial real ou chamada ao PagBank é necessária para rodá-los.

Para homologar de ponta a ponta, configure o token localmente, gere um pedido, aguarde a liquidação automática conforme a faixa de valor do simulador e consulte novamente na aplicação. Recarregue a página para verificar persistência. Teste também expiração com prazo de 1 minuto e token inválido. Não faça transferência com dinheiro real para um código sandbox.

## Limites deste incremento

- Credencial real não foi fornecida: criação/liquidação reais no sandbox e validação visual no navegador permanecem pendentes. Testes automatizados não comprovam a aceitação do token ou habilitação PIX da conta.
- Autenticação continua demonstrativa. O backend autoriza pedidos pelo cookie de visitante, sem confiar em papéis de cliente/admin do navegador. Não serve como autenticação de produção ou sincronização entre dispositivos.
- Não há estoque real, antifraude, NF-e nem webhook. A confirmação tem a latência da consulta, não é um canal de tempo real.
- Ao expirar, o usuário volta ao catálogo para uma nova compra com preços atuais. Não há renovação automática do pedido antigo. Não há liberação de estoque porque não há reserva implementada.
- Boleto e cartões continuam simulados. Pedidos PIX novos não exibem botão local para simular aprovação; a aprovação vem da API.
- Desconto e prazo PIX agora pertencem ao servidor (.env); o painel demonstra apenas sua leitura. Frete ainda é demonstrativo gratuito.

## Referências oficiais consultadas

- [Criar pedido](https://developer.pagbank.com.br/reference/criar-pedido)
- [Objeto Order e QR Codes](https://developer.pagbank.com.br/reference/objeto-order)
- [Consultar pedido](https://developer.pagbank.com.br/reference/consultar-pedido)

## Correções de itens e imagem

A criação agora envia `items` ao PagBank, com referência do produto, nome, quantidade e `unit_amount` em centavos. Os valores enviados são líquidos do desconto PIX; quando necessário, uma linha é dividida em duas para distribuir centavos, preservando quantidade e total exatos. A soma dos itens coincide com o valor do QR Code. O resumo local conserva subtotal bruto e desconto separados.

O adaptador HTTP preserva respostas binárias com `arrayBuffer`, evitando corrupção do PNG do QR Code. Foram adicionados testes de payload, arredondamento e preservação dos bytes da imagem (19 testes no total).

É necessário reiniciar o servidor para aplicar as correções. Pedidos antigos já enviados sem itens continuam assim no PagBank; a consulta não os modifica. Para verificar os itens no portal, crie um novo pedido sandbox. A correção da imagem também atende pedidos existentes que ainda disponibilizem o PNG no provedor.

A conferência externa feita durante esta correção foi impedida por falha de resolução de rede (`ENOTFOUND`). A validação automatizada cobre os defeitos identificados, mas a nova exibição no portal precisa ser conferida após gerar o próximo pedido.


## Preços para testar aprovação

O catálogo agora usa preços fictícios de R$ 8 a R$ 30. Uma unidade de cada produto soma R$ 95 (R$ 90,25 com desconto padrão). A migração atualiza preços originais no SQLite e preserva snapshots de pedidos anteriores. Quantidades maiores alteram o cenário de teste: consulte as [faixas oficiais do simulador](https://developer.pagbank.com.br/docs/simulador). Os testes agora incluem migração, total do catálogo e recusa sem QR Code: 22 aprovados.
