import { ApiError } from '../errors/api-error.js';
export function errorResponse(error, context) {
  if (!(error instanceof ApiError)) console.error('Erro interno da API:', error);
  return context.json(
    { error: error instanceof ApiError ? error.message : 'Não foi possível concluir a operação.' },
    error.status || 500,
  );
}
