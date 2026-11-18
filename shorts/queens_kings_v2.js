// Crown Quest promo v3 "싸움꾼 왕 8명" - polished casual-game look.
// Assets passed as data URLs: sheet (3 kings on #00FF00: angry, happy, think), bg (vertical background), logo.
// Usage: page.evaluate(queensKingsV2, {level, sol, sheet, bg, logo}) on puzzles.tmhub.co.kr, click #go, read window.__res.
export const queensKingsV2 = function ({level, sol, sheet, bg, logo}) {
  window.__res = null; window.__err = null; window.__prog = 0;
  document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&display=swap">');
  document.body.innerHTML = '<button id="go" style="font-size:40px;padding:20px">start</button><span style="font-family:Black Han Sans">가</span>';
  const loadImg = s => new Promise((r, j) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => r(i); i.onerror = j; i.src = s; });
  const FONT = '"Black Han Sans", "Malgun Gothic"';
  const ready = (async () => {
    await new Promise(r => setTimeout(r, 1500));
    await document.fonts.load(`80px "Black Han Sans"`).catch(() => {});
    return Promise.all([loadImg(sheet), loadImg(bg), loadImg(logo), loadImg('/assets/crown-quest/crown-icon/1.png')]);
  })();
  // chroma key + split sheet into 3 sprites
  function makeSprites(img) {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) { const r = p[i], gg = p[i + 1], b = p[i + 2];
      const key = gg - Math.max(r, b);
      if (key > 90) p[i + 3] = 0; else if (key > 30) { p[i + 3] = Math.round(255 * (1 - (key - 30) / 60)); p[i + 1] = Math.max(r, b); }
      else if (key > 0) p[i + 1] = Math.max(r, b) + key * 0.3; }
    g.putImageData(d, 0, 0);
    const out = [];
    for (let k = 0; k < 3; k++) { const x0 = Math.floor(c.width * k / 3), x1 = Math.floor(c.width * (k + 1) / 3);
      let minx = x1, maxx = x0, miny = c.height, maxy = 0;
      for (let y = 0; y < c.height; y += 2) for (let x = x0; x < x1; x += 2) if (p[(y * c.width + x) * 4 + 3] > 40) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
      const s = document.createElement('canvas'); s.width = maxx - minx + 4; s.height = maxy - miny + 4; s.getContext('2d').drawImage(c, minx - 2, miny - 2, s.width, s.height, 0, 0, s.width, s.height); out.push(s); }
    return {angry: out[0], happy: out[1], think: out[2]};
  }
  document.getElementById('go').addEventListener('click', () => { (async () => {
    const actx = new AudioContext(); await actx.resume();
    const [sheetImg, bgImg, logoImg, crownImg] = await ready;
    const SP = makeSprites(sheetImg);
    const S = {};
    for (const k of ['crown', 'error', 'clear']) { try { S[k] = await actx.decodeAudioData(await (await fetch(`/assets/crown-quest/crown-sound/${k}.wav`)).arrayBuffer()); } catch (e) {} }
    const W = 1080, H = 1920, FPS = 30, n = level.size;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; document.body.appendChild(cv); cv.style.width = '200px';
    const x = cv.getContext('2d');
    const BW = 900, cell = BW / n, BX = (W - BW) / 2, BY = 640;
    const rr = (X, Y, w, h, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); };
    const clamp = v => Math.min(Math.max(v, 0), 1);
    const ease = t => 1 - Math.pow(1 - clamp(t), 3);
    const back = t => { t = clamp(t); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
    const lerp = (a, b, t) => a + (b - a) * t;
    const shade = (hex, f) => { const v = parseInt(hex.slice(1), 16); let r = v >> 16, g = (v >> 8) & 255, b = v & 255; if (f > 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; } return `rgb(${r | 0},${g | 0},${b | 0})`; };
    // game-style text: gradient fill, thick dark stroke, drop shadow
    function gtxt(s, X, Y, size, top = '#fff7c2', bot = '#ffb21e', strokeC = '#3a1d6e', sw = null) {
      x.save(); x.font = `${size}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
      x.lineWidth = sw ?? size * 0.22; x.strokeStyle = 'rgba(0,0,0,0.35)'; x.strokeText(s, X, Y + size * 0.08);
      x.strokeStyle = strokeC; x.strokeText(s, X, Y);
      const gr = x.createLinearGradient(0, Y - size / 2, 0, Y + size / 2); gr.addColorStop(0, top); gr.addColorStop(1, bot); x.fillStyle = gr; x.fillText(s, X, Y); x.restore(); }
    const center = (r, c) => [BX + c * cell + cell / 2, BY + r * cell + cell / 2];

    // timeline
    const T = {calm: 2.4, place: 4.9, ask: 19.4, reveal: 22.6, cta: 25.2, end: 30};
    window.__total = T.end;
    const lastRow = 5, order = [2, 3, 4, 6, 7], failCell = [4, sol[2]];
    const pT = {}; let tt = T.place + 0.3; const stepT = (T.ask - 0.5 - tt - 2.0) / order.length;
    for (const r of order) { if (r === 4) { pT.fail = tt; tt += 2.0; } pT[r] = tt; tt += stepT; }
    pT[lastRow] = T.reveal;

    // particles
    const parts = [];
    const burst = (px, py, t0, colors, count = 18, spd = 520, size = 12) => { for (let i = 0; i < count; i++) { const a = Math.random() * Math.PI * 2, v = spd * (0.4 + Math.random() * 0.8); parts.push({x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, t0, life: 0.9 + Math.random() * 0.5, c: colors[i % colors.length], s: size * (0.6 + Math.random() * 0.8), rot: Math.random() * 6, conf: false}); } };
    const confetti = (t0) => { for (let i = 0; i < 140; i++) parts.push({x: Math.random() * W, y: -40 - Math.random() * 400, vx: (Math.random() - 0.5) * 200, vy: 300 + Math.random() * 400, t0, life: 4, c: ['#ffd23f', '#ff5d8f', '#4cc9f0', '#80ed99', '#ffffff', '#b388ff'][i % 6], s: 18 + Math.random() * 14, rot: Math.random() * 6, conf: true}); };
    const spawned = new Set();
    const once = (key, t, t0, fn) => { if (t >= t0 && !spawned.has(key)) { spawned.add(key); fn(); } };

    function drawSprite(sp, cx, footY, h, opts = {}) {
      const w = h * sp.width / sp.height; const sx = opts.sx ?? 1, sy = opts.sy ?? 1;
      x.save(); x.translate(cx + (opts.dx ?? 0), footY); x.rotate(opts.rot ?? 0); x.scale(sx, sy);
      x.fillStyle = 'rgba(0,0,0,0.25)'; x.beginPath(); x.ellipse(0, -4, w * 0.36, h * 0.06, 0, 0, Math.PI * 2); x.fill();
      x.drawImage(sp, -w / 2, -h, w, h); x.restore(); }

    function drawBoard(t, lit, flash) {
      // frame
      x.save(); x.shadowColor = 'rgba(30,10,80,0.45)'; x.shadowBlur = 40; x.shadowOffsetY = 18;
      const fg = x.createLinearGradient(0, BY - 40, 0, BY + BW + 40); fg.addColorStop(0, '#ffe38a'); fg.addColorStop(0.5, '#f5b335'); fg.addColorStop(1, '#c97a10');
      x.fillStyle = fg; rr(BX - 34, BY - 34, BW + 68, BW + 68, 44); x.fill(); x.restore();
      x.fillStyle = '#3b2370'; rr(BX - 16, BY - 16, BW + 32, BW + 32, 30); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.35)'; rr(BX - 30, BY - 30, BW + 60, 14, 7); x.fill();
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const g = level.grid[r][c], base = level.colors[g], X = BX + c * cell + 4, Y = BY + r * cell + 4, w = cell - 8;
        const l = lit[g] ?? 0;
        x.fillStyle = shade(base, -0.35); rr(X, Y + 6, w, w - 4, 16); x.fill();
        const tg = x.createLinearGradient(0, Y, 0, Y + w); tg.addColorStop(0, shade(base, 0.35)); tg.addColorStop(0.55, base); tg.addColorStop(1, shade(base, -0.12));
        x.fillStyle = tg; rr(X, Y, w, w - 6, 16); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.35)'; rr(X + 8, Y + 6, w - 16, (w - 6) * 0.32, 10); x.fill();
        if (l < 1) { x.fillStyle = `rgba(25,12,60,${0.55 * (1 - l)})`; rr(X, Y, w, w, 16); x.fill(); }
        if (l > 0 && l < 1) { x.fillStyle = `rgba(255,255,230,${0.6 * Math.sin(l * Math.PI)})`; rr(X, Y, w, w, 16); x.fill(); } }
      // region borders
      x.strokeStyle = 'rgba(30,12,70,0.75)'; x.lineWidth = 6; x.lineCap = 'round';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const X = BX + c * cell, Y = BY + r * cell, g = level.grid[r][c];
        if (c < n - 1 && level.grid[r][c + 1] !== g) { x.beginPath(); x.moveTo(X + cell, Y + 2); x.lineTo(X + cell, Y + cell - 2); x.stroke(); }
        if (r < n - 1 && level.grid[r + 1][c] !== g) { x.beginPath(); x.moveTo(X + 2, Y + cell); x.lineTo(X + cell - 2, Y + cell); x.stroke(); } }
      if (flash) for (const [r, c] of flash) { const X = BX + c * cell + 4, Y = BY + r * cell + 4; x.fillStyle = `rgba(255,30,30,${0.45 + 0.25 * Math.sin(t * 22)})`; rr(X, Y, cell - 8, cell - 8, 16); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 6; rr(X + 3, Y + 3, cell - 14, cell - 14, 14); x.stroke(); }
    }
    function starburst(cx, cy, r1, r2, spikes, rot, color) { x.save(); x.translate(cx, cy); x.rotate(rot); x.beginPath(); for (let i = 0; i < spikes * 2; i++) { const r = i % 2 ? r2 : r1, a = i * Math.PI / spikes; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); x.fillStyle = color; x.fill(); x.lineWidth = 8; x.strokeStyle = '#3a1d6e'; x.stroke(); x.restore(); }
    function bolt(a, b, t) { x.save(); x.shadowColor = '#fff36b'; x.shadowBlur = 25; x.strokeStyle = '#fffbd0'; x.lineWidth = 9; x.beginPath(); x.moveTo(a[0], a[1]); for (let i = 1; i < 7; i++) { const k = i / 7; x.lineTo(lerp(a[0], b[0], k) + Math.sin(t * 55 + i * 3) * 22, lerp(a[1], b[1], k) + Math.cos(t * 51 + i * 2) * 22); } x.lineTo(b[0], b[1]); x.stroke(); x.restore(); }
    function dust(cx, cy, t) { for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + t * 3, r = cell * 0.55 + Math.sin(t * 9 + i) * 10; x.fillStyle = 'rgba(255,255,255,0.85)'; x.beginPath(); x.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.6, cell * 0.16 + Math.sin(t * 11 + i) * 5, 0, Math.PI * 2); x.fill(); } }
    function progress(t, cnt) { const PW = 760, PX = (W - PW) / 2, PY = 430;
      x.fillStyle = 'rgba(40,18,90,0.6)'; rr(PX, PY, PW, 70, 35); x.fill(); x.strokeStyle = '#ffe38a'; x.lineWidth = 6; rr(PX, PY, PW, 70, 35); x.stroke();
      const f = cnt / n; const pg = x.createLinearGradient(0, PY, 0, PY + 70); pg.addColorStop(0, '#8ef58a'); pg.addColorStop(1, '#2fb84a');
      if (f > 0) { x.fillStyle = pg; rr(PX + 8, PY + 8, (PW - 16) * f, 54, 27); x.fill(); x.fillStyle = 'rgba(255,255,255,0.4)'; rr(PX + 16, PY + 12, Math.max(0, (PW - 32) * f), 14, 7); x.fill(); }
      x.drawImage(crownImg, PX - 40, PY - 30, 110, 110);
      gtxt(`평화로운 왕국 ${cnt} / ${n}`, W / 2 + 20, PY + 37, 46, '#ffffff', '#fff2b0'); }

    function draw(t) {
      const fight1 = t < T.calm, fight2 = t >= pT.fail + 0.3 && t < pT.fail + 1.5;
      const shk = (fight1 && t > 0.15) || fight2 ? Math.sin(t * 75) * 9 : 0;
      // background
      const s = Math.max(W / bgImg.width, H / bgImg.height); x.drawImage(bgImg, (W - bgImg.width * s) / 2, (H - bgImg.height * s) / 2, bgImg.width * s, bgImg.height * s);
      x.fillStyle = 'rgba(60,30,140,0.18)'; x.fillRect(0, 0, W, H);
      x.save(); x.translate(shk, shk * 0.4);
      // camera: zoomed on the first fight, then pull back
      { const Z0 = 1.6, z = lerp(Z0, 1, ease((t - 1.6) / 0.8));
        if (z > 1.001) { const Sx = W / 2, Sy = BY + BW / 2, P = center(0.5, 1.5), Qx = 520, Qy = 1000; const k = (z - 1) / (Z0 - 1);
          const Fx = lerp(Sx, P[0] - (Qx - Sx) / Z0, k), Fy = lerp(Sy, P[1] - (Qy - Sy) / Z0, k);
          x.translate(Sx, Sy); x.scale(z, z); x.translate(-Fx, -Fy); } }
      // compute kings + lit
      const lit = {}; const litAt = (g, t0) => { lit[g] = Math.max(lit[g] ?? 0, clamp((t - t0) / 0.45)); };
      const kings = [];
      kings.push({c: center(0, sol[0]), sp: t < T.calm ? SP.angry : SP.happy, t0: 0, land: 0.05}); if (t >= T.calm + 0.2) litAt(level.grid[0][sol[0]], T.calm + 0.2);
      { const a = center(1, 2), b = center(1, sol[1]), m = ease((t - T.calm - 0.35) / 0.75); kings.push({c: [lerp(a[0], b[0], m), lerp(a[1], b[1], m)], hop: Math.sin(clamp(m) * Math.PI) * 120, sp: t < T.calm ? SP.angry : SP.happy, t0: 0.15, land: m >= 1 ? T.calm + 1.1 : null}); if (t >= T.calm + 1.1) litAt(level.grid[1][sol[1]], T.calm + 1.1); }
      for (const r of [...order, lastRow]) { const tgt = center(r, sol[r]);
        if (r === 4) { if (t < pT.fail) continue; const fp = center(...failCell);
          if (t < pT.fail + 1.5) { kings.push({c: fp, sp: t > pT.fail + 0.3 ? SP.angry : SP.happy, t0: pT.fail, land: pT.fail + 0.3}); continue; }
          const m = ease((t - pT.fail - 1.5) / 0.5); kings.push({c: [lerp(fp[0], tgt[0], m), lerp(fp[1], tgt[1], m)], hop: Math.sin(m * Math.PI) * 110, sp: SP.happy, t0: -9, land: pT.fail + 2.0}); if (t >= pT.fail + 2.0) litAt(level.grid[r][sol[r]], pT.fail + 2.0); continue; }
        if (t < pT[r] - 0.3) continue;
        kings.push({c: tgt, sp: SP.happy, t0: pT[r] - 0.3, land: pT[r]}); if (t >= pT[r]) litAt(level.grid[r][sol[r]], pT[r]); }
      const flash = fight1 && t > 0.15 ? [[0, sol[0]], [1, 2]] : (fight2 ? [failCell, [2, sol[2]]] : null);
      drawBoard(t, lit, flash);
      if (fight2) kings.forEach(k => { const c2 = center(2, sol[2]); if (Math.abs(k.c[0] - c2[0]) < 1 && Math.abs(k.c[1] - c2[1]) < 1) k.sp = SP.angry; });
      // draw kings sorted by y
      const KH = cell * 1.45;
      kings.sort((a, b) => a.c[1] - b.c[1]).forEach(k => {
        let footY = k.c[1] + cell * 0.42, sx = 1, sy = 1, dx = 0;
        if (k.t0 > -1 && t < k.land) { const d = clamp((t - k.t0) / (k.land - k.t0)); footY -= (1 - d * d) * 420; sy = 1.12; sx = 0.9; }
        if (k.land != null && t >= k.land) { const e = t - k.land; if (e < 0.35) { const w = Math.sin(e / 0.35 * Math.PI * 2) * Math.exp(-e * 6); sx = 1 + 0.25 * w; sy = 1 - 0.25 * w; } }
        if (k.hop) footY -= k.hop;
        if (k.sp === SP.angry) dx = Math.sin(t * 60 + k.c[0]) * 5;
        if (k.sp === SP.happy && k.land != null && t > k.land + 0.4) footY -= Math.abs(Math.sin((t - k.land) * 3.2 + k.c[0])) * 6;
        drawSprite(k.sp, k.c[0], footY, KH, {sx, sy, dx});
        if (k.land != null) once('land' + k.c.join(','), t, k.land, () => burst(k.c[0], k.c[1] + cell * 0.3, k.land, ['#ffffff', '#fff2b0', '#ffd23f'], 14, 380, 10));
      });
      if (fight1 && t > 0.15) { const a = center(0, sol[0]), b = center(1, 2); bolt([a[0], a[1] - cell * 0.4], [b[0], b[1] - cell * 0.4], t); dust((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, t); }
      if (fight2) { const a = center(...failCell), b = center(2, sol[2]); bolt([a[0], a[1] - cell * 0.4], [b[0], b[1] - cell * 0.4], t); }
      once('peace', t, T.reveal, () => { confetti(T.reveal); const c = center(lastRow, sol[lastRow]); burst(c[0], c[1], T.reveal, ['#ffd23f', '#ffffff', '#ff5d8f', '#4cc9f0'], 50, 900, 16); });
      // particles
      for (const p of parts) { const e = t - p.t0; if (e < 0 || e > p.life) continue; const px = p.x + p.vx * e, py = p.y + p.vy * e + (p.conf ? 0 : 900 * e * e); x.save(); x.globalAlpha = p.conf ? 1 : 1 - e / p.life; x.translate(px, py); x.rotate(p.rot + e * 6); x.fillStyle = p.c; if (p.conf) x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); else { x.beginPath(); x.arc(0, 0, p.s / 2, 0, Math.PI * 2); x.fill(); } x.restore(); }
      x.restore();

      // ---------- UI / captions ----------
      const cnt = Object.values(lit).filter(v => v >= 1).length;
      if (t < T.calm) {
        const a = back((t - 0.15) / 0.35); starburst(W / 2, 270, 150 * a, 300 * a, 14, t * 0.6, '#ffd23f');
        x.save(); x.translate(W / 2, 250); x.rotate(-0.06); x.scale(a, a); gtxt('싸움 났다!!', 0, -10, 130, '#ffffff', '#ffd6d6', '#b0122c'); x.restore();
        if (t > 0.7) { const b = back((t - 0.7) / 0.3); x.save(); x.translate(W / 2, 470); x.scale(b, b); gtxt('붙어 있으면 싸우는 왕들 😤', 0, 0, 58, '#ffffff', '#ffe9a8'); x.restore(); }
      } else if (t < T.place) {
        const a = back((t - T.calm) / 0.35); x.save(); x.translate(W / 2, 220); x.scale(a, a); gtxt('왕들이 싸우지 않게', 0, 0, 82, '#ffffff', '#e8ddff'); x.restore();
        const b = back((t - T.calm - 0.25) / 0.35); x.save(); x.translate(W / 2, 330); x.scale(b, b); gtxt('왕국마다 1명씩!', 0, 0, 104); x.restore();
        const c = back((t - T.calm - 0.8) / 0.35); x.save(); x.translate(W / 2, 470); x.scale(c, c); x.fillStyle = 'rgba(255,255,255,0.95)'; rr(-400, -45, 800, 90, 45); x.fill(); x.font = `44px ${FONT}`; x.fillStyle = '#4a2a8a'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('같은 줄 ❌   붙어도 ❌ (대각선도)', 0, 3); x.restore();
      } else if (t < T.ask) {
        if (fight2) { const a = back((t - pT.fail - 0.3) / 0.3); starburst(W / 2, 260, 120 * a, 250 * a, 12, t * 0.6, '#ff5d5d'); x.save(); x.translate(W / 2, 255); x.scale(a, a); gtxt('또 싸운다!!', 0, 0, 120, '#ffffff', '#ffd6d6', '#b0122c'); x.restore(); gtxt('같은 세로줄이잖아요', W / 2, 470, 52, '#ffffff', '#ffe9a8'); }
        else { gtxt('왕을 왕국에 보내 주세요', W / 2, 260, 70, '#ffffff', '#e8ddff'); progress(t, cnt); }
      } else if (t < T.reveal) {
        gtxt('마지막 왕은 어디로?', W / 2, 230, 92, '#ffffff', '#e8ddff');
        const left = Math.ceil(T.reveal - t), ph = (T.reveal - t) % 1, sc = 1 + 0.25 * Math.max(0, ph - 0.7) / 0.3;
        x.save(); x.translate(W / 2, 420); x.scale(sc, sc); x.beginPath(); x.arc(0, 0, 82, 0, Math.PI * 2); const cg = x.createRadialGradient(-20, -25, 10, 0, 0, 82); cg.addColorStop(0, '#fff6c0'); cg.addColorStop(1, '#ffb21e'); x.fillStyle = cg; x.fill(); x.lineWidth = 10; x.strokeStyle = '#3a1d6e'; x.stroke(); gtxt(String(left), 0, 6, 100, '#ffffff', '#fff2b0'); x.restore();
        x.strokeStyle = `rgba(255,255,255,${0.6 + 0.4 * Math.sin(t * 10)})`; x.lineWidth = 10; rr(BX - 4, BY + lastRow * cell - 4, BW + 8, cell + 8, 18); x.stroke();
        drawSprite(SP.think, W / 2 + 210, BY + BW + 330 + Math.sin(t * 4) * 12, 300);
        x.fillStyle = 'rgba(255,255,255,0.97)'; rr(130, BY + BW + 95, 420, 110, 40); x.fill(); x.beginPath(); x.moveTo(500, BY + BW + 200); x.lineTo(560, BY + BW + 240); x.lineTo(470, BY + BW + 200); x.fill();
        x.font = `48px ${FONT}`; x.fillStyle = '#4a2a8a'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('나는 어디로...?', 340, BY + BW + 152);
      } else if (t < T.cta) {
        const a = back((t - T.reveal) / 0.4); x.save(); x.translate(W / 2, 280); x.scale(a, a);
        x.fillStyle = '#e8304f'; rr(-430, -85, 860, 170, 30); x.fill(); x.fillStyle = '#b0122c'; x.beginPath(); x.moveTo(-430, -40); x.lineTo(-500, 0); x.lineTo(-430, 40); x.fill(); x.beginPath(); x.moveTo(430, -40); x.lineTo(500, 0); x.lineTo(430, 40); x.fill();
        gtxt('평화 완성! 🎉', 0, 2, 110); x.restore();
        progress(t, n);
      } else {
        const e = t - T.cta; x.fillStyle = `rgba(40,16,100,${0.78 * clamp(e / 0.4)})`; x.fillRect(0, 0, W, H);
        const a = back(e / 0.45); x.save(); x.translate(W / 2, 520); x.scale(a, a); const lw = 640, lh = lw * logoImg.height / logoImg.width; x.drawImage(logoImg, -lw / 2, -lh / 2, lw, lh); x.restore();
        const b = back((e - 0.3) / 0.4); x.save(); x.translate(W / 2, 880); x.scale(b, b); gtxt('크라운 퀘스트', 0, 0, 120); x.restore();
        const c = back((e - 0.55) / 0.4); x.save(); x.translate(W / 2, 1030); x.scale(c, c); gtxt('매일 새로운 왕국 · 설치 없이 무료', 0, 0, 54, '#ffffff', '#e8ddff'); x.restore();
        const d = back((e - 0.8) / 0.4), pulse = 1 + 0.04 * Math.sin(e * 8); x.save(); x.translate(W / 2, 1220); x.scale(d * pulse, d * pulse);
        x.fillStyle = '#1f8a3a'; rr(-330, -70, 660, 150, 75); x.fill(); const bgd = x.createLinearGradient(0, -80, 0, 70); bgd.addColorStop(0, '#9af59a'); bgd.addColorStop(1, '#2fb84a'); x.fillStyle = bgd; rr(-330, -82, 660, 145, 72); x.fill(); x.fillStyle = 'rgba(255,255,255,0.45)'; rr(-290, -70, 580, 40, 20); x.fill();
        gtxt('지금 플레이 ▶', 0, -8, 76, '#ffffff', '#f0fff0', '#145c27'); x.restore();
        const f = back((e - 1.1) / 0.4); x.save(); x.translate(W / 2, 1420); x.scale(f, f); x.fillStyle = 'rgba(255,255,255,0.96)'; rr(-400, -55, 800, 110, 55); x.fill(); x.font = `52px ${FONT}`; x.fillStyle = '#03c75a'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText("네이버에서 '퍼즐 가든' 검색", 0, 3); x.restore();
        drawSprite(SP.happy, W / 2 - 330, 1760 + Math.abs(Math.sin(e * 4)) * -20, 300); drawSprite(SP.happy, W / 2 + 330, 1760 + Math.abs(Math.sin(e * 4 + 1)) * -20, 300);
      }
      // top pill
      x.fillStyle = 'rgba(40,18,90,0.55)'; rr(W / 2 - 280, 40, 560, 76, 38); x.fill(); x.drawImage(crownImg, W / 2 - 290, 30, 92, 92);
      x.font = `40px ${FONT}`; x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('퍼즐 가든 · 크라운 퀘스트', W / 2 + 40, 80);
    }
    window.__draw = draw;

    // ---------- audio ----------
    const dest = actx.createMediaStreamDestination();
    const master = actx.createGain(); master.gain.value = 1.6; const comp = actx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; master.connect(comp); comp.connect(dest);
    const startAt = actx.currentTime + 0.25;
    const play = (k, t, v = 1) => { if (!S[k]) return; const s = actx.createBufferSource(); s.buffer = S[k]; const g = actx.createGain(); g.gain.value = v; s.connect(g); g.connect(master); s.start(startAt + t); };
    const tone = (t, f, dur, vol, type = 'sine', f2 = null) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.setValueAtTime(f, startAt + t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, startAt + t + dur); g.gain.setValueAtTime(0.0001, startAt + t); g.gain.exponentialRampToValueAtTime(vol, startAt + t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, startAt + t + dur); o.connect(g); g.connect(master); o.start(startAt + t); o.stop(startAt + t + dur + 0.05); };
    const nb = actx.createBuffer(1, actx.sampleRate * 0.5, actx.sampleRate); { const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const noise = (t, dur, vol, f = 1200, type = 'bandpass') => { const s = actx.createBufferSource(); s.buffer = nb; const fl = actx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; const g = actx.createGain(); g.gain.setValueAtTime(vol, startAt + t); g.gain.exponentialRampToValueAtTime(0.0001, startAt + t + dur); s.connect(fl); fl.connect(g); g.connect(master); s.start(startAt + t); s.stop(startAt + t + dur); };
    const N = m => 440 * Math.pow(2, (m - 69) / 12);
    const boom = t => { tone(t, 120, 0.4, 0.5, 'sine', 40); noise(t, 0.35, 0.4, 400, 'lowpass'); };
    const scuffle = t0 => { for (let i = 0; i < 10; i++) { noise(t0 + i * 0.11, 0.08, 0.25, 900 + (i % 3) * 500); if (i % 3 === 0) tone(t0 + i * 0.11, 180, 0.07, 0.12, 'square'); } };
    const whoosh = t => noise(t, 0.35, 0.25, 2500);
    const pop = (t, m) => { tone(t, N(m), 0.18, 0.2, 'sine'); tone(t, N(m + 12), 0.1, 0.08, 'triangle'); };
    boom(0.12); play('error', 0.12, 0.9); scuffle(0.3); scuffle(1.4);
    whoosh(T.calm + 0.35); pop(T.calm + 1.1, 79); tone(T.calm + 1.15, N(84), 0.3, 0.1);
    const scale = [72, 74, 76, 77, 79, 81, 83, 84];
    [...order].forEach((r, i) => { if (r === 4) return; whoosh(pT[r] - 0.3); play('crown', pT[r], 0.8); pop(pT[r] + 0.02, scale[i + 1]); });
    whoosh(pT.fail); boom(pT.fail + 0.3); play('error', pT.fail + 0.3, 0.8); scuffle(pT.fail + 0.4); whoosh(pT.fail + 1.5); play('crown', pT.fail + 2.0, 0.8); pop(pT.fail + 2.02, 76);
    for (let s = 0; s < 3; s++) { tone(T.ask + 0.2 + s, 1400, 0.07, 0.18, 'square'); tone(T.ask + 0.7 + s, 900, 0.05, 0.08, 'square'); }
    whoosh(T.reveal - 0.3); play('crown', T.reveal, 1); play('clear', T.reveal + 0.05, 1); boom(T.reveal);
    [72, 76, 79, 84, 88, 91].forEach((m, i) => tone(T.reveal + 0.15 + i * 0.07, N(m), 0.5, 0.12, 'triangle'));
    [79, 84, 88].forEach((m, i) => tone(T.cta + 0.8 + i * 0.1, N(m), 0.4, 0.12, 'triangle'));
    // bouncy bed: bass + pluck + hats (dips during fights and countdown)
    const beat = 60 / 120, bass = [48, 45, 41, 43], arp = [[72, 76, 79], [69, 72, 76], [65, 69, 72], [67, 71, 74]];
    for (let i = 0; T.calm + i * beat / 2 < T.end - 0.7; i++) { const t = T.calm + i * beat / 2; if ((t > pT.fail + 0.25 && t < pT.fail + 1.5) || (t > T.ask && t < T.reveal)) continue;
      const bar = Math.floor(i / 8) % 4, st = i % 8; if (st % 4 === 0) tone(t, N(bass[bar] - 12), 0.35, 0.16, 'sine'); if (st === 2 || st === 6) tone(t, N(bass[bar]), 0.15, 0.07, 'triangle');
      if (st % 2 === 1) noise(t, 0.04, 0.05, 8000, 'highpass'); if (st % 2 === 0) tone(t, N(arp[bar][(st / 2) % 3]), 0.16, 0.05, 'triangle'); }
    for (let s = 0; s < 3; s++) tone(T.ask + s, N(36), 0.9, 0.12, 'sine');
    master.gain.setValueAtTime(1.6, startAt + T.end - 0.8); master.gain.linearRampToValueAtTime(0.0001, startAt + T.end);

    const vtrack = cv.captureStream(0).getVideoTracks()[0];
    const rec = new MediaRecorder(new MediaStream([vtrack, ...dest.stream.getAudioTracks()]), {mimeType: 'video/mp4;codecs=avc1.640028,mp4a.40.2', videoBitsPerSecond: 10_000_000, audioBitsPerSecond: 160_000});
    const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data); const done = new Promise(r => rec.onstop = r);
    draw(0); rec.start(500); vtrack.requestFrame();
    while (actx.currentTime < startAt) await new Promise(r => setTimeout(r, 2));
    let frames = 0;
    await new Promise(resolve => { const tick = () => { const t = actx.currentTime - startAt; draw(t); vtrack.requestFrame(); frames++; window.__prog = t; if (t < T.end) setTimeout(tick, Math.max(0, (frames + 1) / FPS - t) * 1000); else resolve(); }; tick(); });
    rec.stop(); await done;
    const buf = new Uint8Array(await new Blob(chunks, {type: 'video/mp4'}).arrayBuffer()); let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    window.__res = {b64: btoa(bin), size: buf.length, frames};
  })().catch(e => window.__err = String(e && e.stack || e)); }, {once: true});
  return 'armed';
};
