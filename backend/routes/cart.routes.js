export const cartRoutes = (controller) => [
  { method: 'GET', path: /^\/api\/cart$/, handler: controller.get, session: true },
  { method: 'DELETE', path: /^\/api\/cart$/, handler: controller.clear, session: true },
  { method: 'POST', path: /^\/api\/cart\/items$/, handler: controller.add, session: true },
  {
    method: 'PATCH',
    path: /^\/api\/cart\/items\/(?<id>\d+)$/,
    handler: controller.update,
    session: true,
  },
  {
    method: 'DELETE',
    path: /^\/api\/cart\/items\/(?<id>\d+)$/,
    handler: controller.remove,
    session: true,
  },
];
