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

| Beat | Panel | Chart |
|---|---|---|
| 1 | "Remember the 24 heads in a row?" Callback to slide 3's coin comparison and the 1-in-20.5-million ratio | Full haystack |
| 2 | "99.999995% of departures had no fatal accident." Callback to the Flight 1282 opening | Flight 1282 ring appears |
| 3 | "Now find the needles." Invitation to explore | Red rings on the 9 needle dots; readout, period selectors and accident list appear |

Auto advances within the slide and stops at beat 3. It never changes slides. Back and Next retrace the beats. Reduced motion shows the final state.

## Interactions

**Click-to-zoom with labeled levels.** Clicking a dot opens a circular magnifier at that spot. A persistent label always names the level:

- Zoom 1 of 3 · ×1 · 1 dot = 100,000 departures
- Zoom 2 of 3 · ×100 · 1 dot = 1,000 departures (the clicked dot's 100 sub-dots)
- Zoom 3 of 3 · ×100,000 · 1 dot = 1 departure (1,000 single departures)

At zoom 3 a needle shows as a single red departure with a tooltip (date, aircraft, fatal injuries). A non-needle dot reads "No fatal accident among these 1,000 departures." Zoom out steps back one level. "Zoom to a needle" cycles through the needles in the selected period.

**Brushing and linking (course requirement).** Dragging across the year strip selects a period that snaps to whole years. The selection updates three linked views:

- the haystack: columns outside the period fade;
- the readout: percentage, departure count and fatal-accident ratio for the period;
- the accident list: the accidents in that period.

Hovering a list item highlights its ring, and clicking it zooms to that needle. From/To selects and an All years button provide a keyboard equivalent. A period with no recorded fatal accident (e.g. 2010–2017, 73,653,256 departures) shows 100% with the note "That is an observation, not proof of zero risk."

## Limits stated on the page

U.S. scheduled service only, not worldwide. If the team migrates slide 3 to a worldwide source, this slide must migrate with it. Departures are not passengers: a departure without a fatal accident can still involve an accident or injuries, as Flight 1282 did.

## Verification

`npx playwright test tests/safe-departures.spec.js` covers data reconciliation, all three beats and Back, every zoom level, finding a needle, brush and select linking, and Auto never changing slides. The full suite passes apart from `scale-sequence.spec.js › mobile: the analogy and Pause remain above the fixed footer`, which already fails on `main` before this change. Reviewed in light and dark themes at 1440×900 and 390×844.
