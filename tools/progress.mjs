// Renders the build-progress cards and the README progress sections from roadmap.json.
//
//   node tools/progress.mjs           write docs/progress/*.svg and update README.md
//   node tools/progress.mjs --check   exit 1 if anything is out of date
//
// Outputs (light and dark variants, picked by <picture> in the README):
//   docs/progress/progress-{light,dark}.svg   full card: metrics, milestones, stats
//   docs/progress/compact-{light,dark}.svg    two bars, for the profile README
// README sections between <!-- progress:start --> / <!-- progress:end --> and
// <!-- roadmap:start --> / <!-- roadmap:end --> are regenerated as plain Markdown,
// so the numbers are readable without the images too.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const CHECK = process.argv.includes('--check');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'roadmap.json'), 'utf8'));

const THEMES = {
  light: { bg: '#F6F6F4', line: '#D9D9D6', track: '#E6E6E2', ink: '#1A1A1C', soft: '#3A3A3E', mute: '#77777A', chip: '#ECECEA', node: '#1A1A1C', nodeInk: '#F6F6F4' },
  dark: { bg: '#131316', line: '#2C2C31', track: '#26262B', ink: '#F2F2F0', soft: '#D0D0CC', mute: '#8E8E93', chip: '#1D1D21', node: '#F2F2F0', nodeInk: '#131316' },
};
const FONT = "Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Consolas, monospace";
const GRAD = ['#7C5CFF', '#C34FE0', '#FF4F8B'];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtMonth = d => /^\d{4}-\d{2}$/.test(d) ? `${MONTHS[+d.slice(5) - 1]} ${d.slice(0, 4)}` : d[0].toUpperCase() + d.slice(1);
const fmtDay = d => { const [y, m, dd] = d.split('-'); return `${+dd} ${MONTHS[+m - 1]} ${y}`; };
const pct = m => Math.round((m.done / m.total) * 100);

function defs(id) {
  return `<defs><linearGradient id="g${id}" x1="0" x2="1" y1="0" y2="0">${GRAD.map((c, i) => `<stop offset="${i / (GRAD.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient></defs>`;
}

