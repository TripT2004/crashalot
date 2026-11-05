# crashalot

An aviation data presentation for the 6730 group project. Narrative, evidence, charts, interactions, and visual language are developed together, desktop first. The presentation combines a landing page, Flight 1282 opening, count and decade-trend beats, question-led chapter previews, and a linked flight-phase/cause exploration. Remaining storyboard placeholders are not finished visualizations.

## Run locally

```sh
npm ci
npm run dev
```

`npm run build` produces `dist/`; `npm run preview` serves that production build. Vite provides the development and build tooling. The `wrangler.jsonc` serves `dist/` as Cloudflare static assets and runs `npm run build` before Wrangler deployment.

For Cloudflare Workers Builds (Git integration), set the dashboard **Build command** to `npm run build` and **Deploy command** to `npx wrangler deploy`. Workers Builds does not honor Wrangler custom build settings, so the dashboard build command is required to generate the ignored `dist/` directory on a fresh checkout.

## Design and implementation

The [living design scratchpad](docs/design-scratchpad.md) tracks current agreements, narrative proposals, and open questions.

Collaborative design precedes execution. Agents implement bounded, agreed pieces for review within the larger presentation. Prefer documented OSS libraries and component composition; discuss a need for bespoke components or visualization mechanisms together before building them.

Reveal.js is the presentation host. `index.html` is the entry point; `src/presentation.js` imports the standalone HTML fragments in `src/views/cover.html` and `src/views/chapters.html`, places them in the presentation, and initializes Reveal. D3 is the agreed visualization engine. View content remains separate from Reveal navigation. The [component study](components.html) remains a separate page at `/components.html`, comparing Bootstrap 5.3 with Bootswatch Sandstone and Darkly themes. This is a study for discussion, not an accepted final design language. The narrative is developing in the scratchpad. Moving to scrollytelling later may require adapting lifecycle and state handling as well as transitions.

Place future presentation assets in `public/assets/`; Vite serves them at `/assets/` and copies them into the build.

Use existing project datasets exclusively. Do not download more data or create bespoke inspection scripts for each question; use ad hoc queries over retained data instead. Original data tooling is preserved as historical project material.

## Retained material

- `docs/initial-brief.md`, `docs/sketch-analysis.md`, and `docs/experience-research.md`: historical context and evidence, not the current specification.
- `docs/sketches/`: the supplied drawings.
- `data/`: source provenance and locally retained datasets; see [data documentation](data/README.md).
- `scripts/`, `pyproject.toml`, and `uv.lock`: retained Python data tooling (`uv sync` to install).

The earlier website, chart gallery, generated gallery payload, previews, and project-local implementation skills have been removed. Git history retains them. `npm run data:prepare` is a historical gallery preparation command; its output is not required by the new page.

## Component study

`components.html` composes existing Bootstrap controls and a D3 evidence specimen. Theme choices persist locally. Library theme colors feed semantic chart roles; data and scales stay invariant. Bootswatch CSS is copied locally with its remote Google Fonts imports removed so the study uses one system font without runtime font requests. Run `npm run themes:prepare` after updating Bootswatch. Upstream license headers are retained in `src/vendor/`.

## Linked flight-phase and cause exploration

The `#/flight-phase` chapter integrates the approved sequential Sankey and Nivo AreaBump. It shares original IDs across both views, uses eleven five-year periods (1970–2024), and provides Count/Percentage, keyboard selections, an exact-values table, and reduced-motion handling. It follows the presentation’s existing light/dark palette and narration. See [source and interaction contract](docs/flight-exploration-source.md) and the [motion/UX PASS](docs/flight-exploration-motion-review.md).

The committed `public/data/flight-exploration.json` lets a fresh checkout run without the ignored raw snapshot. To regenerate from the matching retained source, use `npm run data:flight`; to verify it without writing, use `uv run python scripts/build_flight_exploration.py --check`.

Run `npm run test:flight` for the production-browser regression checks (requires Google Chrome). The Playwright web-server configuration builds and starts the site unless port 5175 already serves a local preview. Set `FLIGHT_SCREENSHOT_DIR` to an existing absolute directory to retain desktop/mobile screenshots.
