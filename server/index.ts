import { existsSync } from 'node:fs';
import { makeServer } from './app';

if (existsSync('.env')) process.loadEnvFile('.env');
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '127.0.0.1';
const server = makeServer({
  aiBaseUrl: (process.env.AI_BASE_URL ?? 'http://127.0.0.1:8080').replace(/\/$/, ''),
  model: process.env.AI_MODEL ?? 'qwen3-0.6b', token: process.env.APP_TOKEN,
  staticDir: 'dist',
});
server.requestTimeout = 200000;
server.listen(port, host, () => console.log(`ScopeCraft: http://${host}:${port}`));
