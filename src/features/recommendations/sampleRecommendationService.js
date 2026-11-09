import { piercingSamples, placementAffinity } from "../../data/piercingSamples";
import { embedTexts } from "./embeddingService";
import { cosineSimilarity } from "./similarity";
import { tokenize } from "./ranking";

function buildSampleQuery({ placementName, style, material, color, freeText } = {}) {
  return [
    placementName && `${placementName} piercing placement`,
    style && `${style} style`,
    material && `${material} jewelry`,
    color && `${color} color`,
    freeText?.trim(),
  ]
    .filter(Boolean)
    .join(". ");
}

function explain(sample, placementName, affinity, score, mode) {
  const reasons = [];
  if (affinity === 1) reasons.push(`A real ${placementName} placement sample`);
  else if (affinity > 0) reasons.push(`A related placement reference for ${placementName}`);
  else reasons.push("A style reference from the piercer's portfolio");

  if (mode === "ai" && score >= 0.38) reasons.push("Its visual description matches what you asked for");
  if (mode === "fallback") reasons.push("Matched using placement and shared keywords");
  return reasons;
}

function finish(scored, placementName, mode, topK) {
  // Lead with different piercing styles so a placement with several photos
  // (for example Helix) does not crowd every result slot with the same look.
  const diverse = [];
  const seenStyles = new Set();
  for (const entry of scored) {
    if (seenStyles.has(entry.sample.title)) continue;
    diverse.push(entry);
    seenStyles.add(entry.sample.title);
    if (diverse.length === topK) break;
  }
  if (diverse.length < topK) {
    for (const entry of scored) {
      if (diverse.includes(entry)) continue;
      diverse.push(entry);
      if (diverse.length === topK) break;
    }
  }

  return {
    mode,
    results: diverse.map(({ sample, score, affinity }) => ({
      sample,
      score,
      affinity,
      reasons: explain(sample, placementName, affinity, score, mode),
    })),
  };
}

export async function recommendPiercingSamples({
  placementName,
  style,
  material,
  color,
  freeText,
  topK = 6,
  onProgress,
} = {}) {
  const queryText = buildSampleQuery({ placementName, style, material, color, freeText });
  const candidates = piercingSamples.map((sample) => ({
    sample,
    affinity: placementAffinity(sample, placementName),
  }));

  try {
    const vectors = await embedTexts(
      [queryText || "piercing style inspiration", ...candidates.map(({ sample }) => sample.searchText)],
      onProgress,
    );
    const queryVector = vectors[0];
    const scored = candidates.map(({ sample, affinity }, index) => {
      const semantic = cosineSimilarity(queryVector, vectors[index + 1]);
      return { sample, affinity, score: semantic * 0.72 + affinity * 0.28 };
    });
    scored.sort((a, b) => b.score - a.score);
    return finish(scored, placementName, "ai", topK);
  } catch (error) {
    console.warn("Sample inspiration model unavailable, using local matching:", error);
    const tokens = tokenize(queryText);
    const scored = candidates.map(({ sample, affinity }) => {
      const haystack = sample.searchText.toLowerCase();
      const keywordScore = tokens.length
        ? tokens.filter((token) => haystack.includes(token)).length / tokens.length
        : 0;
      return { sample, affinity, score: keywordScore * 0.6 + affinity * 0.4 };
    });
    scored.sort((a, b) => b.score - a.score);
    return finish(scored, placementName, "fallback", topK);
  }
}

