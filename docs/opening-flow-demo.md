# Opening flow demo

October 25, 2026. Reviewable narrative proposal, not a final script.

Updated November 6, 2026. The opening has ten visible states, preserving the user's half-beat labels:

| Beat | New material | Hold before next beat |
| --- | --- | --- |
| 0 | Oregon outline, Portland pulse on the right | 700 ms |
| 1 | 5 January 2024 / Portland, Oregon | 950 ms |
| 2 | Alaska Airlines | 650 ms |
| 2.5 | Flight 1282 | 900 ms |
| 3 | Departure from Portland International Airport | 1,500 ms |
| 4 | Six minutes into the flight, | 1,300 ms of suspense |
| 5 | Panel separation; NTSB photograph enters as map fades | 2,400 ms |
| 6 | Panic, safe return, no fatalities | 3,300 ms |
| 7 | Personal question; all earlier text remains | 3,300 ms |
| 8 | Entire scene fades out; invitation to inspect data fades in | Wait for explicit Next |

The map is present before any story copy. Airline and flight number have separate reveals; the panel clause and photograph share one fragment index. The question appends to the story instead of replacing it. Only the final invitation replaces the scene. Auto controls these reveals within the slide and never changes slides. Back holds the earlier fragment. Reduced-motion Auto presents all narrative copy and the invitation together as a static, scrollable view.

Oregon's geographic outline is an inline SVG generated with D3 geoMercator from the Oregon feature in [PublicaMundi's US states GeoJSON](https://github.com/PublicaMundi/MappingAPI/blob/master/data/geojson/us-states.json). The Portland marker uses the city coordinate (-122.6765, 45.5231), not a flight track or separation location. The outline is a requested map asset, separate from the retained analytical datasets. No map service or runtime request is needed.

## Whole-phrase reveal restored — November 6

The streaming experiment was rejected and removed, including its cursor, renderer trials, dependency, and changed Next behavior. Headings and body phrases fade in as complete units. The panel/photo remains at Beat 5 with the longer suspense hold; later labels remain 6–8. Next advances one beat, and Auto stays within the slide.

## Factual boundaries

- Flight 1282: January 5, 2024, about six minutes after takeoff. The door plug separated; the aircraft returned to Portland. No fatalities; one flight attendant and seven passengers sustained minor injuries.
- Reference: [NTSB press release](https://www.ntsb.gov/news/press-releases/Pages/NR20250624.aspx) and [AIR-25-04](https://www.ntsb.gov/investigations/AccidentReports/Reports/AIR2504.pdf).
- `public/assets/flight-1282-cabin.jpg` is Figure 1 extracted from report page 7 (PDF page 21). Original seat labels are retained. This is an authentic photograph, not a generated reconstruction.
- This nonfatal event is not part of the fatal-accident numerator. The graph changes to U.S. Part 121 scheduled-service data for 2005–2024. See [scheduled-service-source.md](scheduled-service-source.md); a revenue-only filter remains unverified.
- This comparison addresses fatal accidents per departure. It does not answer the probability of an incident like the opening event, or establish that nonfatal incidents are harmless.

## Review questions

Does the photograph leave enough room to absorb the outcome? Does the question invite curiosity without prescribing reassurance? Does the move from a 2024 nonfatal event to historical fatal accidents feel sufficiently explicit? The decade trend and linked phase/cause explanation are live. The perspective hinge, central reveal, and closing callback remain placeholders.

## Navigation revision

The cover, story fragments, chart beats, and placeholders now share one neutral footer with Back/Next and arrow-key navigation. The footer identifies the current slide and reveal. Separate blue calls to action have been removed. Next settles a running chart reveal; Back retraces count beats, and returning from the following slide restores the completed comparison. Pause and Replay remain secondary controls under the graph.

## Reading-time adjustment — November 6, 2026

At the user's request, Auto holds now total 21.1 seconds instead of 15 seconds. The map/date/airline/flight/departure/suspense/photo/outcome/question holds are 1,000 / 1,400 / 900 / 1,200 / 2,300 / 1,800 / 3,500 / 4,400 / 4,600 ms. Longer sentence, photograph and reflection beats receive the largest increases. Whole-phrase fade timing and explicit slide navigation are unchanged.
