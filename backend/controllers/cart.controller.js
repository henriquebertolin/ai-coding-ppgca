export function createCartController(service) {
  return {
    get: (context) => context.json(service.get(context.session)),
    clear: (context) => context.json(service.clear(context.session)),
    add: async (context) => {
      const body = await context.body();
      return context.json(service.add(context.session, body.productId, body.quantity ?? 1), 201);
    },
    update: async (context) => {
      const body = await context.body();
      return context.json(
        service.update(context.session, Number(context.params.id), body.quantity),
      );
    },
    remove: (context) => context.json(service.remove(context.session, Number(context.params.id))),
  };
}
