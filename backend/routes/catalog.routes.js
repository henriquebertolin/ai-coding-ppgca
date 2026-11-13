export const catalogRoutes = (controller) => [
  { method: 'GET', path: /^\/api\/products$/, handler: controller.list },
  { method: 'GET', path: /^\/api\/products\/(?<id>\d+)$/, handler: controller.get },
];
