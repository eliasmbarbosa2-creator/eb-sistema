// Gera as artes do Instagram da EB (posts 1080x1350 e capas de destaque 1080x1920).
// Uso: node instagram/gerar/gerar.mjs   (precisa do Playwright com Chromium)
// Fotos reais do "antes e depois": coloque em instagram/fotos/antes.jpg e depois.jpg e rode de novo.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { POSTS, DESTAQUES } from './conteudo.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');
const SAIDA = join(RAIZ, 'instagram');
const url = (p) => pathToFileURL(p).href;
const MARCA = url(join(RAIZ, 'public/marca/marca-claro.png'));
const LOGO = url(join(RAIZ, 'public/marca/logo-claro.png'));
const FOTO = (n) => { const p = join(SAIDA, 'fotos', n); return existsSync(p) ? url(p) : null; };

// Mesmos ícones de traço do site (src/lib/icones.tsx) + alguns extras para as artes.
const ICO = Object.fromEntries([...readFileSync(join(RAIZ, 'src/lib/icones.tsx'), 'utf8')
  .matchAll(/^\s+(\w+):'(.*)',?$/gm)].map((m) => [m[1], m[2]]));
Object.assign(ICO, {
  alerta: '<path d="M12 3.5L21.5 20h-19z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.3" r=".6" fill="currentColor"/>',
  fogo: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.4-5.2 3.4-8.3 1.6 1.4 2.4 3 2.4 4.6 1-.8 1.7-2.2 1.8-3.6 2.6 2 5.4 4.6 5.4 7.6 0 3.4-2.6 5.9-6.5 5.9z"/>',
  lampada: '<path d="M9 17.5h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2v1.5h5V16c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>',
  tomada: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9.5 9v3M14.5 9v3"/><path d="M10 15.5h4"/>',
  fio: '<path d="M3 17c3 0 3-10 6-10s3 10 6 10 3-6 6-6"/>',
  nariz: '<path d="M5 15c2-1 3 1 5 0s3-1 5 0 3 1 4 0"/><path d="M5 10c2-1 3 1 5 0s3-1 5 0 3 1 4 0"/><path d="M8 5c1-.6 2 .6 3 0"/>',
  disj: '<rect x="7" y="3" width="10" height="18" rx="1.5"/><rect x="10" y="7" width="4" height="6" rx="1"/><path d="M12 16v2"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  casa: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>',
  ferramenta: '<path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5"/><path d="M14.5 6.5L17 4l3 3-2.5 2.5"/>',
  camera: '<path d="M4 8h3.5l1.5-2.5h6L16.5 8H20v11H4z"/><circle cx="12" cy="13.2" r="3.4"/>',
  botao: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  setas: '<path d="M4 9h13l-3-3M20 15H7l3 3"/>',
  pessoa: '<circle cx="12" cy="7.5" r="3.5"/><path d="M5 20.5c.8-3.8 3.6-6 7-6s6.2 2.2 7 6"/>',
  calendario: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/>',
});
const svg = (n, t = 48, w = 1.7) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${ICO[n] ?? ''}</svg>`;
const RAIO = (cls) => `<svg class="${cls}" viewBox="0 0 100 160"><path d="M62 0L8 92h36L30 160 92 62H56z"/></svg>`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
// **texto** vira destaque azul
const rico = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<em>$1</em>').replace(/\n/g, '<br>');

const fonte = (fam, peso, arq) => `@font-face{font-family:'${fam}';font-weight:${peso};src:url('${url(join(AQUI, 'fontes', arq))}') format('woff2')}`;
const CSS = `
${fonte('Barlow Condensed', 500, 'barlow-condensed-latin-500-normal.woff2')}
${fonte('Barlow Condensed', 600, 'barlow-condensed-latin-600-normal.woff2')}
${fonte('Barlow Condensed', 700, 'barlow-condensed-latin-700-normal.woff2')}
${fonte('Barlow Condensed', 800, 'barlow-condensed-latin-800-normal.woff2')}
${fonte('IBM Plex Sans', 400, 'ibm-plex-sans-latin-400-normal.woff2')}
${fonte('IBM Plex Sans', 500, 'ibm-plex-sans-latin-500-normal.woff2')}
${fonte('IBM Plex Sans', 600, 'ibm-plex-sans-latin-600-normal.woff2')}
:root{--bg:#111A1C;--bg2:#18252A;--linha:#24353B;--ink:#EEF3F4;--mute:#9DB0B5;--ac:#0380AC;--ac2:#38AEDF;--claro:#F2F6F7;--alerta:#F2A93B;--ok:#3CC47C;--ruim:#E5604F}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1350px;background:var(--bg)}
body{font-family:'IBM Plex Sans';color:var(--ink);-webkit-font-smoothing:antialiased;overflow:hidden}
.s{position:relative;width:1080px;height:1350px;padding:84px 88px 0;display:flex;flex-direction:column;overflow:hidden;
  background:radial-gradient(1200px 900px at 100% 0%,#173038 0%,transparent 60%),var(--bg)}
.s.claro{background:var(--claro);color:var(--bg)}
.grade{position:absolute;inset:0;background-image:linear-gradient(var(--linha) 1px,transparent 1px),linear-gradient(90deg,var(--linha) 1px,transparent 1px);background-size:54px 54px;opacity:.35;
  -webkit-mask-image:linear-gradient(160deg,#000 0%,transparent 55%)}
.claro .grade{opacity:.5;background-image:linear-gradient(#DCE5E8 1px,transparent 1px),linear-gradient(90deg,#DCE5E8 1px,transparent 1px)}
.raio-bg{position:absolute;right:-90px;bottom:120px;width:560px;fill:var(--ac);opacity:.09}
.topo{position:relative;display:flex;align-items:center;justify-content:space-between;font-family:'Barlow Condensed';font-weight:600;letter-spacing:.14em;text-transform:uppercase;font-size:26px;color:var(--mute)}
.topo .m{display:flex;align-items:center;gap:16px}.topo img{height:46px}
.claro .topo{color:#5B6D72}
.pag{font-family:'IBM Plex Sans';font-weight:500;letter-spacing:.06em;font-size:24px}
.corpo{position:relative;flex:1;display:flex;flex-direction:column;justify-content:center;padding-bottom:40px}
.kicker{font-family:'Barlow Condensed';font-weight:700;letter-spacing:.16em;text-transform:uppercase;font-size:34px;color:var(--ac2);display:flex;align-items:center;gap:14px;margin-bottom:22px}
.kicker:before{content:'';width:44px;height:5px;background:var(--ac2)}
.claro .kicker{color:var(--ac)}.claro .kicker:before{background:var(--ac)}
h1,h2{font-family:'Barlow Condensed';font-weight:800;text-transform:uppercase;line-height:.92;letter-spacing:-.005em}
h1{font-size:150px}h2{font-size:104px;margin-bottom:34px}
h1 em,h2 em,p em,li em,.aviso em,.cta-box em{font-style:normal;color:var(--ac2)}.aviso em{color:#FFD08A}.cta-box em{color:#fff}
.claro h1 em,.claro h2 em,.claro p em,.claro li em{color:var(--ac)}
.sub{font-size:40px;line-height:1.35;color:var(--mute);margin-top:34px;max-width:860px}
.claro .sub{color:#4A5B60}
.txt{font-size:40px;line-height:1.42;color:#D5DFE1;max-width:880px}
.claro .txt{color:#2A383C}
.txt + .txt{margin-top:26px}
.rodape{position:relative;height:112px;display:flex;align-items:center;justify-content:space-between;border-top:2px solid var(--linha);font-size:26px;color:var(--mute);font-weight:500}
.claro .rodape{border-color:#D3DEE1;color:#5B6D72}
.rodape b{color:var(--ink);font-weight:600}.claro .rodape b{color:var(--bg)}
.seta{display:flex;align-items:center;gap:12px;font-family:'Barlow Condensed';font-weight:700;font-size:32px;letter-spacing:.1em;text-transform:uppercase;color:var(--ac2)}
.claro .seta{color:var(--ac)}
.cards{display:flex;flex-direction:column;gap:24px}
.card{display:flex;gap:30px;align-items:flex-start;background:var(--bg2);border:2px solid var(--linha);border-radius:22px;padding:34px 38px}
.claro .card{background:#fff;border-color:#DCE5E8}
.card .ico{flex:none;width:92px;height:92px;border-radius:20px;background:rgba(3,128,172,.18);color:var(--ac2);display:grid;place-items:center}
.claro .card .ico{background:#DCEEF5;color:var(--ac)}
.card h3{font-family:'Barlow Condensed';font-weight:700;font-size:50px;text-transform:uppercase;line-height:1;margin:4px 0 10px}
.card p{font-size:32px;line-height:1.38;color:var(--mute)}.claro .card p{color:#4A5B60}
.card.alerta .ico{background:rgba(242,169,59,.16);color:var(--alerta)}
.num{font-family:'Barlow Condensed';font-weight:800;font-size:220px;line-height:.8;color:var(--ac2);opacity:.95}
.lista{list-style:none;display:flex;flex-direction:column;gap:26px}
.lista li{display:flex;gap:24px;align-items:flex-start;font-size:40px;line-height:1.3}
.lista li .b{flex:none;width:58px;height:58px;border-radius:50%;background:var(--ac);color:#fff;display:grid;place-items:center;margin-top:-2px}
.lista.x li .b{background:var(--ruim)}
.vs{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.vs .card{flex-direction:column;gap:18px}
.etapa-n{font-family:'Barlow Condensed';font-weight:800;font-size:34px;letter-spacing:.14em;color:var(--ac2);text-transform:uppercase;margin-bottom:14px}
.trilha{display:flex;gap:12px;margin-bottom:46px}.trilha i{flex:1;height:10px;border-radius:5px;background:var(--linha)}.trilha i.on{background:var(--ac2)}
.aviso{margin-top:36px;display:flex;gap:20px;align-items:center;background:rgba(242,169,59,.12);border:2px solid rgba(242,169,59,.45);border-radius:18px;padding:26px 30px;font-size:32px;line-height:1.35;color:#F7DDB2}
.aviso svg{flex:none;color:var(--alerta)}
.claro .aviso{background:#FFF4E2;border-color:#F2C77E;color:#6B4A12}
.logo-capa{position:absolute;right:88px;top:200px;width:300px;opacity:.95}
.cta-box{background:var(--ac);color:#fff;border-radius:26px;padding:46px 50px;margin-top:48px}
.cta-box .t{font-family:'Barlow Condensed';font-weight:800;font-size:66px;text-transform:uppercase;line-height:1}
.cta-box .d{font-size:32px;margin-top:14px;opacity:.95}
.tags{display:flex;gap:14px;flex-wrap:wrap;margin-top:40px}
.tags span{font-family:'Barlow Condensed';font-weight:700;font-size:32px;letter-spacing:.1em;text-transform:uppercase;border:2px solid var(--ac2);color:var(--ac2);padding:10px 22px;border-radius:999px}
/* antes e depois */
.foto{position:absolute;left:0;right:0;top:0;height:1238px;background:#0C1315 center/cover no-repeat;display:grid;place-items:center}
.foto.vazio{background:repeating-linear-gradient(45deg,#16232633 0 22px,#1d2c3033 22px 44px),#121C1F}
.foto .ph{display:flex;flex-direction:column;align-items:center;gap:22px;color:#5F767C;font-family:'Barlow Condensed';font-weight:600;font-size:40px;letter-spacing:.1em;text-transform:uppercase;text-align:center}
.foto:after{content:'';position:absolute;inset:auto 0 0 0;height:420px;background:linear-gradient(transparent,rgba(17,26,28,.92))}
.selo{position:absolute;left:64px;top:64px;z-index:2;font-family:'Barlow Condensed';font-weight:800;font-size:64px;letter-spacing:.12em;text-transform:uppercase;padding:14px 34px;border-radius:14px;background:var(--ruim);color:#fff}
.selo.depois{background:var(--ac)}
.marca-f{position:absolute;right:64px;top:64px;z-index:2;height:74px}
.legenda-f{position:absolute;left:64px;right:64px;bottom:150px;z-index:2}
.legenda-f h2{font-size:84px;margin:0}
.legenda-f p{font-size:34px;color:#C9D6D9;margin-top:12px}
.faixa{position:absolute;left:0;right:0;bottom:0;height:112px;background:var(--bg);display:flex;align-items:center;justify-content:space-between;padding:0 64px;font-size:26px;color:var(--mute);font-weight:500;z-index:2}
.faixa b{color:var(--ink)}
.recorte .foto{background:transparent!important}.recorte .foto .ph,.recorte .foto:after{display:none}
.s.recorte{background:transparent}html.transp,html.transp body{background:transparent}
.split{display:grid;grid-template-columns:1fr 1fr;gap:16px;position:absolute;left:0;right:0;top:0;height:1238px}
.split > div{position:relative;background:#0C1315 center/cover no-repeat;display:grid;place-items:center}
.split .selo{font-size:44px;padding:10px 24px;left:30px;top:30px}
/* destaques */
.dest{width:1080px;height:1920px;background:radial-gradient(900px 900px at 50% 50%,#173038 0%,var(--bg) 70%);display:grid;place-items:center;position:relative;overflow:hidden}
.dest .anel{width:640px;height:640px;border-radius:50%;border:6px solid var(--ac2);display:grid;place-items:center;color:var(--ac2);background:rgba(3,128,172,.10)}
.perfil{width:1080px;height:1080px;background:var(--bg);display:grid;place-items:center}
.perfil img{width:600px}
`;

const topo = (i, n) => `<div class="topo"><div class="m"><img src="${MARCA}">EB Instalações Elétricas</div>${n > 1 ? `<div class="pag">${String(i).padStart(2, '0')}/${String(n).padStart(2, '0')}</div>` : ''}</div>`;
const rodape = (ultimo) => `<div class="rodape"><span>Técnico em Eletrotécnica · <b>Responsável técnico com TRT</b></span>${ultimo ? '<span class="seta">Link na bio ↗</span>' : `<span class="seta">Arraste ${svg('setas', 34, 2.2).replace('M4 9h13l-3-3M20 15H7l3 3', 'M4 12h15M14 6l6 6-6 6')}</span>`}</div>`;

function slide(sl, i, n) {
  const ultimo = i === n;
  const cls = `s ${sl.claro ? 'claro' : ''}`;
  const base = (miolo, extra = '') => `<div class="${cls}"><div class="grade"></div>${extra}${topo(i, n)}<div class="corpo">${miolo}</div>${rodape(ultimo)}</div>`;
  const k = sl.kicker ? `<div class="kicker">${esc(sl.kicker)}</div>` : '';
  switch (sl.tipo) {
    case 'capa':
      return base(`${sl.logo ? `<img src="${LOGO}" style="width:300px;margin-bottom:56px">` : ''}${k}<h1 style="${sl.tam ? `font-size:${sl.tam}px` : ''}">${rico(sl.titulo)}</h1>${sl.sub ? `<p class="sub">${rico(sl.sub)}</p>` : ''}${sl.tags ? `<div class="tags">${sl.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : ''}`,
        RAIO('raio-bg'));
    case 'texto':
      return base(`${sl.icone ? `<div style="color:var(--ac2);margin-bottom:30px">${svg(sl.icone, 110, 1.5)}</div>` : ''}${k}<h2>${rico(sl.titulo)}</h2>${sl.paras.map((p) => `<p class="txt">${rico(p)}</p>`).join('')}${sl.aviso ? `<div class="aviso">${svg('alerta', 54, 1.9)}<span>${rico(sl.aviso)}</span></div>` : ''}`);
    case 'cards':
      return base(`${k}${sl.titulo ? `<h2 style="font-size:${sl.tam ?? 96}px">${rico(sl.titulo)}</h2>` : ''}<div class="cards">${sl.cards.map((c) => `<div class="card ${c.alerta ? 'alerta' : ''}"><div class="ico">${svg(c.icone, 54)}</div><div>${c.n ? `<div class="etapa-n" style="margin:0 0 4px">${esc(c.n)}</div>` : ''}<h3>${rico(c.titulo)}</h3><p>${rico(c.texto)}</p></div></div>`).join('')}</div>${sl.aviso ? `<div class="aviso">${svg('alerta', 54, 1.9)}<span>${rico(sl.aviso)}</span></div>` : ''}`);
    case 'vs':
      return base(`${k}<h2>${rico(sl.titulo)}</h2><div class="vs">${sl.cards.map((c) => `<div class="card"><div class="ico">${svg(c.icone, 54)}</div><h3>${rico(c.titulo)}</h3><p>${rico(c.texto)}</p></div>`).join('')}</div>${sl.rodape ? `<p class="txt" style="margin-top:38px">${rico(sl.rodape)}</p>` : ''}`);
    case 'lista':
      return base(`${k}<h2 style="font-size:${sl.tam ?? 96}px">${rico(sl.titulo)}</h2><ul class="lista ${sl.x ? 'x' : ''}">${sl.itens.map((t) => `<li><span class="b">${svg(sl.x ? 'x' : 'check', 34, 2.6)}</span><span>${rico(t)}</span></li>`).join('')}</ul>${sl.aviso ? `<div class="aviso">${svg('alerta', 54, 1.9)}<span>${rico(sl.aviso)}</span></div>` : ''}`);
    case 'etapa':
      return base(`<div class="trilha">${Array.from({ length: sl.total }, (_, j) => `<i class="${j < sl.n ? 'on' : ''}"></i>`).join('')}</div><div style="display:flex;align-items:flex-end;gap:36px;margin-bottom:26px"><div class="num">${sl.n}</div><div style="color:var(--ac2);padding-bottom:18px">${svg(sl.icone, 120, 1.4)}</div></div><div class="etapa-n">Etapa ${sl.n} de ${sl.total}</div><h2>${rico(sl.titulo)}</h2>${sl.paras.map((p) => `<p class="txt">${rico(p)}</p>`).join('')}`, RAIO('raio-bg'));
    case 'sinais':
      return base(`${k}<div class="cards" style="gap:34px">${sl.itens.map((c) => `<div class="card alerta" style="padding:40px"><div><div class="num" style="font-size:120px;color:var(--alerta);margin-bottom:18px">${c.n}</div><h3 style="font-size:58px">${rico(c.titulo)}</h3><p style="font-size:34px">${rico(c.texto)}</p></div></div>`).join('')}</div>`);
    case 'cta':
      return base(`${k}<h2>${rico(sl.titulo)}</h2>${sl.paras ? sl.paras.map((p) => `<p class="txt">${rico(p)}</p>`).join('') : ''}<div class="cta-box"><div class="t">${rico(sl.botao ?? 'Peça seu orçamento')}</div><div class="d">${rico(sl.detalhe ?? 'Pelo WhatsApp ou pelo formulário do site · link na bio')}</div></div>`, RAIO('raio-bg'));
    case 'foto': {
      const f = FOTO(sl.arquivo);
      return `<div class="s ${sl.recorte ? 'recorte' : ''}" style="padding:0"><div class="foto ${f ? '' : 'vazio'}" style="${f ? `background-image:url('${f}')` : ''}">${f ? '' : `<div class="ph">${svg('camera', 130, 1.3)}<span>Foto ${sl.selo === 'antes' ? 'do antes' : 'do depois'}<br>(vertical, 4:5)</span></div>`}</div>
        <div class="selo ${sl.selo}">${sl.selo}</div><img class="marca-f" src="${MARCA}">
        <div class="legenda-f">${sl.titulo ? `<h2>${rico(sl.titulo)}</h2>` : ''}${sl.texto ? `<p>${rico(sl.texto)}</p>` : ''}</div>
        <div class="faixa"><span><b>EB Instalações Elétricas</b> · ${esc(sl.local ?? 'Cidade – UF')}</span><span class="seta">${i === n ? 'Link na bio ↗' : 'Arraste →'}</span></div></div>`;
    }
    case 'lado': {
      const a = FOTO('antes.jpg'), d = FOTO('depois.jpg');
      const caixa = (f, t) => `<div style="${f ? `background-image:url('${f}')` : 'background:repeating-linear-gradient(45deg,#16232633 0 22px,#1d2c3033 22px 44px),#121C1F'}">${f ? '' : `<div class="foto"><div class="ph" style="font-size:32px">${svg('camera', 90, 1.3)}<span>Foto do ${t}</span></div></div>`}<div class="selo ${t}">${t}</div></div>`;
      return `<div class="s" style="padding:0"><div class="split">${caixa(a, 'antes')}${caixa(d, 'depois')}</div>
        <div class="legenda-f" style="bottom:150px"><h2>${rico(sl.titulo)}</h2><p>${rico(sl.texto)}</p></div>
        <div class="faixa"><span><b>EB Instalações Elétricas</b> · ${esc(sl.local ?? 'Cidade – UF')}</span><span class="seta">Arraste →</span></div></div>`;
    }
    default: throw new Error('tipo desconhecido ' + sl.tipo);
  }
}

const pagina = (corpo, w = 1080, h = 1350) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}html,body{width:${w}px;height:${h}px}</style></head><body>${corpo}</body></html>`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const TMP = mkdtempSync(join(tmpdir(), 'eb-ig-'));
async function foto(html, arq, w = 1080, h = 1350, transparente = false) {
  await page.setViewportSize({ width: w, height: h });
  const tmp = join(TMP, 'slide.html');
  writeFileSync(tmp, transparente ? html.replace('<html>', '<html class="transp">') : html);
  await page.goto(url(tmp), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: arq, omitBackground: transparente, type: 'png' });
}

for (const post of POSTS) {
  const dir = join(SAIDA, 'posts', post.pasta);
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  for (const [j, sl] of post.slides.entries()) {
    await foto(pagina(slide(sl, j + 1, post.slides.length)), join(dir, `${String(j + 1).padStart(2, '0')}.png`), 1080, 1350, !!sl.recorte);
  }
  console.log('ok', post.pasta, post.slides.length);
}
const dd = join(SAIDA, 'destaques'); mkdirSync(dd, { recursive: true });
for (const d of DESTAQUES) await foto(pagina(`<div class="dest"><div class="anel">${svg(d.icone, 330, 1.4)}</div></div>`, 1080, 1920), join(dd, `${d.arquivo}.png`), 1080, 1920);
await foto(pagina(`<div class="perfil"><img src="${LOGO}"></div>`, 1080, 1080), join(dd, 'foto-de-perfil.png'), 1080, 1080);
console.log('ok destaques');
await browser.close();
