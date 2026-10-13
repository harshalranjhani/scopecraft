import { spawn } from 'node:child_process';

const children = [spawn('node', ['--import', 'tsx', 'server/index.ts'], { stdio: 'inherit' }), spawn('node', ['node_modules/vite/bin/vite.js'], { stdio: 'inherit' })];
let closing = false;
function stop(code = 0) {
  if (closing) return;
  closing = true;
  children.forEach(child => child.kill('SIGTERM'));
  process.exitCode = code;
}
children.forEach(child => child.on('exit', code => stop(code ?? 1)));
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
