import { toPixResponse } from '../mappers/pix.mapper.js';
export function createPixController(service) {
  return {
    config: (context) => context.json(service.config()),
    list: (context) => context.json(service.list(context.session).map(toPixResponse)),
    get: async (context) =>
      context.json(toPixResponse(await service.get(context.session, context.params.id))),
    create: async (context) =>
      context.json(toPixResponse(await service.create(context.session, await context.body())), 201),
    image: async (context) =>
      context.binary(await service.image(context.session, context.params.id), 'image/png'),
  };
}
