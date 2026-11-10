const sampleModules = import.meta.glob("../assets/images/*.webp", {
  eager: true,
  import: "default",
});

const SAMPLE_META = {
  conch: {
    title: "Conch",
    description: "A centered inner-ear cartilage placement with room for a clean stud or a statement hoop after healing.",
    keywords: ["conch", "inner ear", "cartilage", "stud", "hoop", "minimal", "statement"],
    exact: ["conch"],
    related: ["flat", "helix", "rook", "daith"],
  },
  eyebrow: {
    title: "Eyebrow",
    description: "A facial placement that can read subtle with a curved barbell or bolder with decorative ends.",
    keywords: ["eyebrow", "facial", "curved barbell", "edgy", "minimal", "silver", "gold"],
    exact: ["eyebrow"],
    related: ["vertical labret", "labret"],
  },
  flat: {
    title: "Flat",
    description: "An upper cartilage placement suited to small decorative tops and delicate clustered details.",
    keywords: ["flat", "upper ear", "cartilage", "cluster", "delicate", "stud", "sparkle"],
    exact: ["flat"],
    related: ["helix", "vertical helix", "industrial", "conch"],
  },
  helix: {
    title: "Helix",
    description: "An outer-ear cartilage placement that works with neat studs and slim hoops after healing.",
    keywords: ["helix", "outer ear", "cartilage", "hoop", "stud", "simple", "stacked"],
    exact: ["helix"],
    related: ["vertical helix", "industrial", "flat", "conch", "tragus"],
  },
  lobes: {
    title: "Lobes",
    description: "A classic soft-tissue placement for simple studs, small hoops, and balanced layered looks.",
    keywords: ["lobe", "lobes", "classic", "stud", "hoop", "simple", "balanced", "everyday"],
    exact: ["lobe", "lobes"],
    related: ["upper lobe", "stacked lobe"],
  },
  rook: {
    title: "Rook",
    description: "A compact inner-cartilage placement usually styled with a curved barbell or small ring after healing.",
    keywords: ["rook", "inner ear", "cartilage", "curved barbell", "ring", "compact", "edgy"],
    exact: ["rook"],
    related: ["daith", "conch", "helix"],
  },
  "snake bites": {
    title: "Snake Bites",
    description: "A symmetrical pair of lower-lip placements that can be styled with matching studs or rings after healing.",
    keywords: ["snake bites", "lip", "oral", "pair", "symmetrical", "stud", "ring", "bold"],
    exact: ["snake bites"],
    related: ["spider bites", "dolphin bites", "labret", "vertical labret"],
  },
  "upper lobes": {
    title: "Upper Lobes",
    description: "A higher lobe placement for small studs and layered ear styling without moving into cartilage.",
    keywords: ["upper lobe", "upper lobes", "layered", "stud", "small", "simple", "stacked"],
    exact: ["upper lobe", "upper lobes"],
    related: ["lobe", "lobes", "stacked lobe"],
  },
  "vertical helix": {
    title: "Vertical Helix",
    description: "A vertical upper-ear cartilage placement that creates a pointed or gem-tipped silhouette.",
    keywords: ["vertical helix", "upper ear", "cartilage", "spike", "gem", "bold", "industrial"],
    exact: ["vertical helix"],
    related: ["helix", "industrial", "flat"],
  },
};

// "upperlobes.webp" (no space) is the same placement as "upper lobes"
SAMPLE_META.upperlobes = SAMPLE_META["upper lobes"];

function normalize(value = "") {
  return value
    .toLowerCase()
    .replace(/\.(png|webp)$/i, "")
    .replace(/\s*\(\d+\)$/i, "")
    .trim()
    .replace(/\s+/g, " ");
}

function getMeta(path) {
  const filename = path.split("/").pop();
  return SAMPLE_META[normalize(filename)];
}

export const piercingSamples = Object.entries(sampleModules)
  .map(([path, image], index) => {
    const meta = getMeta(path);
    if (!meta) return null;
    return {
      id: `sample-${index}-${normalize(path.split("/").pop()).replace(/\s+/g, "-")}`,
      image,
      sourcePath: path,
      ...meta,
      searchText: [meta.title, meta.description, ...meta.keywords].join(". "),
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.title.localeCompare(b.title));

export function placementAffinity(sample, placementName = "") {
  const placement = normalize(placementName);
  if (!placement) return 0;
  if (sample.exact.includes(placement)) return 1;
  if (sample.related.includes(placement)) return 0.52;
  return 0;
}

