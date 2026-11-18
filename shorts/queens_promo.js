// Crown Quest (크라운 퀘스트) promo short renderer. Runs in a page on puzzles.tmhub.co.kr (same-origin assets).
// Usage: page.evaluate(queensPromo, {level, sol, wrong}) then click #go; result in window.__res (base64 mp4).
// level: {size, grid, colors}; sol: column per row; wrong: {r,c} of the deliberate mistake in the hook.
export const queensPromo = function ({level, sol, wrong}) {
  window.__res = null; window.__err = null; window.__prog = 0;
  document.body.innerHTML = '<button id="go" style="font-size:40px;padding:20px">start</button>';
  const loadImg = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s; });
  const ready = Promise.all([loadImg('/assets/crown-quest/crown-icon/1.png'), document.fonts.load('900 80px "Malgun Gothic"').catch(() => {})]);
  document.getElementById('go').addEventListener('click', () => { (async () => {
    const actx = new AudioContext(); await actx.resume();
    const [crown] = await ready;
    const loadSnd = async u => actx.decodeAudioData(await (await fetch(u)).arrayBuffer());
    const S = {};
    for (const k of ['crown', 'error', 'clear', 'x']) { try { S[k] = await loadSnd(`/assets/crown-quest/crown-sound/${k}.wav`); } catch (e) {} }
    const W = 1080, H = 1920, FPS = 30, n = level.size;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; document.body.appendChild(cv); cv.style.width = '200px';
    const x = cv.getContext('2d');
    const BW = 920, cell = BW / n, BX = (W - BW) / 2, BY = 560;
    const rr = (X, Y, w, h, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); };
    const ease = t => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
    const txt = (s, X, Y, size, color, weight = 900, stroke = null) => { x.font = `${weight} ${size}px "Malgun Gothic"`; x.textAlign = 'center'; x.textBaseline = 'middle'; if (stroke) { x.lineWidth = stroke[1]; x.strokeStyle = stroke[0]; x.lineJoin = 'round'; x.strokeText(s, X, Y); } x.fillStyle = color; x.fillText(s, X, Y); };
    // timeline
    const T = {wrong: 0.9, rules: 2.6, solve: 7.2, ask: 18.6, reveal: 22.2, cta: 24.4, end: 29};
    window.__total = T.end;
    // hook order: two correct crowns, then the wrong one
    const hookA = [[0, sol[0]], [2, sol[2]]];
    // solve order: rows except the last-asked row
    const lastRow = 5;
    const order = []; for (let r = 0; r < n; r++) if (r !== lastRow) order.push(r);
    const step = (T.ask - 0.6 - T.solve) / order.length;
    const placeT = {}; order.forEach((r, i) => placeT[r] = T.solve + 0.4 + i * step);
    placeT[lastRow] = T.reveal;
    const cellXY = (r, c) => [BX + c * cell, BY + r * cell];
    const drawCrown = (r, c, sc = 1, alpha = 1) => { const [cx, cy] = cellXY(r, c); const s = cell * 0.78 * sc; x.save(); x.globalAlpha = alpha; x.drawImage(crown, cx + cell / 2 - s / 2, cy + cell / 2 - s / 2, s, s); x.restore(); };
    function board(t, crowns, redCells) {
      x.fillStyle = 'rgba(40,20,120,0.35)'; rr(BX - 18, BY - 18, BW + 36, BW + 36, 30); x.fill();
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const [cx, cy] = cellXY(r, c); x.fillStyle = level.colors[level.grid[r][c]]; rr(cx + 3, cy + 3, cell - 6, cell - 6, 12); x.fill(); }
      // region borders
      x.strokeStyle = 'rgba(30,20,60,0.55)'; x.lineWidth = 5;
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const [cx, cy] = cellXY(r, c); const g = level.grid[r][c];
        if (c < n - 1 && level.grid[r][c + 1] !== g) { x.beginPath(); x.moveTo(cx + cell, cy); x.lineTo(cx + cell, cy + cell); x.stroke(); }
        if (r < n - 1 && level.grid[r + 1][c] !== g) { x.beginPath(); x.moveTo(cx, cy + cell); x.lineTo(cx + cell, cy + cell); x.stroke(); } }
      if (redCells) for (const [r, c] of redCells) { const [cx, cy] = cellXY(r, c); x.fillStyle = `rgba(220,0,0,${0.55 + 0.25 * Math.sin(t * 18)})`; rr(cx + 3, cy + 3, cell - 6, cell - 6, 12); x.fill(); x.lineWidth = 9; x.strokeStyle = '#ffffff'; rr(cx + 6, cy + 6, cell - 12, cell - 12, 12); x.stroke(); }
      if (redCells && redCells.length > 1) { const [a, b] = redCells.map(([r, c]) => cellXY(r, c).map(v => v + cell / 2)); x.strokeStyle = '#ff2d2d'; x.lineWidth = 10; x.setLineDash([16, 10]); x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); x.setLineDash([]); }
      for (const cr of crowns) drawCrown(cr[0], cr[1], cr[2] ?? 1, cr[3] ?? 1);
    }
    function bg() { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#8b7cf6'); g.addColorStop(1, '#5b45d6'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.fillStyle = 'rgba(255,255,255,0.16)'; rr(W / 2 - 230, 40, 460, 64, 32); x.fill(); txt('퍼즐 가든 · 크라운 퀘스트', W / 2, 72, 32, '#ffffff', 700); }
    function draw(t) {
      bg();
      let crowns = [], red = null;
      if (t < T.rules) {
        hookA.forEach(([r, c], i) => { const t0 = 0.1 + i * 0.35; if (t >= t0) crowns.push([r, c, 1 + 0.4 * (1 - ease((t - t0) / 0.2))]); });
        if (t >= T.wrong) { crowns.push([wrong.r, wrong.c, 1 + 0.4 * (1 - ease((t - T.wrong) / 0.2))]); red = [[wrong.r, wrong.c], [wrong.r - 1 >= 0 ? wrong.r - 1 : wrong.r + 1, sol[wrong.r - 1 >= 0 ? wrong.r - 1 : wrong.r + 1]]]; }
        board(t, crowns, t >= T.wrong ? red : null);
        if (t < T.wrong) { txt('여기에 왕관을 두면...?', W / 2, 330, 76, '#ffffff', 900, ['#3b2a9e', 12]); }
        else { const sc = 0.6 + 0.4 * ease((t - T.wrong) / 0.25); x.save(); x.translate(W / 2, 300); x.scale(sc, sc); txt('❌ 실패!', 0, -40, 120, '#ff4d4d', 900, ['#ffffff', 14]); txt('붙어 있으면 안 돼요', 0, 90, 64, '#ffffff', 900, ['#3b2a9e', 10]); x.restore(); }
      } else if (t < T.solve) {
        board(t, [], null);
        const rules = ['가로 줄마다 왕관 1개', '세로 줄마다 왕관 1개', '같은 색 칸마다 왕관 1개', '왕관끼리 붙으면 안 돼요 (대각선도!)'];
        txt('규칙은 딱 이것뿐', W / 2, 200, 72, '#ffe066', 900, ['#3b2a9e', 12]);
        rules.forEach((s, i) => { const t0 = T.rules + 0.3 + i * 0.95; if (t < t0) return; const a = ease((t - t0) / 0.3); x.save(); x.globalAlpha = a; x.fillStyle = 'rgba(255,255,255,0.95)'; rr(110, 290 + i * 66 - 28, W - 220, 58, 29); x.fill(); txt(`${i + 1}. ${s}`, W / 2, 290 + i * 66, 40, '#3b2a9e', 900); x.restore(); });
        // highlight demo on board
        const k = Math.floor((t - T.rules - 0.3) / 0.95);
        if (k === 0) { x.fillStyle = 'rgba(255,255,255,0.35)'; rr(BX, BY + 2 * cell, BW, cell, 12); x.fill(); }
        if (k === 1) { x.fillStyle = 'rgba(255,255,255,0.35)'; rr(BX + 3 * cell, BY, cell, BW, 12); x.fill(); }
        if (k === 2) { const g0 = level.grid[0][0]; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (level.grid[r][c] === g0) { const [cx, cy] = cellXY(r, c); x.fillStyle = 'rgba(255,255,255,0.45)'; rr(cx + 3, cy + 3, cell - 6, cell - 6, 12); x.fill(); } }
        if (k >= 3) { const r0 = 3, c0 = sol[3]; drawCrown(r0, c0); for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const r = r0 + dr, c = c0 + dc; if (r < 0 || c < 0 || r >= n || c >= n) continue; const [cx, cy] = cellXY(r, c); x.strokeStyle = '#ff4d4d'; x.lineWidth = 6; x.beginPath(); x.moveTo(cx + 20, cy + 20); x.lineTo(cx + cell - 20, cy + cell - 20); x.moveTo(cx + cell - 20, cy + 20); x.lineTo(cx + 20, cy + cell - 20); x.stroke(); } }
      } else if (t < T.cta) {
        for (const r of Object.keys(placeT).map(Number)) { const t0 = placeT[r]; if (t >= t0) crowns.push([r, sol[r], 1 + 0.4 * (1 - ease((t - t0) / 0.2))]); }
        board(t, crowns, null);
        if (t < T.ask) { txt(`왕관 ${n}개를 놓아 보세요`, W / 2, 230, 70, '#ffffff', 900, ['#3b2a9e', 12]); txt(`${crowns.length} / ${n}`, W / 2, 350, 90, '#ffe066', 900, ['#3b2a9e', 12]); }
        else if (t < T.reveal) { const left = Math.ceil(T.reveal - t); txt('마지막 왕관, 어디일까요?', W / 2, 220, 72, '#ffffff', 900, ['#3b2a9e', 12]);
          x.beginPath(); x.arc(W / 2, 370, 70, 0, Math.PI * 2); x.fillStyle = '#ffe066'; x.fill(); txt(String(left), W / 2, 376, 84, '#3b2a9e', 900);
          // pulse empty row
          x.strokeStyle = `rgba(255,255,255,${0.5 + 0.4 * Math.sin(t * 10)})`; x.lineWidth = 8; rr(BX, BY + lastRow * cell, BW, cell, 14); x.stroke(); }
        else { const sc = 0.6 + 0.4 * ease((t - T.reveal) / 0.3); x.save(); x.translate(W / 2, 290); x.scale(sc, sc); txt('성공! 👑', 0, 0, 130, '#ffe066', 900, ['#3b2a9e', 14]); x.restore();
          // sparkles
          for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, d = 60 + 260 * ease((t - T.reveal) / 0.9); const [cx, cy] = cellXY(lastRow, sol[lastRow]); x.fillStyle = ['#ffe066', '#fff', '#fbbf24'][i % 3]; x.beginPath(); x.arc(cx + cell / 2 + Math.cos(a) * d, cy + cell / 2 + Math.sin(a) * d, 9 * (1 - ease((t - T.reveal) / 1.5)), 0, Math.PI * 2); x.fill(); } }
      } else {
        for (let r = 0; r < n; r++) crowns.push([r, sol[r]]);
        board(t, crowns, null);
        const sc = 0.7 + 0.3 * ease((t - T.cta) / 0.35); x.save(); x.translate(W / 2, 260); x.scale(sc, sc);
        txt('매일 새 퍼즐 · 설치 없이 무료', 0, -50, 62, '#ffffff', 900, ['#3b2a9e', 10]); txt('지금 바로 풀어 보세요', 0, 50, 76, '#ffe066', 900, ['#3b2a9e', 12]); x.restore();
        x.fillStyle = 'rgba(255,255,255,0.95)'; rr(120, BY + BW + 70, W - 240, 120, 60); x.fill();
        txt("네이버에 '퍼즐 가든' 검색", W / 2, BY + BW + 130, 52, '#3b2a9e', 900);
        txt('puzzles.tmhub.co.kr/queens', W / 2, BY + BW + 250, 40, '#ffffff', 700);
      }
      if (t < T.cta && t >= T.solve) txt('👉 퍼즐 가든 · 크라운 퀘스트', W / 2, BY + BW + 120, 44, '#ffffff', 700);
    }
    window.__draw = draw;
    // audio
    const dest = actx.createMediaStreamDestination();
    const master = actx.createGain(); master.gain.value = 1.6; const comp = actx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; master.connect(comp); comp.connect(dest);
    const startAt = actx.currentTime + 0.25;
    const play = (k, t, v = 1) => { if (!S[k]) return; const s = actx.createBufferSource(); s.buffer = S[k]; const g = actx.createGain(); g.gain.value = v; s.connect(g); g.connect(master); s.start(startAt + t); };
    const tone = (t, f, dur, vol, type = 'sine') => { const o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0.0001, startAt + t); g.gain.exponentialRampToValueAtTime(vol, startAt + t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, startAt + t + dur); o.connect(g); g.connect(master); o.start(startAt + t); o.stop(startAt + t + dur + 0.05); };
    const N = m => 440 * Math.pow(2, (m - 69) / 12);
    // light music bed (skip during hook fail moment)
    const beat = 60 / 112; const mel = [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 79, 76, 74, 71];
    for (let i = 0; i * beat / 2 < T.end - 0.6; i++) { const t = 1.6 + i * beat / 2; if (t > T.end - 0.6) break; if (i % 2 === 0) tone(t, N(mel[(i / 2) % 16] - 12), 0.3, 0.06, 'triangle'); if (i % 4 === 0) tone(t, N(48 + [0, -3, 5, 7][Math.floor(i / 16) % 4]), 0.5, 0.08, 'sine'); }
    hookA.forEach((_, i) => play('crown', 0.1 + i * 0.35, 0.9));
    play('error', T.wrong, 1.0); if (!S.error) { tone(T.wrong, 220, 0.4, 0.3, 'square'); }
    for (let i = 0; i < 4; i++) tone(T.rules + 0.3 + i * 0.95, 880, 0.12, 0.12);
    for (const r of order) play('crown', placeT[r], 0.8);
    for (let s = 0; s < 3; s++) tone(T.ask + 0.6 + s, 1200, 0.06, 0.15, 'square');
    play('crown', T.reveal, 1.0); play('clear', T.reveal + 0.15, 1.0);
    [72, 76, 79, 84].forEach((m, i) => tone(T.cta + i * 0.09, N(m), 0.4, 0.15));
    master.gain.setValueAtTime(1.6, startAt + T.end - 0.8); master.gain.linearRampToValueAtTime(0.0001, startAt + T.end);
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
