import { brushX, format, select } from 'd3';
import './safe-departures.css';
import { createBeatPlayback } from './beat-playback.js';

// Needle in a haystack: every departure in the slide 3 cohort, drawn at three labeled zoom levels.
const UNIT = 100000;          // Level 1: one dot = 100,000 departures.
const PER_COL = 4;            // Dots per row inside a year column.
const STEP = 10;              // Dot spacing in viewBox units.
const COL_GAP = 12;
const LENS_R = 150;
const levels = [
  { label: 'Zoom 1 of 3 · ×1', unit: '1 dot = 100,000 departures' },
  { label: 'Zoom 2 of 3 · ×100', unit: '1 dot = 1,000 departures' },
  { label: 'Zoom 3 of 3 · ×100,000', unit: '1 dot = 1 departure' },
];
const beats = [
  { eyebrow: 'U.S. scheduled service · 2005–2024', title: 'Remember the 24 heads in a row?', text: 'Earlier we found 9 fatal accidents in 184,082,802 departures: about 1 in 20.5 million. This is that haystack, drawn to scale. Every dot is 100,000 departures.' },
  { eyebrow: 'The same departures, counted the other way', title: '99.999995% of departures had no fatal accident.', text: 'Flight 1282 is in here too. Its door plug blew out, but it landed with no fatalities, so it counts among these dots.' },
  { eyebrow: 'Your turn', title: 'Now find the needles.', text: 'Red rings mark the 9 dots that hold a fatal accident. Click any dot to zoom in, or drag across the years below to compare periods.' },
];
const int = format(',d');
const millions = v => `${(v / 1e6).toFixed(1)} million`;
const pct = (fatal, deps) => fatal === 0 ? '100%' : `${((1 - fatal / deps) * 100).toFixed(6)}%`;
const dateLabel = iso => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const dayFraction = iso => { const d = new Date(`${iso}T12:00:00Z`); const start = Date.UTC(d.getUTCFullYear(), 0, 1); return (d - start) / (Date.UTC(d.getUTCFullYear() + 1, 0, 1) - start); };

