import { access, readFile } from 'node:fs/promises';

const required = [
  'public/index.html',
  'public/styles.css',
  'public/js/app.js',
  'public/js/config.js',
  'public/js/invite.js',
  'public/js/delivery.js'
];

for (const file of required) await access(file);

const html = await readFile('public/index.html', 'utf8');
const app = await readFile('public/js/app.js', 'utf8');
const config = await readFile('public/js/config.js', 'utf8');

if (!html.includes('noindex,nofollow')) throw new Error('robots protection missing');
if (!html.includes('name="viewport"')) throw new Error('viewport metadata missing');
if (/https?:\/\//.test(html)) throw new Error('external runtime URL found in HTML');
if (/fetch\s*\(|localStorage|sessionStorage|document\.cookie/.test(app)) {
  throw new Error('unexpected persistence or network behavior found');
}
if (!config.includes("senderName: 'Данил'")) throw new Error('sender config missing');

console.log(`static-check: PASS (${required.length} required files)`);
