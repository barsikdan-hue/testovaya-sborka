import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
async function read(path){return readFile(new URL(`../${path}`, import.meta.url),'utf8');}
test('HTML exposes exactly invitation and success screens',async()=>{const html=await read('public/index.html');assert.match(html,/name="robots" content="noindex,nofollow"/);assert.match(html,/data-screen="invitation"/);assert.match(html,/data-screen="success"/);assert.doesNotMatch(html,/sealed|letter|choice|date_picker|custom-date|quick-dates/);assert.match(html,/id="yes-button"/);assert.match(html,/id="later-button"/);assert.match(html,/id="send-response"/);});
test('HTML uses only the two local reference assets',async()=>{const html=await read('public/index.html');assert.match(html,/assets\/hero-sunset\.webp/);assert.match(html,/assets\/success-envelope\.webp/);assert.doesNotMatch(html,/https?:\/\//);});
test('CSS pins mobile geometry and reduced motion',async()=>{const css=await read('public/styles.css');assert.match(css,/--accent:\s*#F36F68/i);assert.match(css,/max-width:\s*430px/);assert.match(css,/height:\s*72px/);assert.match(css,/@media\s*\(prefers-reduced-motion:\s*reduce\)/);assert.doesNotMatch(css,/overflow-x:\s*scroll/);});
test('later response opens Telegram directly with no tracking',async()=>{const app=await read('public/js/app.js');assert.doesNotMatch(app,/fetch\s*\(/);assert.doesNotMatch(app,/localStorage|sessionStorage|document\.cookie/);assert.match(app,/createResponseText\('later'\)/);assert.match(app,/deliverResponse\(laterText\)/);});
