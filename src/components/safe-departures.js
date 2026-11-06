import { brushX, easeCubicOut, easeLinear, format, select } from 'd3';
import './safe-departures.css';
import { createBeatPlayback } from './beat-playback.js';

// Needle in a haystack: every departure in the slide 3 cohort, drawn at three labeled zoom levels.
const UNIT = 100000;           // Level 1: one dot = 100,000 departures.
const YEARS_OF_FLYING = 60;
const motion = { pourMs: 4200, dropMs: 3600, holds: [1600, 5200, 2600, 7000] };
const levels = [
  { label: 'Zoom 1 of 3 · ×1', unit: '1 dot = 100,000 departures' },
  { label: 'Zoom 2 of 3 · ×100', unit: '1 dot = 1,000 departures' },
  { label: 'Zoom 3 of 3 · ×100,000', unit: '1 dot = 1 departure' },
];
// Progress runs 0→1 while dots pour in, 1→2 while needles drop; later beats are not animated.
const beats = [
  { end: 1, eyebrow: 'U.S. scheduled service · 2005–2024', title: 'Remember the 24 heads in a row?', text: 'That was 1 fatal accident per 20.5 million departures. Here are all 184,082,802 departures from that comparison, one dot for every 100,000.' },
  { end: 1, eyebrow: 'Back to the beginning', title: 'Even when something goes wrong.', text: 'Every green dot is a departure without a fatal accident, including ones like Flight 1282, where a door plug blew out mid-climb.' },
  { end: 2, eyebrow: 'The needles', title: 'Now add the 9 that had a fatal accident.', text: 'Each red mark is one departure, drawn far larger than life: at this scale it is a hundred-thousandth of a dot. Everything else, 99.999995%, had no fatal accident.' },
  { end: 2, eyebrow: 'What it means for you', title: 'How often do you fly?', text: `Move the slider. The odds below are for any of your flights, over ${YEARS_OF_FLYING} years of flying, being a departure with a fatal accident.` },
  { end: 2, eyebrow: 'Your turn', title: 'Now find the needles yourself.', text: 'Click any dot to magnify it, down to single departures. Drag across the years to compare periods.' },
];
const EXPLORE = beats.length - 1, CALLBACK = 1, NEEDLES = 2, CALC = 3;
const int = format(',d');
const clamp = v => Math.max(0, Math.min(1, v));
const millions = v => `${(v / 1e6).toFixed(1)} million`;
const pct = (fatal, deps) => fatal === 0 ? '100%' : `${((1 - fatal / deps) * 100).toFixed(6)}%`;
const twoSig = v => Number(v.toPrecision(2));
const dateLabel = iso => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const dayFraction = iso => { const d = new Date(`${iso}T12:00:00Z`); const start = Date.UTC(d.getUTCFullYear(), 0, 1); return (d - start) / (Date.UTC(d.getUTCFullYear() + 1, 0, 1) - start); };

