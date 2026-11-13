import { ApiError } from '../errors/api-error.js';
import { createContext } from './context.js';
import { validateOrigin } from '../middleware/origin.js';
import { attachSession } from '../middleware/session.js';
import { errorResponse } from '../middleware/error-handler.js';

// HTTP pipeline only: services and repositories are wired in backend/app.js.
export function createHttpHandler(routes, sessionService) {
  return async function handle(request) {
    const context = createContext(request);
    try {
      validateOrigin(request, context.url);
      const matches = routes.filter((route) => route.path.test(context.url.pathname));
      if (!matches.length) throw new ApiError(404, 'Rota não encontrada.');
      const route = matches.find((route) => route.method === request.method);
      if (!route) throw new ApiError(405, 'Método não permitido.');
      context.params = route.path.exec(context.url.pathname).groups || {};
      if (route.session) attachSession(context, sessionService);
      return await route.handler(context);
    } catch (error) {
      return errorResponse(error, context);
    }
  };
}
