export function createCatalogController(service) {
  return {
    list: (context) => context.json(service.search(Object.fromEntries(context.url.searchParams))),
    get: (context) => context.json(service.findById(Number(context.params.id))),
  };
}
