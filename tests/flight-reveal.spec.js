import { test,expect } from '@playwright/test';
const next = p => p.locator('[data-story-next]');
const snapshot = p => p.locator('.flight-exploration').evaluate(r => ({
  reveal:r.revealData, sankey:r.sankeyData, area:r.areaData, selection:r.selection, commentary:r.commentary,
}));
async function openFrozen(page) {
  await page.clock.install({time:new Date('2026-11-05T12:00:00Z')});
  await page.goto('/#/another-perspective');
  await page.locator('.flight-exploration').waitFor({state:'attached'});
  await page.clock.pauseAt(new Date('2026-11-05T12:01:00Z'));
  await page.evaluate(() => {location.hash='/flight-phase';});
  await expect(page.locator('#flight-phase')).toHaveClass(/present/);
  await expect(page.locator('.flight-exploration')).toHaveAttribute('data-playback','running');
}
function verifyIdentity(s,source) {
  const columns=source.columns;
  const byId=new Map(source.rows.map(row => [row[0],Object.fromEntries(columns.map((c,i) => [c,row[i]]))]));
  expect(s.sankey.recordIds).toEqual(s.reveal.recordIds);
  expect(s.area.recordIds).toEqual(s.reveal.recordIds);
  expect(s.selection.recordIds).toEqual(s.reveal.recordIds);
  expect(new Set(s.reveal.recordIds).size).toBe(s.reveal.recordIds.length);
  for (const cell of s.area.cells) {
    const expected=s.reveal.recordIds.filter(id => {
      const r=byId.get(id);return r.cause===cell.cause && r.year>=cell.binStart && r.year<=cell.binEnd;
    });
    expect(cell.recordIds).toEqual(expected);
    expect(cell.count).toBe(expected.length);
  }
  for(const link of s.sankey.links) expect(link.value).toBe(link.recordIds.length);
  const commentIds=s.reveal.recordIds.filter(id => byId.get(id).phase===s.commentary.phase);
  expect(s.commentary.recordIds).toEqual(commentIds);
  for(const leader of s.commentary.leaders) expect(leader.count).toBe(commentIds.filter(id => byId.get(id).cause===leader.cause).length);
}

test('slide five builds the same original IDs into both charts, with phase-specific commentary',async ({page,request}) => {
  const errors=[];page.on('pageerror',e => errors.push(e.message));
  const source=await (await request.get('/data/flight-exploration.json')).json();
  await openFrozen(page);
  expect(await page.locator('.slides > section').evaluateAll(nodes => nodes.map(n => n.id))).toEqual([
    'welcome','flight-1282','change-over-time','counts-in-context','flight-phase','another-perspective','the-whole-picture','arrival',
  ]);
  await page.clock.runFor(1000);
  let s=await snapshot(page);verifyIdentity(s,source);
  expect(s.reveal.recordIds.length).toBeGreaterThan(0);expect(s.reveal.recordIds.length).toBeLessThan(610);
  expect(s.commentary.phase).toBe('departure');
  await next(page).click();
  s=await snapshot(page);verifyIdentity(s,source);expect(s.reveal.recordIds).toHaveLength(610);
  expect(s.commentary.leaders).toEqual([{cause:'human',count:215},{cause:'technical',count:181}]);
  await page.clock.runFor(1350);
  s=await snapshot(page);verifyIdentity(s,source);expect(s.commentary.phase).toBe('in_flight');
  expect(s.reveal.recordIds.length).toBeGreaterThan(610);expect(s.reveal.recordIds.length).toBeLessThan(1265);
  await next(page).click();
  s=await snapshot(page);verifyIdentity(s,source);expect(s.reveal.recordIds).toHaveLength(1265);
  expect(s.commentary.leaders).toEqual([{cause:'human',count:267},{cause:'technical',count:168}]);
  await page.clock.runFor(1500);
  s=await snapshot(page);verifyIdentity(s,source);expect(s.commentary.phase).toBe('arrival');
  expect(s.reveal.recordIds.length).toBeGreaterThan(1265);expect(s.reveal.recordIds.length).toBeLessThan(2936);
  await next(page).click();
  s=await snapshot(page);verifyIdentity(s,source);expect(s.reveal.recordIds).toEqual(source.rows.map(r => r[0]));
  expect(s.area.displayedCount).toBe(2253);
  expect(s.commentary.leaders).toEqual([{cause:'human',count:859},{cause:'technical',count:271}]);
  await expect(page.locator('[data-story-position]')).toHaveText('5 of 8 · Reveal 3 of 3');
  await page.clock.fastForward(60000);
  await expect(page.locator('#flight-phase')).toHaveClass(/present/);
  await next(page).click();
  await expect(page.locator('#another-perspective')).toHaveClass(/present/);
  expect(errors).toEqual([]);
});

