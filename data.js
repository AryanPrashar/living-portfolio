const PORTFOLIO_DATA = {
  profile: {
    name: "Your Name",
    roleTag: "Design Engineer · Hardware & Interactive Art",
    email: "hello@example.com",
    linkedin: "https://www.linkedin.com/",
    github: "https://github.com/",
    livingPortfolioRepo: "https://github.com/",
    resumeUrl: "", // Optional: link to PDF resume (if empty, quick-jumps to Experience)
    heroTitle: "The Living Portfolio",
    heroBioConcise:
      "An adaptive, interactive, self-reconfiguring portfolio built as living evidence of design engineering. It learns what you want to explore while keeping navigation calm, transparent, and predictable.",
    heroBioDetailed:
      "Project 0: The Living Portfolio pairs an expressive generative canvas (System A) with an intentional behavioral preference engine (System B). Explore code architecture, hardware builds, or visual art—and watch the interface subtly adapt its visual memory and presentation density without ever hiding core navigation or contact links."
  },

  about: {
    title: "About Me",
    photoUrl: "", // Optional: e.g. "assets/portrait.jpg"
    photoAlt: "Portfolio owner portrait",
    descriptionConcise:
      "I design and engineer systems across software, embedded hardware, and generative art. This portfolio serves as a permanent home for my ongoing build cycles—built to grow cleanly from zero items onward.",
    descriptionDetailed:
      "I design and engineer systems across software, embedded hardware, and generative art. My focus is bridging thoughtful visual craft with dependable technical architecture.\n\nRather than treating a portfolio as a static brochure, this site is engineered as an adaptive design system: customizable via explicit natural-language preferences, responsive across desktop, iPad, and phone, and structured to expand seamlessly as new projects are shipped."
  },

  /**
   * EXPERIENCE (Vertical Carousel)
   * Renders dynamically for any number of entries (0, 1, 2, 3, ...).
   */
  experience: [
    {
      id: "exp-1",
      tabLabel: "Job 1",
      jobTitle: "Design Engineering Intern · Studio / Lab",
      period: "2026 — Present",
      location: "Remote / Hybrid",
      photoUrl: "",
      photoCaption: "Interactive UI Systems & Prototyping",
      descriptionConcise:
        "Built accessible, motion-aware UI prototypes and component token systems bridging visual design and production frontend code.",
      descriptionDetailed:
        "Built accessible, motion-aware UI prototypes and multi-theme design token architectures. Reduced layout shift across desktop, tablet, and mobile breakpoints while implementing keyboard-first navigation and reduced-motion fallbacks.",
      highlights: ["Design Systems", "Vanilla JS / CSS Architecture", "WCAG Accessibility"]
    },
    {
      id: "exp-2",
      tabLabel: "Job 2",
      jobTitle: "Embedded & Hardware Prototyping Assistant",
      period: "2025 — 2026",
      location: "Engineering Lab",
      photoUrl: "",
      photoCaption: "Sensor Arrays & Microcontroller Integration",
      descriptionConcise:
        "Designed custom sensor enclosures, PCB bring-up test harnesses, and real-time serial telemetry dashboards.",
      descriptionDetailed:
        "Designed custom sensor enclosures, executed PCB bring-up validation, and authored lightweight serial telemetry visualizers. Collaborated with mechanical and firmware peers to tighten hardware-in-the-loop debugging turnaround.",
      highlights: ["PCB Bring-Up", "Serial Telemetry", "CAD Prototyping"]
    },
    {
      id: "exp-3",
      tabLabel: "Job 3",
      jobTitle: "Creative Technologist · Independent",
      period: "2024 — 2025",
      location: "Independent",
      photoUrl: "",
      photoCaption: "Procedural Graphics & Interactive Installations",
      descriptionConcise:
        "Created procedural canvas visuals, generative typography studies, and responsive web experiments.",
      descriptionDetailed:
        "Created real-time HTML5 Canvas particle studies, algorithmic grid compositions, and custom interactive tools exploring how user motion shapes digital atmosphere without sacrificing clarity.",
      highlights: ["HTML5 Canvas", "Generative Visuals", "Interaction Design"]
    }
  ],

  software: [],

  hardware: [],

  art: []
};

function addSoftwareProject(item) {
  PORTFOLIO_DATA.software.push({
    id: item.id || `sw-${PORTFOLIO_DATA.software.length + 1}`,
    title: item.title || "Untitled Software Project",
    descriptionConcise: item.descriptionConcise || item.description || "Software project description.",
    descriptionDetailed: item.descriptionDetailed || item.descriptionConcise || item.description || "Detailed software architecture and implementation overview.",
    architectureNotes: item.architectureNotes || "Modular frontend architecture with clean separation of state and rendering.",
    techStack: Array.isArray(item.techStack) ? item.techStack : ["JavaScript", "HTML/CSS"],
    imageUrl: item.imageUrl || "",
    githubUrl: item.githubUrl || PORTFOLIO_DATA.profile.github,
    liveDemoUrl: item.liveDemoUrl || "",
    interactivePreview: Boolean(item.interactivePreview ?? true)
  });
}

function addHardwareProject(item) {
  PORTFOLIO_DATA.hardware.push({
    id: item.id || `hw-${PORTFOLIO_DATA.hardware.length + 1}`,
    title: item.title || "Untitled Hardware Project",
    descriptionConcise: item.descriptionConcise || item.description || "Hardware project description.",
    descriptionDetailed: item.descriptionDetailed || item.descriptionConcise || item.description || "Detailed hardware specifications and repository link.",
    specs: Array.isArray(item.specs) ? item.specs : ["Embedded", "Custom Enclosure"],
    imageUrl: item.imageUrl || "",
    githubUrl: item.githubUrl || PORTFOLIO_DATA.profile.github
  });
}

function addArtwork(item) {
  PORTFOLIO_DATA.art.push({
    id: item.id || `art-${PORTFOLIO_DATA.art.length + 1}`,
    title: item.title || "Untitled Piece",
    medium: item.medium || "Mixed Media",
    year: item.year || String(new Date().getFullYear()),
    aspectRatio: item.aspectRatio || "4 / 5",
    imageUrl: item.imageUrl || "",
    notes: item.notes || ""
  });
}