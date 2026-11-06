# Opening comparison: scheduled service

The opening comparison now uses the retained NTSB workbook, Table 6 (scheduled service), rather than Table 5 (scheduled and nonscheduled combined). Source file: `data/reference/ntsb-aviation-statistics-2005-2024.xlsx`. Prepared chart data: `public/data/scheduled-service.json`.

Extracted A6:O25 with ad hoc Python standard-library XML reads, without another download or a new inspection script. Column D supplies fatal accidents; I supplies departures. Verified 20 consecutive years (2005–2024), exact integer totals, and every annual D/I × 100,000 against column O.

The user's desired population is scheduled revenue flights. Table 6 establishes scheduled service but does not separately verify revenue-only operations. Do not describe the cohort as verified revenue-only, worldwide, or passenger-only. Fatal accidents include ground fatalities. The on-slide copy is intentionally minimal; source and definition remain in this note and chart metadata. Later slides retain their existing cohorts pending iteration.

## Motion

Use one D3 timer for continuous bar geometry and scale. Round only the numeric readouts. Quintic smoothstep gives zero velocity and acceleration at the ends; the shared scale expands with a smooth magnitude function. Axis ticks maintain numeric identity, move with the same scale, and fade when tick density changes. Cache layout during resize instead of measuring on each frame. Preserve pause/resume, replay, and reduced motion.

References consulted: [D3 axis](https://d3js.org/d3-axis), [D3 transitions](https://d3js.org/d3-transition), [Material motion](https://m3.material.io/styles/motion), [duration and easing](https://m1.material.io/motion/duration-easing.html). Quantitative marks must not overshoot their actual totals.

## Progressive interval

The comparison begins with 2005 alone: 3 fatal accidents and 10,910,460 departures. The original two-second accident rise and seven-second departure rise apply to this first year. The complete first-year comparison holds for 1.5 seconds. Then each subsequent source year is added cumulatively over 650 ms, reaching 2005–2024: 9 fatal accidents and 184,082,802 departures. The prominent date displays the year currently being added. Pause/resume and replay cover the full sequence.

One d3-svg-annotation callout appears after the first-year impact, anchored to the actual subpixel bar endpoint and updated with the cumulative count. It does not enlarge the bar. Source notes remain outside the minimal slide UI. The annotation package's transitive d3-color is overridden to ^3.1.0; npm audit reports no vulnerabilities.

## Rolling number polish

NumberFlow's vanilla web component (`number-flow`, MIT; https://number-flow.barvian.me/vanilla) now renders the accident count, departure count, and growing interval end year. Its continuous plugin rolls digits upward. Count updates are paced to 80 ms with 140 ms spin timing, while bars retain the frame-driven continuous D3 geometry. Year updates use 300 ms spins within each 650 ms year addition. The component respects reduced motion, resets directly on replay, and settles to exact integer totals. The redundant sentence beneath the chart is removed; the anchored annotation explains the subpixel accident bar.

The fatal-accident series now uses the theme's danger red; departure bars retain series 2. Each rolling counter inherits precisely its bar's CSS color, and the callout follows the accident red. After the first-year impact, “Now let’s move through the years.” fades in and lifts into place over 600 ms during the existing 1.5-second hold, before cumulative expansion begins. Pause/replay stay above this line.


## Authored slide 3 sequence — November 6, 2026

Checkpoint `bcdc598` preserves the approved opening and was pushed to main before this revision. The scale comparison now separates text cues from numeric motion:

| Beat | Reveal | Auto timing |
| --- | --- | --- |
| 0 | Let’s start with a single year. Counts are zero. | 850 ms |
| 1 | First-year fatal accidents increase to 3. | 2,000 ms motion + 350 ms hold |
| 2 | The whole subtitle fades in: “and put its accident count into perspective.” | 1,100 ms |
| 2.5 | First-year departures increase to 10,910,460. | 7,000 ms motion + 650 ms hold |
| 3 | “That’s only one year.” appears below the chart. | 1,500 ms |
| 3.5 | “Let’s add more.” joins it; subsequent years start accumulating. | 1,600 ms |
| 4 | “Fatal accidents are a tiny fraction of departures.” joins the explanation. | 2,600 ms |
| 5 (Reveal 8 of 9) | Under-chart text is replaced with the fair-coin comparison. The 24 coins flip to heads in order. | Finish years and coins, then wait indefinitely for Next |
| 6 (Reveal 9 of 9) | Explicit Next transitions to “But have planes always been this safe?” | Wait for explicit Next to leave the slide |

Year accumulation takes 650 ms per additional source year and continues underneath Beats 3.5–6. Commentary changes do not settle the whole remaining interval. Auto stops at Reveal 8 with 2005–2024 totals of 9 fatal accidents and 184,082,802 departures. One explicit Next opens the final question; a further Next navigates. If the reader opens the question before the years finish, Next can settle those remaining years first. Pause/Resume, Manual, visibility changes, and inactive slides suspend numeric motion as well as pending Auto cues. Back restores the data snapshot at the previous cue; Replay starts from the zero-count opening. Reduced-motion Auto shows the complete static chart and all heads at Reveal 8, preserving the explicit Next for the question.

Coins share the D3 frame clock with the chart. After 450 ms for the text entrance, each flips over 170 ms, staggered 185 ms apart (one at a time, in reading order). The last head settles at 4,875 ms. Coin slots retain their geometry throughout; Pause/Resume freezes and continues the flips, and re-entering the comparison from the preceding beat resets them.

The former “To see whether that picture holds beyond 2005…” text is removed, resolving the user’s deferred request. The older motion notes above describe the superseded four-stage transport.

### Fair-coin scale comparison

Beat 5 uses a specific mathematical reference instead of mixing unlike road/flying exposure definitions. Twenty-four independent fair coin tosses have 2^24 = 16,777,216 equally likely ordered sequences; one is all heads. The [OpenStax multiplication rule for independent events](https://openstax.org/books/statistics/pages/3-2-independent-and-mutually-exclusive-events) supports this calculation. The visible comparison names both quantities: “24 fair-coin tosses, all heads: 1 in 16.8 million. This record: 1 fatal accident per [current cumulative departures / current cumulative fatal accidents] million departures.” It does not assert exact equivalence, passenger mortality, or that real flight outcomes are independent coin tosses. The rounded dynamic ratio uses the same cumulative values as the bars. The final observed ratio is approximately 20.45 million departures per fatal accident. No new analytical dataset was downloaded.

An on-page source drawer retains the controlling NTSB workbook link, annual source rows, scope, and the distinction between fatal accidents and passengers’ outcomes. Main-story copy remains short. Verification covers each authored beat, shared exact counts, cumulative years under changing text, analogy arithmetic, Auto completion, Pause/Resume, Back/Replay, stable Next geometry, and explicit slide navigation.
