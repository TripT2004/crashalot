import { test,expect } from '@playwright/test';
const next=p=>p.locator('[data-story-next]');
async function manual(page) {
  await page.goto('/#/welcome');
  await page.locator('#playback-toggle').click();
  await next(page).click();
  await expect(page.locator('#flight-1282')).toHaveAttribute('data-hook-step','0');
}
test('opening accumulates every requested beat, pairing the panel and photo before the final scene fade',async({page})=>{
  await manual(page);
  const hook=page.locator('#flight-1282');
  await expect(hook.locator('.hook-map')).toBeVisible();
  await expect(hook.locator('.hook-dateline')).toBeHidden();
  const labels=['1','2','2.5','3','4','5','6','7','8'];
  for(let i=0;i<labels.length;i++) {
    await next(page).click();
    await expect(hook).toHaveAttribute('data-hook-beat',labels[i]);
    if(i<8) {
      const shown=await hook.locator('.hook-copy .fragment').evaluateAll(ns=>ns.filter(n=>n.classList.contains('visible')).map(n=>+n.dataset.fragmentIndex));
      expect(shown).toEqual(Array.from({length:i+1},(_,j)=>j));
    }
    if(i===4) await expect(hook.locator('.hook-polaroid')).toBeHidden();
    if(i===5) {
      await expect(hook.locator('.hook-polaroid')).toBeVisible();
      await expect(hook.locator('.hook-map')).toBeHidden();
    }
    if(i===7) {
      await expect(hook.locator('.hook-landing')).toBeVisible();
      await expect(hook.locator('.hook-sentence')).toBeVisible();
      await expect(hook.locator('.hook-question')).toBeVisible();
    }
  }
  await expect(hook.locator('.hook-scene')).toHaveAttribute('aria-hidden','true');
  await expect(hook.locator('.hook-invitation')).toBeVisible();
  await expect(hook.locator('.hook-scene')).toBeHidden();
  await page.locator('[data-story-back]').click();
  await expect(hook.locator('.hook-scene')).toBeVisible();
  await expect(hook.locator('.hook-question')).toBeVisible();
  await expect(hook.locator('.hook-scene')).toHaveAttribute('aria-hidden','false');
});

test('cover footer uses the same geometry and typography as later pages; team credit is current',async({page})=>{
  await page.goto('/#/welcome');
  await expect(page.locator('.cover-team')).not.toContainText('Eric Shao');
  await expect(page.locator('[data-story-position]')).toBeVisible();
  await expect(page.locator('[data-story-back]')).toBeDisabled();
  const rail=()=>page.locator('.presentation-footer').evaluate(el=>{
    const selectors=['.presentation-keyboard-hint','.navigation-keys kbd','nav','[data-story-next]'];
    return selectors.map(s=>{
      const e=el.querySelector(s),r=e.getBoundingClientRect(),c=getComputedStyle(e);
      return {x:r.x,y:r.y,width:r.width,height:r.height,fontSize:c.fontSize,padding:c.padding,gap:c.gap};
    });
  });
  // The introductory key cue translates briefly; compare the shared resting style.
  await page.emulateMedia({reducedMotion:'reduce'});
  const cover=await rail();
  await page.evaluate(()=>location.hash='/change-over-time');
  await expect(page.locator('#change-over-time')).toHaveClass(/present/);
  expect(await rail()).toEqual(cover);
});

test('reduced motion retains the whole story and mobile keeps the initial map in view',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await manual(page);
  const map=await page.locator('.hook-map').boundingBox();
  const footer=await page.locator('.presentation-footer').boundingBox();
  expect(map.y+map.height).toBeLessThan(footer.y);
  expect(await page.locator('.hook-view').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('#playback-toggle').click();
  await expect(page.locator('#flight-1282')).toHaveAttribute('data-hook-static','true');
  await expect(page.locator('.hook-scene')).toHaveAttribute('aria-hidden','false');
  await expect(page.locator('.hook-question')).toBeVisible();
  await expect(page.locator('.hook-invitation')).toBeVisible();
  expect(await page.locator('.hook-view').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
});
