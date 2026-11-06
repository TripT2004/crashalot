# Seventh slide: the central reveal (needle in a haystack)

Owner: Tom. Built from process book sketch 21, "Needle in a haystack", the second-ranked final selection, and the TA's Phase 1–2 feedback: more variety than bar charts, a continuous story, clearer navigation, and brushing and linking.

## Data

Same cohort as the single-year comparison on slide 3, so both slides refer to the same flights, period and definition.

- **Departures and fatal accidents per year:** NTSB Table 6, U.S. air carriers under 14 CFR Part 121, scheduled service, 2005–2024 (`public/data/scheduled-service.json`, from the retained workbook `data/reference/ntsb-aviation-statistics-2005-2024.xlsx`). Totals: 9 fatal accidents and 184,082,802 departures.
- **The 9 individual fatal accidents:** the retained Table 29 audit (`data/reference/ntsb-part121-fatal-aircraft-audit.json`), filtered to `schedule == "Scheduled"`. Date, aircraft, fatal injuries and NTSB event ID.
- **Flight-based numerator:** the audit shows each 2005–2024 scheduled fatal accident involved exactly one eligible Part 121 aircraft. Fatal accidents therefore equal departures with a fatal accident, which settles the placeholder's open condition. Fatal accidents include fatal injuries on the ground.

`public/data/safe-departures.json` was assembled once from those two retained files with an ad hoc command. No data was downloaded. The build asserted that each year's audited accident count equals Table 6's fatal-accident count and that departures sum to 184,082,802. `tests/safe-departures.spec.js` repeats those checks against the served JSON.

Share of departures without a fatal accident = 1 − 9 / 184,082,802 = **99.999995%**, about 1 fatal accident per 20.5 million departures. This is the same ratio slide 3 states with the coin comparison.

## Encoding

- One column per year, 2005–2024. Each dot is 100,000 departures, rounded per year (about 1,840 dots). Column height therefore follows that year's departures, and the 2020 dip is visible.
- Departures use the departures color from slide 3 (`--viz-series-2`). Fatal accidents use slide 3's fatal red (`--bs-danger`).
- **Needles:** the dot holding each fatal accident sits in its year's column at a height set by its date (January at the top). Its position inside a dot at zoom levels 2 and 3 is illustrative, and the source drawer says so.
- **Year strip:** each year's fatal-accident count sits under its column (red when above zero). It is also the brush.
- **Flight 1282:** a dashed ring marks a January 2024 dot. The flight is a nonfatal Part 121 scheduled accident, so it is one of the departures without a fatal accident.

## Story beats

Five beats, each one Next. The layout fills the space between the slide heading and the footer at any window size, so the slide does not scroll on desktop. It picks the dots-per-row that gives the largest dots.

| Beat | Panel | Chart |
|---|---|---|
| 1 | "Remember the 24 heads in a row?" Callback to slide 3's coin comparison | Dots pour in year by year, left to right; a rolling counter reaches 184,082,802 departures |
| 2 | "Now add the 9 that had a fatal accident." | The 9 needles drop in one at a time in date order, with a ticker naming each; the counter ends at "9 of 9 · 99.999995% had none". Needles are drawn far larger than life, and the copy says so. |
| 3 | "How often do you fly?" | Lifetime-odds calculator (slider, 1–100 flights a year, default 4) |
| 4 | "Flight 1282 is in here too." Callback to the opening slide | The magnifier opens over Flight 1282's January 2024 dot, showing the NTSB cabin photograph with a leader line to the dot |
| 5 | "Now find the needles yourself." | Exploration: click-to-zoom, brushing, linked readout, calculator and accident list |

Auto plays through the beats and stops at beat 5. It never changes slides. Back and Next retrace the beats; Next during an animation finishes it. Reduced motion shows each beat's end state.

## Lifetime-odds calculator

Odds that any of a reader's flights over 60 years is a departure with a fatal accident, treating each flight as an independent draw at the observed rate p = fatal accidents ÷ departures: 1 − (1 − p)^(flights per year × 60), rounded to two significant figures. All years: 4 flights a year gives about 1 in 85,000, and 25 a year about 1 in 14,000. The panel states that this counts departures with a fatal accident, not the reader's chance of being hurt, since 6 of the 9 had a single fatality. During exploration the calculator follows the brushed period, which makes it a fourth linked view. A period with no recorded fatal accident shows no odds and states that zero recorded is not zero risk.

## Interactions

**Click-to-zoom with labeled levels.** Clicking a dot opens a circular magnifier at that spot. A persistent label always names the level:

- Zoom 1 of 3 · ×1 · 1 dot = 100,000 departures
- Zoom 2 of 3 · ×100 · 1 dot = 1,000 departures (the clicked dot's 100 sub-dots)
- Zoom 3 of 3 · ×100,000 · 1 dot = 1 departure (1,000 single departures)

At zoom 3 a needle shows as a single red departure with a tooltip (date, aircraft, fatal injuries). A non-needle dot reads "No fatal accident among these 1,000 departures." Zoom out steps back one level. "Zoom to a needle" cycles through the needles in the selected period.

**Brushing and linking (course requirement).** Dragging across the year strip selects a period that snaps to whole years. The selection updates four linked views:

- the haystack: columns outside the period fade;
- the readout: percentage, departure count and fatal-accident ratio for the period;
- the lifetime-odds calculator: odds at that period's rate;
- the accident list: the accidents in that period.

Hovering a list item highlights its ring, and clicking it zooms to that needle. From/To selects and an All years button provide a keyboard equivalent. A period with no recorded fatal accident (e.g. 2010–2017, 73,653,256 departures) shows 100%, and the calculator notes that zero recorded is not zero risk.

## Limits stated on the page

U.S. scheduled service only, not worldwide. If the team migrates slide 3 to a worldwide source, this slide must migrate with it. Departures are not passengers: a departure without a fatal accident can still involve an accident or injuries, as Flight 1282 did.

## Verification

`npx playwright test tests/safe-departures.spec.js` covers data reconciliation, all five beats and Back, the calculator values, the Flight 1282 photo lens, every zoom level, finding a needle, brush and select linking (including the calculator), Auto stopping at exploration without changing slides, and no scrolling at 1366×768. The full suite passes apart from `scale-sequence.spec.js › mobile: the analogy and Pause remain above the fixed footer`, which already fails on `main` before this change. Reviewed in light and dark themes at 1440×900, 1366×768 and 390×844.
