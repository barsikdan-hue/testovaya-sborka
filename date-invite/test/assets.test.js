import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const specs = {
  invitation: {
    parts: 3,
    bytes: 21168,
    sha1: 'ab8326b745a43e6d66c761597d44175302c79a4d'
  },
  success: {
    parts: 3,
    bytes: 17378,
    sha1: '05cd06cdb6c2fd34b83e283e6f7f5307501e25a8'
  }
};

for (const [name, spec] of Object.entries(specs)) {
  test(`${name} base64 chunks reconstruct the validated WebP`, async () => {
    const chunks = [];
    for (let i = 1; i <= spec.parts; i += 1) {
      chunks.push(await readFile(new URL(`../public/assets/${name}-reference.part${i}.b64`, import.meta.url), 'utf8'));
    }
    const bytes = Buffer.from(chunks.join('').trim(), 'base64');
    assert.equal(bytes.length, spec.bytes);
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP');
    assert.equal(createHash('sha1').update(bytes).digest('hex'), spec.sha1);
  });
}
