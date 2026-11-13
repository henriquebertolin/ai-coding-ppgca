import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function javaScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name);
    return entry.isDirectory() ? javaScriptFiles(file) : /\.(js|mjs)$/.test(file) ? [file] : [];
  });
}

const files = ['server.js', ...['backend', 'src', 'tests', 'scripts'].flatMap(javaScriptFiles)];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Sintaxe verificada em ${files.length} arquivos JavaScript.`);
