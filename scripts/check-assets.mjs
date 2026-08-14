import { existsSync } from 'node:fs';
const required = ['voters','politicians','city'];
const missing = required.filter(n => !existsSync(`public/sprites/${n}.png`));
if (missing.length) {
  console.error('Missing sprite sheets:', missing.map(n=>`public/sprites/${n}.png`).join(', '));
  process.exit(1);
}
console.log('All sprite sheets present.');
