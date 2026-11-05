# Story navigation and reveal controls

The footer owns deliberate story navigation. Left/Right and P/N are shortcuts when focus is outside an interactive control. Up/Down, Space and Page keys retain browser reading behavior. Touch gestures scroll rather than changing slides; the footer remains available for navigation.

While a chart reveal is running or paused midway, Next becomes **Finish animation**. It settles the current reveal at its exact endpoint and pauses automatic sequencing. The next activation starts the next reveal or moves to the next slide. Pause/Resume retains the current animation position. Back immediately reverses a reveal; at its opening state it returns to the previous slide.

Leaving a chart pauses it. Returning through Back or a chapter link restores its last state. Replay explicitly restarts the chart. The footer separates a stable slide position from its reveal position, for example “3 of 8 · Reveal 2 of 4.”

**Auto reveals** appears only on charts implementing automatic reveal sequencing (currently the decade chart). The pressed state enables that preference. It never advances to another slide. Finish pauses auto sequencing; Resume or an explicit Next continues it. Chapter links remain available.

The decade plot fits all eight periods on narrow screens, using rotated labels and smaller exact counts. Its partial-decade marker remains visible. This changes layout only; counts, scope and narration are unchanged.

Validation: `npm run test:story` checks exact endpoints, Pause/Finish, Back and chapter re-entry, Replay, reading keys, Auto boundaries, and mobile period visibility. `npm run test:flight` checks selection IDs, native chart controls, themes and reduced motion. Playwright builds the production site before serving it for tests when no preview server is already running.
