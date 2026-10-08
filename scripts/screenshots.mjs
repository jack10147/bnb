// Скриншоты через playwright-core + системный Chrome. Требует запущенный `npm run preview` (порт 4173, base /bnb/).
// Все вкладки проверяются на ошибки консоли; скриншоты сохраняются для SHOTS (по умолчанию — Обзор и Привычки).
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:4173/bnb/';
const PREFIX = process.env.PREFIX || 'real-';
const TABS = ['overview', 'goals', 'tasks', 'habits', 'work', 'sport', 'nutrition'];
const SHOTS = (process.env.SHOTS || 'overview,habits').split(',');
const VIEWPORTS = [{ name: 'desktop', w: 1280, h: 800 }, { name: 'mobile', w: 390, h: 844, mobile: true }];
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let errors = 0;
for (const vp of VIEWPORTS) {
  for (const tab of TABS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: vp.mobile ? 2 : 1, isMobile: !!vp.mobile, hasTouch: !!vp.mobile });
    const page = await ctx.newPage();
    const tag = `${vp.name}-${tab}`;
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') { if (m.type() === 'error') errors++; console.log(`[${tag}] ${m.type()}:`, m.text()); } });
    page.on('pageerror', (e) => { errors++; console.log(`[${tag}] pageerror:`, e.message); });
    page.on('requestfailed', (r) => { errors++; console.log(`[${tag}] requestfailed:`, r.url()); });
    await page.goto(`${BASE}#/${tab}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const text = await page.evaluate(() => document.body.innerText);
    if (/NaN|undefined|Infinity|Не удалось загрузить/.test(text)) { errors++; console.log(`[${tag}] suspicious text:`, text.match(/.{0,40}(NaN|undefined|Infinity|Не удалось загрузить).{0,40}/)?.[0]); }
    if (SHOTS.includes(tab)) {
      // Растягиваем окно на всю высоту страницы: фиксированная нижняя навигация окажется внизу, как на телефоне
      const h = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.setViewportSize({ width: vp.w, height: Math.max(vp.h, h) });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `screenshots/${PREFIX}${vp.name}-${tab}.png` });
      console.log('saved', `screenshots/${PREFIX}${vp.name}-${tab}.png`);
    }
    await ctx.close();
  }
}
await browser.close();
console.log(errors ? `FAILED: ${errors} error(s)` : 'OK: all tabs rendered without errors');
process.exit(errors ? 1 : 0);
