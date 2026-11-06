# Living design scratchpad

Updated October 24, 2026. Working notes from our conversation, **not an implementation specification**. Keep decisions, proposals, and unknowns distinct as our thinking changes. Historical research remains in the other documents; it does not silently settle current choices.

## Agreed working relationship

The user and main assistant design together. The main assistant holds the whole presentation in view as designer and reviewer; agents implement small, agreed pieces that can be integrated or returned with critique. A discussion is not authorization to build the whole experience.

Develop purpose, narrative, evidence, graphs, and meaningful interactions before committing to aesthetics. Revisit earlier choices when evidence changes them. Prefer OSS libraries and documented composition. If a bespoke component or visualization mechanism seems necessary, stop and deliberate with the user about the need and alternatives.

**Explicit user instruction:** whenever a chart or animation mechanism is needed, consult [awesome-d3](https://github.com/wbkd/awesome-d3) and relevant documented options before handrolling it. The user likes [Potion](https://github.com/finnfiddle/potion) for animation use cases. Record it as a preferred candidate to evaluate, not an installed or adopted dependency. Its React component model and current compatibility need checking against our HTML/D3 substrate.

The substrate is a new desktop-first HTML page hosted by Reveal.js, not Paper. **D3 is the agreed visualization engine.** Views should remain independent of the Reveal API. Scrollytelling remains possible; switching hosts may involve lifecycle and state handling as well as transitions. No theme is selected. Historical `d3-story-scenes` guidance remains in Git; its old renderer preferences are superseded, not restored wholesale.

## Current state: narrative redesign and requested graphs implemented

The user requested a more distinctive presentation, thought about its arc before implementation, a climax in the middle or right of the middle, and agents to implement interactive count/rate charts and an inspectable flight-phase Sankey.

The local review draft now has seven beats: invitation → annual fatal-accident counts → aligned counts/rates → a perspective hinge → count/exposure reveal → phase exploration → quiet return to the passenger. The working climax is page 5 of 7. The [draft 1 plan](draft-1-plan.md) records composition, interaction, evidence boundaries, and alternatives.

The design uses typographic scale, serif emphasis, a neutral window motif, and distinct page densities while preserving existing theme/data-color roles. No new theme is declared final. Bootstrap components and the earlier component showcase remain available.

The count chart and absolute/relative comparison share the verified NTSB cohort. The Sankey classifies the existing worldwide accident archive by operation and recorded phase; it does not fabricate an all-flight journey. Hover/focus and pin/reset reveal exact values; tables retain inspectable data. The supplied two-passenger reference is now included in the local draft's hinge page under public/assets/.

The original near-100% safe-flight concept remains unresolved by the retained data. The implementation uses the supported 17 fatal accidents / 187,608,748 departures contrast as a provisional working climax instead of presenting the arithmetic complement as an observed safe-flight share. This design choice is a reviewable proposal, not user agreement to abandon the original concept.

## Agreed data workflow

**Use existing project datasets exclusively; do not fetch new datasets.** Inspect the retained data using ad hoc queries (DuckDB is acceptable), rather than creating bespoke inspection scripts for each question. The assistant-authored `prepare_safety_trend.py` inspection/extraction script has been deleted at the user's request. Existing datasets and original project data tooling are retained; retention is not authorization to run new downloads. The saved NTSB audit remains historical evidence, not a promised executable reproduction workflow.

Future presentation assets belong in `public/assets/`, served by Vite at `/assets/`.

## Agreed color rules

Provide **at least four visualization-only colors**, separate from text and UI colors. Marks need stronger contrast against their background and distinguishable series. Themes must preserve category identity; labels and line styles supplement color rather than leaving meaning dependent on hue alone. Data geometry remains stable across themes.

Four-color candidates drawn from ColorBrewer Paired are intended for showcase review. Their selection for testing does not settle a final palette or theme.

## Agreed meaning of “safe”

For this story, **safe means a flight with no fatal accident**. The chart label should be **“Flights without a fatal accident”**; broader uses of “safe” need this qualification.

`Share = 1 − (flights involved in fatal accidents / all eligible flights)`

Numerator and denominator must cover the same population and period. This is not passenger survival probability; a flight without a fatal accident can still involve an accident or injuries. Source definitions must settle which fatalities count, including ground deaths. Accident-event counts cannot automatically substitute for flight counts: one event can involve multiple aircraft.

## Narrative intent and working intuition

Reassurance should be grounded in inspectable evidence. Shift attention from salient accidents toward the ordinary successful journeys that establish the denominator, without dismissing fear or hiding remaining risk.

The user's priorities are: improving absolute counts and rates; comparison with everyday risks; commercial passenger safety relative to other flights; technical safety improvements; and flight-phase patterns across short and long journeys. These are intended messages awaiting evidence, not established findings. Avoid promising annual decline, claiming all technical failure domains are conquered, or assuming short-/long-haul similarity. Risk comparisons need compatible outcomes and exposure.

The proposed climax inverts the question: the share without fatal accidents approaches **100%**, while its gap to 100% approaches zero. The gap may be so small that inspection requires zooming. Proposed treatment: establish the full scale, then magnify the gap while retaining a full-scale reference. Complementary frames must use identical cohorts, periods, and definitions; annual fluctuations remain honest.

The [two-passenger meme](references/same-journey-different-view.png) suggests **“Same journey. Different view.”** Proposed placement, not approved implementation: introduce it before inversion, asking “What changes if we look through the other window?” It reframes attention to the same evidence, not the facts themselves. The [flight-journey sketch](references/narrative-flight-sketch.png) can orient the experience without forcing graphs into flight shapes. Both images are supplied references; preservation does not establish ownership or publication rights.

Our design tests: does the first impression survive inspection? What new understanding does each interaction produce? Do grouping, metaphor, and aesthetics clarify the intended comparison? Positive framing must remain examinable.

The [D3 inspiration notes](d3-inspiration.md) separate observed library capabilities from candidate applications. They remain reversible research, with no new adoption or narrative commitment.

## Still open

- Eligible flight population, geography, period, and compatible numerator/denominator sources.
- User review of the implemented narrative order, editorial treatment, and interactions.
- Whether the tested Bootstrap/Bootswatch compositions fit, plus visual language and theme choice.

## Provisional evidence for the component specimen

The [NTSB source audit](safety-trend-source.md) establishes a matched 2005–2024 annual series for U.S. Part 121 air carriers, including passenger and cargo, scheduled and nonscheduled operations. Fatal-accident **counts and rates per departure** are verified and available for the live component specimen. The selected source population remains provisional for the final story.

Fatal accidents include ground fatalities. An aircraft-level audit resolves fatal-event versus eligible-aircraft multiplicity in this window, but the source does not directly enumerate completed flights linked to outcomes. Therefore an exact observed safe-flight share is not yet established: `safePercent` remains unset, and the mathematical rate complement must not silently acquire that label. This measurement question does **not** change the user's agreed meaning of safe or discard the planned 100% reveal.

The source-backed graph implementations and visual treatment are now reviewable locally. Final narrative scope, the near-100% measurement, and final theme choice remain open.

## Second visualization · October 25, 2026

Requested and implemented: animated decade counts for the exact PlaneCrashData Scheduled Revenue Flight category. Exact title retained: “Aviation has been getting safer and safer through the decades”. Five pauses reveal 1950s–1960s → 1970s peak → 1980s–1990s decline with technology and training context → 2000s–2010s → separate partial 2020–2024 bar. Shared navigation, D3 transitions, reversible beats, reduced motion, and inspectable source table.

Evidence changes the initial hypothesis: 1970s is the peak (923), not a dip; the decline follows, reaching 269 in the 2010s. 2020–2024 has 44 records over five years. The category ends mid-2025, so that year is excluded. Worldwide archive counts include nonfatal outcomes and do not establish risk per flight or causal attribution. Historical GPWS and CRM sources contextualize the change without explaining its magnitude. See [source and beat notes](decade-trend-source.md).

Follow-up: the user requested a bar-to-line morph. Added a sixth beat: connect the bar tops at their horizontal centers, then fade the bars, retaining exact labels and scales. The partial 2020–2024 period becomes an unconnected hollow diamond.

Playback follow-up: a top Manual / Auto toggle controls the second visualization. Auto waits two seconds after each completed beat, then advances, stopping on the final line chart. Manual is the default; Pause/Resume, Back, Replay, and slide departure cancel or resume scheduled playback explicitly.

## Motion direction revision · October 26, 2026

Latest user direction supersedes the six-beat treatment: three beats (rise/peak, sustained decline, partial decade plus line transformation). The final segment MUST be dashed, rather than omitted; the five-year label and hollow marker remain. Move playback out of the chart into a quiet header icon beside the sun/moon theme switch, replacing Appearance. Timing is provisional for a later motion-design pass. Music is a future addition only.


## Linked phase/cause exploration · November 5, 2026

User-approved prototype transferred to the `flight-phase` chapter, almost unchanged in chart structure. Current confirmed scope: exact Scheduled Revenue Flight label, 1970–2024, eleven complete five-year bins; 2025 is the right boundary. The sequential Sankey partitions accident records by phase (with ground/missing separate), rather than measuring successful flights. Nivo AreaBump shows Weather, Technical, Human Factor, Intentional Acts; Others and Not Recorded are retained in source/Sankey and disclosed below the cause chart. Count/Percentage toggles use the same selected identities and an explicit four-cause denominator.

One optional explore beat; no autoplay selection or new click gate. Added keyboard equivalents, exact-value table, focus-aware cause jump, and reduced-motion lifecycle. Source JSON is generated from the retained Parquet with ID/checksum/partition checks. Reviewed against existing narration and style; motion/interaction expert gave a PASS after code and desktop/mobile screenshots. See [source contract](flight-exploration-source.md) and [review](flight-exploration-motion-review.md). The prior operation→phase taxonomy component remains only for historical/component-study use.


## Opening-page polish · November 5, 2026

Back on `main` at the user's request. The opener now retains the shared footer divider, height, progress rail, and Next button. The invitation tagline is removed; its space introduces arrow-key navigation and scrolling on desktop, or tapping Next on phones. The arrow keys lift subtly three times and then rest. Reduced motion suppresses both this cue and the cloud drift; scenery pauses away from the cover.

The earlier cyan oval is replaced with an inline SVG aircraft window: ivory cabin trim, a recessed gasket and bevel, shade handle, blue sky, layered clouds, and a wing. No remote asset or new runtime dependency is required. This is a reviewable visual pass, not a change to the narrative or data.


Navigation correction: the user rejected the filled square Next treatment and the changing “Finish animation” label. Next now uses the lighter outlined style, a constant label and a fixed 104 × 44 px footprint across pages and chart states. Pressing it during an active reveal still settles that reveal; the navigation no longer changes its visible name or geometry to expose that playback state.


## Auto default and overhead pictograms · November 5, 2026

Checkpoint `88991d1` preserves the opening-page polish and stable Next button. The user then made Auto the default, requested tighter pacing, and explicitly prohibited automatic slide changes. Auto now runs the opening's existing fragments and both animated charts; it stops on each completed slide. The linked exploration remains user-operated.

Both charts share a small view-local playback controller with no slide-navigation API. Natural completion and an explicit Next can queue the following reveal, using 280 ms then 450 ms holds instead of a uniform two seconds. The decade timeline moves at 1,050 ms per reveal unit, with easing applied to individual marks rather than the entire multi-bar sequence. Opening holds are content-specific (900 / 1,400 / 800 / 2,600 ms), allowing the sentence, photograph, and landing to register before the closing question. These are reviewable timing choices, not evidence of a tested comprehension optimum.

Manual pauses the current reveal and cancels pending work. Back holds the earlier beat for inspection. Hidden tabs and inactive slides suspend timers and motion; Auto resumes from the retained point on return unless the reader explicitly paused. Reduced-motion Auto shows the complete static view rather than racing through intermediate states.

A delegated ImageGen study proposed overhead strips, circular wells, and sign tiles. The user rejected all of those physical/ornamental boards, then explicitly chose plain pictograms with no panel or housing and only restrained bloom. The implementation therefore uses fixed seatbelt and reading-light SVGs in generous invisible click targets. Auto and light-theme states glow; geometry stays constant. Rejected boards are exploration artifacts, not accepted direction.


Cover follow-up: the earlier header-hiding exception also hid the new utility pictograms. The cover now shows those controls in their shared top-right position, while keeping the brand/chapter links hidden and preserving the cover composition. Auto and theme can both be set before starting the story; that playback choice carries into the opening.


## Phase explanation moved to slide 5 · November 6, 2026

At the user's request, `flight-phase` now directly follows the decade chart. It builds departure → in-flight → arrival records, with a right-hand leading-cause explanation. The commentary is short and descriptive; source/method details remain inspectable below.

The Sankey and cause chart accumulate the same original-ID subset at every committed reveal update. The commentary describes only the current added phase; selecting a phase explicitly finishes the build and focuses all views on that cohort. Both charts rewind together. Ground/missing-phase records stay in their separate branch. Next remains stable and Auto never changes slides. See the updated [interaction/evidence contract](flight-exploration-source.md) for exact counts, timings, and reveal ordering.


## Directional phase reveal — November 6

Checkpoint `ec22701` preserves the cumulative width-fill version. The revised Sankey keeps the final layout fixed and draws each phase's bands along their consecutive paths. Earlier phases no longer thicken or move as new ones enter. The front advances left to right on desktop and top to bottom on mobile, while the existing source-ID membership updates continue to drive commentary, totals, and cause cells together. Intermediate stroke length is an animated construction state; final ribbon thickness encodes the complete phase count. Ground/missing-phase records retain their separate completion branch. Tests cover segment order, fixed geometry, hidden future bands, retained completed routes, and Pause alongside the existing identity/playback checks.


## Opening revision — November 6

The cover uses the shared footer without enlarged keycaps or displaced hints. The page counter remains visible; Back is disabled on the cover. Eric Shao was removed from the team credit at the user's request.

The Flight 1282 opening now follows the user's sequence: Oregon map / Portland pulse (0), date and location (1), airline (2), flight number (2.5), Portland International Airport departure (3), six-minute clause (4), panel separation and photograph together (4.5), safe return / no fatalities (5), personal question with all earlier copy retained (6), then a scene-wide fade to the data invitation (7). Auto remains slide-local and manual navigation retraces every beat. Reduced-motion Auto keeps the complete story readable instead of hiding it behind the final invitation.

**Resolved in the November 6 slide 3 sequence revision:** removed “To see whether that picture holds beyond 2005, let’s add the following years.” The user explicitly deferred this edit until we reach slide 3; do not alter that slide during the opening revision.


## Whole-phrase reveal restored — November 6

The user rejected the streaming experiment. Removed the streaming component, cursor, trial renderer links, dependency, and stream-specific navigation. Large headings must fade in together as complete phrases. Retained the requested panel/photo move to Beat 5 and its 1,300 ms suspense hold, with the later labels 6 (safe return), 7 (question), 8 (data invitation). The cover/footer, current team credit, Oregon map, accumulated narrative, and pending slide 3 edit remain as requested.


## Scale comparison sequence — November 6

After checkpointing and pushing the opening as `bcdc598`, the next slide now follows the user's 0 / 1 / 2 / 2.5 / 3 / 3.5 / 4 / 5 / 6 cues. Headline clauses fade in as complete phrases. First the fatal-accident count rises; the perspective clause appears; then departures rise. The lower text accumulates the one-year / add-more / tiny-fraction explanation, replaces it with a fair-coin scale comparison, then transitions to the historical-safety question. Years continue cumulatively through the last four cues, while commentary changes independently. The old deferred “To see whether that picture holds…” sentence is now gone. The script uses “fatal accidents,” matching the controlling source's count (which includes ground fatalities). Coin probability and observed accident/departure frequency are explicitly named as separate quantities. Source, timings, transport behavior, and the calculation are in [scheduled-service-source.md](scheduled-service-source.md).

Follow-up: Auto now stops at Reveal 8 of 9 (the coin comparison). The final question opens only on explicit Next. Coins flip to heads one at a time using the same pausable D3 clock; reduced motion shows all 24 heads immediately while retaining the stop before the question.
