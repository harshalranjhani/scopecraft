import { createServer } from 'node:http';

createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ app: 'ScopeCraft', status: 'foundation' }));
}).listen(3001, '127.0.0.1', () => console.log('ScopeCraft API: http://127.0.0.1:3001'));
