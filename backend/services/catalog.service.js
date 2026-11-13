import { ApiError } from '../errors/api-error.js';
const normalize = (s) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export function createCatalogService(productRepository) {
  const product = (id) => {
    if (!Number.isSafeInteger(id) || id < 1) throw new ApiError(400, 'Produto inválido.');
    const p = productRepository.findAll().find((p) => p.id === id);
    if (!p) throw new ApiError(404, 'Produto não encontrado.');
    return p;
  };
  return {
    findById: product,
    search: ({ q = '', category = 'Todos', sort = 'featured' } = {}) => {
      if (q.length > 120) throw new ApiError(400, 'A busca deve ter no máximo 120 caracteres.');
      if (!['Todos', 'Smartphones', 'Laptops', 'Acessórios'].includes(category))
        throw new ApiError(400, 'Categoria inválida.');
      if (!['featured', 'price', 'price-desc'].includes(sort))
        throw new ApiError(400, 'Ordenação inválida.');
      const items = productRepository
        .findAll()
        .filter(
          (p) =>
            (category === 'Todos' || p.category === category) &&
            normalize(`${p.name} ${p.spec}`).includes(normalize(q.trim())),
        );
      if (sort !== 'featured')
        items.sort((a, b) => (sort === 'price' ? a.price - b.price : b.price - a.price));
      return { items, total: items.length };
    },
  };
}
