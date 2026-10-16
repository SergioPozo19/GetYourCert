// EarnYourCert smoke tests: the key flows on desktop and phone, against a local static server.
//   node tests/smoke.mjs            (exit code 1 if anything fails)
// Runs automatically before every `git push` (see .githooks/pre-push; enable once with
// `git config core.hooksPath .githooks`). The PHP API is mocked; the service worker is blocked
// (otherwise it would serve cached files and hide the requests from the mocks).
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PORT = 8800 + Math.floor(Math.random() * 100);
const BASE = `http://127.0.0.1:${PORT}`;
const results = [];
const ok = (name) => results.push({ name, ok: true });
const fail = (name, why) => results.push({ name, ok: false, why: String(why).split('\n')[0].slice(0, 300) });
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message || e); } }
const assert = (c, msg) => { if (!c) throw new Error(msg); };

// ---------- static server
const server = spawn(process.platform === 'win32' ? 'python' : 'python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch (e) {} };
process.on('exit', stop);
for (let i = 0; i < 50; i++) { try { await fetch(BASE + '/sw.js'); break; } catch (e) { await new Promise(r => setTimeout(r, 150)); } }

// ---------- API mocks
const API = {
  'referral.php': (m) => m === 'GET' ? { ok: true, code: 'TEST123', invited: 1, bonus: 0, per: 50 } : { ok: true, bonus: 50 },
  'reviews.php': () => ({ ok: true, reviews: [] }),
  'events.php': () => ({ ok: true }),
  'sync.php': () => ({ ok: true, data: null }),
  'stats.php': () => ({ ok: false, error: 'forbidden' }),
};
async function newPage(browser, opts, { user = null, lang = 'es' } = {}) {
  const ctx = await browser.newContext({ ...opts, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|GSI_LOGGER|accounts\.google|status of 40[34]/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.route('**/accounts.google.com/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await page.route('**/api/**', r => {
    const u = r.request().url(); if (/\.html(\?|$)/.test(u)) return r.continue();
    const key = Object.keys(API).find(k => u.includes(k));
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(key ? API[key](r.request().method()) : { ok: false }) });
  });
  await page.addInitScript(([user, lang]) => {
    localStorage.setItem('eyc_onboarded', '1'); localStorage.setItem('onboardingDone', '1');
    localStorage.setItem('gyc:lang', JSON.stringify(lang));
    if (user) { localStorage.setItem('gyc:session', JSON.stringify('t')); localStorage.setItem('gyc:account', JSON.stringify(user)); }
  }, [user, lang]);
  return { ctx, page, errors };
}
const closeModals = (page) => page.evaluate(() => document.querySelectorAll('.modal-ov.show .modal-x,.modal-ov.show .modal-close-btn,#obSkipBtn').forEach(x => x.click()));
const noOverflow = async (page, where) => { const w = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); assert(w[0] <= w[1] + 1, `${where}: page is ${w[0]}px wide for a ${w[1]}px screen`); };

const DESK = { viewport: { width: 1280, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const FREE = { name: 'Test User', email: 'test@example.com', is_pro: false };
const PRO = { name: 'Pro User', email: 'pro@example.com', is_pro: true };

const browser = await chromium.launch();
try {
  for (const [dev, opts] of [['desktop', DESK], ['phone', PHONE]]) {
    // catalog as a guest
    await check(`${dev}: catalog (guest)`, async () => {
      const { ctx, page, errors } = await newPage(browser, opts);
      await page.goto(BASE + '/index.html'); await page.waitForTimeout(1200); await closeModals(page);
      const n = await page.locator('#examGrid .exam-card:not(.coming-soon)').count();
      assert(n >= 16, `only ${n} exam cards`);
      await page.waitForFunction(() => !document.documentElement.classList.contains('booting'), null, { timeout: 5000 });
      const pre = await page.evaluate(() => {
        const p = [...document.querySelectorAll('link[rel=preload][as=script]')].map(l => l.getAttribute('href')).sort();
        const s = [...document.querySelectorAll('script[src]')].map(x => x.getAttribute('src')).filter(x => !/^https?:/.test(x)).sort();
        return { p, s };
      });
      assert(JSON.stringify(pre.p) === JSON.stringify(pre.s), `preloads ${pre.p} != scripts ${pre.s}`);
      assert(await page.locator('#qotd .qd-opt').count() >= 3, 'question of the day missing');
      if (dev === 'phone') {
        assert(await page.evaluate(() => document.documentElement.classList.contains('m-app')), 'mobile shell not active');
        await noOverflow(page, 'catalog');
      }
      assert(!errors.length, errors.join(' | '));
      await ctx.close();
    });

    // exam home + domain practice + finishing a short practice
    await check(`${dev}: exam home and a practice session`, async () => {
      const { ctx, page, errors } = await newPage(browser, opts, { user: FREE });
      await page.goto(BASE + '/index.html'); await page.waitForTimeout(1000); await closeModals(page);
      await page.evaluate(() => selectExam('az-900')); await page.waitForTimeout(800);
      assert(await page.locator('#xh .xh-dom').count() === 3, 'domain rows missing on the exam page');
      await page.locator('#xh .xh-dom').first().click(); await page.waitForTimeout(300);
      assert(await page.evaluate(() => document.getElementById('lenModal').classList.contains('show') && mode === 'domain'), 'domain practice did not open');
      await page.evaluate(() => { document.getElementById('lenModal').classList.remove('show'); mode = 'all'; });
      // a 5-question free-review session answered at random, then finish
      await page.evaluate(() => { _lenSelected = 5; startExam(); });
      await page.waitForTimeout(500);
      assert(await page.evaluate(() => !document.getElementById('exam').classList.contains('hidden')), 'exam screen not shown');
      if (dev === 'phone') await noOverflow(page, 'exam');
      await page.evaluate(async () => {
        for (let i = 0; i < exam.length; i++) {
          cur = i; render();
          const o = document.querySelector('#opts .opt, #opts button, #opts .yn-btn, #opts select');
          if (o && o.tagName === 'SELECT') { o.selectedIndex = 1; o.dispatchEvent(new Event('change', { bubbles: true })); } else if (o) o.click();
          await new Promise(r => setTimeout(r, 30));
        }
      });
      await page.evaluate(() => document.getElementById('submitBtn').click());
      await page.waitForTimeout(600);
      const cm = await page.$('#confirmModal.show #cmOk'); if (cm) { await cm.click(); await page.waitForTimeout(600); }
      assert(await page.evaluate(() => !document.getElementById('results').classList.contains('hidden')), 'results screen not shown');
      assert(!errors.length, errors.join(' | '));
      await ctx.close();
    });

    // badge after a strong mock exam (simulated results)
    await check(`${dev}: badge after 80%+ mock exam`, async () => {
      const { ctx, page, errors } = await newPage(browser, opts, { user: FREE });
      await page.goto(BASE + '/index.html'); await page.waitForTimeout(1000); await closeModals(page);
      await page.evaluate(async () => { await selectExam('az-104'); mode = 'exam'; exam = new Array(50).fill(0);
        ['catalog', 'home', 'exam'].forEach(id => document.getElementById(id).classList.add('hidden')); document.getElementById('results').classList.remove('hidden');
        window.careerAfterResults({ pct: 86, passed: true, domStat: {}, passMark: 70 }); });
      await page.waitForTimeout(400);
      assert(await page.locator('#invBadge img').count() === 1, 'badge panel missing');
      assert(!errors.length, errors.join(' | '));
      await ctx.close();
    });

    // deep link to a domain + invite link capture
    await check(`${dev}: deep link ?exam&dom and ?ref`, async () => {
      const { ctx, page, errors } = await newPage(browser, opts);
      await page.goto(BASE + '/?exam=az-104&dom=4&ref=abc1234'); await page.waitForTimeout(1500);
      assert(await page.evaluate(() => document.getElementById('lenModal').classList.contains('show') && domainPick === 4), 'domain 4 practice did not open');
      assert(await page.evaluate(() => localStorage.getItem('gyc:refCode')) === '"ABC1234"', 'invite code not stored');
      assert(!errors.length, errors.join(' | '));
      await ctx.close();
    });

    // Pro identity
    await check(`${dev}: Pro member look`, async () => {
      const { ctx, page, errors } = await newPage(browser, opts, { user: PRO });
      await page.goto(BASE + '/index.html'); await page.waitForTimeout(1200); await closeModals(page);
      assert(await page.evaluate(() => document.body.classList.contains('is-pro')), 'body.is-pro missing');
      assert(await page.locator('#heroBanner .eng-hello').count() === 1, 'Pro greeting missing in hero');
      assert(!errors.length, errors.join(' | '));
      await ctx.close();
    });
  }

  // phone-only: More sheet, invite sheet, language switch
  await check('phone: More sheet, invite and language', async () => {
    const { ctx, page, errors } = await newPage(browser, PHONE, { user: FREE });
    await page.goto(BASE + '/index.html'); await page.waitForTimeout(1200); await closeModals(page);
    await page.click('.account-info'); await page.waitForTimeout(400);
    assert(await page.locator('#mSheet [data-act="invite"]').count() === 1, 'invite row missing in More sheet');
    await page.click('#mSheet [data-act="invite"]'); await page.waitForTimeout(500);
    assert(await page.evaluate(() => document.getElementById('inviteModal').classList.contains('show')), 'invite sheet did not open');
    assert((await page.inputValue('#invLink')).includes('?ref=TEST123'), 'invite link missing the code');
    await page.evaluate(() => document.getElementById('inviteModal').classList.remove('show'));
    await page.click('#langToggle [data-lang="en"]'); await page.waitForTimeout(500);
    assert(await page.evaluate(() => lang === 'en'), 'language did not switch');
    await noOverflow(page, 'catalog (en)');
    assert(!errors.length, errors.join(' | '));
    await ctx.close();
  });

  // SEO pages and admin panel
  for (const [name, url] of [['landing az-900', '/az-900.html'], ['landing en/ab-900', '/en/ab-900.html'], ['domain page', '/az-104-dominio-4.html'], ['category page', '/examenes-practica-azure.html']]) {
    await check(`seo: ${name}`, async () => {
      const { ctx, page, errors } = await newPage(browser, PHONE);
      const res = await page.goto(BASE + url); await page.waitForTimeout(400);
      assert(res.status() === 200, `HTTP ${res.status()}`);
      const ld = await page.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { JSON.parse(s.textContent); return true; } catch (e) { return false; } }));
      assert(ld.length && ld.every(Boolean), 'invalid JSON-LD');
      assert(await page.locator('h1').count() === 1, 'expected exactly one h1');
      await noOverflow(page, url);
      assert(!errors.length, errors.join(' | '));
      await ctx.close();
    });
  }
  await check('admin panel asks to sign in', async () => {
    const { ctx, page, errors } = await newPage(browser, DESK);
    await page.goto(BASE + '/api/admin/panel.html'); await page.waitForTimeout(500);
    assert((await page.textContent('#msg')).includes('Inicia sesión'), 'no sign-in prompt');
    assert(!errors.length, errors.join(' | '));
    await ctx.close();
  });
} finally {
  await browser.close();
  stop();
}

const failed = results.filter(r => !r.ok);
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : '\n      ' + r.why}`);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