test('natural Auto completion, Pause/Resume, Back and Replay retain linked data',async ({page,request}) => {
  const source=await (await request.get('/data/flight-exploration.json')).json();
  await openFrozen(page);
  const root=page.locator('.flight-exploration');
  await page.clock.runFor(500);
  await page.locator('[data-flight-pause]').click();
  const held=(await snapshot(page)).reveal.recordIds;
  await page.clock.runFor(5000);expect((await snapshot(page)).reveal.recordIds).toEqual(held);
  await page.locator('[data-flight-pause]').click();
  await page.clock.runFor(8500);
  await expect(root).toHaveAttribute('data-playback','complete');
  verifyIdentity(await snapshot(page),source);
  await page.locator('[data-story-back]').click();
  const back=await snapshot(page);verifyIdentity(back,source);expect(back.reveal.recordIds).toHaveLength(1265);
  await page.clock.runFor(10000);expect((await snapshot(page)).reveal.recordIds).toEqual(back.reveal.recordIds);
  await page.locator('[data-flight-replay]').click();
  await page.clock.runFor(800);
  const replay=await snapshot(page);verifyIdentity(replay,source);expect(replay.reveal.recordIds.length).toBeLessThan(610);
});

for (const [layout,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]) {
  test(`${layout}: phase ribbons draw through consecutive paths at fixed thickness`,async ({page}) => {
    await page.setViewportSize(viewport);
    await openFrozen(page);
    const paths = () => page.locator('path.flow-base').evaluateAll(nodes => nodes.map(n => ({
      terminal:n.dataset.terminal,path:n.getAttribute('d'),width:n.getAttribute('stroke-width'),
      progress:Number(n.getAttribute('stroke-dasharray').split(' ')[0]),visibility:n.getAttribute('visibility'),
    })));
    await page.clock.runFor(400);
    const early=await paths(),departure=early.filter(d => d.terminal==='departure');
    expect(departure[0].progress).toBeGreaterThan(0);
    expect(departure[0].progress).toBeLessThan(1);
    expect(departure[1].progress).toBe(0);
    expect(early.filter(d => d.terminal!=='departure').every(d => d.visibility==='hidden')).toBe(true);
    await page.clock.runFor(600);
    const middle=await paths(),route=middle.filter(d => d.terminal==='departure');
    expect(route[0].progress).toBe(1);
    expect(route[1].progress).toBeGreaterThan(0);
    expect(route[1].progress).toBeLessThan(1);
    expect(middle.map(({terminal,path,width})=>({terminal,path,width}))).toEqual(early.map(({terminal,path,width})=>({terminal,path,width})));
    // The path's leading point advances on the reading axis, including the
    // top-to-bottom mobile route; a width-only fill cannot satisfy this.
    const front=await page.locator('path.flow-base[data-terminal="departure"]').first().evaluate(n => {
      const length=n.getTotalLength(),p=n.getPointAtLength(length*.25),q=n.getPointAtLength(length*.75);
      return {dx:q.x-p.x,dy:q.y-p.y};
    });
    expect(layout==='desktop' ? front.dx : front.dy).toBeGreaterThan(20);
    await page.clock.runFor(2200);
    const later=await paths();
    expect(later.filter(d=>d.terminal==='departure').every(d=>d.progress===1)).toBe(true);
    expect(later.map(({terminal,path,width})=>({terminal,path,width}))).toEqual(early.map(({terminal,path,width})=>({terminal,path,width})));
    expect(later.filter(d=>d.terminal==='arrival').every(d=>d.visibility==='hidden')).toBe(true);
    await page.locator('[data-flight-pause]').click();
    const paused=await paths();await page.clock.runFor(3000);expect(await paths()).toEqual(paused);
  });
}
