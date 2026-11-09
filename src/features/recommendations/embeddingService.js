// Turns text into 384-number vectors using a small model that runs IN THE BROWSER (free, no server).
// The model (about 25 MB) downloads on first use and is cached by the browser afterwards.
// The library is imported lazily so it never slows down pages that don't need it.

// This repo has onnx/model_quantized.onnx (about 23 MB), which is the file dtype 'q8' loads.
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
const DTYPE = 'q8';
// stored in jewelry_embeddings.model so old vectors are ignored if we ever change the model
export const MODEL_KEY = `${MODEL_ID}:${DTYPE}`;

let embedderPromise = null;

// The AI runtime (WebAssembly) normally downloads from a public CDN, which fails on some networks and is a
// reliability risk for customers. We serve our own copy from /ort/ (copied by scripts/copy-ort.mjs).
// If those files are missing, the library silently keeps its default CDN behaviour.
async function useLocalRuntime(env) {
  const base = new URL(`${import.meta.env.BASE_URL}ort/`, window.location.origin).href;
  const isSafari = /^((?!chrome|chromium|android).)*safari/i.test(navigator.userAgent);
  const name = isSafari ? 'ort-wasm-simd-threaded' : 'ort-wasm-simd-threaded.asyncify';
  const paths = { mjs: `${base}${name}.mjs`, wasm: `${base}${name}.wasm` };
  try {
    const res = await fetch(paths.mjs, { method: 'HEAD' });
    const isHtml = (res.headers.get('content-type') || '').includes('text/html'); // dev-server fallback page
    if (res.ok && !isHtml && env.backends?.onnx?.wasm) env.backends.onnx.wasm.wasmPaths = paths;
    else console.warn('[AI] Local runtime files not found in /ort/. Run `npm run dev` again so they get copied.');
  } catch {
    /* keep the default */
  }
}

// onProgress(percent 0-100) is called while the model downloads (first call only).
export function loadEmbedder(onProgress) {
  if (!embedderPromise) {
    embedderPromise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers');
      await useLocalRuntime(env);
      const perFile = {};
      return pipeline('feature-extraction', MODEL_ID, {
        dtype: DTYPE,
        progress_callback: (p) => {
          if (!onProgress) return;
          if (p.status === 'progress_total') {
            onProgress(Math.round(p.progress ?? 0));
          } else if (p.status === 'progress') {
            perFile[p.file] = p.progress ?? 0;
            const vals = Object.values(perFile);
            onProgress(Math.round(vals.reduce((a, b) => a + b, 0) / vals.length));
          }
        },
      });
    })().catch((err) => {
      embedderPromise = null; // allow a retry later
      throw err;
    });
  }
  return embedderPromise;
}

export async function embedText(text, onProgress) {
  const embedder = await loadEmbedder(onProgress);
  const out = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(out.data, (x) => Math.round(x * 1e5) / 1e5); // shorter to store
}

// Batch embedding is used for the curated sample gallery. Keeping the query and
// samples in one inference call is faster than running the model once per card.
export async function embedTexts(texts, onProgress) {
  const embedder = await loadEmbedder(onProgress);
  const out = await embedder(texts, { pooling: 'mean', normalize: true });
  return out.tolist().map((vector) => vector.map((x) => Math.round(x * 1e5) / 1e5));
}

// The text that represents a jewelry item. Price and stock are left out on purpose,
// so changing them does not force a re-index.
export function buildJewelryText(item) {
  return [
    item.name,
    item.description,
    item.style && `Style: ${item.style}.`,
    item.material && `Material: ${item.material}.`,
    item.color && `Color: ${item.color}.`,
  ]
    .filter(Boolean)
    .map((s) => String(s).trim())
    .join(' ');
}
