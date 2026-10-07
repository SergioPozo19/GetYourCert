// Generates 1200x630 social images in seo-assets/og/ (one per exam + home).
// Usage: node tools/og_images.mjs
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const exams = JSON.parse(idx.match(/<script id="examsdata" type="application\/json">([\s\S]*?)<\/script>/)[1]).filter(e => !e.soon);
for (const e of exams) e.n = JSON.parse(fs.readFileSync(path.join(ROOT, 'questions', e.id + '.json'), 'utf8')).length;
const total = exams.reduce((s, e) => s + e.n, 0);
const icon = fs.readFileSync(path.join(ROOT, 'icon.svg'), 'utf8');
const out = path.join(ROOT, 'seo-assets', 'og');
fs.mkdirSync(out, { recursive: true });

const LV = { fundamentals: ['#1E9E6A', 'Fundamentals'], associate: ['#0F6CBD', 'Associate'], expert: ['#7A4FD6', 'Expert'], specialty: ['#D9822B', 'Specialty'] };
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shortName = t => t.replace(/^Microsoft (365 )?Certified:\s*/, '');

function page({ code, title, sub, accent, badge }) {
  return `<!doctype html><html><head><meta charset="utf-8">
<style>
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;font-family:'Segoe UI',system-ui,sans-serif;color:#fff;
 background:linear-gradient(135deg,#0A3F86 0%,#0F6CBD 55%,#2886DE 100%);position:relative;overflow:hidden}
.c1{position:absolute;right:-140px;top:-160px;width:620px;height:620px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.22),rgba(255,255,255,0) 68%)}
.c2{position:absolute;left:-120px;bottom:-220px;width:520px;height:520px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.12),rgba(255,255,255,0) 70%)}
.wrap{position:absolute;inset:64px 72px;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:16px;font-size:30px;font-weight:700;letter-spacing:-.01em}
.brand svg{width:56px;height:56px;border-radius:14px;background:#fff;padding:6px}
.badge{display:inline-block;margin-top:56px;padding:8px 18px;border-radius:99px;background:${accent};font-size:22px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;align-self:flex-start;box-shadow:0 4px 14px rgba(0,0,0,.18)}
.code{font-size:${code.length > 8 ? 92 : 128}px;font-weight:800;letter-spacing:-.03em;line-height:1;margin-top:22px}
.title{font-size:40px;font-weight:600;line-height:1.2;margin-top:18px;max-width:1000px;opacity:.97}
.sub{margin-top:auto;font-size:28px;font-weight:600;opacity:.92;display:flex;gap:28px}
.sub span{display:flex;align-items:center;gap:10px}
.sub span:before{content:"";width:12px;height:12px;border-radius:50%;background:#7CF0A8}
</style></head><body><div class="c1"></div><div class="c2"></div>
<div class="wrap">
 <div class="brand">${icon}EarnYourCert</div>
 <div class="badge">${esc(badge)}</div>
 <div class="code">${esc(code)}</div>
 <div class="title">${esc(title)}</div>
 <div class="sub">${sub.map(s => `<span>${esc(s)}</span>`).join('')}</div>
</div></body></html>`;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
async function shot(name, html) {
  await p.setContent(html, { waitUntil: 'load' });
  await p.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 86 });
}
for (const e of exams) {
  const [accent, lvl] = LV[e.level] || LV.associate;
  await shot(e.id, page({ code: e.code, title: shortName(e.title_en), accent, badge: lvl + ' · Practice exam',
    sub: [e.n + ' questions', 'Explanations', 'Free to start'] }));
}
await shot('home', page({ code: 'Practice exams', title: `${exams.length} Microsoft certifications: Azure, Microsoft 365, Copilot, Security, Data & AI`,
  accent: '#1E9E6A', badge: 'Microsoft certification prep', sub: [Math.floor(total / 100) * 100 + '+ questions', 'Explanations', 'Free to start'] }));
await browser.close();
console.log('OG images:', exams.length + 1);