export async function mountSafeDepartures(container) {
  const response = await fetch(`${import.meta.env.BASE_URL}data/safe-departures.json`);
  if (!response.ok) throw new Error('Departure data unavailable');
  const data = await response.json();
  const years = data.years;
  if (years.length !== 20 || data.accidents.length !== data.totals.fatalAccidents) throw new Error('Invalid departure data');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let active = false, running = false, stage = 0, progress = 0, range = null, zoom = null, focused = null, flights = 4;
  let W = 900, H = 420, lensR = 150, stripY = 0, colW = 40, gap = 12, step = 10;

  const columns = years.map((y, i) => ({ ...y, i, n: Math.max(1, Math.round(y.departures / UNIT)) }));
  const nMax = Math.max(...columns.map(c => c.n));
  const dots = columns.flatMap(c => Array.from({ length: c.n }, (_, k) => ({ year: c.year, col: c, k })));
  // A needle sits in its year column at a height set by its date: January at the top.
  // Its position inside a dot at zoom levels 2 and 3 is illustrative.
  const slot = (c, iso) => c.n - 1 - Math.min(c.n - 1, Math.floor(dayFraction(iso) * c.n));
  const needles = data.accidents.map((a, i) => {
    const c = columns.find(col => col.year === Number(a.date.slice(0, 4)));
    let k = slot(c, a.date);
    while (dots.some(d => d.needle && d.col === c && d.k === k)) k = (k + 1) % c.n;
    const dot = dots.find(d => d.col === c && d.k === k);
    dot.needle = { ...a, order: i, sub: (i * 37 + 11) % 100, leaf: (i * 389 + 97) % 1000 };
    return dot;
  });
  const callCol = columns.find(c => c.year === Number(data.callout.date.slice(0, 4)));
  const callDot = dots.find(d => d.col === callCol && d.k === slot(callCol, data.callout.date) && !d.needle) || dots.find(d => d.col === callCol && !d.needle);

  const root = select(container).append('div').attr('class', 'safe-departures');
  const grid = root.append('div').attr('class', 'safe-departures__grid');
  const plot = grid.append('div').attr('class', 'safe-departures__plot');
  const zoomBar = plot.append('div').attr('class', 'safe-departures__zoombar');
  const legend = zoomBar.append('p').attr('class', 'safe-departures__zoom').attr('aria-live', 'polite');
  const svg = plot.append('svg').attr('role', 'img')
    .attr('aria-label', 'Every U.S. scheduled departure from 2005 to 2024 as dots of 100,000, with the 9 departures that had a fatal accident marked in red');
  svg.append('desc').text(`${int(data.totals.departures)} departures in 20 yearly columns. 9 had a fatal accident: ${data.accidents.map(a => `${a.date} ${a.aircraft}`).join('; ')}. Flight 1282, a nonfatal accident on ${data.callout.date}, is among the departures without a fatal accident.`);
  const defs = svg.append('defs');
  const clipCircle = defs.append('clipPath').attr('id', 'safe-departures-lens').append('circle');

  const dotSel = svg.append('g').attr('class', 'safe-departures__dots').selectAll('circle').data(dots).join('circle')
    .on('click', (event, d) => { if (stage !== EXPLORE) return; event.stopPropagation(); setZoom({ dot: d, level: 1 }); });
  const needleSel = svg.append('g').attr('class', 'safe-departures__needles').selectAll('g').data(needles).join('g')
    .on('pointerenter', (event, d) => { focusNeedle(d); showTip(event, d.needle); })
    .on('pointerleave', () => { focusNeedle(null); hideTip(); })
    .on('click', (event, d) => { if (stage !== EXPLORE) return; event.stopPropagation(); setZoom({ dot: d, level: 1 }); });
  needleSel.append('circle').attr('class', 'safe-departures__needle');
  needleSel.append('circle').attr('class', 'safe-departures__ring');
  const call = svg.append('g').attr('class', 'safe-departures__call');
  call.append('circle'); call.append('line'); call.append('text').text('Flight 1282 · no fatalities');

  // Year strip: fatal-accident counts per year, and the brush that selects a period.
  const strip = svg.append('g').attr('class', 'safe-departures__strip');
  const cells = strip.selectAll('g').data(columns).join('g');
  cells.append('rect').attr('rx', 3);
  cells.append('text').attr('class', 'safe-departures__count').attr('text-anchor', 'middle').text(c => c.fatalAccidents);
  cells.append('text').attr('class', 'safe-departures__year').attr('text-anchor', 'middle').text(c => `’${String(c.year).slice(2)}`);
  const stripLabel = svg.append('text').attr('class', 'safe-departures__strip-label');
  const brush = brushX().on('brush end', event => {
    if (!event.sourceEvent) return;
    if (!event.selection) { setRange(null); return; }
    const near = px => columns.reduce((best, c) => Math.abs(c.cx - px) < Math.abs(best.cx - px) ? c : best).year;
    const [a, b] = event.selection.map(near);
    setRange([Math.min(a, b), Math.max(a, b)], event.type === 'end');
  });
  const brushG = svg.append('g').attr('class', 'safe-departures__brush');

  // Lens: a magnified view of one dot, opened where the reader clicks (or over Flight 1282).
  const lens = svg.append('g').attr('class', 'safe-departures__lens').attr('hidden', true).on('click', event => event.stopPropagation());
  const lensLeader = lens.append('line').attr('class', 'safe-departures__lens-leader');
  const lensBg = lens.append('circle').attr('class', 'safe-departures__lens-bg');
  const lensPhoto = lens.append('image').attr('href', `${import.meta.env.BASE_URL}assets/flight-1282-cabin.jpg`).attr('preserveAspectRatio', 'xMidYMid slice').attr('clip-path', 'url(#safe-departures-lens)');
  const lensDots = lens.append('g').attr('clip-path', 'url(#safe-departures-lens)');
  const lensCaption = lens.append('text').attr('class', 'safe-departures__lens-caption').attr('text-anchor', 'middle');
  const lensCredit = lens.append('text').attr('class', 'safe-departures__lens-credit').attr('text-anchor', 'middle').text('Photograph: NTSB');
  svg.on('click', () => { if (zoom) setZoom(null); });
  const tip = plot.append('div').attr('class', 'safe-departures__tip').attr('role', 'tooltip').attr('hidden', true);

  // Side panel: story beats, then the linked readouts.
  const note = grid.append('aside').attr('class', 'safe-departures__note');
  const story = note.append('div').attr('class', 'safe-departures__story');
  const eyebrow = story.append('p').attr('class', 'eyebrow');
  const headline = story.append('h2');
  const copy = story.append('p');
  const counter = note.append('div').attr('class', 'safe-departures__counter');
  const ticker = note.append('p').attr('class', 'safe-departures__ticker').attr('aria-live', 'polite');
  const readout = note.append('div').attr('class', 'safe-departures__readout').attr('aria-live', 'polite');
  const calc = note.append('div').attr('class', 'safe-departures__calc');
  const calcLabel = calc.append('label').attr('for', 'safe-departures-flights');
  const slider = calc.append('input').attr('type', 'range').attr('id', 'safe-departures-flights').attr('min', 1).attr('max', 100).attr('step', 1).property('value', flights)
    .on('input', event => { flights = Number(event.target.value); renderCalc(); });
  const calcOut = calc.append('p').attr('class', 'safe-departures__odds').attr('aria-live', 'polite');
  calc.append('p').attr('class', 'safe-departures__caveat').text('This counts departures with a fatal accident, not your chance of being hurt: 6 of the 9 had a single fatality.');
  const periodControls = note.append('div').attr('class', 'safe-departures__period');
  const yearOptions = years.map(y => y.year);
  const fromSel = periodControls.append('label').text('From ').append('select').attr('aria-label', 'First year of period');
  const toSel = periodControls.append('label').text('to ').append('select').attr('aria-label', 'Last year of period');
  [fromSel, toSel].forEach(sel => sel.selectAll('option').data(yearOptions).join('option').attr('value', d => d).text(d => d));
  const pickRange = () => { const a = +fromSel.property('value'), b = +toSel.property('value'); setRange([Math.min(a, b), Math.max(a, b)], true); };
  fromSel.on('change', pickRange); toSel.on('change', pickRange);
  periodControls.append('button').attr('type', 'button').attr('class', 'text-button').text('All years').on('click', () => setRange(null, true));
  const list = note.append('ul').attr('class', 'safe-departures__list');

  const source = root.append('details').attr('class', 'evidence-source safe-departures__source');
  source.append('summary').text('Source, scope & exact counts');
  source.append('p').html(`Source: <a href="${data.source.url}" target="_blank" rel="noreferrer">NTSB U.S. Civil Aviation Accident Statistics</a>, retained 2005–2024 workbook. Table 6: U.S. air carriers under 14 CFR Part 121, scheduled service, the same cohort as the earlier single-year comparison. ${data.source.definition} Dots are rounded to the nearest 100,000 departures per year. Needles are drawn far larger than their true size; a needle's year and its height within the year column follow its date (January at the top), and its position inside a dot when zoomed in is illustrative. A period with no recorded fatal accident is an observation, not proof of zero risk. Lifetime odds treat every flight as an independent draw at the selected period's observed rate: 1 − (1 − fatal accidents ÷ departures)^(flights per year × ${YEARS_OF_FLYING}). Flight 1282's 2024 departure is part of these counts; cabin photograph: NTSB.`);
  const table = source.append('table');
  table.append('caption').text('Departures and fatal accidents by year');
  table.append('thead').append('tr').selectAll('th').data(['Year', 'Departures', 'Fatal accidents']).join('th').attr('scope', 'col').text(d => d);
  table.append('tbody').selectAll('tr').data(years).join('tr').selectAll('td').data(y => [y.year, int(y.departures), y.fatalAccidents]).join('td').text(d => d);
  const t2 = source.append('table');
  t2.append('caption').text('The 9 fatal accidents');
  t2.append('thead').append('tr').selectAll('th').data(['Date', 'Aircraft', 'Fatal injuries', 'NTSB ID']).join('th').attr('scope', 'col').text(d => d);
  t2.append('tbody').selectAll('tr').data(data.accidents).join('tr').selectAll('td').data(a => [dateLabel(a.date), a.aircraft, a.fatalities, a.id]).join('td').text(d => d);

  root.on('keydown', event => { if (event.target.closest('button, select, input, summary, a') && [' ', 'Enter'].includes(event.key)) event.stopPropagation(); });

  // Fill the space between the slide heading and the footer. Pick the dots-per-row that gives the largest dots.
  function layout() {
    const view = container.closest('.view');
    const narrow = (view?.clientWidth || innerWidth) < 900;
    root.classed('safe-departures--narrow', narrow);
    if (view && !narrow) {
      const top = root.node().getBoundingClientRect().top - view.getBoundingClientRect().top + view.scrollTop;
      const pad = parseFloat(getComputedStyle(view).paddingBottom) || 24;
      const summary = source.node().getBoundingClientRect().height || 28;
      grid.style('height', `${Math.max(380, view.clientHeight - top - pad - summary - 10)}px`);
    } else grid.style('height', null);
    W = Math.max(300, plot.node().clientWidth);
    H = narrow ? 360 : Math.max(300, grid.node().clientHeight - zoomBar.node().offsetHeight - 6);
    const stripH = Math.max(30, Math.min(40, H * .08)), labelH = 22, topH = 26;
    stripY = H - stripH - labelH;
    const usableH = stripY - topH - 10, usableW = W - 8;
    let best = { step: 0, perRow: 4 };
    for (let perRow = 2; perRow <= 12; perRow++) {
      const byW = usableW / (20 * perRow + 19 * 1.2);
      const byH = usableH / Math.ceil(nMax / perRow);
      const s = Math.min(byW, byH);
      if (s > best.step) best = { step: s, perRow };
    }
    step = best.step;
    colW = best.perRow * step;
    gap = (usableW - 20 * colW) / 19;
    const base = stripY - 10;
    columns.forEach(c => { c.x = 4 + c.i * (colW + gap); c.cx = c.x + colW / 2; });
    dots.forEach(d => {
      d.x = d.col.x + (d.k % best.perRow) * step + step / 2;
      d.y = base - Math.floor(d.k / best.perRow) * step - step / 2;
    });
    lensR = Math.max(110, Math.min(190, H * .36));
    svg.attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H);
    dotSel.attr('cx', d => d.x).attr('cy', d => d.y).attr('r', step * .4);
    needleSel.select('.safe-departures__ring').attr('r', Math.max(6, step * .95));
    call.select('circle').attr('cx', callDot.x).attr('cy', callDot.y).attr('r', Math.max(7, step * .95));
    call.select('line').attr('x1', callDot.x).attr('x2', callDot.x).attr('y1', callDot.y - Math.max(8, step)).attr('y2', 18);
    call.select('text').attr('x', callDot.x - 6).attr('y', 14).attr('text-anchor', 'end');
    cells.attr('transform', c => `translate(${c.x},${stripY})`);
    cells.select('rect').attr('width', colW).attr('height', stripH);
    cells.select('.safe-departures__count').attr('x', colW / 2).attr('y', stripH * .45);
    cells.select('.safe-departures__year').attr('x', colW / 2).attr('y', stripH * .85);
    stripLabel.attr('x', 4).attr('y', H - 6);
    brush.extent([[columns[0].x - gap / 2, stripY - 4], [columns.at(-1).x + colW + gap / 2, stripY + stripH + 4]]);
    brushG.call(brush);
    if (range) moveBrush();
    render();
  }

  function inRange(year) { return !range || (year >= range[0] && year <= range[1]); }
  function selection() {
    const ys = years.filter(y => inRange(y.year));
    return { from: ys[0].year, to: ys.at(-1).year, departures: ys.reduce((s, y) => s + y.departures, 0), fatal: ys.reduce((s, y) => s + y.fatalAccidents, 0), accidents: data.accidents.filter(a => inRange(Number(a.date.slice(0, 4)))) };
  }
  function moveBrush() {
    const a = columns.find(c => c.year === range[0]), b = columns.find(c => c.year === range[1]);
    brushG.call(brush.move, [a.x - gap / 2 + 1, b.x + colW + gap / 2 - 1]);
  }
  function setRange(next, snap = false) {
    range = next && !(next[0] === yearOptions[0] && next[1] === yearOptions.at(-1)) ? next : null;
    if (snap) { if (range) moveBrush(); else brushG.call(brush.move, null); }
    if (zoom && !inRange(zoom.dot.year)) zoom = null;
    render();
  }
  function setZoom(next) { zoom = next; render(); }
  function focusNeedle(d) { focused = d; needleSel.classed('is-focused', r => r === focused); list.selectAll('li').classed('is-focused', a => focused && a.id === focused.needle.id); }
  function showTip(event, a) {
    const box = plot.node().getBoundingClientRect();
    tip.attr('hidden', null).html(`<strong>${dateLabel(a.date)}</strong><br>${a.aircraft}<br>${a.fatalities} fatal ${a.fatalities === 1 ? 'injury' : 'injuries'}`)
      .style('left', `${Math.min(event.clientX - box.left + 12, box.width - 170)}px`).style('top', `${event.clientY - box.top + 12}px`);
  }
  function hideTip() { tip.attr('hidden', true); }

  function renderCalc() {
    const s = stage === EXPLORE ? selection() : { departures: data.totals.departures, fatal: data.totals.fatalAccidents, from: 2005, to: 2024 };
    const total = flights * YEARS_OF_FLYING;
    calcLabel.html(`I fly <strong>${flights}</strong> ${flights === 1 ? 'time' : 'times'} a year`);
    if (!s.fatal) { calcOut.html(`No fatal accident was recorded in ${s.from}–${s.to}, so these data give no odds for that period. Zero recorded is not zero risk.`); return; }
    const p = s.fatal / s.departures;
    const lifetime = -Math.expm1(total * Math.log1p(-p));
    calcOut.html(`Over ${YEARS_OF_FLYING} years (${int(total)} flights), the chance any of them has a fatal accident is about <strong>1 in ${int(twoSig(1 / lifetime))}</strong>.${stage === EXPLORE && range ? ` <span>Using ${s.from}–${s.to}.</span>` : ''}`);
  }

  function renderLens() {
    lensDots.selectAll('*').remove();
    const view = stage === CALLBACK ? { dot: callDot, photo: true } : stage === EXPLORE ? zoom : null;
    if (!view) { lens.attr('hidden', true); return; }
    const { dot } = view;
    const cx = Math.max(lensR + 4, Math.min(W - lensR - 4, dot.x - (view.photo ? lensR * 1.2 : 0)));
    const cy = Math.max(lensR + 4, Math.min(stripY - 6, dot.y + (view.photo ? lensR * .4 : 0)));
    lens.attr('hidden', null).attr('transform', `translate(${cx},${cy})`);
    // Leader from the lens rim to the magnified dot.
    const dx = dot.x - cx, dy = dot.y - cy, dist = Math.hypot(dx, dy) || 1;
    lensLeader.attr('hidden', dist > lensR + 4 ? null : true).attr('x1', dx / dist * lensR).attr('y1', dy / dist * lensR).attr('x2', dx - dx / dist * step).attr('y2', dy - dy / dist * step);
    clipCircle.attr('cx', 0).attr('cy', 0).attr('r', lensR - 2);
    lensBg.attr('r', lensR).classed('is-dashed', !!view.photo);
    lensPhoto.attr('hidden', view.photo ? null : true).attr('x', -lensR).attr('y', -lensR).attr('width', lensR * 2).attr('height', lensR * 2);
    const gs = lensR / 150;
    lensCredit.attr('hidden', true);
    lensCaption.classed('is-on-photo', false);
    if (view.photo) {
      lensCaption.classed('is-on-photo', true).attr('y', lensR - 24).text('Flight 1282 · 5 Jan 2024 · no fatalities');
      lensCredit.attr('hidden', null).attr('y', lensR - 8);
      return;
    }
    const needle = dot.needle;
    if (view.level === 1) {
      const subs = Array.from({ length: 100 }, (_, i) => ({ i, x: (i % 10 - 4.5) * 20 * gs, y: (Math.floor(i / 10) - 4.5) * 20 * gs, host: needle && needle.sub === i }));
      lensDots.selectAll('circle').data(subs).join('circle').attr('cx', d => d.x).attr('cy', d => d.y).attr('r', 6.5 * gs)
        .attr('class', d => d.host ? 'is-needle-host' : null)
        .on('click', (event, d) => { event.stopPropagation(); setZoom({ dot, level: 2, sub: d.i }); });
      lensCaption.attr('y', lensR - 26 * gs).text(needle ? '1 dot = 1,000 · one holds the needle · click it' : `${dot.year} · 1 dot = 1,000 · click one to go further`);
    } else {
      const hit = needle && needle.sub === view.sub;
      const leaves = Array.from({ length: 1000 }, (_, i) => ({ i, x: (i % 40 - 19.5) * 6 * gs, y: ((Math.floor(i / 40) - 12) * 6 - 10) * gs, red: hit && needle.leaf === i }));
      lensDots.selectAll('circle').data(leaves).join('circle').attr('cx', d => d.x).attr('cy', d => d.y).attr('r', d => (d.red ? 4 : 2.2) * gs)
        .attr('class', d => d.red ? 'is-needle' : null)
        .on('pointerenter', (event, d) => { if (d.red) showTip(event, needle); })
        .on('pointerleave', hideTip);
      lensDots.selectAll('circle.is-needle').raise();
      lensCaption.attr('y', lensR - 26 * gs).text(hit ? `1 dot = 1 departure · found it: ${dateLabel(needle.date)}` : '1 dot = 1 departure · no fatal accident in these 1,000');
    }
  }

  function render() {
    const pour = clamp(progress), drop = clamp(progress - 1);
    const s = selection();
    const explore = stage === EXPLORE;
    root.classed('is-exploring', explore);
    calc.select('.safe-departures__caveat').attr('hidden', explore ? true : null);
    // Columns pour in left to right; each fills from the bottom up.
    dotSel.attr('opacity', d => { const c = clamp(pour * 20 - d.col.i); return d.k < c * d.col.n ? (inRange(d.year) ? 1 : .14) : 0; })
      .classed('is-selected', d => explore && zoom && zoom.dot === d);
    // Needles drop in one at a time, earliest first.
    needleSel.each(function (d) {
      const t = clamp(drop * needles.length - d.needle.order);
      const shown = t > 0 && inRange(d.year);
      select(this).attr('opacity', shown ? (inRange(d.year) ? 1 : 0) : 0).style('pointer-events', shown ? 'all' : 'none')
        .attr('transform', `translate(${d.x},${d.y - (1 - easeCubicOut(t)) * Math.min(160, d.y)})`);
    });
    needleSel.select('.safe-departures__needle').attr('r', Math.max(4, step * .55));
    call.attr('opacity', (stage === CALLBACK || stage === EXPLORE) && inRange(callDot.year) ? 1 : 0);
    call.select('text').attr('opacity', stage === EXPLORE ? 1 : 0);
    call.select('line').attr('opacity', stage === EXPLORE ? 1 : 0);
    cells.classed('is-faded', c => !inRange(c.year)).classed('has-fatal', c => c.fatalAccidents > 0);
    brushG.style('pointer-events', explore ? null : 'none').attr('opacity', explore ? 1 : 0);
    stripLabel.text(explore ? 'Fatal accidents per year · drag across years to select a period' : 'Fatal accidents per year');
    fromSel.property('value', s.from); toSel.property('value', s.to);
    const lvl = explore && zoom ? zoom.level : 0;
    legend.html(stage === CALLBACK ? '<strong>Flight 1282</strong> · one dot among 184,082,802 departures' : explore && zoom ? `<strong>Magnified</strong> · ${levels[lvl].unit} · click outside the circle to close` : `<span class="safe-departures__key safe-departures__key--dot"></span>1 dot = 100,000 departures${stage >= NEEDLES ? '<span class="safe-departures__key safe-departures__key--needle"></span>departure with a fatal accident (enlarged)' : ''}`);
    const b = beats[stage];
    if (headline.text() !== b.title) {
      story.classed('is-changing', !reduced.matches);
      eyebrow.text(b.eyebrow); headline.text(b.title); copy.text(b.text);
      requestAnimationFrame(() => requestAnimationFrame(() => story.classed('is-changing', false)));
    }
    // Rolling departure counter while the haystack fills, then the share without a fatal accident.
    const poured = columns.reduce((sum, c) => sum + c.departures * clamp(pour * 20 - c.i), 0);
    const dropped = needles.filter(d => clamp(drop * needles.length - d.needle.order) > 0).length;
    counter.attr('hidden', stage === 0 || stage === NEEDLES ? null : true).html(stage === 0
      ? `<span class="safe-departures__big">${int(Math.round(poured))}</span><span>departures</span>`
      : `<span class="safe-departures__big safe-departures__big--fatal">${dropped} of 9</span><span>departures with a fatal accident</span>${dropped === 9 ? '<span class="safe-departures__share">99.999995% had none</span>' : ''}`);
    const latest = needles.filter(d => clamp(drop * needles.length - d.needle.order) > 0).at(-1);
    ticker.attr('hidden', stage === NEEDLES && latest ? null : true).text(latest ? `${dateLabel(latest.needle.date)} · ${latest.needle.aircraft} · ${latest.needle.fatalities} fatal` : '');
    readout.attr('hidden', explore ? null : true).html(
      `<p class="safe-departures__period-label">${range ? 'Selected period' : 'All years'} · ${s.from}–${s.to}</p>`
      + `<p class="safe-departures__pct">${pct(s.fatal, s.departures)}</p>`
      + `<p>of ${int(s.departures)} departures had no fatal accident${s.fatal ? ` · ${s.fatal} fatal ${s.fatal === 1 ? 'accident' : 'accidents'}, about 1 per ${millions(s.departures / s.fatal)}` : '.'}</p>`);
    calc.attr('hidden', stage === CALC || explore ? null : true);
    renderCalc();
    periodControls.attr('hidden', explore ? null : true);
    list.attr('hidden', !explore || !s.accidents.length ? true : null);
    list.selectAll('li').data(explore ? s.accidents : [], a => a.id).join('li')
      .html(a => `<span>${dateLabel(a.date)}</span> ${a.aircraft} · ${a.fatalities} fatal`)
      .classed('is-focused', a => focused && focused.needle.id === a.id)
      .on('pointerenter', (event, a) => focusNeedle(needles.find(n => n.needle.id === a.id)))
      .on('pointerleave', () => focusNeedle(null))
      .on('click', (event, a) => { const n = needles.find(x => x.needle.id === a.id); focusNeedle(n); setZoom({ dot: n, level: 1 }); });
    renderLens();
    root.attr('data-stage', stage).attr('data-progress', progress.toFixed(2)).attr('data-zoom', lvl).attr('data-range', range ? range.join('-') : 'all').attr('data-playback', playback.status);
  }
  function notify() { container.dispatchEvent(new CustomEvent('storybeat', { bubbles: true })); }
  function stop() { root.interrupt('reveal'); running = false; }
  function finish() { running = false; render(); playback.settled(); notify(); }
  function play() {
    const end = beats[stage].end;
    if (!active || document.hidden) return;
    if (progress >= end) { finish(); return; }
    if (reduced.matches) { progress = end; finish(); return; }
    running = true; notify();
    const start = progress;
    const ms = (end - start) * (start < 1 ? motion.pourMs : motion.dropMs);
    root.transition('reveal').duration(ms).ease(easeLinear).tween('reveal', () => t => { progress = start + (end - start) * t; render(); }).on('end', finish);
  }
  function enter(next) {
    stage = next;
    if (stage !== EXPLORE) { zoom = null; if (range) { range = null; brushG.call(brush.move, null); } }
    render();
    play();
  }
  const playback = createBeatPlayback({
    state: () => ({ running, complete: stage === EXPLORE && progress >= beats[stage].end, atBoundary: progress >= beats[stage].end }),
    play, pause: stop,
    advance() { if (stage < EXPLORE) enter(stage + 1); },
    holdMs: () => motion.holds[stage] ?? 3000,
    reduced,
    showAll() { stop(); stage = EXPLORE; progress = beats[stage].end; render(); },
    changed() { root.attr('data-playback', playback.status); },
  });
  const observer = new ResizeObserver(() => { if (active) layout(); });
  observer.observe(plot.node());
  addEventListener('resize', () => { if (active) layout(); });
  layout();
  return {
    resize() { if (active) layout(); },
    finishBeat() { playback.engage(); stop(); progress = beats[stage].end; finish(); },
    setPlaybackMode: value => playback.setMode(value),
    setActive(value) { active = value; if (value) requestAnimationFrame(layout); playback.setActive(value); if (!value) { stop(); hideTip(); } },
    getNavigationState() { return { step: stage + 1, total: beats.length, running, inProgress: progress > (stage === 0 ? 0 : beats[stage - 1].end) && progress < beats[stage].end, action: stage < EXPLORE ? 'Continue' : 'Continue the story' }; },
    nextBeat() {
      if (running) return true;
      if (progress < beats[stage].end) { playback.engage(); play(); return true; }
      if (stage >= EXPLORE) return false;
      playback.engage(); enter(stage + 1); notify(); return true;
    },
    previousBeat() {
      if (stage === 0 && progress === 0) return false;
      playback.hold(); stop();
      if (stage > 0) { stage--; progress = beats[stage].end; } else progress = 0;
      zoom = null; if (range) { range = null; brushG.call(brush.move, null); }
      render(); notify(); return true;
    },
    showLastBeat() { playback.hold(); stop(); stage = EXPLORE; progress = beats[stage].end; render(); notify(); },
    destroy() { playback.destroy(); observer.disconnect(); root.remove(); },
  };
}
