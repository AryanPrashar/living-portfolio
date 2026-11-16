/**
 * ============================================================================
 * THE LIVING PORTFOLIO — APPLICATION & ADAPTIVE ENGINE (app.js)
 * Pure Vanilla JS · Zero External Dependencies
 * ============================================================================
 */

(function () {
  "use strict";

  const STORAGE_KEYS = {
    ADAPTIVE: "living_portfolio_adaptive_v1",
    CUSTOM_ITEMS: "living_portfolio_custom_items_v1"
  };

  const ALLOWED_CONFIG = {
    theme: ["neutral", "expressive", "cinematic"],
    layout: ["editorial", "gallery", "technical"],
    density: ["concise", "detailed"],
    motion: ["reduced", "standard", "immersive"],
    emphasis: ["visual", "engineering", "balanced"]
  };

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function getDefaultConfig() {
    return {
      theme: "neutral",
      layout: "editorial",
      density: "concise",
      motion: prefersReducedMotion ? "reduced" : "standard",
      emphasis: "balanced"
    };
  }

  function getDefaultAdaptiveState() {
    return {
      liveMode: true,
      config: getDefaultConfig(),
      signals: {
        visualExplorations: 0,
        engineeringExplorations: 0,
        detailExpansions: 0,
        interactiveTaps: 0
      },
      visualMemory: {
        energy: 0.25,
        bias: 0 // -1 (visual/organic) to +1 (engineering/architectural)
      },
      suggestionDismissed: false,
      lastSuggestionType: null
    };
  }

  // Mutable working state
  let state = loadAdaptiveState();
  let activeExpIndex = 0;
  let activeSoftwareSlide = 0;
  let showAllSoftware = false;
  let expandedArchIds = new Set();
  let studioActiveCategory = "software";
  let pendingSuggestion = null;
  let toastTimeout = null;

  // Working items merged from PORTFOLIO_DATA + optional Studio local overrides
  let runtimeItems = loadRuntimeItems();

  /* --------------------------------------------------------------------------
   * STORAGE HELPERS
   * -------------------------------------------------------------------------- */
  function loadAdaptiveState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ADAPTIVE);
      if (!raw) return getDefaultAdaptiveState();
      const parsed = JSON.parse(raw);
      const def = getDefaultAdaptiveState();
      return {
        liveMode: typeof parsed.liveMode === "boolean" ? parsed.liveMode : def.liveMode,
        config: validateConfig({ ...def.config, ...(parsed.config || {}) }),
        signals: { ...def.signals, ...(parsed.signals || {}) },
        visualMemory: { ...def.visualMemory, ...(parsed.visualMemory || {}) },
        suggestionDismissed: Boolean(parsed.suggestionDismissed),
        lastSuggestionType: parsed.lastSuggestionType || null
      };
    } catch {
      return getDefaultAdaptiveState();
    }
  }

  function saveAdaptiveState() {
    try {
      localStorage.setItem(STORAGE_KEYS.ADAPTIVE, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors gracefully
    }
  }

  function loadRuntimeItems() {
    const base = {
      software: [...(PORTFOLIO_DATA.software || [])],
      hardware: [...(PORTFOLIO_DATA.hardware || [])],
      art: [...(PORTFOLIO_DATA.art || [])]
    };
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_ITEMS);
      if (!raw) return base;
      const parsed = JSON.parse(raw);
      return {
        software: Array.isArray(parsed.software) ? parsed.software : base.software,
        hardware: Array.isArray(parsed.hardware) ? parsed.hardware : base.hardware,
        art: Array.isArray(parsed.art) ? parsed.art : base.art
      };
    } catch {
      return base;
    }
  }

  function saveRuntimeItems() {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_ITEMS, JSON.stringify(runtimeItems));
    } catch {
      showToast("Browser storage full—large images kept in current session only.");
    }
  }

  function validateConfig(cfg) {
    const def = getDefaultConfig();
    return {
      theme: ALLOWED_CONFIG.theme.includes(cfg.theme) ? cfg.theme : def.theme,
      layout: ALLOWED_CONFIG.layout.includes(cfg.layout) ? cfg.layout : def.layout,
      density: ALLOWED_CONFIG.density.includes(cfg.density) ? cfg.density : def.density,
      motion: ALLOWED_CONFIG.motion.includes(cfg.motion) ? cfg.motion : def.motion,
      emphasis: ALLOWED_CONFIG.emphasis.includes(cfg.emphasis) ? cfg.emphasis : def.emphasis
    };
  }

  /* --------------------------------------------------------------------------
   * ESCAPING & SAFE HELPERS
   * -------------------------------------------------------------------------- */
  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function sanitizeUrl(url) {
    const raw = String(url ?? "").trim();
    if (!raw) return "#";
    if (
      raw.startsWith("https://") ||
      raw.startsWith("http://") ||
      raw.startsWith("mailto:") ||
      raw.startsWith("#") ||
      raw.startsWith("data:image/") ||
      raw.startsWith("assets/") ||
      raw.startsWith("./")
    ) {
      return raw;
    }
    return "#";
  }

  function showToast(message) {
    const toast = document.getElementById("status-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.hidden = true;
    }, 4200);
  }

  /* --------------------------------------------------------------------------
   * APPLY ADAPTIVE CONFIGURATION TO DOM
   * -------------------------------------------------------------------------- */
  function applyConfigToDOM() {
    const root = document.documentElement;
    const effective = state.liveMode ? state.config : getDefaultConfig();

    root.setAttribute("data-theme", effective.theme);
    root.setAttribute("data-layout", effective.layout);
    root.setAttribute("data-density", effective.density);
    root.setAttribute("data-motion", effective.motion);
    root.setAttribute("data-emphasis", effective.emphasis);

    // Update header Live Mode switch
    const switchBtn = document.getElementById("live-mode-toggle");
    const switchLabel = document.getElementById("live-mode-state");
    if (switchBtn && switchLabel) {
      switchBtn.setAttribute("aria-checked", String(state.liveMode));
      switchLabel.textContent = state.liveMode ? "ON" : "OFF (Static)";
    }

    // Update telemetry micro-strip & portrait badge
    const tTheme = document.getElementById("telemetry-theme");
    const tLayout = document.getElementById("telemetry-layout");
    const tDensity = document.getElementById("telemetry-density");
    const pBadge = document.getElementById("portrait-mode-badge");
    const densityBtn = document.getElementById("hero-density-toggle");

    if (tTheme) tTheme.textContent = effective.theme;
    if (tLayout) tLayout.textContent = effective.layout;
    if (tDensity) tDensity.textContent = effective.density;
    if (pBadge) {
      const capTheme = effective.theme.charAt(0).toUpperCase() + effective.theme.slice(1);
      pBadge.textContent = state.liveMode ? `Visual Memory · ${capTheme}` : "Static Mode · Neutral";
    }
    if (densityBtn) {
      const isDetailed = effective.density === "detailed";
      densityBtn.textContent = isDetailed ? "Show concise view" : "Show detailed view";
      densityBtn.setAttribute("aria-pressed", String(isDetailed));
    }

    renderHeroAndAbout();
    renderExperience();
    renderSoftware();
    renderHardware();
    renderArt();
  }

  /* --------------------------------------------------------------------------
   * RENDER: HEADER, HERO & ABOUT
   * -------------------------------------------------------------------------- */
  function renderProfileChrome() {
    const p = PORTFOLIO_DATA.profile;
    const nameEl = document.getElementById("header-name-link");
    const emailIcon = document.getElementById("header-email-link");
    const linkedinIcon = document.getElementById("header-linkedin-link");
    const githubIcon = document.getElementById("header-github-link");
    const heroTitle = document.getElementById("hero-title");
    const repoLink = document.getElementById("hero-repo-link");
    const sayHiBtn = document.getElementById("say-hi-btn");
    const resumeBtn = document.getElementById("quick-resume-btn");

    if (nameEl) nameEl.textContent = p.name || "Your Name";
    if (emailIcon) emailIcon.href = `mailto:${p.email}`;
    if (linkedinIcon) linkedinIcon.href = sanitizeUrl(p.linkedin);
    if (githubIcon) githubIcon.href = sanitizeUrl(p.github);
    if (heroTitle) heroTitle.textContent = p.heroTitle || "The Living Portfolio";
    if (repoLink) repoLink.href = sanitizeUrl(p.livingPortfolioRepo || p.github);
    if (sayHiBtn) sayHiBtn.href = `mailto:${p.email}`;
    if (resumeBtn && p.resumeUrl) {
      resumeBtn.href = sanitizeUrl(p.resumeUrl);
      resumeBtn.target = "_blank";
      resumeBtn.rel = "noopener noreferrer";
      resumeBtn.textContent = "Resume (PDF)";
    }
  }

  function renderHeroAndAbout() {
    const effective = state.liveMode ? state.config : getDefaultConfig();
    const isDetailed = effective.density === "detailed";
    const p = PORTFOLIO_DATA.profile;
    const a = PORTFOLIO_DATA.about;

    const heroBio = document.getElementById("hero-bio-text");
    if (heroBio) {
      heroBio.textContent = isDetailed ? p.heroBioDetailed : p.heroBioConcise;
    }

    const aboutTitle = document.getElementById("about-title");
    const aboutDesc = document.getElementById("about-description-text");
    const aboutPhoto = document.getElementById("about-photo-slot");

    if (aboutTitle) aboutTitle.textContent = a.title || "About Me";
    if (aboutDesc) {
      const text = isDetailed ? a.descriptionDetailed : a.descriptionConcise;
      aboutDesc.innerHTML = text
        .split(/\n\s*\n/)
        .map((para) => `<p>${escapeHtml(para)}</p>`)
        .join("");
    }

    if (aboutPhoto) {
      if (a.photoUrl) {
        aboutPhoto.innerHTML = `<img src="${sanitizeUrl(a.photoUrl)}" alt="${escapeHtml(a.photoAlt || "Portrait")}" loading="lazy" />`;
      } else {
        aboutPhoto.innerHTML = `
          <div class="procedural-placeholder">
            <strong>Photo Placeholder</strong>
            <span>Set about.photoUrl in data.js</span>
          </div>
        `;
      }
    }
  }

  /* --------------------------------------------------------------------------
   * RENDER: EXPERIENCE (Vertical Carousel + Dynamic Rail)
   * -------------------------------------------------------------------------- */
  function renderExperience() {
    const jobs = PORTFOLIO_DATA.experience || [];
    const photoEl = document.getElementById("exp-photo-carousel");
    const jobTitleEl = document.getElementById("exp-job-title");
    const jobMetaEl = document.getElementById("exp-job-meta");
    const descEl = document.getElementById("exp-description-text");
    const highlightsEl = document.getElementById("exp-highlights-list");
    const tabsEl = document.getElementById("exp-rail-tabs");

    if (!jobs.length) {
      if (photoEl) {
        photoEl.innerHTML = `<div class="procedural-placeholder"><strong>Experience</strong><span>No experience entries yet</span></div>`;
      }
      if (jobTitleEl) jobTitleEl.textContent = "No experience entries added";
      if (jobMetaEl) jobMetaEl.textContent = "";
      if (descEl) descEl.textContent = "Add entries to PORTFOLIO_DATA.experience in data.js.";
      if (highlightsEl) highlightsEl.innerHTML = "";
      if (tabsEl) tabsEl.innerHTML = "";
      return;
    }

    if (activeExpIndex >= jobs.length) activeExpIndex = 0;
    const job = jobs[activeExpIndex];
    const effective = state.liveMode ? state.config : getDefaultConfig();
    const isDetailed = effective.density === "detailed" || effective.layout === "technical";

    if (photoEl) {
      if (job.photoUrl) {
        photoEl.innerHTML = `
          <div class="exp-photo-slide" key="${escapeHtml(job.id)}">
            <img src="${sanitizeUrl(job.photoUrl)}" alt="${escapeHtml(job.photoCaption || job.jobTitle)}" loading="lazy" />
          </div>
        `;
      } else {
        photoEl.innerHTML = `
          <div class="exp-photo-slide">
            <div class="procedural-placeholder">
              <strong>${escapeHtml(job.tabLabel || `Role ${activeExpIndex + 1}`)}</strong>
              <span>${escapeHtml(job.photoCaption || job.jobTitle)}</span>
            </div>
          </div>
        `;
      }
    }

    if (jobTitleEl) jobTitleEl.textContent = job.jobTitle || "Role";
    if (jobMetaEl) {
      jobMetaEl.textContent = [job.period, job.location].filter(Boolean).join(" · ");
    }
    if (descEl) {
      descEl.textContent = isDetailed ? (job.descriptionDetailed || job.descriptionConcise) : job.descriptionConcise;
    }
    if (highlightsEl) {
      highlightsEl.innerHTML = (job.highlights || [])
        .map((h) => `<li class="tag-chip">${escapeHtml(h)}</li>`)
        .join("");
    }

    if (tabsEl) {
      tabsEl.innerHTML = jobs
        .map((item, idx) => {
          const selected = idx === activeExpIndex;
          return `
            <button
              type="button"
              class="exp-rail-tab"
              role="tab"
              aria-selected="${selected}"
              data-exp-index="${idx}"
            >${escapeHtml(item.tabLabel || `Job ${idx + 1}`)}</button>
          `;
        })
        .join("");
    }

    updateExperienceRailIndicator(jobs.length);
  }

  function updateExperienceRailIndicator(totalCount) {
    const indicatorEl = document.getElementById("exp-rail-indicator");
    if (!indicatorEl || !totalCount) return;

    const pct = 100 / totalCount;
    const offset = activeExpIndex * pct;
    const isPhone = window.innerWidth <= 639;

    if (isPhone) {
      indicatorEl.style.top = "0";
      indicatorEl.style.height = "100%";
      indicatorEl.style.left = `${offset}%`;
      indicatorEl.style.width = `${pct}%`;
    } else {
      indicatorEl.style.left = "0";
      indicatorEl.style.width = "100%";
      indicatorEl.style.top = `${offset}%`;
      indicatorEl.style.height = `${pct}%`;
    }
  }

  /* --------------------------------------------------------------------------
   * RENDER: SOFTWARE (Horizontal Carousel + Dynamic Grid)
   * -------------------------------------------------------------------------- */
  function renderSoftware() {
    const items = runtimeItems.software || [];
    const countBadge = document.getElementById("software-count-badge");
    const viewAllBtn = document.getElementById("view-all-software-btn");
    const viewport = document.getElementById("software-carousel-viewport");
    const dotsEl = document.getElementById("software-carousel-dots");
    const prevBtn = document.getElementById("software-prev-btn");
    const nextBtn = document.getElementById("software-next-btn");
    const gridEl = document.getElementById("software-cards-grid");

    if (countBadge) countBadge.textContent = String(items.length);

    if (viewAllBtn) {
      if (items.length <= 3) {
        viewAllBtn.textContent = `View all (${items.length})`;
      } else {
        viewAllBtn.textContent = showAllSoftware ? "Show featured (3)" : `View all projects (${items.length})`;
      }
    }

    // Empty state for Software
    if (!items.length) {
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      if (dotsEl) dotsEl.innerHTML = "";
      if (viewport) {
        viewport.innerHTML = `
          <div class="empty-state-box" style="border: none; background: transparent;">
            <h3>Software Showcase Ready (0 Projects)</h3>
            <p>
              Software starts empty. Add projects in <code>data.js</code> or open
              <button type="button" class="text-link-btn" data-open-studio="software">Portfolio Studio</button>
              to add projects and test the carousel &amp; adaptive cards.
            </p>
          </div>
        `;
      }
      if (gridEl) {
        gridEl.dataset.count = "0";
        gridEl.innerHTML = `
          <div class="empty-state-box">
            <h3>No software projects added yet</h3>
            <p>Cards and carousel slides automatically adjust as you add 1, 2, 3, or more software projects.</p>
            <button type="button" class="wire-btn wire-btn-small" data-open-studio="software">+ Add Software Project</button>
          </div>
        `;
      }
      return;
    }

    // Ensure valid slide index
    if (activeSoftwareSlide >= items.length) activeSoftwareSlide = 0;
    const current = items[activeSoftwareSlide];
    const effective = state.liveMode ? state.config : getDefaultConfig();
    const isDetailed = effective.density === "detailed" || effective.layout === "technical";

    if (prevBtn) prevBtn.disabled = items.length <= 1;
    if (nextBtn) nextBtn.disabled = items.length <= 1;

    // Render featured carousel slide
    if (viewport) {
      const mediaHtml = current.imageUrl
        ? `<img src="${sanitizeUrl(current.imageUrl)}" alt="${escapeHtml(current.title)}" loading="lazy" />`
        : `<div class="procedural-placeholder"><strong>${escapeHtml(current.title)}</strong><span>Featured Software Preview</span></div>`;

      viewport.innerHTML = `
        <article class="carousel-slide-card">
          <div class="carousel-slide-media">${mediaHtml}</div>
          <div class="carousel-slide-info">
            <h3>${escapeHtml(current.title)}</h3>
            <p>${escapeHtml(isDetailed ? current.descriptionDetailed : current.descriptionConcise)}</p>
            <ul class="tag-list" style="margin-bottom: 0.9rem;">
              ${(current.techStack || []).map((t) => `<li class="tag-chip">${escapeHtml(t)}</li>`).join("")}
            </ul>
            <div class="project-card-actions" style="border-top: none; padding-top: 0;">
              <button type="button" class="wire-btn wire-btn-small wire-btn-accent" data-open-demo="${escapeHtml(current.id)}">
                Interactive Demo
              </button>
              <a href="${sanitizeUrl(current.githubUrl)}" target="_blank" rel="noopener noreferrer" class="wire-btn wire-btn-small" data-track-eng="github">
                GitHub Repository
              </a>
            </div>
          </div>
        </article>
      `;
    }

    // Render carousel indicator dashes
    if (dotsEl) {
      dotsEl.innerHTML = items
        .map((_, idx) => `
          <button
            type="button"
            class="carousel-dot"
            role="tab"
            aria-selected="${idx === activeSoftwareSlide}"
            aria-label="Go to software project ${idx + 1}"
            data-slide-index="${idx}"
          ></button>
        `)
        .join("");
    }

    // Render Software cards grid (top 3 unless View All toggled)
    const visibleItems = showAllSoftware ? items : items.slice(0, 3);
    if (gridEl) {
      gridEl.dataset.count = visibleItems.length >= 3 ? "3+" : String(visibleItems.length);
      gridEl.innerHTML = visibleItems
        .map((proj) => {
          const archOpen = isDetailed || expandedArchIds.has(proj.id);
          return `
            <article class="project-card">
              ${proj.imageUrl ? `<div class="project-card-media"><img src="${sanitizeUrl(proj.imageUrl)}" alt="${escapeHtml(proj.title)}" loading="lazy" /></div>` : ""}
              <div class="project-card-title-box">
                <h3>${escapeHtml(proj.title)}</h3>
              </div>
              <div class="project-card-body-box">
                <div>
                  <p>${escapeHtml(isDetailed ? proj.descriptionDetailed : proj.descriptionConcise)}</p>
                  <ul class="tag-list" style="margin-top: 0.7rem;">
                    ${(proj.techStack || []).map((t) => `<li class="tag-chip">${escapeHtml(t)}</li>`).join("")}
                  </ul>
                </div>
                ${
                  archOpen
                    ? `<div class="project-architecture-box">
                         <strong>Architecture &amp; Code Notes</strong>
                         <span>${escapeHtml(proj.architectureNotes || "Modular state-driven design.")}</span>
                       </div>`
                    : ""
                }
                <div class="project-card-actions">
                  <a href="${sanitizeUrl(proj.githubUrl)}" target="_blank" rel="noopener noreferrer" class="inline-accent-link" data-track-eng="github">
                    GitHub Repo &rarr;
                  </a>
                  <button type="button" class="density-toggle-btn" data-toggle-arch="${escapeHtml(proj.id)}">
                    ${archOpen ? "Hide Code Notes" : "Architecture"}
                  </button>
                  <button type="button" class="density-toggle-btn" data-open-demo="${escapeHtml(proj.id)}">
                    Live Demo
                  </button>
                </div>
              </div>
            </article>
          `;
        })
        .join("");
    }
  }

  /* --------------------------------------------------------------------------
   * RENDER: HARDWARE (Dynamic 3-Col Desktop / 2-Col iPad / 1-Col Phone)
   * -------------------------------------------------------------------------- */
  function renderHardware() {
    const items = runtimeItems.hardware || [];
    const countBadge = document.getElementById("hardware-count-badge");
    const gridEl = document.getElementById("hardware-cards-grid");

    if (countBadge) countBadge.textContent = String(items.length);
    if (!gridEl) return;

    if (!items.length) {
      gridEl.dataset.count = "0";
      gridEl.innerHTML = `
        <div class="empty-state-box">
          <h3>No hardware builds added yet</h3>
          <p>
            Hardware starts empty. Add builds in <code>data.js</code> or open
            <button type="button" class="text-link-btn" data-open-studio="hardware">Portfolio Studio</button>
            to populate responsive Image + Title + GitHub cards.
          </p>
        </div>
      `;
      return;
    }

    const effective = state.liveMode ? state.config : getDefaultConfig();
    const isDetailed = effective.density === "detailed" || effective.layout === "technical";

    gridEl.dataset.count = items.length >= 3 ? "3+" : String(items.length);
    gridEl.innerHTML = items
      .map((item) => {
        const mediaHtml = item.imageUrl
          ? `<img src="${sanitizeUrl(item.imageUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" />`
          : `<div class="procedural-placeholder"><strong>Hardware Image</strong><span>${escapeHtml((item.specs || [])[0] || "Schematic / Build")}</span></div>`;

        return `
          <article class="project-card">
            <div class="project-card-media">${mediaHtml}</div>
            <div class="project-card-title-box">
              <h3>${escapeHtml(item.title)}</h3>
            </div>
            <div class="project-card-body-box">
              <div>
                <p>${escapeHtml(isDetailed ? item.descriptionDetailed : item.descriptionConcise)}</p>
                <ul class="tag-list" style="margin-top: 0.7rem;">
                  ${(item.specs || []).map((s) => `<li class="tag-chip">${escapeHtml(s)}</li>`).join("")}
                </ul>
              </div>
              <div class="project-card-actions">
                <a href="${sanitizeUrl(item.githubUrl)}" target="_blank" rel="noopener noreferrer" class="inline-accent-link" data-track-eng="github">
                  Link to GitHub Repository &rarr;
                </a>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  /* --------------------------------------------------------------------------
   * RENDER: ART (Auto-Resizing 3 Invisible Divider Columns)
   * -------------------------------------------------------------------------- */
  function getArtColumnCount() {
    const w = window.innerWidth;
    if (w >= 1024) return 3; // Desktop: 3 invisible dividers
    if (w >= 640) return 2;  // iPad / Tablet: 2 columns
    return 1;                // Phone: 1 column
  }

  function parseAspectWeight(aspectStr) {
    const parts = String(aspectStr || "4 / 5").split("/");
    if (parts.length === 2) {
      const w = parseFloat(parts[0]);
      const h = parseFloat(parts[1]);
      if (w > 0 && h > 0) return h / w;
    }
    return 1.25;
  }

  function renderArt() {
    const items = runtimeItems.art || [];
    const countBadge = document.getElementById("art-count-badge");
    const gridEl = document.getElementById("art-masonry-grid");
    const noteEl = document.getElementById("art-layout-note");

    if (countBadge) countBadge.textContent = String(items.length);

    const maxCols = getArtColumnCount();
    const colCount = items.length ? Math.min(maxCols, items.length) : maxCols;
    if (noteEl) {
      noteEl.textContent =
        maxCols === 3
          ? "3 invisible divider columns (desktop)"
          : maxCols === 2
          ? "2 invisible divider columns (tablet)"
          : "1 column (mobile)";
    }

    if (!gridEl) return;

    if (!items.length) {
      delete gridEl.dataset.cols;
      gridEl.innerHTML = `
        <div class="empty-state-box">
          <h3>No artworks uploaded yet</h3>
          <p>
            Art starts empty. With every piece added in <code>data.js</code> or
            <button type="button" class="text-link-btn" data-open-studio="art">Portfolio Studio</button>,
            the gallery automatically distributes &amp; resizes across 3 invisible columns on desktop (2 on iPad, 1 on phone).
          </p>
        </div>
      `;
      return;
    }

    // Balance artworks across columns by shortest estimated height
    const columns = Array.from({ length: colCount }, () => ({ height: 0, items: [] }));
    items.forEach((art, idx) => {
      let shortest = 0;
      for (let c = 1; c < colCount; c++) {
        if (columns[c].height < columns[shortest].height) shortest = c;
      }
      columns[shortest].items.push({ art, idx });
      columns[shortest].height += parseAspectWeight(art.aspectRatio) + 0.25;
    });

    gridEl.dataset.cols = String(colCount);
    gridEl.innerHTML = columns
      .map(
        (col) => `
        <div class="art-masonry-col">
          ${col.items
            .map(({ art, idx }) => {
              const aspect = escapeHtml(art.aspectRatio || "4 / 5");
              const media = art.imageUrl
                ? `<img src="${sanitizeUrl(art.imageUrl)}" alt="${escapeHtml(art.title)}" loading="lazy" />`
                : `<div class="procedural-placeholder" style="height: 100%;"><strong>${escapeHtml(art.title)}</strong><span>${escapeHtml(art.medium)}</span></div>`;

              return `
                <button type="button" class="art-card" data-open-art="${idx}" aria-label="View artwork ${escapeHtml(art.title)}">
                  <div class="art-card-media" style="aspect-ratio: ${aspect};">
                    ${media}
                  </div>
                  <div class="art-card-caption">
                    <strong>${escapeHtml(art.title)}</strong>
                    <span>${escapeHtml(art.medium)}${art.year ? ` · ${escapeHtml(art.year)}` : ""}</span>
                  </div>
                </button>
              `;
            })
            .join("")}
        </div>
      `
      )
      .join("");
  }

  /* --------------------------------------------------------------------------
   * SYSTEM B: BEHAVIORAL SCORING & POLITE ADAPTATION SUGGESTIONS
   * -------------------------------------------------------------------------- */
  function recordSignal(type) {
    if (!state.liveMode) return;

    state.signals.interactiveTaps += 1;

    if (type === "visual") {
      state.signals.visualExplorations += 1;
      state.visualMemory.bias = Math.max(-1, state.visualMemory.bias - 0.18);
      state.visualMemory.energy = Math.min(1, state.visualMemory.energy + 0.12);
    } else if (type === "engineering") {
      state.signals.engineeringExplorations += 1;
      state.visualMemory.bias = Math.min(1, state.visualMemory.bias + 0.18);
      state.visualMemory.energy = Math.min(1, state.visualMemory.energy + 0.12);
    } else if (type === "detail") {
      state.signals.detailExpansions += 1;
      state.visualMemory.energy = Math.min(1, state.visualMemory.energy + 0.08);
    }

    saveAdaptiveState();
    evaluateAdaptationSuggestion();
  }

  function evaluateAdaptationSuggestion() {
    if (!state.liveMode || state.suggestionDismissed) return;

    const { visualExplorations, engineeringExplorations } = state.signals;
    const banner = document.getElementById("adaptation-banner");
    const titleEl = document.getElementById("adaptation-banner-title");
    const descEl = document.getElementById("adaptation-banner-desc");
    if (!banner || !titleEl || !descEl) return;

    if (
      visualExplorations >= 2 &&
      visualExplorations > engineeringExplorations &&
      state.config.layout !== "gallery" &&
      state.lastSuggestionType !== "gallery"
    ) {
      pendingSuggestion = {
        type: "gallery",
        patch: { layout: "gallery", theme: "expressive", emphasis: "visual" }
      };
      titleEl.textContent = "Want to explore more interactively?";
      descEl.textContent =
        "You seem interested in live demos and visual work. I can bring the Gallery and Expressive visual atmosphere forward.";
      banner.hidden = false;
    } else if (
      engineeringExplorations >= 2 &&
      engineeringExplorations >= visualExplorations &&
      state.config.layout !== "technical" &&
      state.lastSuggestionType !== "technical"
    ) {
      pendingSuggestion = {
        type: "technical",
        patch: { layout: "technical", density: "detailed", emphasis: "engineering" }
      };
      titleEl.textContent = "Switch to the engineering-focused view?";
      descEl.textContent =
        "You've been checking repositories and architecture notes. I can highlight Software & Hardware first with detailed specs.";
      banner.hidden = false;
    }
  }

  /* --------------------------------------------------------------------------
   * NATURAL-LANGUAGE SAFE DESIGN CONFIGURATION INTERPRETER
   * Maps visitor text prompts to validated preset tokens (never arbitrary CSS)
   * -------------------------------------------------------------------------- */
  function interpretPreferencePrompt(rawPrompt) {
    const text = String(rawPrompt || "").trim().toLowerCase();
    if (!text) return null;

    if (/\b(reset|default|original|clear|start over)\b/.test(text)) {
      return { reset: true, summary: "Reset to neutral default configuration" };
    }

    const patch = { ...state.config };
    const matched = [];

    // Theme intent
    if (/\b(futuristic|lab|cinematic|dark|night|cyber|dramatic|sci-?fi)\b/.test(text)) {
      patch.theme = "cinematic";
      matched.push("theme: cinematic");
    } else if (/\b(expressive|creative|colorful|artistic|warm|playful|vibrant)\b/.test(text)) {
      patch.theme = "expressive";
      matched.push("theme: expressive");
    } else if (/\b(minimal|neutral|clean|calm|simple|static|wireframe)\b/.test(text)) {
      patch.theme = "neutral";
      matched.push("theme: neutral");
    }

    // Layout & Emphasis intent
    if (/\b(engineering|programming|code|software|hardware|technical|tech|architecture|recruiter|developer)\b/.test(text)) {
      patch.layout = "technical";
      patch.emphasis = "engineering";
      matched.push("layout: technical", "emphasis: engineering");
    } else if (/\b(gallery|art|visual|design|showcase|demo|interactive)\b/.test(text)) {
      patch.layout = "gallery";
      patch.emphasis = "visual";
      matched.push("layout: gallery", "emphasis: visual");
    } else if (/\b(editorial|story|classic|balanced)\b/.test(text)) {
      patch.layout = "editorial";
      patch.emphasis = "balanced";
      matched.push("layout: editorial");
    }

    // Information density intent
    if (/\b(detailed|deep|in-depth|full|long|specs|everything|more info)\b/.test(text)) {
      patch.density = "detailed";
      matched.push("density: detailed");
    } else if (/\b(concise|short|brief|quick|summary|minimal)\b/.test(text)) {
      patch.density = "concise";
      matched.push("density: concise");
    }

    // Motion intent
    if (/\b(reduced|no motion|still|calm|static|accessible)\b/.test(text)) {
      patch.motion = "reduced";
      matched.push("motion: reduced");
    } else if (/\b(immersive|animated|dynamic|futuristic|alive)\b/.test(text)) {
      patch.motion = "immersive";
      matched.push("motion: immersive");
    } else if (/\b(standard|normal)\b/.test(text)) {
      patch.motion = "standard";
      matched.push("motion: standard");
    }

    if (!matched.length) {
      return {
        reset: false,
        noMatch: true,
        summary: "Try keywords like 'futuristic engineering', 'visual gallery', 'minimal concise', or 'reset'."
      };
    }

    return {
      reset: false,
      patch: validateConfig(patch),
      summary: `Applied safe configuration (${matched.join(", ")})`
    };
  }

  /* --------------------------------------------------------------------------
   * SYSTEM A: INTERACTIVE GENERATIVE PORTRAIT ("VISUAL MEMORY")
   * -------------------------------------------------------------------------- */
  function initInteractivePortrait() {
    const canvas = document.getElementById("interactive-portrait-canvas");
    const frame = document.getElementById("interactive-portrait-frame");
    if (!canvas || !frame) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let pointer = { x: 0.5, y: 0.45, active: false };
    let smoothPointer = { x: 0.5, y: 0.45 };
    let tick = 0;
    let rafId = null;

    function resizeCanvas() {
      const rect = frame.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawFrame() {
      const rect = frame.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w <= 0 || h <= 0) return;

      const effective = state.liveMode ? state.config : getDefaultConfig();
      const isReduced = effective.motion === "reduced";
      const bias = state.liveMode ? state.visualMemory.bias : 0;

      if (!isReduced) {
        smoothPointer.x += (pointer.x - smoothPointer.x) * 0.08;
        smoothPointer.y += (pointer.y - smoothPointer.y) * 0.08;
        tick += effective.motion === "immersive" ? 0.028 : 0.015;
      }

      ctx.clearRect(0, 0, w, h);

      // Background blueprint grid (stronger in technical/cinematic/engineering bias)
      const gridAlpha = effective.theme === "cinematic" ? 0.14 : bias > 0 ? 0.12 : 0.06;
      ctx.strokeStyle = `rgba(255, 117, 31, ${gridAlpha})`;
      ctx.lineWidth = 1;
      const step = 32;
      for (let gx = step; gx < w; gx += step) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = step; gy < h; gy += step) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      const cx = w * 0.5 + (smoothPointer.x - 0.5) * 26;
      const cy = h * 0.43 + (smoothPointer.y - 0.5) * 22;
      const baseR = Math.min(w, h) * 0.24;

      // Outer orbital memory rings
      const ringCount = effective.theme === "expressive" ? 4 : 3;
      for (let i = 0; i < ringCount; i++) {
        const r = baseR * (1.28 + i * 0.3) + (isReduced ? 0 : Math.sin(tick + i) * 4);
        ctx.beginPath();
        if (bias > 0.25) {
          // Architectural polygon for engineering bias
          const sides = 6 + i * 2;
          for (let s = 0; s <= sides; s++) {
            const ang = (s / sides) * Math.PI * 2 + (isReduced ? 0 : tick * (i % 2 === 0 ? 0.2 : -0.15));
            const px = cx + Math.cos(ang) * r;
            const py = cy + Math.sin(ang) * r;
            if (s === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
        } else {
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
        }
        ctx.strokeStyle = i === 0 ? "rgba(255, 117, 31, 0.55)" : "rgba(0, 191, 99, 0.28)";
        ctx.lineWidth = i === 0 ? 2 : 1.2;
        ctx.stroke();
      }

      // Stylized geometric silhouette (Head + Shoulders)
      ctx.save();
      ctx.strokeStyle = "#ff751f";
      ctx.lineWidth = 2.4;
      ctx.fillStyle = "rgba(255, 117, 31, 0.08)";

      // Shoulders arc
      ctx.beginPath();
      ctx.moveTo(cx - baseR * 1.15, h * 0.86);
      ctx.quadraticCurveTo(cx, cy + baseR * 0.85, cx + baseR * 1.15, h * 0.86);
      ctx.stroke();

      // Head node
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Gaze / focus vector lines inside portrait
      const eyeOffsetX = (smoothPointer.x - 0.5) * 14;
      const eyeOffsetY = (smoothPointer.y - 0.5) * 10;
      ctx.fillStyle = "#00bf63";
      ctx.beginPath();
      ctx.arc(cx - baseR * 0.24 + eyeOffsetX, cy - 4 + eyeOffsetY, 4.5, 0, Math.PI * 2);
      ctx.arc(cx + baseR * 0.24 + eyeOffsetX, cy - 4 + eyeOffsetY, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Orbiting memory nodes
      const nodeCount = 8;
      for (let n = 0; n < nodeCount; n++) {
        const ang = (n / nodeCount) * Math.PI * 2 + (isReduced ? 0.3 : tick * 0.55);
        const nr = baseR * (1.28 + (n % 2) * 0.3);
        const nx = cx + Math.cos(ang) * nr;
        const ny = cy + Math.sin(ang) * nr;
        ctx.beginPath();
        ctx.arc(nx, ny, n % 2 === 0 ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fillStyle = n % 2 === 0 ? "#ff751f" : "#00bf63";
        ctx.fill();
      }
      ctx.restore();

      if (!isReduced) {
        rafId = requestAnimationFrame(drawFrame);
      } else {
        rafId = null;
      }
    }

    function ensureAnimationState() {
      const effective = state.liveMode ? state.config : getDefaultConfig();
      if (effective.motion === "reduced") {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        drawFrame();
      } else if (!rafId) {
        rafId = requestAnimationFrame(drawFrame);
      }
    }

    frame.addEventListener("pointermove", (e) => {
      const rect = frame.getBoundingClientRect();
      pointer.x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      pointer.y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      pointer.active = true;
      if ((state.liveMode ? state.config.motion : "standard") === "reduced") {
        drawFrame();
      }
    });

    frame.addEventListener("pointerleave", () => {
      pointer = { x: 0.5, y: 0.45, active: false };
    });

    const ro = new ResizeObserver(() => {
      resizeCanvas();
      drawFrame();
    });
    ro.observe(frame);

    resizeCanvas();
    ensureAnimationState();

    // Expose re-sync hook for config changes
    window.__syncPortraitMotion = ensureAnimationState;
  }

  /* --------------------------------------------------------------------------
   * MODALS: PROJECT DEMO / ALL PROJECTS / ART LIGHTBOX / TRANSPARENCY
   * -------------------------------------------------------------------------- */
  function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.hidden = false;
    const closeBtn = el.querySelector(".modal-close-btn");
    if (closeBtn) closeBtn.focus();
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  }

  function openProjectDemoModal(projId) {
    const proj = (runtimeItems.software || []).find((p) => p.id === projId);
    if (!proj) return;
    recordSignal("visual");

    const titleEl = document.getElementById("project-modal-title");
    const bodyEl = document.getElementById("project-modal-body");
    if (!titleEl || !bodyEl) return;

    titleEl.textContent = `${proj.title} — Interactive Preview`;
    bodyEl.innerHTML = `
      <p>${escapeHtml(proj.descriptionDetailed || proj.descriptionConcise)}</p>
      <div class="demo-sandbox">
        <strong style="color: var(--accent-green);">Live Interactive Sandbox</strong>
        <canvas id="demo-sandbox-canvas" class="demo-canvas-box"></canvas>
        <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted);">
          Move pointer inside the canvas to test interactive responsiveness. Architecture: ${escapeHtml(proj.architectureNotes)}
        </p>
      </div>
      <div class="project-card-actions" style="border-top: none;">
        <a href="${sanitizeUrl(proj.githubUrl)}" target="_blank" rel="noopener noreferrer" class="wire-btn wire-btn-small wire-btn-accent" data-track-eng="github">
          View Source on GitHub
        </a>
        ${
          proj.liveDemoUrl
            ? `<a href="${sanitizeUrl(proj.liveDemoUrl)}" target="_blank" rel="noopener noreferrer" class="wire-btn wire-btn-small">Open External Demo</a>`
            : ""
        }
      </div>
    `;
    openModal("project-modal");
    initDemoSandboxCanvas();
  }

  function initDemoSandboxCanvas() {
    const canvas = document.getElementById("demo-sandbox-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(300, rect.width);
    canvas.height = 220;

    let mx = canvas.width / 2;
    let my = canvas.height / 2;
    const nodes = Array.from({ length: 18 }, (_, i) => ({
      x: ((i + 1) / 19) * canvas.width,
      y: canvas.height / 2 + Math.sin(i) * 45,
      phase: i * 0.45
    }));

    function draw() {
      if (document.getElementById("project-modal").hidden) return;
      ctx.fillStyle = "rgba(16, 24, 32, 0.35)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "rgba(255, 117, 31, 0.55)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      nodes.forEach((n, idx) => {
        const dx = mx - n.x;
        const dy = my - n.y;
        const dist = Math.hypot(dx, dy);
        const pull = Math.max(0, 1 - dist / 160) * 18;
        const px = n.x + (dx / (dist || 1)) * pull;
        const py = n.y + Math.sin(Date.now() * 0.002 + n.phase) * 18 + (dy / (dist || 1)) * pull;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      nodes.forEach((n) => {
        const py = n.y + Math.sin(Date.now() * 0.002 + n.phase) * 18;
        ctx.fillStyle = "#00bf63";
        ctx.beginPath();
        ctx.arc(n.x, py, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      if ((state.liveMode ? state.config.motion : "standard") !== "reduced") {
        requestAnimationFrame(draw);
      }
    }

    canvas.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
      if ((state.liveMode ? state.config.motion : "standard") === "reduced") draw();
    });

    draw();
  }

  function openArtLightbox(idx) {
    const art = (runtimeItems.art || [])[idx];
    if (!art) return;
    recordSignal("visual");

    const titleEl = document.getElementById("lightbox-title");
    const bodyEl = document.getElementById("lightbox-body");
    if (!titleEl || !bodyEl) return;

    titleEl.textContent = art.title;
    bodyEl.innerHTML = `
      <div style="border: 2px solid var(--accent-orange); border-radius: var(--radius-box); overflow: hidden; background: var(--bg-surface-elevated);">
        ${
          art.imageUrl
            ? `<img src="${sanitizeUrl(art.imageUrl)}" alt="${escapeHtml(art.title)}" style="width: 100%; max-height: 62vh; object-fit: contain; margin: 0 auto;" />`
            : `<div class="procedural-placeholder" style="min-height: 280px;"><strong>${escapeHtml(art.title)}</strong><span>${escapeHtml(art.medium)}</span></div>`
        }
      </div>
      <p style="margin: 0; color: var(--text-secondary);">
        <strong>Medium:</strong> ${escapeHtml(art.medium)}
        ${art.year ? ` &middot; <strong>Year:</strong> ${escapeHtml(art.year)}` : ""}
      </p>
      ${art.notes ? `<p style="margin: 0; color: var(--text-muted);">${escapeHtml(art.notes)}</p>` : ""}
    `;
    openModal("lightbox-modal");
  }

  function openTransparencyModal() {
    const bodyEl = document.getElementById("transparency-body");
    if (!bodyEl) return;

    const effective = state.liveMode ? state.config : getDefaultConfig();
    bodyEl.innerHTML = `
      <p style="margin: 0; color: var(--text-secondary);">
        All behavioral signals and design preferences are stored strictly in your browser's
        <code>localStorage</code>. Nothing is transmitted externally.
      </p>
      <div class="wire-box">
        <strong style="color: var(--accent-orange); display: block; margin-bottom: 0.45rem;">Active Design Configuration</strong>
        <ul class="tag-list">
          <li class="tag-chip">Live Mode: ${state.liveMode ? "ON" : "OFF"}</li>
          <li class="tag-chip">Theme: ${escapeHtml(effective.theme)}</li>
          <li class="tag-chip">Layout: ${escapeHtml(effective.layout)}</li>
          <li class="tag-chip">Density: ${escapeHtml(effective.density)}</li>
          <li class="tag-chip">Motion: ${escapeHtml(effective.motion)}</li>
          <li class="tag-chip">Emphasis: ${escapeHtml(effective.emphasis)}</li>
        </ul>
      </div>
      <div class="wire-box">
        <strong style="color: var(--accent-green); display: block; margin-bottom: 0.45rem;">Observed Session Signals</strong>
        <ul class="tag-list">
          <li class="tag-chip">Visual explorations: ${state.signals.visualExplorations}</li>
          <li class="tag-chip">Engineering explorations: ${state.signals.engineeringExplorations}</li>
          <li class="tag-chip">Detail expansions: ${state.signals.detailExpansions}</li>
          <li class="tag-chip">Visual Memory bias: ${state.visualMemory.bias.toFixed(2)}</li>
        </ul>
      </div>
      <div style="display: flex; gap: 0.65rem; flex-wrap: wrap;">
        <button type="button" class="wire-btn wire-btn-small wire-btn-accent" id="modal-reset-adaptive-btn">
          Reset Adaptive State &amp; Clear Signals
        </button>
      </div>
    `;
    openModal("transparency-modal");
  }

  /* --------------------------------------------------------------------------
   * PORTFOLIO STUDIO (Add / Stress-Test / Delete / Export data.js)
   * -------------------------------------------------------------------------- */
  function generateSvgDataUri(title, subtitle, accent, ratioW, ratioH) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ratioW * 120}" height="${ratioH * 120}" viewBox="0 0 ${ratioW * 120} ${ratioH * 120}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#223242"/>
          <stop offset="100%" stop-color="#131c25"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <circle cx="72%" cy="30%" r="${Math.min(ratioW, ratioH) * 28}" fill="${accent}" fill-opacity="0.18" stroke="${accent}" stroke-width="2"/>
      <rect x="24" y="24" width="${ratioW * 120 - 48}" height="${ratioH * 120 - 48}" fill="none" stroke="${accent}" stroke-opacity="0.45" stroke-width="2"/>
      <text x="40" y="${ratioH * 60}" fill="#f3f7fa" font-family="system-ui, sans-serif" font-size="22" font-weight="700">${title.replace(/[<>&]/g, "")}</text>
      <text x="40" y="${ratioH * 60 + 28}" fill="${accent}" font-family="monospace" font-size="14">${subtitle.replace(/[<>&]/g, "")}</text>
    </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function loadDemoDataset() {
    runtimeItems = {
      software: [
        {
          id: "sw-demo-1",
          title: "Adaptive Token Compiler",
          descriptionConcise: "Deterministic design-token engine compiling JSON themes into accessible CSS variables.",
          descriptionDetailed: "Deterministic design-token engine compiling semantic JSON themes into WCAG-validated CSS custom properties with zero runtime CSS-in-JS overhead.",
          architectureNotes: "Pure AST validation pass + contrast ratio checker + CSS variable emitter.",
          techStack: ["JavaScript", "CSS Tokens", "WCAG"],
          imageUrl: generateSvgDataUri("Adaptive Token Compiler", "Software · Design Systems", "#ff751f", 16, 10),
          githubUrl: PORTFOLIO_DATA.profile.github,
          liveDemoUrl: "",
          interactivePreview: true
        },
        {
          id: "sw-demo-2",
          title: "FlowField Procedural Synth",
          descriptionConcise: "Real-time 60fps vector field canvas tool driven by Perlin-style curl noise.",
          descriptionDetailed: "Real-time 60fps vector field canvas instrument supporting keyboard-controlled turbulence, exportable SVG paths, and reduced-motion frame stepping.",
          architectureNotes: "TypedArray particle buffer + spatial hash grid for O(N) neighbor sampling.",
          techStack: ["HTML5 Canvas", "TypedArrays", "Procedural"],
          imageUrl: generateSvgDataUri("FlowField Synth", "Software · Graphics", "#00bf63", 16, 10),
          githubUrl: PORTFOLIO_DATA.profile.github,
          liveDemoUrl: "",
          interactivePreview: true
        },
        {
          id: "sw-demo-3",
          title: "SerialScope Telemetry UI",
          descriptionConcise: "Browser-based WebSerial oscilloscope and packet parser for microcontroller debugging.",
          descriptionDetailed: "Browser-based WebSerial oscilloscope plotting multi-channel sensor streams at 250Hz with ring-buffered Canvas rendering and CSV snapshot export.",
          architectureNotes: "Circular Float32Array ring buffer decoupled from requestAnimationFrame draw loop.",
          techStack: ["WebSerial", "Ring Buffer", "Telemetry"],
          imageUrl: generateSvgDataUri("SerialScope UI", "Software · Tooling", "#ff751f", 16, 10),
          githubUrl: PORTFOLIO_DATA.profile.github,
          liveDemoUrl: "",
          interactivePreview: true
        },
        {
          id: "sw-demo-4",
          title: "GridLayout Stress Inspector",
          descriptionConcise: "Lightweight breakpoint previewer verifying responsive aspect ratios across Laptop, iPad, and Phone.",
          descriptionDetailed: "Lightweight multi-viewport diagnostic overlay checking touch-target sizing, flex/grid wrapping, and horizontal overflow across standard device widths.",
          architectureNotes: "Zero-dependency DOM rect analyzer with ResizeObserver instrumentation.",
          techStack: ["Responsive CSS", "Diagnostics", "DOM API"],
          imageUrl: generateSvgDataUri("GridLayout Inspector", "Software · Testing", "#00bf63", 16, 10),
          githubUrl: PORTFOLIO_DATA.profile.github,
          liveDemoUrl: "",
          interactivePreview: true
        }
      ],
      hardware: [
        {
          id: "hw-demo-1",
          title: "Haptic Rotary Macro Dial",
          descriptionConcise: "Custom RP2040 desk controller with magnetic encoder and anodized aluminum knob.",
          descriptionDetailed: "Custom RP2040 USB-HID desk controller featuring an AS5600 magnetic rotary encoder, NeoPixel status ring, and machined aluminum enclosure.",
          specs: ["RP2040", "AS5600", "KiCad 2-Layer PCB"],
          imageUrl: generateSvgDataUri("Haptic Macro Dial", "Hardware · RP2040 + PCB", "#ff751f", 16, 10),
          githubUrl: PORTFOLIO_DATA.profile.github
        },
        {
          id: "hw-demo-2",
          title: "Environmental Air Node",
          descriptionConcise: "Low-power ESP32-S3 CO2 & particulate desk monitor with e-ink display.",
          descriptionDetailed: "Low-power ESP32-S3 environmental node sampling SCD41 CO2 and BME280 metrics onto a 2.9-inch e-paper display with deep-sleep power profiling.",
          specs: ["ESP32-S3", "E-Ink 2.9\"", "3D Printed Shell"],
          imageUrl: generateSvgDataUri("Air Quality Node", "Hardware · ESP32-S3", "#00bf63", 16, 10),
          githubUrl: PORTFOLIO_DATA.profile.github
        },
        {
          id: "hw-demo-3",
          title: "Modular Synth Patch Matrix",
          descriptionConcise: "Analog CV routing matrix and LED attenuverter rack module.",
          descriptionDetailed: "8-channel passive/buffered CV patch matrix built on custom FR4 panel with precision op-amp buffering and bi-color LED polarity indicators.",
          specs: ["Eurorack", "TL074 Op-Amp", "FR4 Frontplate"],
          imageUrl: generateSvgDataUri("CV Patch Matrix", "Hardware · Analog Synth", "#ff751f", 16, 10),
          githubUrl: PORTFOLIO_DATA.profile.github
        }
      ],
      art: [
        {
          id: "art-demo-1",
          title: "Orbit Study I",
          medium: "Generative Plotter",
          year: "2026",
          aspectRatio: "3 / 4",
          imageUrl: generateSvgDataUri("Orbit Study I", "Generative · 3:4", "#ff751f", 3, 4),
          notes: "Pen-plotter study exploring harmonic phase drift."
        },
        {
          id: "art-demo-2",
          title: "Slate Horizon",
          medium: "Digital Composition",
          year: "2026",
          aspectRatio: "16 / 10",
          imageUrl: generateSvgDataUri("Slate Horizon", "Digital · 16:10", "#00bf63", 16, 10),
          notes: "Architectural tonal study in slate and signal orange."
        },
        {
          id: "art-demo-3",
          title: "Signal Lattice",
          medium: "Algorithmic Grid",
          year: "2025",
          aspectRatio: "1 / 1",
          imageUrl: generateSvgDataUri("Signal Lattice", "Algorithmic · 1:1", "#ff751f", 4, 4),
          notes: "Subdivision recursion grid on square format."
        },
        {
          id: "art-demo-4",
          title: "Vertical Resonance",
          medium: "Ink & Code",
          year: "2026",
          aspectRatio: "2 / 3",
          imageUrl: generateSvgDataUri("Vertical Resonance", "Ink & Code · 2:3", "#00bf63", 2, 3),
          notes: "Tall portrait proportion stress-testing 3-column masonry."
        },
        {
          id: "art-demo-5",
          title: "Copper Trace Study",
          medium: "PCB Aesthetic",
          year: "2025",
          aspectRatio: "4 / 3",
          imageUrl: generateSvgDataUri("Copper Trace", "PCB Study · 4:3", "#ff751f", 4, 3),
          notes: "Differential pair routing rendered as geometric art."
        },
        {
          id: "art-demo-6",
          title: "Calm Telemetry",
          medium: "Minimal Vector",
          year: "2026",
          aspectRatio: "4 / 5",
          imageUrl: generateSvgDataUri("Calm Telemetry", "Vector · 4:5", "#00bf63", 4, 5),
          notes: "Quiet contour lines derived from interaction velocity."
        }
      ]
    };
    saveRuntimeItems();
    activeSoftwareSlide = 0;
    renderSoftware();
    renderHardware();
    renderArt();
    renderStudioUI();
    showToast("Loaded sample items across Software (4), Hardware (3), and Art (6).");
  }

  function clearAllItemsToEmpty() {
    runtimeItems = { software: [], hardware: [], art: [] };
    activeSoftwareSlide = 0;
    showAllSoftware = false;
    saveRuntimeItems();
    renderSoftware();
    renderHardware();
    renderArt();
    renderStudioUI();
    showToast("Cleared Software, Hardware, and Art back to empty (0 items).");
  }

  function renderStudioUI() {
    const fieldsEl = document.getElementById("studio-form-fields");
    const listHeading = document.getElementById("studio-list-heading");
    const listEl = document.getElementById("studio-items-list");
    if (!fieldsEl || !listEl) return;

    document.querySelectorAll(".studio-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.studioTab === studioActiveCategory);
    });

    if (studioActiveCategory === "software") {
      fieldsEl.innerHTML = `
        <div class="studio-field">
          <label for="st-title">Project Title *</label>
          <input id="st-title" name="title" type="text" required placeholder="e.g. Neural Synth UI" />
        </div>
        <div class="studio-field">
          <label for="st-github">GitHub Repository URL</label>
          <input id="st-github" name="githubUrl" type="url" placeholder="https://github.com/..." />
        </div>
        <div class="studio-field studio-field-full">
          <label for="st-desc">Description *</label>
          <textarea id="st-desc" name="description" rows="2" required placeholder="Brief overview of what it does"></textarea>
        </div>
        <div class="studio-field">
          <label for="st-tags">Tech Stack (comma-separated)</label>
          <input id="st-tags" name="tags" type="text" placeholder="JavaScript, Canvas, CSS" />
        </div>
        <div class="studio-field">
          <label for="st-arch">Architecture Notes</label>
          <input id="st-arch" name="architectureNotes" type="text" placeholder="Key algorithm or design pattern" />
        </div>
        <div class="studio-field">
          <label for="st-img-url">Image URL (optional)</label>
          <input id="st-img-url" name="imageUrl" type="text" placeholder="https://... or assets/img.png" />
        </div>
        <div class="studio-field">
          <label for="st-img-file">Or Upload Image File (optional)</label>
          <input id="st-img-file" name="imageFile" type="file" accept="image/*" />
        </div>
      `;
    } else if (studioActiveCategory === "hardware") {
      fieldsEl.innerHTML = `
        <div class="studio-field">
          <label for="st-title">Hardware Build Title *</label>
          <input id="st-title" name="title" type="text" required placeholder="e.g. RP2040 Macro Pad" />
        </div>
        <div class="studio-field">
          <label for="st-github">GitHub Repository URL</label>
          <input id="st-github" name="githubUrl" type="url" placeholder="https://github.com/..." />
        </div>
        <div class="studio-field studio-field-full">
          <label for="st-desc">Description *</label>
          <textarea id="st-desc" name="description" rows="2" required placeholder="Hardware specs, microcontroller, enclosure"></textarea>
        </div>
        <div class="studio-field">
          <label for="st-tags">Specs (comma-separated)</label>
          <input id="st-tags" name="tags" type="text" placeholder="ESP32, KiCad PCB, 3D Print" />
        </div>
        <div class="studio-field">
          <label for="st-img-url">Image URL (optional)</label>
          <input id="st-img-url" name="imageUrl" type="text" placeholder="https://... or assets/hw.jpg" />
        </div>
        <div class="studio-field studio-field-full">
          <label for="st-img-file">Or Upload Image File (optional)</label>
          <input id="st-img-file" name="imageFile" type="file" accept="image/*" />
        </div>
      `;
    } else {
      fieldsEl.innerHTML = `
        <div class="studio-field">
          <label for="st-title">Artwork Title *</label>
          <input id="st-title" name="title" type="text" required placeholder="e.g. Harmonic Grid IV" />
        </div>
        <div class="studio-field">
          <label for="st-medium">Medium</label>
          <input id="st-medium" name="medium" type="text" placeholder="Generative / Ink / 3D" />
        </div>
        <div class="studio-field">
          <label for="st-aspect">Aspect Ratio (for 3-divider auto-resize)</label>
          <select id="st-aspect" name="aspectRatio">
            <option value="4 / 5">Portrait (4 / 5)</option>
            <option value="3 / 4">Portrait (3 / 4)</option>
            <option value="1 / 1">Square (1 / 1)</option>
            <option value="16 / 10">Landscape (16 / 10)</option>
            <option value="4 / 3">Classic (4 / 3)</option>
            <option value="2 / 3">Tall (2 / 3)</option>
          </select>
        </div>
        <div class="studio-field">
          <label for="st-year">Year</label>
          <input id="st-year" name="year" type="text" value="2026" />
        </div>
        <div class="studio-field">
          <label for="st-img-url">Image URL (optional)</label>
          <input id="st-img-url" name="imageUrl" type="text" placeholder="https://... or assets/art.png" />
        </div>
        <div class="studio-field">
          <label for="st-img-file">Or Upload Image File (optional)</label>
          <input id="st-img-file" name="imageFile" type="file" accept="image/*" />
        </div>
        <div class="studio-field studio-field-full">
          <label for="st-notes">Artist Notes (optional)</label>
          <input id="st-notes" name="notes" type="text" placeholder="Process or medium notes" />
        </div>
      `;
    }

    const list = runtimeItems[studioActiveCategory] || [];
    if (listHeading) {
      listHeading.textContent = `Current ${studioActiveCategory.toUpperCase()} Items (${list.length})`;
    }

    if (!list.length) {
      listEl.innerHTML = `<p style="margin: 0; color: var(--text-muted);">Empty (0 items). Use the form above or click "Load Sample Items" to test.</p>`;
    } else {
      listEl.innerHTML = list
        .map(
          (item, idx) => `
          <div class="studio-item-row">
            <div>
              <strong>${escapeHtml(item.title)}</strong>
              <span style="display: block; font-size: 0.8rem; color: var(--text-muted);">
                ${escapeHtml(item.medium || item.descriptionConcise || "")}
              </span>
            </div>
            <button type="button" class="wire-btn wire-btn-small wire-btn-ghost" data-delete-studio-item="${idx}">
              Remove
            </button>
          </div>
        `
        )
        .join("");
    }
  }

  function readUploadedImageAsDataUrl(file) {
    return new Promise((resolve) => {
      if (!file) return resolve("");
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        if (!result || file.type === "image/svg+xml" || result.length < 180000) {
          return resolve(result);
        }
        // Downscale large uploaded raster images so localStorage remains snappy
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
          const c = document.createElement("canvas");
          c.width = Math.max(1, Math.round(img.width * scale));
          c.height = Math.max(1, Math.round(img.height * scale));
          const cx = c.getContext("2d");
          if (!cx) return resolve(result);
          cx.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/jpeg", 0.84));
        };
        img.onerror = () => resolve(result);
        img.src = result;
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  }

  function exportDataJsFile() {
    const exportedObj = {
      ...PORTFOLIO_DATA,
      software: runtimeItems.software,
      hardware: runtimeItems.hardware,
      art: runtimeItems.art
    };
    const helpersCode = `
function addSoftwareProject(item) {
  PORTFOLIO_DATA.software.push({
    id: item.id || \`sw-\${PORTFOLIO_DATA.software.length + 1}\`,
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
    id: item.id || \`hw-\${PORTFOLIO_DATA.hardware.length + 1}\`,
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
    id: item.id || \`art-\${PORTFOLIO_DATA.art.length + 1}\`,
    title: item.title || "Untitled Piece",
    medium: item.medium || "Mixed Media",
    year: item.year || String(new Date().getFullYear()),
    aspectRatio: item.aspectRatio || "4 / 5",
    imageUrl: item.imageUrl || "",
    notes: item.notes || ""
  });
}
`;
    const fileContent =
      `// Exported from Portfolio Studio\nconst PORTFOLIO_DATA = ${JSON.stringify(exportedObj, null, 2)};\n${helpersCode}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fileContent).catch(() => {});
    }

    const blob = new Blob([fileContent], { type: "application/javascript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.js";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Downloaded updated data.js (and copied to clipboard if permitted).");
  }

  /* --------------------------------------------------------------------------
   * EVENT WIRING & INITIALIZATION
   * -------------------------------------------------------------------------- */
  function bindEvents() {
    // Mobile nav toggle
    const mobileToggle = document.getElementById("mobile-nav-toggle");
    const primaryNav = document.getElementById("primary-nav");
    if (mobileToggle && primaryNav) {
      mobileToggle.addEventListener("click", () => {
        const isOpen = primaryNav.classList.toggle("open");
        mobileToggle.setAttribute("aria-expanded", String(isOpen));
      });
      primaryNav.addEventListener("click", (e) => {
        if (e.target.closest("a")) {
          primaryNav.classList.remove("open");
          mobileToggle.setAttribute("aria-expanded", "false");
        }
      });
    }

    // Live Mode Switch
    const liveSwitch = document.getElementById("live-mode-toggle");
    if (liveSwitch) {
      liveSwitch.addEventListener("click", () => {
        state.liveMode = !state.liveMode;
        saveAdaptiveState();
        applyConfigToDOM();
        if (window.__syncPortraitMotion) window.__syncPortraitMotion();
        showToast(state.liveMode ? "Live Adaptive Mode ON." : "Static Default Mode ON (adaptations paused).");
      });
    }

    // Hero Density Toggle
    const densityBtn = document.getElementById("hero-density-toggle");
    if (densityBtn) {
      densityBtn.addEventListener("click", () => {
        if (!state.liveMode) state.liveMode = true;
        state.config.density = state.config.density === "detailed" ? "concise" : "detailed";
        if (state.config.density === "detailed") recordSignal("detail");
        saveAdaptiveState();
        applyConfigToDOM();
      });
    }

    // Experience Vertical Carousel Rail clicks & keyboard
    const expTabs = document.getElementById("exp-rail-tabs");
    if (expTabs) {
      expTabs.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-exp-index]");
        if (!btn) return;
        activeExpIndex = Number(btn.dataset.expIndex) || 0;
        renderExperience();
      });
      expTabs.addEventListener("keydown", (e) => {
        const total = (PORTFOLIO_DATA.experience || []).length;
        if (!total) return;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          activeExpIndex = (activeExpIndex + 1) % total;
          renderExperience();
          expTabs.querySelector(`[data-exp-index="${activeExpIndex}"]`)?.focus();
        } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          activeExpIndex = (activeExpIndex - 1 + total) % total;
          renderExperience();
          expTabs.querySelector(`[data-exp-index="${activeExpIndex}"]`)?.focus();
        }
      });
    }

    // Software Carousel Controls
    document.getElementById("software-prev-btn")?.addEventListener("click", () => {
      const len = runtimeItems.software.length;
      if (len <= 1) return;
      activeSoftwareSlide = (activeSoftwareSlide - 1 + len) % len;
      renderSoftware();
    });

    document.getElementById("software-next-btn")?.addEventListener("click", () => {
      const len = runtimeItems.software.length;
      if (len <= 1) return;
      activeSoftwareSlide = (activeSoftwareSlide + 1) % len;
      renderSoftware();
    });

    document.getElementById("software-carousel-dots")?.addEventListener("click", (e) => {
      const dot = e.target.closest("[data-slide-index]");
      if (!dot) return;
      activeSoftwareSlide = Number(dot.dataset.slideIndex) || 0;
      renderSoftware();
    });

    document.getElementById("software-carousel-stage")?.addEventListener("keydown", (e) => {
      const len = runtimeItems.software.length;
      if (len <= 1) return;
      if (e.key === "ArrowLeft") {
        activeSoftwareSlide = (activeSoftwareSlide - 1 + len) % len;
        renderSoftware();
      } else if (e.key === "ArrowRight") {
        activeSoftwareSlide = (activeSoftwareSlide + 1) % len;
        renderSoftware();
      }
    });

    document.getElementById("view-all-software-btn")?.addEventListener("click", () => {
      if (!runtimeItems.software.length) {
        studioActiveCategory = "software";
        renderStudioUI();
        openModal("studio-modal");
        return;
      }
      showAllSoftware = !showAllSoftware;
      renderSoftware();
    });

    // Delegated main content actions (Demos, Architecture Notes, Art Lightbox, GitHub tracking, Studio triggers)
    document.getElementById("main-content")?.addEventListener("click", (e) => {
      const demoBtn = e.target.closest("[data-open-demo]");
      if (demoBtn) {
        openProjectDemoModal(demoBtn.dataset.openDemo);
        return;
      }

      const archBtn = e.target.closest("[data-toggle-arch]");
      if (archBtn) {
        const id = archBtn.dataset.toggleArch;
        if (expandedArchIds.has(id)) expandedArchIds.delete(id);
        else {
          expandedArchIds.add(id);
          recordSignal("engineering");
        }
        renderSoftware();
        return;
      }

      const artCard = e.target.closest("[data-open-art]");
      if (artCard) {
        openArtLightbox(Number(artCard.dataset.openArt));
        return;
      }

      const engLink = e.target.closest("[data-track-eng]");
      if (engLink) {
        recordSignal("engineering");
        return;
      }

      const studioOpen = e.target.closest("[data-open-studio]");
      if (studioOpen) {
        studioActiveCategory = studioOpen.dataset.openStudio || "software";
        renderStudioUI();
        openModal("studio-modal");
      }
    });

    // Adaptation Suggestion Banner buttons
    document.getElementById("adaptation-accept-btn")?.addEventListener("click", () => {
      if (!pendingSuggestion) return;
      state.config = validateConfig({ ...state.config, ...pendingSuggestion.patch });
      state.lastSuggestionType = pendingSuggestion.type;
      document.getElementById("adaptation-banner").hidden = true;
      saveAdaptiveState();
      applyConfigToDOM();
      if (window.__syncPortraitMotion) window.__syncPortraitMotion();
      showToast(`Adapted layout to ${state.config.layout} (${state.config.theme} theme).`);
      pendingSuggestion = null;
    });

    document.getElementById("adaptation-dismiss-btn")?.addEventListener("click", () => {
      state.suggestionDismissed = true;
      document.getElementById("adaptation-banner").hidden = true;
      saveAdaptiveState();
    });

    // Floating Reset Button
    function performReset() {
      state = getDefaultAdaptiveState();
      pendingSuggestion = null;
      expandedArchIds.clear();
      document.getElementById("adaptation-banner").hidden = true;
      saveAdaptiveState();
      applyConfigToDOM();
      if (window.__syncPortraitMotion) window.__syncPortraitMotion();
      showToast("Reset to default neutral configuration and cleared behavioral signals.");
    }

    document.getElementById("reset-adaptive-btn")?.addEventListener("click", performReset);

    // Floating Expandable Pencil Input Pill
    const pill = document.getElementById("preference-form");
    const input = document.getElementById("preference-input");
    const toggleBtn = document.getElementById("preference-toggle-btn");
    const presets = document.getElementById("preference-presets");

    function setPillExpanded(open) {
      if (!pill || !input || !toggleBtn || !presets) return;
      pill.classList.toggle("expanded", open);
      toggleBtn.setAttribute("aria-expanded", String(open));
      input.setAttribute("aria-hidden", String(!open));
      input.tabIndex = open ? 0 : -1;
      presets.hidden = !open;
      if (open) {
        setTimeout(() => input.focus(), 60);
      }
    }

    function submitPreferenceText(promptText) {
      const result = interpretPreferencePrompt(promptText);
      if (!result) return;
      if (result.reset) {
        performReset();
        input.value = "";
        setPillExpanded(false);
        return;
      }
      if (result.noMatch) {
        showToast(result.summary);
        return;
      }
      state.liveMode = true;
      state.config = result.patch;
      saveAdaptiveState();
      applyConfigToDOM();
      if (window.__syncPortraitMotion) window.__syncPortraitMotion();
      showToast(result.summary);
      input.value = "";
      setPillExpanded(false);
    }

    toggleBtn?.addEventListener("click", () => {
      const isExpanded = pill.classList.contains("expanded");
      if (!isExpanded) {
        setPillExpanded(true);
      } else if (input.value.trim()) {
        submitPreferenceText(input.value);
      } else {
        setPillExpanded(false);
      }
    });

    pill?.addEventListener("submit", (e) => {
      e.preventDefault();
      if (input.value.trim()) {
        submitPreferenceText(input.value);
      }
    });

    presets?.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-prompt]");
      if (!chip) return;
      submitPreferenceText(chip.dataset.prompt);
    });

    // Transparency & Studio triggers
    document.getElementById("open-transparency-btn")?.addEventListener("click", openTransparencyModal);
    document.getElementById("footer-transparency-btn")?.addEventListener("click", openTransparencyModal);
    document.getElementById("open-studio-btn")?.addEventListener("click", () => {
      renderStudioUI();
      openModal("studio-modal");
    });

    document.getElementById("transparency-modal")?.addEventListener("click", (e) => {
      if (e.target.id === "modal-reset-adaptive-btn") {
        performReset();
        openTransparencyModal();
      }
    });

    // Studio Events
    document.querySelectorAll(".studio-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        studioActiveCategory = tab.dataset.studioTab;
        renderStudioUI();
      });
    });

    document.getElementById("studio-load-demo-btn")?.addEventListener("click", loadDemoDataset);
    document.getElementById("studio-clear-all-btn")?.addEventListener("click", clearAllItemsToEmpty);
    document.getElementById("studio-export-btn")?.addEventListener("click", exportDataJsFile);

    document.getElementById("studio-add-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const fd = new FormData(form);
      const fileInput = form.querySelector('input[name="imageFile"]');
      const uploadedUrl = await readUploadedImageAsDataUrl(fileInput?.files?.[0]);
      const finalImage = uploadedUrl || String(fd.get("imageUrl") || "").trim();

      if (studioActiveCategory === "software") {
        const tags = String(fd.get("tags") || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        runtimeItems.software.push({
          id: `sw-${Date.now()}`,
          title: String(fd.get("title") || "Untitled Software").trim(),
          descriptionConcise: String(fd.get("description") || "").trim(),
          descriptionDetailed: String(fd.get("description") || "").trim(),
          architectureNotes: String(fd.get("architectureNotes") || "Modular architecture.").trim(),
          techStack: tags.length ? tags : ["JavaScript"],
          imageUrl: finalImage,
          githubUrl: String(fd.get("githubUrl") || PORTFOLIO_DATA.profile.github).trim(),
          liveDemoUrl: "",
          interactivePreview: true
        });
        renderSoftware();
      } else if (studioActiveCategory === "hardware") {
        const specs = String(fd.get("tags") || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        runtimeItems.hardware.push({
          id: `hw-${Date.now()}`,
          title: String(fd.get("title") || "Untitled Hardware").trim(),
          descriptionConcise: String(fd.get("description") || "").trim(),
          descriptionDetailed: String(fd.get("description") || "").trim(),
          specs: specs.length ? specs : ["Hardware"],
          imageUrl: finalImage,
          githubUrl: String(fd.get("githubUrl") || PORTFOLIO_DATA.profile.github).trim()
        });
        renderHardware();
      } else {
        runtimeItems.art.push({
          id: `art-${Date.now()}`,
          title: String(fd.get("title") || "Untitled Artwork").trim(),
          medium: String(fd.get("medium") || "Mixed Media").trim(),
          year: String(fd.get("year") || "2026").trim(),
          aspectRatio: String(fd.get("aspectRatio") || "4 / 5"),
          imageUrl: finalImage,
          notes: String(fd.get("notes") || "").trim()
        });
        renderArt();
      }

      saveRuntimeItems();
      form.reset();
      renderStudioUI();
      showToast(`Added item to ${studioActiveCategory}. Layout adjusted automatically.`);
    });

    document.getElementById("studio-items-list")?.addEventListener("click", (e) => {
      const del = e.target.closest("[data-delete-studio-item]");
      if (!del) return;
      const idx = Number(del.dataset.deleteStudioItem);
      runtimeItems[studioActiveCategory].splice(idx, 1);
      saveRuntimeItems();
      renderSoftware();
      renderHardware();
      renderArt();
      renderStudioUI();
    });

    // Global Modal Close & Escape handler + Keyboard shortcut Ctrl+Shift+E for Studio
    document.addEventListener("click", (e) => {
      const closeBtn = e.target.closest("[data-close-modal]");
      if (closeBtn) {
        closeModal(closeBtn.dataset.closeModal);
        return;
      }
      if (e.target.classList.contains("modal-backdrop")) {
        e.target.hidden = true;
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        document.querySelectorAll(".modal-backdrop").forEach((m) => (m.hidden = true));
        if (pill?.classList.contains("expanded")) setPillExpanded(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        renderStudioUI();
        openModal("studio-modal");
      }
    });

    // Rebalance Art masonry & Experience rail orientation on resize
    let lastArtCols = getArtColumnCount();
    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        updateExperienceRailIndicator((PORTFOLIO_DATA.experience || []).length);
        const newCols = getArtColumnCount();
        if (newCols !== lastArtCols) {
          lastArtCols = newCols;
          renderArt();
        }
      }, 120);
    });
  }

  /* --------------------------------------------------------------------------
   * BOOTSTRAP
   * -------------------------------------------------------------------------- */
  function initScrollSpy() {
    if (!("IntersectionObserver" in window)) return;
    const links = Array.from(document.querySelectorAll(".nav-link[data-nav]"));
    const sections = links
      .map((l) => document.getElementById(l.dataset.nav))
      .filter(Boolean);
    if (!sections.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            links.forEach((l) => l.classList.toggle("active", l.dataset.nav === entry.target.id));
          }
        });
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: 0.01 }
    );
    sections.forEach((sec) => io.observe(sec));
  }

  function init() {
    renderProfileChrome();
    applyConfigToDOM();
    initInteractivePortrait();
    bindEvents();
    initScrollSpy();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();