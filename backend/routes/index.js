import { catalogRoutes } from './catalog.routes.js';
import { cartRoutes } from './cart.routes.js';
import { pixRoutes } from './pix.routes.js';
export function createRoutes(controllers) {
  return [
    ...catalogRoutes(controllers.catalog),
    ...cartRoutes(controllers.cart),
    ...pixRoutes(controllers.pix),
  ];
}
