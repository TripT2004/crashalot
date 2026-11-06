import { test, expect } from '@playwright/test';

async function ready(page) {
  await page.goto('/#/counts-in-context');
  await expect(page.locator('.decade-trend')).toBeVisible();
  await page.locator('#playback-toggle').click();
  await expect(page.locator('#theme-toggle')).toBeEnabled();
}

test('themes reveal from the lamp in both directions without changing story state or geometry', async ({ page }) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(() => {
    const animate=Element.prototype.animate;
    Element.prototype.animate=function(frames,options) {
      const animation=animate.call(this,frames,options);
      if(options?.pseudoElement==='::view-transition-new(root)') {
        window.themeReveal={frames,options,animation};
        animation.pause();
      }
      return animation;
    };
  });
  await ready(page);
  await expect(page.getByRole('navigation',{name:'Story chapters'})).toHaveCount(0);
  const light=page.locator('#theme-toggle'), chart=page.locator('.decade-trend');
  const bounds=await light.boundingBox(), progress=await chart.getAttribute('data-progress');
  for (const theme of ['dark','light']) {
    await page.evaluate(()=>{window.themeReveal=null;});
    await light.click();
    await expect.poll(()=>page.evaluate(()=>Boolean(window.themeReveal))).toBe(true);
    const reveal=await page.evaluate(()=>({frames:window.themeReveal.frames,options:window.themeReveal.options}));
    expect(reveal.frames.clipPath[0]).toBe(`circle(0px at ${bounds.x+bounds.width/2}px ${bounds.y+bounds.height/2}px)`);
    expect(reveal.options.duration).toBe(650);
    await expect(page.locator('html')).toHaveAttribute('data-bs-theme',theme);
    await page.evaluate(()=>window.themeReveal.animation.finish());
    await expect(light).toBeEnabled();
    await expect(page.locator('html')).not.toHaveClass(/theme-reveal/);
    expect(await light.boundingBox()).toEqual(bounds);
    expect(await chart.getAttribute('data-progress')).toBe(progress);
    await expect(page.locator('#presentation-theme')).toHaveCount(1);
    await expect(page).toHaveURL(/counts-in-context$/);
  }
  expect(errors).toEqual([]);
});

for(const mode of ['reduced motion','without View Transitions']) {
  test(`theme switching works ${mode}`,async({page})=>{
    if(mode==='reduced motion') await page.emulateMedia({reducedMotion:'reduce'});
    else await page.addInitScript(()=>{document.startViewTransition=undefined;});
    await ready(page);
    await page.locator('#theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-bs-theme','dark');
    await expect(page.locator('#theme-toggle')).toBeEnabled();
    await expect(page.locator('html')).not.toHaveClass(/theme-reveal|theme-crossfade/);
  });
}
