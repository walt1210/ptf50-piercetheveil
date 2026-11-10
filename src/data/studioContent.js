export const serviceCategories = [
  {
    id: "ear",
    label: "Ear piercings",
    description: "From simple lobe placements to more complex cartilage work.",
    items: [
      ["Lobe", 100],
      ["Upper lobe", 120],
      ["Stacked lobe", 170],
      ["Conch", 200],
      ["Helix", 170],
      ["Vertical helix", 180],
      ["Flat", 200],
      ["Tragus", 250],
      ["Rook", 300],
      ["Daith", 400],
      ["Industrial", 450],
    ],
  },
  {
    id: "oral",
    label: "Lip & oral",
    description: "Oral and lip placements, from single labrets to paired bites.",
    items: [
      ["Labret", 350],
      ["Vertical labret", 370],
      ["Snake bites", 670],
      ["Spider bites", 670],
      ["Dolphin bites", 670],
      ["Tongue", 500],
    ],
  },
  {
    id: "facial",
    label: "Facial",
    description: "Facial placements assessed according to anatomy and fit.",
    items: [
      ["Septum", 400],
      ["Eyebrow", 350],
    ],
  },
  {
    id: "body",
    label: "Body",
    description: "Body placements with aftercare and healing guidance included.",
    items: [["Navel", 450]],
  },
];

const careGuideEntries = [
  {
    id: "aftercare",
    label: "Aftercare",
    eyebrow: "Daily care",
    title: "Care for the piercing, not the jewelry.",
    intro: "A calm, consistent routine protects the piercing while your body does the healing.",
    groups: [
      {
        title: "Keep it clean",
        items: [
          "Wash your hands thoroughly before touching your piercing.",
          "Clean with packaged sterile saline wound wash 1–2 times daily.",
          "Gently pat dry with clean, disposable gauze or paper towel.",
          "Rinse away soap, shampoo, and skincare product residue.",
        ],
      },
      {
        title: "Protect the healing site",
        items: [
          "Do not twist, play with, or change the jewelry before healing.",
          "Avoid pressure, friction, snagging, and sleeping on the piercing.",
          "Avoid swimming in pools, beaches, and other bodies of water while healing.",
          "Avoid alcohol, hydrogen peroxide, Betadine, DIY salt solutions, and ointments.",
        ],
      },
    ],
    note: "Seek medical care for worsening pain, swelling, redness, or unusual discharge.",
  },
  {
    id: "prepare",
    label: "Before your visit",
    eyebrow: "Appointment prep",
    title: "Arrive rested, fed, and ready.",
    intro: "A little preparation makes the consultation and piercing experience easier.",
    groups: [
      {
        title: "Do",
        items: [
          "Eat a proper meal beforehand to help prevent dizziness.",
          "Get enough sleep, stay hydrated, and wear comfortable clothing.",
          "Arrive with clean skin and no products around the piercing area.",
          "Ask about healing time, aftercare, jewelry, and placement limitations.",
          "Stay open to alternative placements that better suit your anatomy.",
          "Take your time deciding and make sure you are comfortable with your choice.",
        ],
      },
      {
        title: "Don’t",
        items: [
          "Come on an empty stomach or after using alcohol or recreational drugs.",
          "Rush the consultation or procedure.",
          "Hesitate to reschedule if you feel unwell or have not had enough rest.",
          "Assume every anatomy can accommodate the same placement.",
          "Feel pressured by a trend or insist on an unsuitable placement.",
        ],
      },
    ],
    note: "Comfort, proper fit, and safe healing should come before aesthetics.",
  },
  {
    id: "healing",
    label: "Healing times",
    eyebrow: "Healing estimates",
    title: "Healing happens from the outside in.",
    intro: "A piercing may look settled before the inner channel has fully healed. Timelines vary by person and placement.",
    timelines: [
      ["Earlobes", "6–8 weeks or longer"],
      ["Cartilage", "6–12 months or longer"],
      ["Septum", "2–3 months or longer"],
      ["Eyebrow", "2–4 months or longer"],
      ["Lip", "2–4 months or longer"],
      ["Tongue", "4–8 weeks or longer"],
      ["Navel", "6–12 months or longer"],
    ],
    note: "Your piercer can give placement-specific guidance and assess when downsizing is appropriate.",
  },
  {
    id: "reminders",
    label: "Reminders",
    eyebrow: "During healing",
    title: "Small habits make a difference.",
    intro: "Protect the placement from avoidable pressure and check in when something feels wrong.",
    groups: [
      {
        title: "Placement notes",
        items: [
          "Ask your piercer to assess jewelry downsizing, often around 2–8 weeks after piercing.",
          "Surface piercings have a higher migration and rejection risk; avoid pressure and friction.",
          "Maintain oral hygiene and rinse with clean water after meals for oral piercings.",
          "Avoid sleeping directly on a healing cartilage piercing.",
          "Avoid playing with lip jewelry to help protect teeth and gums.",
          "Keep makeup and skincare products away from facial piercings.",
        ],
      },
    ],
    note: "If you are unsure whether a change is normal, contact your piercer before changing the jewelry yourself.",
  },
];

export const careGuides = ["prepare", "aftercare", "healing", "reminders"].map(
  (id) => careGuideEntries.find((guide) => guide.id === id),
);

export const galleryItems = [
  {
    src: "/gallery/sample-ear-piercing-placement-sketch.webp",
    title: "Ear placement study",
    category: "Sketches",
    alt: "Hand-drawn ear piercing placement study",
    featured: true,
  },
  {
    src: "/gallery/price-list-ear-piercings.webp",
    title: "Ear piercing guide",
    category: "Services",
    alt: "piercetheveil.ac ear piercing price guide",
  },
  {
    src: "/gallery/price-list-oral-facial-body.webp",
    title: "Oral, facial & body guide",
    category: "Services",
    alt: "piercetheveil.ac oral, facial, and body piercing price guide",
  },
  {
    src: "/gallery/aftercare.webp",
    title: "Aftercare notes",
    category: "Care",
    alt: "piercetheveil.ac piercing aftercare poster",
  },
  {
    src: "/gallery/healing-process.webp",
    title: "Healing process",
    category: "Care",
    alt: "piercetheveil.ac healing timeline poster",
  },
  {
    src: "/gallery/dos-donts.webp",
    title: "Before your appointment",
    category: "Care",
    alt: "piercetheveil.ac appointment dos and don'ts poster",
  },
  {
    src: "/gallery/reminders.webp",
    title: "Care reminders",
    category: "Care",
    alt: "piercetheveil.ac healing reminders poster",
  },
];