function bar(m, x, y, w, t, id, compact) {
  const p = pct(m);
  const h = compact ? 10 : 12;
  let s = `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${compact ? 13 : 14}" font-weight="600" fill="${t.ink}">${esc(m.label)}</text>`;
  s += `<text x="${x + w}" y="${y}" text-anchor="end" font-family="${MONO}" font-size="${compact ? 12 : 13}" fill="${t.soft}">${m.done} / ${m.total} ${esc(m.unit)} · <tspan font-weight="700" fill="${t.ink}">${p}%</tspan></text>`;
  const by = y + 12;
  if (m.segmented) {
    const gap = 4, seg = (w - gap * (m.total - 1)) / m.total;
    for (let i = 0; i < m.total; i++) {
      const sx = x + i * (seg + gap);
      s += `<rect x="${sx.toFixed(2)}" y="${by}" width="${seg.toFixed(2)}" height="${h}" rx="${h / 2}" fill="${i < m.done ? `url(#g${id})` : t.track}"/>`;
    }
  } else {
    s += `<rect x="${x}" y="${by}" width="${w}" height="${h}" rx="${h / 2}" fill="${t.track}"/>`;
    s += `<rect x="${x}" y="${by}" width="${Math.max(h, (w * p) / 100).toFixed(1)}" height="${h}" rx="${h / 2}" fill="url(#g${id})"/>`;
  }
  if (!compact && m.note) s += `<text x="${x}" y="${by + h + 18}" font-family="${FONT}" font-size="12" fill="${t.mute}">${esc(m.note)}</text>`;
  return s;
}

function fullCard(t, id) {
  const W = 960, pad = 40, inner = W - pad * 2;
  const ms = data.milestones;
  let y = 0, body = '';
  body += `<text x="${pad}" y="52" font-family="${FONT}" font-size="11" letter-spacing="2.2" fill="${t.mute}">${esc(data.product.toUpperCase())} · BUILD PROGRESS</text>`;
  body += `<text x="${pad}" y="88" font-family="${FONT}" font-size="30" font-weight="700" letter-spacing="-0.5" fill="${t.ink}">${esc(data.release.label)} ${esc(data.release.status.toLowerCase())}</text>`;
  body += `<text x="${pad}" y="112" font-family="${FONT}" font-size="13" fill="${t.mute}">Live since ${fmtDay(data.release.since)} · updated ${fmtDay(data.updated)}</text>`;
  // badge
  const bw = 150, bx = W - pad - bw;
  body += `<rect x="${bx}" y="58" width="${bw}" height="34" rx="17" fill="none" stroke="url(#g${id})" stroke-width="1.6"/>`;
  body += `<circle cx="${bx + 20}" cy="75" r="4.5" fill="url(#g${id})"><animate attributeName="opacity" values="1;.35;1" dur="2.4s" repeatCount="indefinite"/></circle>`;
  body += `<text x="${bx + 34}" y="80" font-family="${FONT}" font-size="13" font-weight="600" fill="${t.ink}">${esc(data.release.label)} → ${esc(data.release.next)}</text>`;
  y = 160;
  for (const m of data.metrics) { body += bar(m, pad, y, inner, t, id, false); y += 78; }
  // milestones
  y += 14;
  body += `<text x="${pad}" y="${y}" font-family="${FONT}" font-size="11" letter-spacing="2.2" fill="${t.mute}">MILESTONES</text>`;
  const ly = y + 42, step = inner / (ms.length - 1);
  const lastDone = ms.map(m => m.status).lastIndexOf('done');
  body += `<line x1="${pad}" y1="${ly}" x2="${pad + inner}" y2="${ly}" stroke="${t.line}" stroke-width="2"/>`;
  body += `<line x1="${pad}" y1="${ly}" x2="${pad + step * lastDone}" y2="${ly}" stroke="url(#g${id})" stroke-width="3"/>`;
  ms.forEach((m, i) => {
    const cx = pad + step * i;
    const anchor = i === 0 ? 'start' : i === ms.length - 1 ? 'end' : 'middle';
    const tx = i === 0 ? cx - 9 : i === ms.length - 1 ? cx + 9 : cx;
    body += `<text x="${tx}" y="${ly - 20}" text-anchor="${anchor}" font-family="${MONO}" font-size="11" fill="${t.mute}">${esc(fmtMonth(m.date))}</text>`;
    if (m.status === 'done') {
      body += `<circle cx="${cx}" cy="${ly}" r="9" fill="${t.node}"/><path d="M${cx - 4} ${ly} l2.8 2.8 l5.2 -5.4" fill="none" stroke="${t.nodeInk}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
    } else if (m.status === 'active') {
      body += `<circle cx="${cx}" cy="${ly}" r="9" fill="${t.bg}" stroke="url(#g${id})" stroke-width="2.4"/><circle cx="${cx}" cy="${ly}" r="3.5" fill="url(#g${id})"><animate attributeName="r" values="3.5;5;3.5" dur="2.4s" repeatCount="indefinite"/></circle>`;
    } else {
      body += `<circle cx="${cx}" cy="${ly}" r="8" fill="${t.bg}" stroke="${t.line}" stroke-width="2" stroke-dasharray="3 3"/>`;
    }
    const [l1, l2] = m.title.split(' · ');
    body += `<text x="${tx}" y="${ly + 30}" text-anchor="${anchor}" font-family="${FONT}" font-size="12" font-weight="600" fill="${m.status === 'planned' ? t.mute : t.ink}">${esc(l1)}</text>`;
    if (l2) body += `<text x="${tx}" y="${ly + 46}" text-anchor="${anchor}" font-family="${FONT}" font-size="11.5" fill="${t.mute}">${esc(l2)}</text>`;
  });
  // stats
  const sy = ly + 76, gap = 10, cw = (inner - gap * (data.stats.length - 1)) / data.stats.length;
  data.stats.forEach((s, i) => {
    const sx = pad + i * (cw + gap);
    body += `<rect x="${sx.toFixed(1)}" y="${sy}" width="${cw.toFixed(1)}" height="58" rx="12" fill="${t.chip}"/>`;
    body += `<text x="${(sx + 14).toFixed(1)}" y="${sy + 27}" font-family="${FONT}" font-size="20" font-weight="700" fill="${t.ink}">${esc(s.value)}</text>`;
    body += `<text x="${(sx + 14).toFixed(1)}" y="${sy + 45}" font-family="${FONT}" font-size="11" fill="${t.mute}">${esc(s.label)}</text>`;
  });
  const H = sy + 58 + pad;
  return svg(W, H, t, id, body, `${data.product} build progress`);
}

function compactCard(t, id) {
  const W = 840, pad = 28, inner = W - pad * 2;
  let body = `<text x="${pad}" y="40" font-family="${FONT}" font-size="15" font-weight="700" fill="${t.ink}">${esc(data.product)} <tspan font-weight="400" fill="${t.mute}">· ${esc(data.release.label)} ${esc(data.release.status.toLowerCase())} · updated ${fmtDay(data.updated)}</tspan></text>`;
  let y = 78;
  for (const m of data.metrics) { body += bar(m, pad, y, inner, t, id, true); y += 50; }
  return svg(W, y - 6, t, id, body, `${data.product} build progress`);
}

function svg(W, H, t, id, body, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${defs(id)}` +
    `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="20" fill="${t.bg}" stroke="${t.line}"/>${body}</svg>\n`;
}

function progressMd() {
  const rows = data.metrics.map(m => `| ${m.label} | ${m.done} / ${m.total} ${m.unit} | **${pct(m)}%** |`).join('\n');
  return `_Last updated ${fmtDay(data.updated)} · ${data.release.label} ${data.release.status.toLowerCase()} since ${fmtDay(data.release.since)}._\n\n| Track | Progress | |\n|---|---|---|\n${rows}`;
}
function roadmapMd() {
  const label = { done: 'Done', active: 'In progress', planned: 'Planned' };
  return '| When | Milestone | Status | What shipped, or what comes next |\n|---|---|---|---|\n' +
    data.milestones.map(m => `| ${fmtMonth(m.date)} | ${m.title} | ${label[m.status]} | ${m.detail} |`).join('\n');
}

const outputs = {
  'docs/progress/progress-light.svg': fullCard(THEMES.light, 'L'),
  'docs/progress/progress-dark.svg': fullCard(THEMES.dark, 'D'),
  'docs/progress/compact-light.svg': compactCard(THEMES.light, 'l'),
  'docs/progress/compact-dark.svg': compactCard(THEMES.dark, 'd'),
};
const readmePath = path.join(ROOT, 'README.md');
if (fs.existsSync(readmePath)) {
  let r = fs.readFileSync(readmePath, 'utf8');
  const put = (name, md) => { r = r.replace(new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(<!-- ${name}:end -->)`), (_, a, b) => `${a}\n${md}\n${b}`); };
  put('progress', progressMd());
  put('roadmap', roadmapMd());
  outputs['README.md'] = r;
}

let stale = 0;
for (const [rel, content] of Object.entries(outputs)) {
  const p = path.join(ROOT, rel);
  const cur = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  if (cur === content) continue;
  stale++;
  if (!CHECK) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content); console.log('updated', rel); }
  else console.log('out of date:', rel);
}
if (CHECK) process.exit(stale ? 1 : 0);
if (!stale) console.log('progress: everything up to date');
