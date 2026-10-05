import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
async function read(path){return readFile(new URL(`../${path}`, import.meta.url),'utf8');}

test('HTML exposes exactly invitation and success screens',async()=>{
  const html=await read('public/index.html');
  assert.match(html,/name="robots" content="noindex,nofollow"/);
  assert.match(html,/data-screen="invitation"/);
  assert.match(html,/data-screen="success"/);
  assert.doesNotMatch(html,/sealed|letter|choice|date_picker|custom-date|quick-dates/);
  assert.match(html,/id="yes-button"/);
  assert.match(html,/id="later-button"/);
  assert.match(html,/id="send-response"/);
});

test('HTML uses exact local reference WebP slices',async()=>{
  const html=await read('public/index.html');
  const app=await read('public/js/app.js');
  assert.match(html,/src="\.\/assets\/invitation-reference\.webp"/);
  assert.match(html,/src="\.\/assets\/success-reference\.webp"/);
  assert.match(html,/width="430" height="1241"/);
  assert.match(html,/width="430" height="1040"/);
  assert.doesNotMatch(app,/reference-assets/);
  assert.doesNotMatch(html,/https?:\/\//);
});

test('success card overlays approved response text',async()=>{
  const html=await read('public/index.html');
  const css=await read('public/styles.css');
  assert.match(html,/class="success-message-overlay"/);
  assert.match(html,/Да ❤️ Я согласна\. Посмотрим, что ты придумал 😌/);
  assert.match(css,/\.success-message-overlay/);
  assert.match(html,/class="success-subtitle-overlay"[^>]*>Посмотрим, что ты придумал 😌<\/p>/);
});

test('CSS pins reference canvas and reduced motion',async()=>{
  const css=await read('public/styles.css');
  assert.match(css,/max-width:\s*430px/);
  assert.match(css,/\.reference-screen-image/);
  assert.match(css,/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.doesNotMatch(css,/overflow-x:\s*scroll/);
});

test('later response opens Telegram directly with no tracking',async()=>{
  const app=await read('public/js/app.js');
  assert.doesNotMatch(app,/fetch\s*\(/);
  assert.doesNotMatch(app,/localStorage|sessionStorage|document\.cookie/);
  assert.match(app,/createResponseText\('later'\)/);
  assert.match(app,/deliverResponse\(laterText\)/);
});

test('essential content is visible even when CSS animations do not run', async () => {
  const css = await read('public/styles.css');
  assert.match(css, /\.screen\s*\{[^}]*opacity:\s*1;[^}]*transform:\s*none;/s);
  assert.match(css, /@keyframes\s+screenIn\s*\{[\s\S]*from\s*\{[^}]*opacity:\s*0;[^}]*transform:\s*translateY\(16px\)\s*scale\(\.99\);[^}]*\}[\s\S]*to\s*\{[^}]*opacity:\s*1;[^}]*transform:\s*none;[^}]*\}/s);
});
