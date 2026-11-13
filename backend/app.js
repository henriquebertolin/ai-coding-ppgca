import { createPagBank } from './integrations/pagbank.client.js';
import { createCatalogService } from './services/catalog.service.js';
import { createCartService } from './services/cart.service.js';
import { createPixService } from './services/pix.service.js';
import { createSessionService } from './services/session.service.js';
import { createCatalogController } from './controllers/catalog.controller.js';
import { createCartController } from './controllers/cart.controller.js';
import { createPixController } from './controllers/pix.controller.js';
import { createRoutes } from './routes/index.js';
import { createHttpHandler } from './http/api.js';

// Composition root: dependencies flow from persistence/integrations to services,
// controllers and routes. Each factory can receive test doubles independently.
export function createApi(repositories, { gateway = createPagBank(), pixConfig } = {}) {
  const catalogService = createCatalogService(repositories.products);
  const cartService = createCartService(repositories.cart, catalogService);
  const sessionService = createSessionService(repositories.sessions);
  const pixService = createPixService({
    cartRepository: repositories.cart,
    pixRepository: repositories.pix,
    cartService,
    gateway,
    config: pixConfig,
  });
  const controllers = {
    catalog: createCatalogController(catalogService),
    cart: createCartController(cartService),
    pix: createPixController(pixService),
  };
  return createHttpHandler(createRoutes(controllers), sessionService);
}
