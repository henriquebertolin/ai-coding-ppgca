import { createComponents } from './views/components.js';
import { createCatalogViews } from './views/catalog.js';
import { createCheckoutViews } from './views/checkout.js';
import { createAccountViews } from './views/account.js';
import { createOrderViews } from './views/orders.js';
export { orderStatus as status } from './domain.js';

// Compose screen renderers from a state snapshot and shared components.
export function createViews(context) {
  const components = createComponents(context);
  const options = { ...context, ...components };
  return {
    ...components,
    ...createCatalogViews(options),
    ...createCheckoutViews(options),
    ...createAccountViews(options),
    ...createOrderViews(options),
  };
}
