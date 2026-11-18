// Crown Quest promo v2 "싸움꾼 왕 8명": kings with faces fight when they share a line or touch.
// Usage: page.evaluate(queensKings, {level, sol}) on a puzzles.tmhub.co.kr page, click #go, read window.__res.
export const queensKings = function ({level, sol}) {
  window.__res = null; window.__err = null; window.__prog = 0;
  document.body.innerHTML = '<button id="go" style="font-size:40px;padding:20px">start</button>';
  const loadImg = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s; });
  const ready = Promise.all([loadImg('/assets/crown-quest/crown-icon/1.png'), document.fonts.load('900 80px "Malgun Gothic"').catch(() => {})]);
  document.getElementById('go').addEventListener('click', () => { (async () => {
    const actx = new AudioContext(); await actx.resume();
    const [crown] = await ready;
    const S = {};
    for (const k of ['crown', 'error', 'clear']) { try { S[k] = await actx.decodeAudioData(await (await fetch(`/assets/crown-quest/crown-sound/${k}.wav`)).arrayBuffer()); } catch (e) {} }
    const W = 1080, H = 1920, FPS = 30, n = level.size;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; document.body.appendChild(cv); cv.style.width = '200px';
    const x = cv.getContext('2d');
    const BW = 940, cell = BW / n, BX = (W - BW) / 2, BY = 600;
    const rr = (X, Y, w, h, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); };
    const ease = t => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
    const lerp = (a, b, t) => a + (b - a) * t;
    const txt = (s, X, Y, size, color, weight = 900, stroke = null) => { x.font = `${weight} ${size}px "Malgun Gothic"`; x.textAlign = 'center'; x.textBaseline = 'middle'; if (stroke) { x.lineWidth = stroke[1]; x.strokeStyle = stroke[0]; x.lineJoin = 'round'; x.strokeText(s, X, Y); } x.fillStyle = color; x.fillText(s, X, Y); };
    const center = (r, c) => [BX + c * cell + cell / 2, BY + r * cell + cell / 2];

    // ---------- timeline ----------
    const T = {hook: 0, calm: 2.3, place: 4.6, fail2: 10.6, ask: 19.2, reveal: 22.4, cta: 25.0, end: 29.5};
    window.__total = T.end;
    const hookPair = [[0, sol[0]], [1, 2]];          // two kings touching -> fight
    const moveTo1 = [1, sol[1]];                      // calm: king 2 walks away
    const lastRow = 5;
    const order = [2, 3, 4, 6, 7];                    // rows placed after the hook
    const failCell = [4, sol[2]];                     // same column as row 2's king
    const pT = {}; // placement start times
    let tt = T.place + 0.2; for (const r of order) { if (r === 4) { pT.fail = tt; tt += 1.9; } pT[r] = tt; tt += (T.ask - 0.4 - T.place - 0.2 - 1.9) / order.length; }
    pT[lastRow] = T.reveal;

    // ---------- king drawing ----------
    function king(cx, cy, s, mood, t, alpha = 1) {
      const shake = mood === 'angry' ? Math.sin(t * 60) * 6 : 0;
      x.save(); x.globalAlpha = alpha; x.translate(cx + shake, cy);
      const hr = s * 0.34;
      // head
      x.beginPath(); x.arc(0, s * 0.1, hr, 0, Math.PI * 2); x.fillStyle = mood === 'angry' ? '#ffb4a2' : '#ffe0bd'; x.fill(); x.lineWidth = s * 0.04; x.strokeStyle = '#7a4a2a'; x.stroke();
      // crown
      const cw = s * 0.62; x.drawImage(crown, -cw / 2, s * 0.1 - hr - cw * 0.62, cw, cw);
      // face
      x.strokeStyle = '#3a2412'; x.fillStyle = '#3a2412'; x.lineWidth = s * 0.035; x.lineCap = 'round';
      const ey = s * 0.06, ex = hr * 0.42;
      if (mood === 'happy') { for (const sx of [-1, 1]) { x.beginPath(); x.arc(sx * ex, ey + s * 0.02, s * 0.05, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); }
        x.beginPath(); x.arc(0, s * 0.17, s * 0.1, Math.PI * 0.15, Math.PI * 0.85); x.stroke();
        x.fillStyle = 'rgba(255,120,120,0.45)'; for (const sx of [-1, 1]) { x.beginPath(); x.arc(sx * hr * 0.62, s * 0.18, s * 0.05, 0, Math.PI * 2); x.fill(); } }
      else if (mood === 'angry') { for (const sx of [-1, 1]) { x.beginPath(); x.arc(sx * ex, ey + s * 0.03, s * 0.035, 0, Math.PI * 2); x.fill(); x.beginPath(); x.moveTo(sx * (ex + s * 0.08), ey - s * 0.07); x.lineTo(sx * (ex - s * 0.06), ey - s * 0.02); x.stroke(); }
        x.beginPath(); x.arc(0, s * 0.27, s * 0.09, Math.PI * 1.15, Math.PI * 1.85); x.stroke();
        txt('💢', hr * 0.95, -hr * 0.55, s * 0.32, '#ff2d2d'); }
      else if (mood === 'think') { for (const sx of [-1, 1]) { x.beginPath(); x.arc(sx * ex, ey + s * 0.03, s * 0.035, 0, Math.PI * 2); x.fill(); } x.beginPath(); x.moveTo(-s * 0.06, s * 0.2); x.lineTo(s * 0.06, s * 0.2); x.stroke(); txt('?', hr * 1.05, -hr * 0.5, s * 0.38, '#ffffff', 900, ['#3b2a9e', 6]); }
      else { for (const sx of [-1, 1]) { x.beginPath(); x.arc(sx * ex, ey + s * 0.03, s * 0.035, 0, Math.PI * 2); x.fill(); } x.beginPath(); x.arc(0, s * 0.15, s * 0.07, Math.PI * 0.2, Math.PI * 0.8); x.stroke(); }
      x.restore();
    }

    // ---------- board ----------
    function board(t, lit, flashCells) {
      x.fillStyle = 'rgba(30,15,90,0.45)'; rr(BX - 18, BY - 18, BW + 36, BW + 36, 30); x.fill();
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const g = level.grid[r][c]; const X = BX + c * cell, Y = BY + r * cell;
        x.fillStyle = level.colors[g]; rr(X + 3, Y + 3, cell - 6, cell - 6, 12); x.fill();
        const l = lit[g] ?? 0; x.fillStyle = `rgba(20,10,60,${0.5 * (1 - l)})`; rr(X + 3, Y + 3, cell - 6, cell - 6, 12); x.fill();
        if (l > 0 && l < 1) { x.fillStyle = `rgba(255,255,255,${0.5 * Math.sin(l * Math.PI)})`; rr(X + 3, Y + 3, cell - 6, cell - 6, 12); x.fill(); } }
      x.strokeStyle = 'rgba(20,10,50,0.6)'; x.lineWidth = 5;
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const X = BX + c * cell, Y = BY + r * cell, g = level.grid[r][c];
        if (c < n - 1 && level.grid[r][c + 1] !== g) { x.beginPath(); x.moveTo(X + cell, Y); x.lineTo(X + cell, Y + cell); x.stroke(); }
        if (r < n - 1 && level.grid[r + 1][c] !== g) { x.beginPath(); x.moveTo(X, Y + cell); x.lineTo(X + cell, Y + cell); x.stroke(); } }
      if (flashCells) { for (const [r, c] of flashCells) { const X = BX + c * cell, Y = BY + r * cell; x.fillStyle = `rgba(230,0,0,${0.45 + 0.25 * Math.sin(t * 20)})`; rr(X + 3, Y + 3, cell - 6, cell - 6, 12); x.fill(); } }
    }
    const bolt = (a, b, t) => { const [x1, y1] = a, [x2, y2] = b; x.strokeStyle = '#fff36b'; x.lineWidth = 10; x.beginPath(); x.moveTo(x1, y1); for (let i = 1; i < 6; i++) { const k = i / 6; x.lineTo(lerp(x1, x2, k) + Math.sin(t * 50 + i) * 18, lerp(y1, y2, k) + Math.cos(t * 47 + i) * 18); } x.lineTo(x2, y2); x.stroke(); };
    const header = () => { x.fillStyle = 'rgba(255,255,255,0.16)'; rr(W / 2 - 230, 40, 460, 64, 32); x.fill(); txt('퍼즐 가든 · 크라운 퀘스트', W / 2, 72, 32, '#ffffff', 700); };
    function bg(t, shake) { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#7f6cf3'); g.addColorStop(1, '#4b36c4'); x.fillStyle = g; x.fillRect(0, 0, W, H); }

    function draw(t) {
      const fight1 = t < T.calm, fight2 = t >= pT.fail && t < pT.fail + 1.4;
      const shk = (fight1 || fight2) ? Math.sin(t * 70) * 7 : 0;
      x.save(); x.translate(shk, 0);
      bg(t);
      // which kings are on board
      const kings = []; const lit = {};
      const litAt = (g, t0) => { lit[g] = Math.max(lit[g] ?? 0, Math.min(1, Math.max(0, (t - t0) / 0.5))); };
      // king row0
      const k0mood = t < T.calm ? 'angry' : 'happy';
      kings.push({p: center(...hookPair[0]), mood: k0mood, s: 1}); if (t >= T.calm) litAt(level.grid[0][sol[0]], T.calm);
      // king row1: from hook cell to correct cell during calm
      { const a = center(...hookPair[1]), b = center(...moveTo1); const m = ease((t - T.calm - 0.4) / 0.8); const hop = Math.sin(Math.min(1, Math.max(0, m)) * Math.PI) * 60;
        kings.push({p: [lerp(a[0], b[0], m), lerp(a[1], b[1], m) - hop], mood: t < T.calm ? 'angry' : 'happy', s: 1}); if (t >= T.calm + 1.2) litAt(level.grid[1][sol[1]], T.calm + 1.2); }
      // placements
      for (const r of [...order, lastRow]) { const t0 = r === 4 ? pT.fail : pT[r]; if (t < t0 - 0.35) continue;
        const target = center(r, sol[r]);
        if (r === 4) { // fail then move
          const fpos = center(...failCell);
          if (t < pT.fail) continue;
          if (t < pT.fail + 1.4) { const d = ease((t - pT.fail) / 0.3); kings.push({p: [fpos[0], lerp(fpos[1] - 300, fpos[1], d)], mood: t > pT.fail + 0.3 ? 'angry' : 'normal', s: 1}); continue; }
          const m = ease((t - pT.fail - 1.4) / 0.45); kings.push({p: [lerp(fpos[0], target[0], m), lerp(fpos[1], target[1], m) - Math.sin(m * Math.PI) * 50], mood: 'happy', s: 1}); if (m >= 1) litAt(level.grid[r][sol[r]], pT.fail + 1.85); continue; }
        if (r === lastRow && t < T.reveal) continue;
        const d = ease((t - (t0 - 0.35)) / 0.35); kings.push({p: [target[0], lerp(target[1] - 260, target[1], d)], mood: 'happy', s: 1 + 0.25 * (1 - ease((t - t0) / 0.25))}); if (t >= t0) litAt(level.grid[r][sol[r]], t0);
      }
      const flash = fight1 ? [hookPair[0], hookPair[1]] : (fight2 ? [failCell, [2, sol[2]]] : null);
      board(t, lit, flash);
      // row-2 king angry during fight2
      if (fight2) kings.forEach(k => { const c2 = center(2, sol[2]); if (Math.abs(k.p[0] - c2[0]) < 2 && Math.abs(k.p[1] - c2[1]) < 2) k.mood = 'angry'; });
      for (const k of kings) king(k.p[0], k.p[1], cell * 0.95 * k.s, k.mood, t);
      if (fight1) bolt(center(...hookPair[0]), center(...hookPair[1]), t);
      if (fight2) bolt(center(...failCell), center(2, sol[2]), t);
      x.restore();
      header();
      // ---------- captions ----------
      if (t < T.calm) { const sc = 0.6 + 0.4 * ease(t / 0.25); x.save(); x.translate(W / 2, 290); x.scale(sc, sc); txt('아니 왜 싸워!! 😤', 0, -50, 100, '#ffffff', 900, ['#3b2a9e', 14]); txt('붙어 있으면 싸우는 왕들', 0, 75, 62, '#ffe066', 900, ['#3b2a9e', 10]); x.restore(); }
      else if (t < T.place) { txt('왕들이 싸우지 않게', W / 2, 220, 70, '#ffffff', 900, ['#3b2a9e', 12]); txt('왕국마다 1명씩 보내 주세요', W / 2, 315, 70, '#ffe066', 900, ['#3b2a9e', 12]);
        const a = ease((t - T.calm - 0.6) / 0.4); x.save(); x.globalAlpha = a; x.fillStyle = 'rgba(255,255,255,0.95)'; rr(150, 400, W - 300, 110, 55); x.fill(); txt('같은 줄 ❌  ·  붙어도 ❌ (대각선도)', W / 2, 456, 44, '#3b2a9e', 900); x.restore(); }
      else if (t < T.ask) { const cnt = Object.values(lit).filter(v => v >= 1).length;
        if (fight2) { txt('또 싸운다!! 💢', W / 2, 250, 96, '#ffffff', 900, ['#c81e1e', 14]); txt('같은 세로줄이잖아요', W / 2, 370, 58, '#ffe066', 900, ['#3b2a9e', 10]); }
        else { txt('평화로운 왕국', W / 2, 240, 70, '#ffffff', 900, ['#3b2a9e', 12]); txt(`${cnt} / ${n}`, W / 2, 360, 100, '#ffe066', 900, ['#3b2a9e', 12]); } }
      else if (t < T.reveal) { const left = Math.ceil(T.reveal - t); txt('마지막 왕은 어디로?', W / 2, 220, 80, '#ffffff', 900, ['#3b2a9e', 12]);
        x.beginPath(); x.arc(W / 2, 380, 72, 0, Math.PI * 2); x.fillStyle = '#ffe066'; x.fill(); txt(String(left), W / 2, 386, 88, '#3b2a9e', 900);
        x.strokeStyle = `rgba(255,255,255,${0.55 + 0.4 * Math.sin(t * 10)})`; x.lineWidth = 9; rr(BX, BY + lastRow * cell, BW, cell, 14); x.stroke();
        king(W / 2, BY + BW + 140 + Math.sin(t * 4) * 12, cell * 1.3, 'think', t); }
      else if (t < T.cta) { const sc = 0.6 + 0.4 * ease((t - T.reveal) / 0.3); x.save(); x.translate(W / 2, 300); x.scale(sc, sc); txt('평화 완성! 🎉', 0, 0, 120, '#ffe066', 900, ['#3b2a9e', 14]); x.restore();
        for (let i = 0; i < 40; i++) { const a = i * 2.4, d = 120 + 520 * ease((t - T.reveal) / 1.2); x.fillStyle = ['#ffe066', '#ffffff', '#ff8fd1', '#7ee8fa'][i % 4]; x.beginPath(); x.arc(W / 2 + Math.cos(a) * d, BY + BW / 2 + Math.sin(a) * d, 12 * (1 - ease((t - T.reveal) / 2)), 0, Math.PI * 2); x.fill(); } }
      else { const sc = 0.7 + 0.3 * ease((t - T.cta) / 0.35); x.save(); x.translate(W / 2, 260); x.scale(sc, sc);
        txt('매일 새로운 왕국 👑', 0, -55, 80, '#ffe066', 900, ['#3b2a9e', 12]); txt('설치 없이 무료로 바로 플레이', 0, 55, 60, '#ffffff', 900, ['#3b2a9e', 10]); x.restore();
        x.fillStyle = 'rgba(255,255,255,0.96)'; rr(120, BY + BW + 70, W - 240, 120, 60); x.fill(); txt("네이버에 '퍼즐 가든' 검색", W / 2, BY + BW + 130, 54, '#3b2a9e', 900);
        txt('크라운 퀘스트 · puzzles.tmhub.co.kr', W / 2, BY + BW + 250, 38, '#ffffff', 700); }
      if (t >= T.place && t < T.ask && !fight2) txt('왕국에 불이 켜지면 성공 ✨', W / 2, BY + BW + 110, 44, '#ffffff', 700);
    }
    window.__draw = draw;

    // ---------- audio ----------
    const dest = actx.createMediaStreamDestination();
    const master = actx.createGain(); master.gain.value = 1.7; const comp = actx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; master.connect(comp); comp.connect(dest);
    const startAt = actx.currentTime + 0.25;
    const play = (k, t, v = 1) => { if (!S[k]) return; const s = actx.createBufferSource(); s.buffer = S[k]; const g = actx.createGain(); g.gain.value = v; s.connect(g); g.connect(master); s.start(startAt + t); };
    const tone = (t, f, dur, vol, type = 'sine', f2 = null) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.setValueAtTime(f, startAt + t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, startAt + t + dur); g.gain.setValueAtTime(0.0001, startAt + t); g.gain.exponentialRampToValueAtTime(vol, startAt + t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, startAt + t + dur); o.connect(g); g.connect(master); o.start(startAt + t); o.stop(startAt + t + dur + 0.05); };
    const N = m => 440 * Math.pow(2, (m - 69) / 12);
    // fight: grumble + error
    const grumble = t0 => { for (let i = 0; i < 6; i++) tone(t0 + i * 0.12, 140 + (i % 2) * 40, 0.1, 0.18, 'sawtooth'); };
    play('error', 0.05, 1); grumble(0.1); play('error', 1.0, 0.8);
    tone(T.calm + 0.4, 300, 0.5, 0.15, 'sine', 900); // whoosh/hop
    tone(T.calm + 1.2, N(79), 0.25, 0.15); tone(T.calm + 1.35, N(84), 0.3, 0.15);
    for (const r of order) if (r !== 4) { play('crown', pT[r], 0.85); tone(pT[r] + 0.05, N(76 + order.indexOf(r) * 2), 0.25, 0.08); }
    play('error', pT.fail + 0.3, 0.9); grumble(pT.fail + 0.35); tone(pT.fail + 1.4, 300, 0.45, 0.14, 'sine', 900); play('crown', pT[4] > pT.fail + 1.85 ? pT[4] : pT.fail + 1.85, 0.85);
    for (let s = 0; s < 3; s++) tone(T.ask + 0.2 + s, 1200, 0.06, 0.16, 'square');
    play('crown', T.reveal, 1); play('clear', T.reveal + 0.1, 1);
    [72, 76, 79, 84, 88].forEach((m, i) => tone(T.reveal + 0.2 + i * 0.08, N(m), 0.45, 0.12));
    // playful bed
    const beat = 60 / 118, bass = [48, 45, 41, 43], mel = [72, 74, 76, 79, 76, 74, 72, 67];
    for (let i = 0; T.calm + i * beat / 2 < T.end - 0.7; i++) { const t = T.calm + i * beat / 2; if (t > pT.fail && t < pT.fail + 1.4) continue;
      if (i % 2 === 0) tone(t, N(bass[Math.floor(i / 8) % 4]), 0.3, 0.09, 'triangle'); if (i % 4 === 2) tone(t, N(mel[(i / 2) % 8 | 0]), 0.2, 0.05, 'square'); if (i % 2 === 1) tone(t, 6000, 0.03, 0.02, 'square'); }
    master.gain.setValueAtTime(1.7, startAt + T.end - 0.8); master.gain.linearRampToValueAtTime(0.0001, startAt + T.end);

    const vtrack = cv.captureStream(0).getVideoTracks()[0];
    const rec = new MediaRecorder(new MediaStream([vtrack, ...dest.stream.getAudioTracks()]), {mimeType: 'video/mp4;codecs=avc1.640028,mp4a.40.2', videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 160_000});
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
