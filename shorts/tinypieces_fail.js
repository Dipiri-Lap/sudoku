// Tiny Pieces 15s "fail" short: player almost finishes, fumbles the last swap, time runs out.
// Usage: page.evaluate(tinyFail, {img, rows, cols, title, seed}) on puzzles.tmhub.co.kr, click #go, read window.__res.
export const tinyFail = function ({img, rows, cols, title, seed: seed0, handImg, handTip}) {
  window.__res = null; window.__err = null; window.__prog = 0;
  document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&display=swap">');
  document.body.innerHTML = '<button id="go" style="font-size:40px;padding:20px">start</button><span style="font-family:Black Han Sans">가</span>';
  const FONT = '"Black Han Sans", "Malgun Gothic"';
  const load = s => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = s; });
  const ready = (async () => { await new Promise(r => setTimeout(r, 1500)); await document.fonts.load(`80px "Black Han Sans"`).catch(() => {}); return Promise.all([load(img), handImg ? load(handImg) : null]); })();
  document.getElementById('go').addEventListener('click', () => { (async () => {
    const actx = new AudioContext(); await actx.resume();
    const [IM, HAND] = await ready; const HAND_TIP = handTip || [0.5, 0.05];
    const W = 1080, H = 1920, FPS = 30;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; document.body.appendChild(cv); cv.style.width = '200px';
    const x = cv.getContext('2d');
    let seed = seed0 || 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const clamp = v => Math.min(Math.max(v, 0), 1);
    const ease = t => 1 - Math.pow(1 - clamp(t), 3);
    const easeIO = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    const back = t => { t = clamp(t); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
    const lerp = (a, b, t) => a + (b - a) * t;
    const rr = (X, Y, w, h, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); };
    function gtxt(s, X, Y, size, top = '#fff7c2', bot = '#ffb21e', strokeC = '#5a2a12', sw = null) {
      x.save(); x.font = `${size}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
      x.lineWidth = sw ?? size * 0.22; x.strokeStyle = 'rgba(0,0,0,0.3)'; x.strokeText(s, X, Y + size * 0.08); x.strokeStyle = strokeC; x.strokeText(s, X, Y);
      const g = x.createLinearGradient(0, Y - size / 2, 0, Y + size / 2); g.addColorStop(0, top); g.addColorStop(1, bot); x.fillStyle = g; x.fillText(s, X, Y); x.restore(); }

    // ---------- puzzle ----------
    const n = rows * cols;
    const BW = 920, BH = Math.round(BW * IM.height / IM.width * rows / rows), BX = (W - BW) / 2, BY = 560;
    const cw = BW / cols, ch = BH / rows;
    const sw = IM.width / cols, sh = IM.height / rows;
    // scramble with disjoint swaps
    const perm = [...Array(n).keys()]; const used = new Set(); const pairs = [];
    const NSW = Math.min(Math.floor(n / 2) - 1, 11);
    while (pairs.length < NSW) { const a = Math.floor(rnd() * n), b = Math.floor(rnd() * n); if (a === b || used.has(a) || used.has(b)) continue; used.add(a); used.add(b); pairs.push([a, b]); [perm[a], perm[b]] = [perm[b], perm[a]]; }
    const lastPair = pairs[pairs.length - 1];
    const solveSeq = pairs.slice(0, -1);                     // swaps actually completed

    // ---------- timeline (event based: natural pace with early mistakes) ----------
    const T = {show: 1.0, shuffle: 0.9, play: 2.1, timeUp: 12.1, cta: 13.0, end: 15.8};
    window.__total = T.end;
    const okSlots = [...Array(n).keys()].filter(i => !used.has(i));
    const pickOk = () => okSlots[Math.floor(rnd() * okSlots.length)];
    // ev: {k:'ok'|'wrong'|'hover'|'final', a, c, t, d}
    const ev = []; let tt = T.play + 0.3;
    const add = (k, a, c, d) => { ev.push({k, a, c, t: tt, d}); tt += d; };
    const S = pairs; let si = 0; const pat = ['hover','ok','ok','wrong','ok','hover','ok','wrong','ok','ok','hover','ok','ok','ok'];
    for (const k of pat) { if (tt >= T.timeUp || si >= S.length) break;
      if (k === 'ok') add('ok', ...S[si++], 0.9 + rnd() * 0.25);
      else if (k === 'wrong') add('wrong', S[si][0], pickOk(), 0.8);
      else add('hover', S[si][0], pickOk(), 0.55); }
    const okEnd = ev.filter(e => e.k === 'ok' && e.t + e.d * 0.75 < T.timeUp).map(e => ({...e, done: e.t + e.d * 0.75}));
    const hesT = 99; const lastEv = ev[ev.length - 1];
    const challengeLeft = t => Math.min(T.timeUp - T.play, Math.max(0, (T.timeUp - T.play) - (t - T.play)));
    function boardAt(t) { const b = perm.slice(); for (const e of okEnd) if (t >= e.done) [b[e.a], b[e.c]] = [b[e.c], b[e.a]]; return b; }
    const center = s => [BX + (s % cols) * cw + cw / 2, BY + Math.floor(s / cols) * ch + ch / 2];
    const parts = [];
    const burst = (px, py, t0, colors, count = 16, spd = 520, size = 12) => { for (let i = 0; i < count; i++) { const a = rnd() * Math.PI * 2, v = spd * (0.4 + rnd() * 0.8); parts.push({x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 150, t0, life: 0.7 + rnd() * 0.4, c: colors[i % colors.length], s: size * (0.6 + rnd() * 0.8)}); } };
    const spawned = new Set(); const once = (k, t, t0, f) => { if (t >= t0 && !spawned.has(k)) { spawned.add(k); f(); } };
    function piece(pid, X, Y, w, h, opts = {}) {
      x.save(); if (opts.lift) { x.shadowColor = 'rgba(0,0,0,0.45)'; x.shadowBlur = 30; x.shadowOffsetY = 16; }
      x.translate(X + w / 2, Y + h / 2); x.rotate(opts.rot || 0); const s = opts.scale || 1; x.scale(s, s);
      rr(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 14); x.clip(); x.drawImage(IM, (pid % cols) * sw, Math.floor(pid / cols) * sh, sw, sh, -w / 2, -h / 2, w, h); x.restore();
      x.save(); x.translate(X + w / 2, Y + h / 2); x.rotate(opts.rot || 0); x.scale(s, s);
      x.lineWidth = opts.red ? 10 : (opts.glow ? 10 : 4); x.strokeStyle = opts.red ? '#ff3b3b' : (opts.glow ? `rgba(255,240,140,${opts.glow})` : 'rgba(255,255,255,0.75)');
      rr(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 14); x.stroke(); x.restore(); }
    function hand(X, Y, press) {
      if (!HAND) return; const hw = 230, hh = hw * HAND.height / HAND.width; const s = press ? 0.92 : 1;
      x.save(); x.translate(X, Y); if (press) { x.fillStyle = 'rgba(255,255,255,0.6)'; x.beginPath(); x.arc(0, 0, 30, 0, Math.PI * 2); x.fill(); }
      x.scale(s, s); x.shadowColor = 'rgba(0,0,0,0.3)'; x.shadowBlur = 14; x.shadowOffsetY = 8;
      x.drawImage(HAND, -hw * HAND_TIP[0], -hh * HAND_TIP[1], hw, hh); x.restore(); }
    let lastHand = [W / 2, BY + BH + 160];
    const posOf = pid => perm.indexOf(pid);
    function introBoard(t) {
      const ps = [...Array(n).keys()].map(pid => { const from = pid, to = posOf(pid); const st = T.show + (pid % 7) * 0.05; const p = easeIO(clamp((t - st) / 0.75)); return {pid, from, to, p}; });
      // still pieces first, moving ones on top
      for (const q of ps.filter(q => q.p === 0 || q.p === 1 || q.from === q.to)) { const s = q.p >= 1 ? q.to : q.from; piece(q.pid, BX + (s % cols) * cw, BY + Math.floor(s / cols) * ch, cw, ch, {}); }
      if (t < T.show) { x.save(); x.strokeStyle = `rgba(255,255,255,${0.6 + 0.3 * Math.sin(t * 8)})`; x.lineWidth = 10; rr(BX - 4, BY - 4, BW + 8, BH + 8, 24); x.stroke(); x.restore(); }
      for (const q of ps.filter(q => q.p > 0 && q.p < 1 && q.from !== q.to)) { const [fx, fy] = [BX + (q.from % cols) * cw, BY + Math.floor(q.from / cols) * ch], [tx, ty] = [BX + (q.to % cols) * cw, BY + Math.floor(q.to / cols) * ch]; piece(q.pid, lerp(fx, tx, q.p), lerp(fy, ty, q.p) - Math.sin(q.p * Math.PI) * 120, cw, ch, {lift: true, scale: 1 + 0.15 * Math.sin(q.p * Math.PI), rot: Math.sin(q.p * Math.PI) * (q.pid % 2 ? 0.3 : -0.3)}); }
    }
    function draw(t) {
      const shake = (t >= T.timeUp && t < T.timeUp + 0.45) ? Math.sin(t * 80) * 14 * (1 - (t - T.timeUp) / 0.45) : 0;
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ffd3e6'); g.addColorStop(1, '#ff9fc4'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.save(); x.globalAlpha = 0.18; x.fillStyle = '#fff'; for (let i = 0; i < 14; i++) { const px = (i * 173 + t * 30) % (W + 200) - 100, py = (i * 311) % H; x.beginPath(); x.arc(px, py, 26 + (i % 3) * 14, 0, Math.PI * 2); x.fill(); } x.restore();
      x.save(); x.translate(shake, 0);
      x.save(); x.shadowColor = 'rgba(120,30,70,0.4)'; x.shadowBlur = 40; x.shadowOffsetY = 18;
      const fg = x.createLinearGradient(0, BY - 40, 0, BY + BH + 40); fg.addColorStop(0, '#fff2a8'); fg.addColorStop(0.5, '#f7b84a'); fg.addColorStop(1, '#d4851c');
      x.fillStyle = fg; rr(BX - 30, BY - 30, BW + 60, BH + 60, 40); x.fill(); x.restore();
      x.fillStyle = '#7a3b5a'; rr(BX - 12, BY - 12, BW + 24, BH + 24, 26); x.fill();
      const b = boardAt(t);
      const cur = t >= T.timeUp ? (lastEv.t + lastEv.d * 0.75 > T.timeUp ? lastEv : null) : ev.find(e => t >= e.t && t < e.t + e.d);
      const moving = cur && cur.k !== 'hover' ? cur : null;
      if (t < T.play) introBoard(t); else for (let s = 0; s < n; s++) { if (moving && (s === moving.a || (moving.k === 'ok' && s === moving.c))) continue;
        const X = BX + (s % cols) * cw, Y = BY + Math.floor(s / cols) * ch; piece(b[s], X, Y, cw, ch, {});
        if (b[s] !== s && t < T.timeUp) { x.fillStyle = 'rgba(80,20,60,0.12)'; rr(X + 3, Y + 3, cw - 6, ch - 6, 14); x.fill(); } }
      for (const e of okEnd) { const q = t - e.done; if (q >= 0 && q < 0.5) for (const s of [e.a, e.c]) { const X = BX + (s % cols) * cw, Y = BY + Math.floor(s / cols) * ch; piece(b[s], X, Y, cw, ch, {glow: 1 - q / 0.5, scale: 1 + 0.08 * Math.sin(q / 0.5 * Math.PI)}); } }
      let handPos = null, press = false;
      if (cur) {
        const [ax, ay] = center(cur.a), [cx2, cy2] = center(cur.c); const p = (Math.min(t, T.timeUp) - cur.t) / cur.d;
        if (cur.k === 'hover') { const k = 0.5 - 0.5 * Math.cos(p * Math.PI * 3); const from = lastHand; const tgt = [lerp(ax, cx2, k * 0.6), lerp(ay, cy2, k * 0.6)]; const m = easeIO(Math.min(1, p * 3)); handPos = [lerp(from[0], tgt[0], m), lerp(from[1], tgt[1], m) + Math.sin(t * 9) * 8]; }
        else if (cur.k === 'ok') {
          const reach = 0.25, q = clamp((p - reach) / (0.75 - reach)), m = easeIO(q);
          if (p < reach) { const r = easeIO(p / reach); handPos = [lerp(lastHand[0], ax, r), lerp(lastHand[1], ay, r)]; piece(b[cur.a], ax - cw / 2, ay - ch / 2, cw, ch, {}); piece(b[cur.c], cx2 - cw / 2, cy2 - ch / 2, cw, ch, {}); }
          else if (p < 0.75) { piece(b[cur.c], cx2 - cw / 2 + (ax - cx2) * m, cy2 - ch / 2 + (ay - cy2) * m, cw, ch, {}); piece(b[cur.a], ax - cw / 2 + (cx2 - ax) * m, ay - ch / 2 + (cy2 - ay) * m - Math.sin(m * Math.PI) * 40, cw, ch, {lift: true, scale: 1.08}); handPos = [ax + (cx2 - ax) * m, ay + (cy2 - ay) * m - Math.sin(m * Math.PI) * 40]; press = true; }
          else { piece(b[cur.a], ax - cw / 2, ay - ch / 2, cw, ch, {}); piece(b[cur.c], cx2 - cw / 2, cy2 - ch / 2, cw, ch, {}); handPos = [cx2, cy2 + 20]; }
          if (cur.t + cur.d * 0.75 < T.timeUp) once('snap' + cur.t, t, cur.t + cur.d * 0.75, () => { burst(cx2, cy2, cur.t + cur.d * 0.75, ['#ffffff', '#fff2a8', '#ff8fc0'], 14, 420, 11); burst(ax, ay, cur.t + cur.d * 0.75, ['#ffffff', '#fff2a8'], 8, 300, 9); });
        } else if (cur.k === 'wrong') {
          const go = easeIO(clamp(p / 0.35)), bk = easeIO(clamp((p - 0.72) / 0.28)); const k = p < 0.35 ? go : (p < 0.72 ? 1 : 1 - bk);
          const bad = p >= 0.35 && p < 0.72; const shk = bad ? Math.sin(p * 90) * 12 : 0;
          piece(b[cur.a], ax - cw / 2 + (cx2 - ax) * k + shk, ay - ch / 2 + (cy2 - ay) * k, cw, ch, {lift: true, scale: 1.08, red: bad, rot: shk * 0.004});
          handPos = [ax + (cx2 - ax) * k + shk, ay + (cy2 - ay) * k]; press = p < 0.72;
          if (bad) { x.save(); x.translate(cx2, cy2 - ch * 0.75); const sc = back((p - 0.35) / 0.12); x.scale(sc, sc); x.beginPath(); x.arc(0, 0, 46, 0, Math.PI * 2); x.fillStyle = '#ff3b3b'; x.fill(); x.lineWidth = 8; x.strokeStyle = '#fff'; x.stroke(); x.strokeStyle = '#fff'; x.lineWidth = 11; x.lineCap = 'round'; x.beginPath(); x.moveTo(-17, -17); x.lineTo(17, 17); x.moveTo(17, -17); x.lineTo(-17, 17); x.stroke(); x.restore(); }
        } else if (cur.k === 'final') {
          // slow, careful drag toward the right slot... time runs out at ~85%
          const reach = 0.2; let m;
          if (p < reach) { const r = easeIO(p / reach); handPos = [lerp(lastHand[0], ax, r), lerp(lastHand[1], ay, r)]; m = 0; piece(b[cur.a], ax - cw / 2, ay - ch / 2, cw, ch, {}); }
          else { m = 0.86 * easeIO(clamp((p - reach) / (1 - reach))); const frozen = t >= T.timeUp; piece(b[cur.a], ax - cw / 2 + (cx2 - ax) * m, ay - ch / 2 + (cy2 - ay) * m - Math.sin(m * Math.PI) * 40, cw, ch, {lift: true, scale: 1.08, red: frozen}); handPos = [ax + (cx2 - ax) * m, ay + (cy2 - ay) * m - Math.sin(m * Math.PI) * 40]; press = !frozen; }
        }
        if (handPos && (cur.k !== 'hover' || p > 0.95)) lastHand = handPos;
      }
      if (t >= hesT && t < T.timeUp) for (const s of lastPair) { const X = BX + (s % cols) * cw, Y = BY + Math.floor(s / cols) * ch; x.strokeStyle = `rgba(255,80,80,${0.5 + 0.4 * Math.sin(t * 12)})`; x.lineWidth = 9; rr(X + 4, Y + 4, cw - 8, ch - 8, 14); x.stroke(); }
      if (handPos && t < T.cta) hand(handPos[0], handPos[1], press);
      if (t >= T.timeUp) { x.fillStyle = `rgba(40,10,30,${0.45 * clamp((t - T.timeUp) / 0.3)})`; rr(BX - 12, BY - 12, BW + 24, BH + 24, 26); x.fill(); }
      for (const p of parts) { const e = t - p.t0; if (e < 0 || e > p.life) continue; x.globalAlpha = 1 - e / p.life; x.fillStyle = p.c; x.beginPath(); x.arc(p.x + p.vx * e, p.y + p.vy * e + 700 * e * e, p.s / 2, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1; }
      x.restore();
      x.fillStyle = 'rgba(122,59,90,0.55)'; rr(W / 2 - 270, 40, 540, 76, 38); x.fill();
      x.font = `40px ${FONT}`; x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('퍼즐 가든 · Tiny Pieces', W / 2, 80);
      if (t < T.cta) {
        const left = challengeLeft(t), frac = left / (T.timeUp - T.play), urgent = left <= 3.2;
        const PW = 760, PX = (W - PW) / 2 - 40, PY = 410;
        x.fillStyle = 'rgba(122,59,90,0.55)'; rr(PX, PY, PW, 64, 32); x.fill(); x.strokeStyle = '#fff2a8'; x.lineWidth = 6; rr(PX, PY, PW, 64, 32); x.stroke();
        const pg = x.createLinearGradient(0, PY, 0, PY + 64); pg.addColorStop(0, urgent ? '#ff8a8a' : '#9af59a'); pg.addColorStop(1, urgent ? '#e02f2f' : '#2fb84a');
        if (frac > 0) { x.fillStyle = pg; rr(PX + 7, PY + 7, (PW - 14) * frac, 50, 25); x.fill(); }
        const sc = urgent ? 1 + 0.12 * Math.max(0, Math.sin(t * Math.PI * 2)) : 1;
        x.save(); x.translate(PX + PW + 50, PY + 32); x.scale(sc, sc); x.beginPath(); x.arc(0, 0, 58, 0, Math.PI * 2); x.fillStyle = urgent ? '#ff3b3b' : '#ffb21e'; x.fill(); x.lineWidth = 8; x.strokeStyle = '#5a2a12'; x.stroke(); gtxt(String(Math.ceil(left)), 0, 4, 64, '#ffffff', '#fff2b0'); x.restore();
        const solved = b.filter((p, i) => p === i).length;
        x.font = `38px ${FONT}`; x.fillStyle = '#7a3b5a'; x.textAlign = 'center'; if (t >= T.play) x.fillText(`맞춘 조각 ${solved} / ${n}`, W / 2, BY + BH + 90);
      }
      // captions
      const cap = (s, a, top, bot, st) => { x.save(); x.translate(W / 2, 255); const sc = back(a); x.scale(sc, sc); gtxt(s, 0, 0, 96, top, bot, st); x.restore(); };
      if (t < T.show) { const a = back(t / 0.35); x.save(); x.translate(W / 2, 250); x.scale(a, a); gtxt('이 그림을 맞춰 볼게요', 0, -40, 84, '#ffffff', '#ffe3f0'); gtxt(`🧩 ${title}`, 0, 62, 54, '#ffffff', '#ffe3f0'); x.restore(); }
      else if (t < T.play + 0.9) { const a = back((t - T.show) / 0.35); x.save(); x.translate(W / 2, 250); x.scale(a, a); gtxt(t < T.play ? '섞는 중...!' : '10초 안에 완성 도전!', 0, -40, 92); gtxt(`🧩 ${title}`, 0, 62, 54, '#ffffff', '#ffe3f0'); x.restore(); }
      else if (t < T.timeUp) {
        if (cur && cur.k === 'wrong') cap(cur === ev.find(e => e.k === 'wrong') ? '어? 여기 아닌가...' : '아 왜 안 맞아!!', (t - cur.t) / 0.3, '#ffffff', '#ffd6d6', '#b0122c');
        else if (challengeLeft(t) <= 3) cap('빨리빨리!!', 1, '#ffffff', '#ffd6d6', '#b0122c');
        else { const done = okEnd.filter(e => t >= e.done).length; cap(['어디부터 하지...', '좋아!', '오 잘 맞는다', '나이스!', '이 속도면 된다!', '좋아 좋아!', '좋아 좋아!', '서둘러!', '서둘러!', '서둘러!'][Math.min(done, 9)], 1, '#ffffff', '#ffe3f0'); }
      }
      else if (t < T.cta) { const a = back((t - T.timeUp) / 0.3); x.save(); x.translate(W / 2, BY + BH / 2); x.rotate(-0.12); x.scale(a, a);
        x.fillStyle = '#e8304f'; rr(-380, -110, 760, 220, 30); x.fill(); x.lineWidth = 12; x.strokeStyle = '#fff'; rr(-380, -110, 760, 220, 30); x.stroke(); gtxt('시간 초과 😭', 0, -10, 120, '#ffffff', '#ffe0e0', '#7a0a1c'); x.restore();
        gtxt(`${n - b.filter((p, i) => p === i).length}조각 남았는데... 😭`, W / 2, 260, 76, '#ffffff', '#ffe3f0', '#7a3b5a'); }
      else {
        const e = t - T.cta;
        x.fillStyle = `rgba(122,59,90,${0.82 * clamp(e / 0.3)})`; x.fillRect(0, 0, W, H);
        const a = back(e / 0.4); x.save(); x.translate(W / 2, 360); x.scale(a, a); gtxt('나라면 더 빨리 할 수 있는데?', 0, 0, 84); x.restore();
        const iw = 620, ih = iw * IM.height / IM.width; const b2 = back((e - 0.2) / 0.4); x.save(); x.translate(W / 2, 760); x.scale(b2, b2); x.rotate(-0.04); x.fillStyle = '#fff'; rr(-iw / 2 - 18, -ih / 2 - 18, iw + 36, ih + 36, 26); x.fill(); x.save(); rr(-iw / 2, -ih / 2, iw, ih, 16); x.clip(); x.drawImage(IM, -iw / 2, -ih / 2, iw, ih); x.restore(); x.restore();
        const c = back((e - 0.5) / 0.35), pulse = 1 + 0.04 * Math.sin(e * 8); x.save(); x.translate(W / 2, 1230); x.scale(c * pulse, c * pulse);
        x.fillStyle = '#1f8a3a'; rr(-340, -70, 680, 150, 75); x.fill(); const gd = x.createLinearGradient(0, -80, 0, 70); gd.addColorStop(0, '#9af59a'); gd.addColorStop(1, '#2fb84a'); x.fillStyle = gd; rr(-340, -82, 680, 145, 72); x.fill(); x.fillStyle = 'rgba(255,255,255,0.45)'; rr(-300, -70, 600, 40, 20); x.fill();
        gtxt('지금 도전하기 ▶', 0, -8, 76, '#ffffff', '#f0fff0', '#145c27'); x.restore();
        const d = back((e - 0.75) / 0.35); x.save(); x.translate(W / 2, 1430); x.scale(d, d); x.fillStyle = 'rgba(255,255,255,0.96)'; rr(-410, -55, 820, 110, 55); x.fill(); x.font = `50px ${FONT}`; x.fillStyle = '#03c75a'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText("네이버에서 '퍼즐 가든' 검색", 0, 3); x.restore();
        x.font = `40px ${FONT}`; x.fillStyle = '#fff'; x.fillText('Tiny Pieces · 설치 없이 무료', W / 2, 1560);
      }
    }
    window.__draw = draw;

    // ---------- audio ----------
    const dest = actx.createMediaStreamDestination();
    const master = actx.createGain(); master.gain.value = 1.6; const comp = actx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; master.connect(comp); comp.connect(dest);
    const startAt = actx.currentTime + 0.25;
    const tone = (t, f, dur, vol, type = 'sine', f2 = null) => { const o = actx.createOscillator(), gg = actx.createGain(); o.type = type; o.frequency.setValueAtTime(f, startAt + t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, startAt + t + dur); gg.gain.setValueAtTime(0.0001, startAt + t); gg.gain.exponentialRampToValueAtTime(vol, startAt + t + 0.01); gg.gain.exponentialRampToValueAtTime(0.0001, startAt + t + dur); o.connect(gg); gg.connect(master); o.start(startAt + t); o.stop(startAt + t + dur + 0.05); };
    const nb = actx.createBuffer(1, actx.sampleRate * 0.5, actx.sampleRate); { const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const noise = (t, dur, vol, f = 1200, type = 'bandpass') => { const s = actx.createBufferSource(); s.buffer = nb; const fl = actx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; const gg = actx.createGain(); gg.gain.setValueAtTime(vol, startAt + t); gg.gain.exponentialRampToValueAtTime(0.0001, startAt + t + dur); s.connect(fl); fl.connect(gg); gg.connect(master); s.start(startAt + t); s.stop(startAt + t + dur); };
    const N = m => 440 * Math.pow(2, (m - 69) / 12);
    const scale = [72, 74, 76, 79, 81, 84, 86, 88];
    // shuffle whooshes
    for (let i = 0; i < 6; i++) noise(T.show + i * 0.12, 0.25, 0.12, 1800 + i * 300);
    tone(T.play, 880, 0.12, 0.15, 'square'); tone(T.play + 0.12, 1320, 0.2, 0.15, 'square');
    // hook sting
    [67, 72, 76].forEach((m, i) => tone(0.05 + i * 0.07, N(m), 0.25, 0.14, 'triangle'));
    let oi = 0; for (const e of ev) { if (e.k === 'ok') { noise(e.t + e.d * 0.25, 0.18, 0.12, 2200); tone(e.t + e.d * 0.75, N(scale[Math.min(oi, 7)]), 0.22, 0.2, 'sine'); tone(e.t + e.d * 0.75, N(scale[Math.min(oi, 7)] + 12), 0.12, 0.07, 'triangle'); oi++; } else if (e.k === 'wrong') { noise(e.t, 0.18, 0.12, 2200); tone(e.t + e.d * 0.35, 180, 0.3, 0.3, 'square', 120); tone(e.t + e.d * 0.37, 140, 0.3, 0.2, 'sawtooth', 90); } else if (e.k === 'final') { noise(e.t + e.d * 0.2, 0.25, 0.1, 2200); } }
    // ticking last 3s
    for (let s = 0; s < 3; s++) { const tt = T.timeUp - 3 + s; tone(tt, 1500, 0.06, 0.2, 'square'); tone(tt + 0.5, 1000, 0.05, 0.1, 'square'); }
    // fail
    tone(T.timeUp, 392, 0.3, 0.3, 'triangle'); tone(T.timeUp + 0.28, 370, 0.3, 0.3, 'triangle'); tone(T.timeUp + 0.56, 349, 0.3, 0.3, 'triangle'); tone(T.timeUp + 0.84, 330, 0.7, 0.3, 'triangle', 300);
    noise(T.timeUp, 0.4, 0.3, 300, 'lowpass');
    [72, 76, 79, 84].forEach((m, i) => tone(T.cta + 0.5 + i * 0.08, N(m), 0.4, 0.13, 'triangle'));
    // bouncy bed during play
    const beat = 60 / 128, bass = [48, 45, 41, 43];
    for (let i = 0; T.play + i * beat / 2 < T.timeUp - 0.1; i++) { const t = T.play + i * beat / 2; const bar = Math.floor(i / 8) % 4, st = i % 8;
      if (st % 4 === 0) tone(t, N(bass[bar] - 12), 0.3, 0.15, 'sine'); if (st % 2 === 1) noise(t, 0.04, 0.05, 8000, 'highpass'); if (t > hesT && st % 2 === 0) tone(t, N(bass[bar] + 24), 0.1, 0.05, 'square'); }
    for (let i = 0; T.cta + 0.9 + i * beat / 2 < T.end - 0.4; i++) { const t = T.cta + 0.9 + i * beat / 2; if (i % 4 === 0) tone(t, N(48 - 12), 0.3, 0.12); if (i % 2 === 0) tone(t, N([72, 76, 79, 76][(i / 2) % 4]), 0.15, 0.05, 'triangle'); }
    master.gain.setValueAtTime(1.6, startAt + T.end - 0.5); master.gain.linearRampToValueAtTime(0.0001, startAt + T.end);

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
