import { loadEnvFile } from 'node:process';
try {
  loadEnvFile('.env');
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
}
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRepository } from './backend/repositories/index.js';
import { createApi } from './backend/app.js';
export async function sendResponse(res, response) {
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}
export function createApp({ database = 'data/vendeletro.sqlite' } = {}) {
  const root = path.dirname(fileURLToPath(import.meta.url));
  const repo = createRepository(database),
    api = createApi(repo, {
      pixConfig: {
        discount: Number(process.env.PAGBANK_PIX_DISCOUNT || 5),
        minutes: Number(process.env.PAGBANK_PIX_MINUTES || 15),
      },
    });
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://' + req.headers.host);
      if (url.pathname.startsWith('/api/')) {
        let size = 0;
        const chunks = [];
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 4096) {
            res
              .writeHead(413, { 'Content-Type': 'application/json' })
              .end(JSON.stringify({ error: 'Corpo da requisição muito grande.' }));
            return;
          }
          chunks.push(chunk);
        }
        const request = new Request(url, {
          method: req.method,
          headers: req.headers,
          ...(!['GET', 'HEAD'].includes(req.method) ? { body: Buffer.concat(chunks) } : {}),
        });
        const response = await api(request);
        await sendResponse(res, response);
        return;
      }
      if (!['GET', 'HEAD'].includes(req.method)) {
        res.writeHead(405).end();
        return;
      }
      const pathname = decodeURIComponent(url.pathname);
      if (
        pathname !== '/' &&
        pathname !== '/index.html' &&
        !/^\/src\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(js|css)$/.test(pathname)
      ) {
        res.writeHead(404).end('Não encontrado');
        return;
      }
      const file = path.join(root, pathname === '/' ? 'index.html' : pathname.slice(1));
      const data = await fs.readFile(file);
      res.writeHead(200, {
        'Content-Type': {
          html: 'text/html; charset=utf-8',
          js: 'text/javascript; charset=utf-8',
          css: 'text/css; charset=utf-8',
        }[file.split('.').pop()],
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch (error) {
      res
        .writeHead(error instanceof URIError ? 400 : 500)
        .end('Não foi possível atender a requisição.');
    }
  });
  server.on('close', () => repo.close());
  return server;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  createApp().listen(Number(process.env.PORT || 5173), '127.0.0.1', () =>
    console.log(`VendEletro: http://127.0.0.1:${process.env.PORT || 5173}`),
  );
