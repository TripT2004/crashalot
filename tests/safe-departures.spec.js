import { test, expect } from '@playwright/test';
const next = p => p.locator('[data-story-next]');
const chart = p => p.locator('.safe-departures');

async function manual(page) {
  await page.goto('/#/arrival');
  await chart(page).waitFor({ state: 'attached' });
  await page.locator('#playback-toggle').click();
  await page.evaluate(() => { location.hash = '/the-whole-picture'; });
  await expect(chart(page)).toBeVisible();
}

test('data matches the slide 3 cohort and the audited accidents', async ({ request }) => {
  const data = await (await request.get('/data/safe-departures.json')).json();
  const slide3 = await (await request.get('/data/scheduled-service.json')).json();
  expect(data.totals).toEqual({ departures: slide3.summary.departures, fatalAccidents: slide3.summary.fatalAccidents });
  expect(data.years.reduce((s, y) => s + y.departures, 0)).toBe(184082802);
  expect(data.accidents).toHaveLength(9);
  for (const y of data.years) expect(data.accidents.filter(a => a.date.startsWith(String(y.year)))).toHaveLength(y.fatalAccidents);
});

test('three beats: coin callback, reveal with Flight 1282, then exploration', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await manual(page);
  await expect(chart(page)).toHaveAttribute('data-stage', '0');
  await expect(chart(page).locator('h2')).toHaveText('Remember the 24 heads in a row?');
  await expect(chart(page).locator('.safe-departures__ring').first()).toHaveAttribute('opacity', '0');
  await next(page).click();
  await expect(chart(page).locator('h2')).toHaveText('99.999995% of departures had no fatal accident.');
  await expect(chart(page).locator('.safe-departures__call')).toHaveAttribute('opacity', '1');
  await next(page).click();
  await expect(chart(page)).toHaveAttribute('data-stage', '2');
  await expect(chart(page).locator('.safe-departures__ring[opacity="1"]')).toHaveCount(9);
  await expect(chart(page).locator('.safe-departures__pct')).toHaveText('99.999995%');
  await page.locator('[data-story-back]').click();
  await expect(chart(page)).toHaveAttribute('data-stage', '1');
  await expect(page).toHaveURL(/the-whole-picture$/);
  expect(errors).toEqual([]);
});

test('click-to-zoom has three labeled levels and finds a needle', async ({ page }) => {
  await manual(page); await next(page).click(); await next(page).click();
  const label = chart(page).locator('.safe-departures__zoom');
  await expect(label).toContainText('Zoom 1 of 3');
  await chart(page).getByRole('button', { name: 'Zoom to a needle' }).click();
  await expect(label).toContainText('Zoom 2 of 3 · ×100 · 1 dot = 1,000 departures');
  await chart(page).locator('.safe-departures__lens circle.is-needle-host').click();
  await expect(label).toContainText('Zoom 3 of 3 · ×100,000 · 1 dot = 1 departure');
  await expect(chart(page).locator('.safe-departures__lens circle.is-needle')).toHaveCount(1);
  await expect(chart(page).locator('.safe-departures__lens-caption')).toContainText('Found it');
  await chart(page).getByRole('button', { name: 'Zoom out' }).click();
  await expect(label).toContainText('Zoom 2 of 3');
  await chart(page).getByRole('button', { name: 'Zoom out' }).click();
  await expect(label).toContainText('Zoom 1 of 3');
});

test('brushing the year strip links the haystack, readout and accident list', async ({ page }) => {
  await manual(page); await next(page).click(); await next(page).click();
  const cells = chart(page).locator('.safe-departures__strip g');
  const a = await cells.nth(5).boundingBox(), b = await cells.nth(12).boundingBox();
  await page.mouse.move(a.x + 2, a.y + a.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width - 2, b.y + b.height / 2, { steps: 6 }); await page.mouse.up();
  await expect(chart(page)).toHaveAttribute('data-range', '2010-2017');
  await expect(chart(page).locator('.safe-departures__pct')).toHaveText('100%');
  await expect(chart(page).locator('.safe-departures__readout')).toContainText('not proof of zero risk');
  await expect(chart(page).locator('.safe-departures__dots circle.is-faded').first()).toBeAttached();
  await chart(page).locator('select[aria-label="First year of period"]').selectOption('2005');
  await chart(page).locator('select[aria-label="Last year of period"]').selectOption('2009');
  await expect(chart(page)).toHaveAttribute('data-range', '2005-2009');
  await expect(chart(page).locator('.safe-departures__list li')).toHaveCount(6);
  await chart(page).getByRole('button', { name: 'All years' }).click();
  await expect(chart(page)).toHaveAttribute('data-range', 'all');
});

test('Auto stops on the slide and never changes slides', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-06T12:00:00Z') });
  await page.goto('/#/the-whole-picture');
  await expect(chart(page)).toBeVisible();
  await page.clock.runFor(20000);
  await expect(chart(page)).toHaveAttribute('data-stage', '2');
  await expect(page).toHaveURL(/the-whole-picture$/);
});
