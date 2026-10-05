const ASSET_PARTS = {
  invitation: [
    './assets/invitation-reference.part1.b64',
    './assets/invitation-reference.part2.b64',
    './assets/invitation-reference.part3.b64'
  ],
  success: [
    './assets/success-reference.part1.b64',
    './assets/success-reference.part2.b64',
    './assets/success-reference.part3.b64'
  ]
};

async function readBase64Parts(paths) {
  const chunks = await Promise.all(paths.map(async (path) => {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Reference asset chunk failed: ${path}`);
    return (await response.text()).trim();
  }));
  return chunks.join('');
}

async function hydrateImage(image, parts) {
  const base64 = await readBase64Parts(parts);
  image.src = `data:image/webp;base64,${base64}`;
  await image.decode();
}

export async function hydrateReferenceImages() {
  const invitationImage = document.querySelector('#invitation-reference');
  const successImage = document.querySelector('#success-reference');
  if (!invitationImage || !successImage) throw new Error('Reference image nodes missing');

  await Promise.all([
    hydrateImage(invitationImage, ASSET_PARTS.invitation),
    hydrateImage(successImage, ASSET_PARTS.success)
  ]);
}
