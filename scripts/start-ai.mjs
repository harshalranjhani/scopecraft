import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { delimiter, dirname } from 'node:path';

const dir = new URL('../.local/ai/', import.meta.url).pathname;
async function find(path) {
  if (!existsSync(path)) return null;
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (entry.name === 'llama-server') return path + '/' + entry.name;
    if (entry.isDirectory()) { const found = await find(path + '/' + entry.name); if (found) return found; }
  }
  return null;
}
const binary = await find(dir) ?? 'llama-server';
const model = dir + 'Qwen3-0.6B-Q8_0.gguf';
if (!existsSync(model)) { console.error('Run npm run ai:setup before starting the model.'); process.exit(1); }
const child = spawn(binary, ['-m', model, '--host', '127.0.0.1', '--port', '8080', '-c', '8192', '-t', '2', '--parallel', '1', '--alias', 'qwen3-0.6b', '--jinja', '--chat-template-kwargs', '{"enable_thinking":false}'], {
  stdio: 'inherit', env: { ...process.env, LD_LIBRARY_PATH: [dirname(binary), process.env.LD_LIBRARY_PATH].filter(Boolean).join(delimiter) },
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
