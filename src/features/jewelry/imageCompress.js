// Shrinks a photo in the browser before upload, so a 5 MB phone picture becomes a ~150 KB web image.
// Result: longest side <= MAX_EDGE, WebP (JPEG on browsers that cannot encode WebP), always under maxBytes.
// Animated GIFs are left alone (re-drawing would flatten them to one frame).

export const MAX_EDGE = 1200;
export const MAX_SOURCE_BYTES = 30 * 1024 * 1024; // refuse absurdly large originals before decoding

const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));

async function encode(bitmap, edge, maxBytes) {
  const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  for (const quality of [0.82, 0.7, 0.55]) {
    let blob = await toBlob(canvas, 'image/webp', quality);
    if (!blob || blob.type !== 'image/webp') {
      // no WebP encoder (older Safari): JPEG has no transparency, so paint a white background first
      const flat = document.createElement('canvas');
      flat.width = canvas.width;
      flat.height = canvas.height;
      const flatCtx = flat.getContext('2d');
      flatCtx.fillStyle = '#ffffff';
      flatCtx.fillRect(0, 0, flat.width, flat.height);
      flatCtx.drawImage(canvas, 0, 0);
      blob = await toBlob(flat, 'image/jpeg', quality);
    }
    if (blob && blob.size <= maxBytes) return blob;
  }
  return null;
}

// Returns a File ready to upload. Throws an Error with a message that is safe to show.
export async function prepareJewelryImage(file, { maxBytes = 2 * 1024 * 1024 } = {}) {
  if (file.type === 'image/gif') {
    if (file.size > maxBytes) throw new Error('That GIF is over 2 MB. Please use a JPG or PNG photo instead.');
    return file;
  }
  if (file.size > MAX_SOURCE_BYTES) throw new Error('That photo is too large to process. Please choose a smaller one.');

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('That image could not be read. Try a different photo.');
  }
  try {
    for (const edge of [MAX_EDGE, 900, 640]) {
      const blob = await encode(bitmap, edge, maxBytes);
      if (blob) {
        const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
        return new File([blob], `jewelry.${ext}`, { type: blob.type });
      }
    }
    throw new Error('Could not shrink that photo enough. Try a simpler picture.');
  } finally {
    bitmap.close?.();
  }
}