export async function mountSafeDepartures(container) {
  const response = await fetch(`${import.meta.env.BASE_URL}data/safe-departures.json`);
  if (!response.ok) throw new Error('Departure data unavailable');
  const data = await response.json();
  const years = data.years;
  if (years.length !== 20 || data.accidents.length !== data.totals.fatalAccidents) throw new Error('Invalid departure data');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let active = false, stage = 0, range = null, zoom = null, focused = null;

  // Layout: one column per year, dots fill from the bottom; column height follows departures.
  const colW = PER_COL * STEP;
  const width = 40 + years.length * (colW + COL_GAP);
  const columns = years.map((y, i) => ({ ...y, i, n: Math.max(1, Math.round(y.departures / UNIT)), x: 30 + i * (colW + COL_GAP) }));
  const maxRows = Math.max(...columns.map(c => Math.ceil(c.n / PER_COL)));
  const base = 30 + maxRows * STEP;
  const stripY = base + 22, stripH = 34, height = stripY + stripH + 28;
  const dotPos = (c, k) => ({ x: c.x + (k % PER_COL) * STEP + STEP / 2, y: base - Math.floor(k / PER_COL) * STEP - STEP / 2 });
  const dots = columns.flatMap(c => Array.from({ length: c.n }, (_, k) => ({ year: c.year, col: c, k, ...dotPos(c, k) })));
  // A needle sits in its year column at a height set by its date: January at the top, December at the bottom.
  // Its position inside that dot (zoom 2 and 3) is illustrative.
  const needles = data.accidents.map((a, i) => {
    const c = columns.find(col => col.year === Number(a.date.slice(0, 4)));
    let k = c.n - 1 - Math.min(c.n - 1, Math.floor(dayFraction(a.date) * c.n));
    while (dots.some(d => d.needle && d.col === c && d.k === k)) k = (k + 1) % c.n;
    const dot = dots.find(d => d.col === c && d.k === k);
    dot.needle = { ...a, sub: (i * 37 + 11) % 100, leaf: (i * 389 + 97) % 1000 };
    return dot;
  });
  const callCol = columns.find(c => c.year === Number(data.callout.date.slice(0, 4)));
  const callDot = dots.find(d => d.col === callCol && d.k === callCol.n - 1 - Math.min(callCol.n - 1, Math.floor(dayFraction(data.callout.date) * callCol.n)) && !d.needle) || dots.find(d => d.col === callCol && !d.needle);

  const root = select(container).append('div').attr('class', 'safe-departures');
  const grid = root.append('div').attr('class', 'safe-departures__grid');
  const plot = grid.append('div').attr('class', 'safe-departures__plot');
  const zoomBar = plot.append('div').attr('class', 'safe-departures__zoombar');
  const zoomLabel = zoomBar.append('p').attr('class', 'safe-departures__zoom').attr('aria-live', 'polite');
  const zoomControls = zoomBar.append('div');
  const zoomOut = zoomControls.append('button').attr('type', 'button').attr('class', 'text-button').text('Zoom out').on('click', () => setZoom(zoom && zoom.level === 2 ? { ...zoom, level: 1, sub: null } : null));
  const findNeedle = zoomControls.append('button').attr('type', 'button').attr('class', 'text-button').text('Zoom to a needle').on('click', () => {
    const pool = range ? needles.filter(d => inRange(d.year)) : needles;
    const target = pool.length ? pool[(pool.indexOf(focused) + 1) % pool.length] : needles[0];
    focusNeedle(target); setZoom({ dot: target, level: 1 });
  });
  const svg = plot.append('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('role', 'img')
    .attr('aria-label', 'Every U.S. scheduled departure from 2005 to 2024 as dots of 100,000, with the 9 departures that had a fatal accident marked');
  svg.append('desc').text(`${int(data.totals.departures)} departures in 20 yearly columns. 9 had a fatal accident: ${data.accidents.map(a => `${a.date} ${a.aircraft}`).join('; ')}.`);
  const clip = svg.append('defs').append('clipPath').attr('id', 'safe-departures-lens');
  const clipCircle = clip.append('circle').attr('r', LENS_R - 2);

  const dotLayer = svg.append('g').attr('class', 'safe-departures__dots');
  const dotSel = dotLayer.selectAll('circle').data(dots).join('circle')
    .attr('cx', d => d.x).attr('cy', d => d.y).attr('r', 3.9)
    .on('click', (event, d) => { event.stopPropagation(); setZoom({ dot: d, level: 1 }); });
  const ringSel = svg.append('g').selectAll('circle').data(needles).join('circle').attr('class', 'safe-departures__ring')
    .attr('cx', d => d.x).attr('cy', d => d.y).attr('r', 7)
    .on('pointerenter', (event, d) => { focusNeedle(d); showTip(event, d.needle); })
    .on('pointerleave', hideTip)
    .on('click', (event, d) => { event.stopPropagation(); setZoom({ dot: d, level: 1 }); });
  const call = svg.append('g').attr('class', 'safe-departures__call');
  call.append('circle').attr('cx', callDot.x).attr('cy', callDot.y).attr('r', 8);
  call.append('line').attr('x1', callDot.x).attr('x2', callDot.x).attr('y1', callDot.y - 9).attr('y2', 22);
  call.append('text').attr('x', callDot.x).attr('y', 14).attr('text-anchor', 'end').text('Flight 1282 · no fatalities');

  // Year strip: fatal-accident counts per year, and the brush that selects a period.
  const strip = svg.append('g').attr('class', 'safe-departures__strip');
  const cells = strip.selectAll('g').data(columns).join('g').attr('transform', c => `translate(${c.x},${stripY})`);
  cells.append('rect').attr('width', colW).attr('height', stripH).attr('rx', 3);
  cells.append('text').attr('class', 'safe-departures__count').attr('x', colW / 2).attr('y', 15).attr('text-anchor', 'middle').text(c => c.fatalAccidents);
  cells.append('text').attr('class', 'safe-departures__year').attr('x', colW / 2).attr('y', 29).attr('text-anchor', 'middle').text(c => `’${String(c.year).slice(2)}`);
  svg.append('text').attr('class', 'safe-departures__strip-label').attr('x', 30).attr('y', stripY + stripH + 20).text('Fatal accidents per year · drag across years to select a period');
  const brush = brushX().extent([[columns[0].x - COL_GAP / 2, stripY - 4], [columns.at(-1).x + colW + COL_GAP / 2, stripY + stripH + 4]])
    .on('brush end', event => {
      if (!event.sourceEvent) return;
      if (!event.selection) { setRange(null); return; }
      const [a, b] = event.selection.map(px => columns.reduce((best, c) => Math.abs(c.x + colW / 2 - px) < Math.abs(best.x + colW / 2 - px) ? c : best).year);
      setRange([Math.min(a, b), Math.max(a, b)], event.type === 'end');
    });
  const brushG = svg.append('g').attr('class', 'safe-departures__brush').call(brush);

  // Lens: a magnified view of one dot, opened where the reader clicks.
  const lens = svg.append('g').attr('class', 'safe-departures__lens').attr('hidden', true).on('click', event => event.stopPropagation());
  const lensBg = lens.append('circle').attr('r', LENS_R).attr('class', 'safe-departures__lens-bg');
  const lensDots = lens.append('g').attr('clip-path', 'url(#safe-departures-lens)');
  const lensCaption = lens.append('text').attr('class', 'safe-departures__lens-caption').attr('text-anchor', 'middle');
  svg.on('click', () => { if (zoom) setZoom(null); });

  const tip = plot.append('div').attr('class', 'safe-departures__tip').attr('role', 'tooltip').attr('hidden', true);

  // Side panel: story beats, the linked period readout and its accident list.
  const note = grid.append('aside').attr('class', 'safe-departures__note');
  const eyebrow = note.append('p').attr('class', 'eyebrow');
  const headline = note.append('h2');
  const copy = note.append('p');
  const readout = note.append('div').attr('class', 'safe-departures__readout').attr('aria-live', 'polite');
  const periodControls = note.append('div').attr('class', 'safe-departures__period');
  const yearOptions = years.map(y => y.year);
  periodControls.append('label').text('From ');
  const fromSel = periodControls.select('label:last-of-type').append('select').attr('aria-label', 'First year of period');
  periodControls.append('label').text(' to ');
  const toSel = periodControls.select('label:last-of-type').append('select').attr('aria-label', 'Last year of period');
  [fromSel, toSel].forEach((sel, j) => sel.selectAll('option').data(yearOptions).join('option').attr('value', d => d).text(d => d)
    .property('selected', d => d === (j ? yearOptions.at(-1) : yearOptions[0])));
  fromSel.on('change', () => setRange([Math.min(+fromSel.property('value'), +toSel.property('value')), Math.max(+fromSel.property('value'), +toSel.property('value'))], true));
  toSel.on('change', () => setRange([Math.min(+fromSel.property('value'), +toSel.property('value')), Math.max(+fromSel.property('value'), +toSel.property('value'))], true));
  periodControls.append('button').attr('type', 'button').attr('class', 'text-button').text('All years').on('click', () => setRange(null, true));
  const list = note.append('ul').attr('class', 'safe-departures__list');

  const source = root.append('details').attr('class', 'evidence-source safe-departures__source');
  source.append('summary').text('Source, scope & exact counts');
  source.append('p').html(`Source: <a href="${data.source.url}" target="_blank" rel="noreferrer">NTSB U.S. Civil Aviation Accident Statistics</a>, retained 2005–2024 workbook. Table 6: U.S. air carriers under 14 CFR Part 121, scheduled service, the same cohort as the earlier single-year comparison. ${data.source.definition} Dots are rounded to the nearest 100,000 departures per year. A needle's year and its height within the year column follow its date (January at the top); its position inside a dot when zoomed in is illustrative. A period with no recorded fatal accident is an observation, not proof of zero risk. Flight 1282's 2024 departure is part of these counts.`);
  const table = source.append('table');
  table.append('caption').text('Departures and fatal accidents by year');
  table.append('thead').append('tr').selectAll('th').data(['Year', 'Departures', 'Fatal accidents']).join('th').attr('scope', 'col').text(d => d);
  table.append('tbody').selectAll('tr').data(years).join('tr').selectAll('td').data(y => [y.year, int(y.departures), y.fatalAccidents]).join('td').text(d => d);
  const t2 = source.append('table');
  t2.append('caption').text('The 9 fatal accidents');
  t2.append('thead').append('tr').selectAll('th').data(['Date', 'Aircraft', 'Fatal injuries', 'NTSB ID']).join('th').attr('scope', 'col').text(d => d);
  t2.append('tbody').selectAll('tr').data(data.accidents).join('tr').selectAll('td').data(a => [dateLabel(a.date), a.aircraft, a.fatalities, a.id]).join('td').text(d => d);

  root.on('keydown', event => { if (event.target.closest('button, select, summary, a') && [' ', 'Enter'].includes(event.key)) event.stopPropagation(); });

  function inRange(year) { return !range || (year >= range[0] && year <= range[1]); }
  function selection() {
    const ys = years.filter(y => inRange(y.year));
    return { from: ys[0].year, to: ys.at(-1).year, departures: ys.reduce((s, y) => s + y.departures, 0), fatal: ys.reduce((s, y) => s + y.fatalAccidents, 0), accidents: data.accidents.filter(a => inRange(Number(a.date.slice(0, 4)))) };
  }
  function setRange(next, snap = false) {
    range = next && !(next[0] === yearOptions[0] && next[1] === yearOptions.at(-1)) ? next : null;
    if (snap) {
      if (range) {
        const a = columns.find(c => c.year === range[0]), b = columns.find(c => c.year === range[1]);
        brushG.call(brush.move, [a.x - COL_GAP / 2 + 1, b.x + colW + COL_GAP / 2 - 1]);
      } else brushG.call(brush.move, null);
    }
    if (zoom && !inRange(zoom.dot.year)) zoom = null;
    if (stage < 2) stage = 2;
    render(); notify();
  }
  function setZoom(next) { zoom = next; if (stage < 2 && next) stage = 2; render(); notify(); }
  function focusNeedle(d) { focused = d; ringSel.classed('is-focused', r => r === focused); list.selectAll('li').classed('is-focused', a => focused && a.id === focused.needle.id); }
  function showTip(event, a) {
    const box = plot.node().getBoundingClientRect();
    tip.attr('hidden', null).html(`<strong>${dateLabel(a.date)}</strong><br>${a.aircraft}<br>${a.fatalities} fatal ${a.fatalities === 1 ? 'injury' : 'injuries'}`)
      .style('left', `${event.clientX - box.left + 12}px`).style('top', `${event.clientY - box.top + 12}px`);
  }
  function hideTip() { tip.attr('hidden', true); }

  function renderLens() {
    lensDots.selectAll('*').remove();
    if (!zoom) { lens.attr('hidden', true); return; }
    const { dot, level } = zoom;
    const cx = Math.max(LENS_R + 4, Math.min(width - LENS_R - 4, dot.x));
    const cy = Math.max(LENS_R + 4, Math.min(height - LENS_R - 30, dot.y));
    lens.attr('hidden', null).attr('transform', `translate(${cx},${cy})`);
    clipCircle.attr('cx', 0).attr('cy', 0);
    const needle = dot.needle;
    if (level === 1) {
      // 100 dots of 1,000 departures inside the clicked dot.
      const subs = Array.from({ length: 100 }, (_, i) => ({ i, x: (i % 10 - 4.5) * 20, y: (Math.floor(i / 10) - 4.5) * 20, needle: needle && needle.sub === i }));
      lensDots.selectAll('circle').data(subs).join('circle').attr('cx', d => d.x).attr('cy', d => d.y).attr('r', 6.5)
        .attr('class', d => d.needle ? 'is-needle-host' : null)
        .on('click', (event, d) => { event.stopPropagation(); setZoom({ dot, level: 2, sub: d.i }); });
      lensCaption.attr('y', LENS_R - 30).text(needle ? 'One of these holds the needle · click to zoom' : `${dot.year} · click a dot to zoom further`);
    } else {
      // 1,000 single departures inside the chosen sub-dot.
      const hit = needle && needle.sub === zoom.sub;
      const leaves = Array.from({ length: 1000 }, (_, i) => ({ i, x: (i % 40 - 19.5) * 6, y: (Math.floor(i / 40) - 12) * 6 - 10, red: hit && needle.leaf === i }));
      lensDots.selectAll('circle').data(leaves).join('circle').attr('cx', d => d.x).attr('cy', d => d.y).attr('r', d => d.red ? 4 : 2.2)
        .attr('class', d => d.red ? 'is-needle' : null)
        .on('pointerenter', (event, d) => { if (d.red) showTip(event, needle); })
        .on('pointerleave', hideTip);
      lensDots.selectAll('circle.is-needle').raise();
      lensCaption.attr('y', LENS_R - 30).text(hit ? `Found it: ${dateLabel(needle.date)} · ${needle.aircraft}` : 'No fatal accident among these 1,000 departures');
    }
  }

  function render() {
    const s = selection();
    const shownRings = stage >= 2 || !!range;
    dotSel.classed('is-faded', d => !inRange(d.year)).classed('is-selected', d => zoom && zoom.dot === d);
    ringSel.attr('opacity', d => shownRings && inRange(d.year) ? 1 : 0).style('pointer-events', d => shownRings && inRange(d.year) ? 'all' : 'none');
    call.attr('opacity', stage >= 1 && inRange(callDot.year) ? 1 : 0);
    cells.classed('is-faded', c => !inRange(c.year)).classed('has-fatal', c => c.fatalAccidents > 0);
    fromSel.property('value', s.from); toSel.property('value', s.to);
    const lvl = zoom ? zoom.level : 0;
    zoomLabel.html(`<strong>${levels[lvl].label}</strong> · ${levels[lvl].unit}`);
    zoomOut.property('disabled', !zoom);
    const b = beats[stage];
    if (headline.text() !== b.title) {
      note.classed('is-changing', !reduced.matches);
      eyebrow.text(b.eyebrow); headline.text(b.title); copy.text(b.text);
      requestAnimationFrame(() => note.classed('is-changing', false));
    }
    readout.attr('hidden', stage < 2 && !range ? true : null).html(
      `<p class="safe-departures__period-label">${range ? 'Selected period' : 'All years'} · ${s.from}–${s.to}</p>`
      + `<p class="safe-departures__pct">${pct(s.fatal, s.departures)}</p>`
      + `<p>of ${int(s.departures)} departures had no fatal accident.</p>`
      + `<p class="safe-departures__ratio">${s.fatal ? `${s.fatal} fatal ${s.fatal === 1 ? 'accident' : 'accidents'} · about 1 per ${millions(s.departures / s.fatal)} departures` : 'No fatal accident was recorded in this period. That is an observation, not proof of zero risk.'}</p>`);
    periodControls.attr('hidden', stage < 2 ? true : null);
    list.attr('hidden', stage < 2 || !s.accidents.length ? true : null);
    list.selectAll('li').data(s.accidents, a => a.id).join('li')
      .html(a => `<span>${dateLabel(a.date)}</span> ${a.aircraft} · ${a.fatalities} fatal`)
      .classed('is-focused', a => focused && focused.needle.id === a.id)
      .on('pointerenter', (event, a) => focusNeedle(needles.find(n => n.needle.id === a.id)))
      .on('pointerleave', () => focusNeedle(null))
      .on('click', (event, a) => { const n = needles.find(x => x.needle.id === a.id); focusNeedle(n); setZoom({ dot: n, level: 1 }); });
    renderLens();
    root.attr('data-stage', stage).attr('data-zoom', lvl).attr('data-range', range ? range.join('-') : 'all').attr('data-playback', playback.status);
  }
  function notify() { container.dispatchEvent(new CustomEvent('storybeat', { bubbles: true })); }

  const playback = createBeatPlayback({
    state: () => ({ running: false, complete: stage >= beats.length - 1, atBoundary: true }),
    play() {}, pause() {},
    advance() { if (stage < beats.length - 1) { stage++; render(); notify(); playback.settled(); } },
    holdMs: () => [4200, 4800][stage] ?? 4000,
    reduced,
    showAll() { stage = beats.length - 1; render(); },
    changed() { root.attr('data-playback', playback.status); },
  });
  render();
  return {
    resize() {},
    finishBeat() {},
    setPlaybackMode: value => playback.setMode(value),
    setActive(value) { active = value; playback.setActive(value); if (!value) hideTip(); },
    getNavigationState() { return { step: stage + 1, total: beats.length, running: false, inProgress: false, action: stage < beats.length - 1 ? 'Continue' : 'Continue the story' }; },
    nextBeat() { if (stage >= beats.length - 1) return false; playback.engage(); stage++; render(); notify(); playback.settled(); return true; },
    previousBeat() { if (stage === 0) return false; playback.hold(); stage--; if (stage < 2) { zoom = null; range = null; brushG.call(brush.move, null); } render(); notify(); return true; },
    showLastBeat() { playback.hold(); stage = beats.length - 1; render(); notify(); },
    destroy() { playback.destroy(); root.remove(); },
    get active() { return active; },
  };
}
