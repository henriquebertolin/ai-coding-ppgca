export const pixRoutes = (controller) => [
  { method: 'GET', path: /^\/api\/pix\/config$/, handler: controller.config },
  { method: 'GET', path: /^\/api\/pix$/, handler: controller.list, session: true },
  { method: 'POST', path: /^\/api\/pix$/, handler: controller.create, session: true },
  {
    method: 'GET',
    path: /^\/api\/pix\/(?<id>[a-f0-9-]{36})$/,
    handler: controller.get,
    session: true,
  },
  {
    method: 'GET',
    path: /^\/api\/pix\/(?<id>[a-f0-9-]{36})\/qr$/,
    handler: controller.image,
    session: true,
  },
];
