# Linked flight-phase and recorded-cause chapter

Integrated November 5, 2026. This supersedes the older operation→phase component for the presentation’s `flight-phase` chapter; that component remains in the separate component study. The approved prototype’s sequential Sankey and Nivo AreaBump are preserved, with the website’s existing editorial typography, theme palette, and navigation.

## Narrative and interaction

Question: **Where in a flight do these crashes happen?** Supporting line: “Follow the recorded phase, then compare the recorded causes.” This follows the earlier worldwide decade trend while explicitly narrowing the period from 1950–2024 to 1970–2024.

This is one optional exploration beat. Next leaves the slide; chart selections never become click gates and Auto does not select anything. The phase filter updates the cause chart. A cause or cause/period highlight selects the corresponding original IDs back through the Sankey. Count/Percentage retains the selection. Leaving and returning to the chapter retains state. Clear selection or Escape resets phase/highlight while preserving the selected measure.

The page scrolls within the existing slide viewport. “Compare causes below” scrolls to and focuses the cause heading; reduced motion makes that jump immediate. Native phase/measure/legend buttons and keyboard SVG ribbon buttons are isolated from Reveal’s navigation keys. The exact-values table supplies a native keyboard path to every period/cause selection. Ground and missing phases remain outside the ordered sequence.

## Source and scope

- Existing retained source: `data/raw/planecrashdata.parquet`; no new dataset downloaded.
- Dataset: MauroPello/planecrashdata, revision `b817a96f2b9152b735c9c6570d465102f5f76c88`; publisher-declared CC BY 4.0.
- Locked retained-file SHA-256: `db334ffbab0cf67b06765038803338531fbfe23522c69b453cd8eb63a6c09b48`, from `data/sources.json`.
- Exact filter: `flight_type == "Scheduled Revenue Flight"`, year ≥ 1970 and < 2025. 2025 is the right boundary, not an included data year. Separate `Passenger - Scheduled` records are not merged.
- 2,936 distinct original record IDs, dates 1970-01-05 through 2024-12-29. These are archive aircraft-occurrence records, not verified unique incidents or the population of operated flights.
- The retained Parquet and prototype CSV were independently compared during integration: IDs, raw phase, raw cause, and year agree for all 2,936 included records.

| Recorded phase group | Records |
| --- | ---: |
| Departure / takeoff / climb | 610 |
| In flight | 655 |
| Arrival / descent / approach / landing | 1,527 |
| Ground | 82 |
| Missing phase | 62 |

Known airborne records (2,792) split into 610 departure and 2,182 later-phase records; those later records split into 655 in flight and 1,527 arrival. A later recorded phase supports the displayed classification sequence; it does not establish successful operation of earlier phases, observed flight trajectories, or a phase-specific probability of crashing.

## AreaBump semantics

Eleven equally spaced five-year periods run from 1970–1974 through 2020–2024. Tick labels appear at regular intervals appropriate to the viewport; every period retains its tick and datum. Nivo ranks ribbon order separately at each period and anchors the layout at the bottom. Smooth crossings interpolate the display; they are not observations between periods.

| Displayed cause | Records |
| --- | ---: |
| Weather | 153 |
| Technical | 643 |
| Human Factor | 1,376 |
| Intentional Acts | 81 |

The area view displays 2,253 records. Others (109) and Not Recorded (574) remain in canonical records and the Sankey; their omission from AreaBump is disclosed below it, with counts recalculated for the current phase filter. The source provides broad cause categories, not reviewed engine/systems/structure/maintenance domains.

Count uses raw records. Percentage divides each displayed cause count by the sum of the four displayed causes in the same phase-selected period. It does not divide by all archive records or flight exposure. Empty periods keep their position and use a zero value; the exact table shows “—” when there is no denominator. When units change, Nivo is remounted to avoid interpolating between incompatible count/share scales; ordinary within-unit selection changes use restrained motion. Reduced-motion users receive immediate changes.

## Portable source and identity contract

`data/flight-exploration-rules.json` owns the exact filter, maps, period policy, and display/denominator definition. `scripts/build_flight_exploration.py` reads only the retained snapshot, verifies its checksum and unique IDs, fails on unmapped categories, and checks the period partition. It writes the committed `public/data/flight-exploration.json`: source receipt, rules checksum, named projection columns, preserved source IDs/raw labels, normalized fields, and count audit. No HTML embeds a separately edited copy of the data. The presentation loads this JSON locally; React, Nivo, D3, and themes are bundled by Vite, with no chart CDN dependency.

Rebuild with `npm run data:flight`; verify without mutation with `uv run python scripts/build_flight_exploration.py --check`. The retained raw file is ignored by Git; a fresh checkout runs the presentation from its committed reviewed JSON. Regeneration requires the matching retained source, not a new unpinned download.

The component’s bubbling `flight-safety:selection` and backward-compatible `flight-phase:select` events contain dataset/revision, filter, period policy, phase cohort, optional cause/period highlight, measure, original string `recordIds`, namespaced snapshot keys, and displayed-cause denominator IDs. Keys are `MauroPello/planecrashdata@REVISION:ID`; they do not assert stability across upstream rewrites. Both charts read the same record projection and recompute memberships from those identities. Display labels and array positions are never join keys.

## Verification

- `npm run build`: production bundle succeeds.
- `npm run test:flight`: three production-browser tests cover exact linked IDs and denominator arithmetic; count/percentage state retention; keyboard controls versus Reveal navigation; Next/Back state preservation; Escape; theme changes; mobile overflow; reduced motion; and explicit cause-jump focus.
- The browser check caught and fixed a Reveal integration hazard: the area region uses a `div role="region"`, because nested `section` elements would be interpreted as additional slides.
- [Motion/interaction review](flight-exploration-motion-review.md): independent code/screenshot PASS. That review does not establish assistive-technology usability or independently validate source classifications.

Source completeness, reporting changes, event-level reconciliation, and exposure-based safety claims remain outside this chapter’s evidence. The presentation makes no claim that a change in recorded cause counts proves why aviation became safer.
