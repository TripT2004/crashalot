import { test, expect } from '@playwright/test';
const next = page => page.locator('[data-story-next]');
async function scale(page) {
  await page.goto('/#/change-over-time');
  await expect(page.locator('.scale-comparison')).toBeVisible();
  await expect(next(page)).toBeEnabled();
}
const scaleValues = page => page.locator('.scale-comparison__value').evaluateAll(nodes => nodes.map(n => Number(n.dataset.value)));

test('Finish settles each scale beat; paused beats finish; all routes preserve state; Replay resets', async ({ page, request }) => {
  await scale(page);
  const rows = (await (await request.get('/data/scheduled-service.json')).json()).rows;
  await next(page).click();
  await expect(next(page)).toHaveText(/Finish animation/);
  await page.locator('.scale-comparison__transport button', { hasText: 'Pause' }).click();
  await expect(next(page)).toHaveText(/Finish animation/);
  await next(page).click();
  expect(await scaleValues(page)).toEqual([rows[0].fatalAccidents, 0]);
  await next(page).click();
  await expect(next(page)).toHaveText(/Finish animation/);
  await next(page).click();
  expect(await scaleValues(page)).toEqual([rows[0].fatalAccidents, rows[0].departures]);
  await next(page).click();
  await next(page).click();
  const totals = rows.reduce((a, r) => [a[0] + r.fatalAccidents, a[1] + r.departures], [0, 0]);
  expect(await scaleValues(page)).toEqual(totals);
  await next(page).click();
  await expect(page).toHaveURL(/counts-in-context$/);
  await next(page).click(); // Finish the first decade reveal.
  await page.locator('[data-story-back]').click(); // Rewind that reveal.
  await page.locator('[data-story-back]').click(); // Return to the scale.
  await expect(page).toHaveURL(/change-over-time$/);
  expect(await scaleValues(page)).toEqual(totals);
  await page.locator('[data-stage=inspect]').click();
  await page.locator('[data-stage=notice]').click();
  expect(await scaleValues(page)).toEqual(totals);
  await page.locator('.scale-comparison__transport button', { hasText: 'Replay' }).click();
  expect(await scaleValues(page)).toEqual([0, 0]);
  await expect(page.locator('[data-story-position]')).toHaveText('3 of 8 · Reveal 1 of 4');
});

test('reading keys scroll the exploration without advancing; explicit footer still navigates', async ({ page }) => {
  await page.goto('/#/flight-phase');
  await page.locator('.jump-to-causes').click();
  await expect(page.locator('#flight-causes-title')).toBeFocused();
  const view = page.locator('#flight-phase .view');
  await view.evaluate(el => el.scrollTop = 0);
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => view.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  for (const key of ['ArrowUp', 'Space', 'PageDown', 'PageUp']) {
    await page.keyboard.press(key);
    await expect(page).toHaveURL(/flight-phase$/);
  }
  await next(page).click();
  await expect(page).toHaveURL(/arrival$/);
});

test('Auto is scoped to chart reveals and Finish stops at a reader-controlled endpoint', async ({ page }) => {
  await scale(page);
  await expect(page.locator('#playback-toggle')).toBeHidden();
  await page.goto('/#/counts-in-context');
  await expect(page.locator('#playback-toggle')).toBeVisible();
  await expect(page.locator('#playback-toggle')).toHaveAccessibleName('Auto chart reveals');
  await page.locator('#playback-toggle').click();
  await expect(next(page)).toHaveText(/Finish animation/);
  await next(page).click();
  await expect(next(page)).toHaveText(/^Next/);
  await page.waitForTimeout(2200);
  await expect(page.locator('[data-story-position]')).toHaveText('4 of 8 · Reveal 1 of 3');
  for (let i = 0; i < 2; i++) { await next(page).click(); await next(page).click(); }
  await expect(page).toHaveURL(/counts-in-context$/);
  await expect(page.locator('[data-story-position]')).toHaveText('4 of 8 · Reveal 3 of 3');
});

test('all decades fit mobile and retain readable labels, including the partial period', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/counts-in-context');
  await expect(page.locator('.decade-trend--narrow')).toBeVisible();
  await next(page).click(); await next(page).click();
  const plot = page.locator('.decade-trend__plot');
  expect(await plot.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  const svg = await plot.locator('svg').boundingBox();
  for (const tick of await plot.locator('.decade-trend__tick').all()) {
    const box = await tick.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(svg.x - 1);
    expect(box.x + box.width).toBeLessThanOrEqual(svg.x + svg.width + 1);
  }
  await expect(plot.locator('.decade-trend__partial')).toBeVisible();
  if (process.env.FLIGHT_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.FLIGHT_SCREENSHOT_DIR}/transport-mobile-decades.png` });
});
