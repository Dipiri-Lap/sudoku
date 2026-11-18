// Tiny Pieces promo renderer (runs in a browser page, armed by clicking #go).
// args: {imgs: {name: dataURL}, thumbs: [dataURL...], gains}
// Output: 1080x1920 ~30s MP4 with synthesized BGM + SFX -> window.__res
export const tinyPiecesPromo = function ({imgs, thumbs, gains}) {
  window.__res = null; window.__err = null; window.__prog = 0;
  document.body.innerHTML = '<button id="go" style="font-size:40px;padding:20px">start</button>';
  const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s; });
  const ready = (async () => { const o = {}; for (const k of Object.keys(imgs)) o[k] = await load(imgs[k]); const th = []; for (const t of thumbs) th.push(await load(t)); await document.fonts.load('900 80px "Malgun Gothic"').catch(() => {}); return {o, th}; })();
  document.getElementById('go').addEventListener('click', () => { (async () => {
    const actx = new AudioContext(); await actx.resume();
    const {o: IM, th: TH} = await ready;
    const W = 1080, H = 1920, FPS = 30;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; document.body.appendChild(cv); cv.style.width = '200px';
    const x = cv.getContext('2d');
    // ---------- helpers ----------
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const ease = t => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
    const easeIO = t => { t = Math.min(Math.max(t, 0), 1); return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2; };
    const back = t => { t = Math.min(Math.max(t, 0), 1); const c = 1.7; return 1 + (c+1)*Math.pow(t-1,3) + c*Math.pow(t-1,2); };
    const rr = (X, Y, w, h, r) => { x.beginPath(); x.moveTo(X+r, Y); x.arcTo(X+w, Y, X+w, Y+h, r); x.arcTo(X+w, Y+h, X, Y+h, r); x.arcTo(X, Y+h, X, Y, r); x.arcTo(X, Y, X+w, Y, r); x.closePath(); };
    const txt = (s, X, Y, size, color, stroke = '#1f6b43', sw = 12, weight = 900) => { x.font = `${weight} ${size}px "Malgun Gothic"`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; if (stroke) { x.lineWidth = sw; x.strokeStyle = stroke; x.strokeText(s, X, Y); } x.fillStyle = color; x.fillText(s, X, Y); };
    const BX = 60, BY = 470, BS = 960;
    function bg(t) {
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#6fd69a'); g.addColorStop(1, '#45b878'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.save(); x.globalAlpha = 0.08; x.strokeStyle = '#fff'; x.lineWidth = 26;
      const off = (t * 40) % 80; for (let k = -30; k < 40; k++) { x.beginPath(); x.moveTo(k*80 + off, 0); x.lineTo(k*80 + off - H, H); x.stroke(); }
      x.restore();
    }
    function badge() { x.fillStyle = 'rgba(255,255,255,0.22)'; rr(W/2-230, 40, 460, 64, 32); x.fill(); txt('퍼즐 가든 · Tiny Pieces', W/2, 73, 34, '#ffffff', null); }
    // ---------- puzzle model ----------
    function makePuzzle(name, rows, cols, nSwaps) {
      const n = rows * cols; const perm = [...Array(n).keys()];
      // scramble by random swaps so solution is the reverse
      const swaps = []; const used = new Set();
      for (let s = 0; s < nSwaps; s++) { let a, b; do { a = Math.floor(rnd()*n); b = Math.floor(rnd()*n); } while (a === b || used.has(a) || used.has(b)); used.add(a); used.add(b); [perm[a], perm[b]] = [perm[b], perm[a]]; swaps.push([a, b]); }
      // perm[slot] = piece id. solve: selection sort order
      const p = perm.slice(); const sol = [];
      for (let slot = 0; slot < n; slot++) { if (p[slot] !== slot) { const j = p.indexOf(slot); sol.push([slot, j]); [p[slot], p[j]] = [p[j], p[slot]]; } }
      return {img: IM[name], rows, cols, start: perm, sol};
    }
    function slotRect(P, slot) { const cw = BS / P.cols, ch = BS / P.rows; return [BX + (slot % P.cols) * cw, BY + Math.floor(slot / P.cols) * ch, cw, ch]; }
    function drawPiece(P, piece, X, Y, w, h, lift = 0, glow = 0, gap = 6) {
      const sw = P.img.width / P.cols, sh = P.img.height / P.rows;
      const sx = (piece % P.cols) * sw, sy = Math.floor(piece / P.cols) * sh;
      const s = 1 + lift * 0.1; const cx = X + w/2, cy = Y + h/2; const ww = w * s, hh = h * s;
      x.save();
      x.shadowColor = 'rgba(0,0,0,' + (0.18 + lift*0.25) + ')'; x.shadowBlur = 8 + lift*30; x.shadowOffsetY = 4 + lift*14;
      rr(cx - ww/2 + gap/2, cy - hh/2 + gap/2, ww - gap, hh - gap, Math.min(18, w/8)); x.fillStyle = '#fff'; x.fill();
      x.shadowColor = 'transparent';
      x.clip(); x.drawImage(P.img, sx, sy, sw, sh, cx - ww/2, cy - hh/2, ww, hh);
      if (glow > 0) { x.fillStyle = `rgba(255,255,220,${glow*0.6})`; x.fillRect(cx-ww/2, cy-hh/2, ww, hh); }
      x.restore();
      if (lift > 0.01) { x.lineWidth = 8; x.strokeStyle = `rgba(255,224,77,${lift})`; rr(cx - ww/2 + gap/2, cy - hh/2 + gap/2, ww - gap, hh - gap, Math.min(18, w/8)); x.stroke(); }
    }
    // state at local time u within a solve sequence with swap schedule
    function drawBoard(P, events, u, opts = {}) {
      // board backing
      x.save(); x.shadowColor = 'rgba(0,0,0,0.25)'; x.shadowBlur = 30; x.shadowOffsetY = 12; x.fillStyle = '#2f8f5b'; rr(BX-16, BY-16, BS+32, BS+32, 34); x.fill(); x.restore();
      const cur = P.start.slice(); let active = null; const glowAt = {};
      for (const ev of events) {
        if (u >= ev.t1) { [cur[ev.a], cur[ev.b]] = [cur[ev.b], cur[ev.a]]; glowAt[ev.a] = ev.t1; glowAt[ev.b] = ev.t1; }
        else if (u >= ev.t0) { active = ev; break; }
      }
      const n = P.rows * P.cols;
      for (let slot = 0; slot < n; slot++) {
        if (active && (slot === active.a || slot === active.b)) continue;
        const [X, Y, w, h] = slotRect(P, slot);
        const g = glowAt[slot] !== undefined ? Math.max(0, 1 - (u - glowAt[slot]) / 0.35) : 0;
        drawPiece(P, cur[slot], X, Y, w, h, 0, cur[slot] === slot ? g : 0, opts.gap ?? 6);
      }
      if (active) {
        const k = (u - active.t0) / (active.t1 - active.t0);
        const pickT = 0.25; const lift = k < pickT ? ease(k / pickT) : (k > 0.85 ? 1 - ease((k - 0.85) / 0.15) : 1);
        const m = k < pickT ? 0 : easeIO((k - pickT) / (0.85 - pickT));
        const [ax, ay, w, h] = slotRect(P, active.a), [bx, by] = slotRect(P, active.b);
        const arc = Math.sin(m * Math.PI) * 60;
        drawPiece(P, cur[active.b], bx + (ax - bx) * m, by + (ay - by) * m + arc, w, h, lift * 0.6, 0, opts.gap ?? 6);
        drawPiece(P, cur[active.a], ax + (bx - ax) * m, ay + (by - ay) * m - arc, w, h, lift, 0, opts.gap ?? 6);
        if (opts.finger) { // finger tap indicator follows the lifted piece
          const fx = ax + (bx - ax) * m + w * 0.62, fy = ay + (by - ay) * m - arc + h * 0.62;
          x.save(); x.globalAlpha = 0.95; x.beginPath(); x.arc(fx, fy, 34 - lift * 6, 0, Math.PI * 2); x.fillStyle = 'rgba(255,255,255,0.85)'; x.fill();
          x.lineWidth = 6; x.strokeStyle = 'rgba(31,107,67,0.6)'; x.stroke();
          if (k < pickT) { x.beginPath(); x.arc(fx, fy, 34 + 50 * (k / pickT), 0, Math.PI * 2); x.strokeStyle = `rgba(255,255,255,${1 - k / pickT})`; x.lineWidth = 5; x.stroke(); }
          x.restore();
        }
      }
      return cur;
    }
    function schedule(P, t0, total, accel = 1) {
      // durations shrink geometrically; scale to total
      const n = P.sol.length; const raw = []; let r = 1; for (let i = 0; i < n; i++) { raw.push(r); r *= accel; }
      const sum = raw.reduce((a, b) => a + b, 0); let t = t0; const ev = [];
      for (let i = 0; i < n; i++) { const d = raw[i] / sum * total; ev.push({a: P.sol[i][0], b: P.sol[i][1], t0: t, t1: t + d}); t += d; }
      return ev;
    }
    function drawWhole(P, alpha = 1, scale = 1) {
      x.save(); x.globalAlpha = alpha; const cx = BX + BS/2, cy = BY + BS/2; const s = BS * scale;
      x.shadowColor = 'rgba(0,0,0,0.25)'; x.shadowBlur = 30; x.shadowOffsetY = 12; rr(cx - s/2, cy - s/2, s, s, 30); x.fillStyle = '#fff'; x.fill(); x.shadowColor = 'transparent';
      x.clip(); x.drawImage(P.img, cx - s/2, cy - s/2, s, s); x.restore();
    }
    function sparkles(t, t0, cx, cy, spread, count = 40) {
      const k = t - t0; if (k < 0 || k > 1.6) return;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + i; const sp = spread * (0.4 + (i * 37 % 100) / 160);
        const px = cx + Math.cos(a) * sp * ease(k / 0.9), py = cy + Math.sin(a) * sp * ease(k / 0.9) + k * k * 160;
        const col = ['#ffe14d', '#ff7aa2', '#7ad3ff', '#ffffff', '#b38cff'][i % 5];
        x.save(); x.globalAlpha = Math.max(0, 1 - k / 1.6); x.translate(px, py); x.rotate(k * 6 + i); x.fillStyle = col; x.fillRect(-9, -5, 18, 10); x.restore();
      }
    }
    function stars(t, t0, Y) {
      for (let i = 0; i < 3; i++) { const k = back((t - t0 - i * 0.15) / 0.35); if (k <= 0) continue; const cx = W/2 + (i - 1) * 130;
        x.save(); x.translate(cx, Y); x.scale(k, k); x.beginPath(); for (let j = 0; j < 10; j++) { const r = j % 2 ? 26 : 60; const a = -Math.PI/2 + j * Math.PI / 5; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); x.fillStyle = '#ffd23f'; x.fill(); x.lineWidth = 8; x.strokeStyle = '#c98a00'; x.stroke(); x.restore(); }
    }
    // ---------- build scenes ----------
    const P1 = makePuzzle('whale', 3, 4, 6);
    const ev1 = schedule(P1, 1.9, 7.2, 0.86);
    const mont = [makePuzzle('jungle', 5, 5, 12), makePuzzle('sky', 6, 6, 18), makePuzzle('starry', 6, 7, 21)];
    const MT0 = 11.8, MD = 3.1;
    const evM = mont.map((P, i) => schedule(P, MT0 + i * MD + 0.35, MD - 0.95, 0.93));
    const T_TOTAL = 30;
    window.__total = T_TOTAL;
    function draw(t) {
      bg(t); badge();
      if (t < 1.9) { // HOOK
        const sc = back(t / 0.45);
        x.save(); x.translate(W/2, 250); x.scale(sc, sc); txt('이 그림,', 0, -58, 76, '#ffffff'); txt('맞출 수 있어?', 0, 44, 104, '#ffe14d'); x.restore();
        if (t < 1.05) drawWhole(P1, 1, 0.9 + 0.1 * ease(t / 0.4));
        else { // shatter: pieces fly from correct to scrambled slots
          const k = easeIO((t - 1.05) / 0.8); const n = P1.rows * P1.cols;
          x.save(); x.fillStyle = '#2f8f5b'; rr(BX-16, BY-16, BS+32, BS+32, 34); x.fill(); x.restore();
          for (let slot = 0; slot < n; slot++) { const piece = P1.start[slot]; const [fx, fy, w, h] = slotRect(P1, piece), [tx, ty] = slotRect(P1, slot);
            const jitter = Math.sin(k * Math.PI) * 120; const ang = Math.sin(k * Math.PI) * ((piece % 2) ? 0.3 : -0.3);
            const px = fx + (tx - fx) * k + Math.cos(piece) * jitter, py = fy + (ty - fy) * k + Math.sin(piece * 1.7) * jitter;
            x.save(); x.translate(px + w/2, py + h/2); x.rotate(ang); drawPiece(P1, piece, -w/2, -h/2, w, h, Math.sin(k * Math.PI) * 0.5); x.restore(); }
        }
        return;
      }
      if (t < 9.6) { // PLAY 1
        const done = ev1.filter(e => t >= e.t1).length; const total = P1.rows * P1.cols;
        txt('톡톡 바꾸면', W/2, 205, 70, '#ffffff'); txt('그림이 완성돼요!', W/2, 300, 84, '#ffe14d');
        drawBoard(P1, ev1, t, {finger: true});
        let correct = 0; const cur = P1.start.slice(); for (const e of ev1) if (t >= e.t1) [cur[e.a], cur[e.b]] = [cur[e.b], cur[e.a]]; cur.forEach((p, s) => { if (p === s) correct++; });
        x.fillStyle = 'rgba(255,255,255,0.25)'; rr(W/2 - 200, BY + BS + 70, 400, 90, 45); x.fill();
        txt(`${correct} / ${total}`, W/2, BY + BS + 117, 64, '#ffffff');
        return;
      }
      if (t < MT0) { // COMPLETE
        const k = t - 9.6;
        txt('완성!', W/2, 250, 130 * back(k / 0.4), '#ffe14d');
        drawWhole(P1, 1, 1 + 0.03 * Math.sin(Math.min(k, 0.5) * Math.PI * 2));
        // shine sweep
        x.save(); rr(BX, BY, BS, BS, 30); x.clip(); const sx = BX - 400 + (k / 0.9) * (BS + 800); const g = x.createLinearGradient(sx - 150, 0, sx + 150, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(BX, BY, BS, BS); x.restore();
        stars(t, 9.8, BY + BS + 110);
        sparkles(t, 9.6, W/2, BY + BS/2, 700, 60);
        return;
      }
      if (t < MT0 + 3 * MD) { // MONTAGE
        const i = Math.min(2, Math.floor((t - MT0) / MD)); const P = mont[i]; const lt = t - MT0 - i * MD;
        const labels = [['25조각', '정글 탐험'], ['36조각', '하늘 섬 마을'], ['42조각', '별이 빛나는 밤']];
        txt('점점 더 어려워져요', W/2, 200, 70, '#ffffff');
        const sc = back(lt / 0.3); x.save(); x.translate(W/2, 305); x.scale(sc, sc); txt(labels[i][0], 0, 0, 104, '#ffe14d'); x.restore();
        const endT = evM[i][evM[i].length - 1].t1;
        if (t < endT + 0.05) drawBoard(P, evM[i], t, {gap: 4});
        else { drawWhole(P, 1, 1); sparkles(t, endT, W/2, BY + BS/2, 600, 36); }
        txt(labels[i][1], W/2, BY + BS + 110, 56, '#ffffff');
        // speed lines feel: progress bar of 3 dots
        for (let d = 0; d < 3; d++) { x.beginPath(); x.arc(W/2 + (d - 1) * 60, BY + BS + 200, 14, 0, Math.PI * 2); x.fillStyle = d <= i ? '#ffe14d' : 'rgba(255,255,255,0.4)'; x.fill(); }
        return;
      }
      const T4 = MT0 + 3 * MD;
      if (t < T4 + 3.2) { // THUMB WALL
        const k = t - T4;
        const cols = 3, size = 300, gap = 24, startY = 470 - (k * 140);
        for (let i = 0; i < TH.length; i++) { const r = Math.floor(i / cols), c = i % cols; const X = (W - (cols * size + (cols - 1) * gap)) / 2 + c * (size + gap); const Y = startY + r * (size + gap);
          const pop = back((k - i * 0.025) / 0.25); if (pop <= 0) continue;
          x.save(); x.translate(X + size/2, Y + size/2); x.scale(pop, pop); x.shadowColor = 'rgba(0,0,0,0.2)'; x.shadowBlur = 16; x.shadowOffsetY = 6; rr(-size/2, -size/2, size, size, 26); x.fillStyle = '#fff'; x.fill(); x.shadowColor = 'transparent'; x.clip(); x.drawImage(TH[i], -size/2, -size/2, size, size); x.restore(); }
        x.save(); x.beginPath(); x.rect(0, 0, W, 420); x.clip(); bg(t); badge(); x.restore();
        txt('매일 새로운', W/2, 200, 70, '#ffffff'); txt('귀여운 그림 가득!', W/2, 305, 96 * back(k / 0.35), '#ffe14d');
        return;
      }
      // CTA
      const k = t - (T4 + 3.2);
      drawWhole(P1, 1, 0.78 + 0.02 * Math.sin(t * 3));
      x.fillStyle = 'rgba(31,107,67,0.0)';
      const sc = back(k / 0.4);
      x.save(); x.translate(W/2, 230); x.scale(sc, sc); txt('설치 없이', 0, -60, 76, '#ffffff'); txt('지금 무료로!', 0, 45, 110, '#ffe14d'); x.restore();
      const pulse = 1 + 0.05 * Math.sin(t * 7);
      x.save(); x.translate(W/2, BY + BS + 120); x.scale(pulse, pulse); x.shadowColor = 'rgba(0,0,0,0.25)'; x.shadowBlur = 20; x.shadowOffsetY = 10; rr(-400, -70, 800, 140, 70); x.fillStyle = '#ffffff'; x.fill(); x.shadowColor = 'transparent'; txt('▶  Tiny Pieces 플레이', 0, 4, 58, '#2f8f5b', null); x.restore();
      txt('네이버에서 "퍼즐 가든" 검색', W/2, BY + BS + 275, 52, '#ffffff', '#1f6b43', 10, 900);
      txt('puzzles.tmhub.co.kr/jigsaw', W/2, BY + BS + 350, 42, '#e9fff1', '#1f6b43', 8, 700);
      // tapping finger on button
      const fk = (t * 1.4) % 1; const fy = BY + BS + 150 + Math.sin(fk * Math.PI) * 18;
      x.beginPath(); x.arc(W/2 + 300, fy, 32, 0, Math.PI * 2); x.fillStyle = 'rgba(255,255,255,0.9)'; x.fill(); x.lineWidth = 6; x.strokeStyle = 'rgba(31,107,67,0.6)'; x.stroke();
    }
    window.__draw = draw;
    // ---------- audio ----------
    const dest = actx.createMediaStreamDestination();
    const limiter = actx.createDynamicsCompressor(); limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.002; limiter.release.value = 0.1; limiter.connect(dest);
    const master = actx.createGain(); master.gain.value = gains.master; master.connect(limiter);
    const comp = actx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 4; comp.connect(master);
    const musicBus = actx.createGain(); musicBus.gain.value = gains.music; musicBus.connect(comp);
    const sfxBus = actx.createGain(); sfxBus.gain.value = gains.sfx; sfxBus.connect(comp);
    const noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.5, actx.sampleRate); { const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const tone = (bus, t, f, dur, vol, type = 'sine', attack = 0.005, fEnd) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (fEnd) o.frequency.exponentialRampToValueAtTime(fEnd, t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05); };
    const noise = (bus, t, dur, vol, ftype, f0, f1) => { const s = actx.createBufferSource(); s.buffer = noiseBuf; const fl = actx.createBiquadFilter(); fl.type = ftype; fl.frequency.setValueAtTime(f0, t); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur); fl.Q.value = 1.2; const g = actx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(fl); fl.connect(g); g.connect(bus); s.start(t); s.stop(t + dur + 0.05); };
    const N = n => 440 * Math.pow(2, (n - 69) / 12);
    const startAt = actx.currentTime + 0.25;
    // BGM: bouncy 128 bpm, I-V-vi-IV in F
    const bpm = 128, e8 = 60 / bpm / 2;
    const chords = [[53, 65, 69, 72], [48, 60, 64, 67], [50, 62, 65, 69], [46, 58, 62, 65]];
    const mel = [[77, 81, 84, 81, 79, 77, 76, 77], [76, 79, 84, 79, 76, 74, 72, 74], [74, 77, 81, 77, 76, 74, 72, 74], [74, 77, 82, 81, 79, 77, 76, 72]];
    const quiet = t => (t > 9.55 && t < 10.3) ? 0.35 : 1;
    for (let i = 0; i * e8 < T_TOTAL - 0.6; i++) { const lt = i * e8; const t = startAt + lt; const bar = Math.floor(i / 8) % 4, step = i % 8; const ch = chords[bar]; const q = quiet(lt);
      if (lt < 1.0) continue; // hook: only sfx
      if (step % 2 === 0) noise(musicBus, t, 0.04, 0.05 * q, 'highpass', 8000);
      if (step === 0 || step === 4) { tone(musicBus, t, 150, 0.16, 0.45 * q, 'sine', 0.002, 45); }
      if (step === 2 || step === 6) noise(musicBus, t, 0.12, 0.12 * q, 'bandpass', 1800);
      if (step === 0 || step === 3 || step === 4 || step === 6) tone(musicBus, t, N(ch[0] - 12 + 12), 0.25, 0.2 * q, 'triangle');
      tone(musicBus, t, N(mel[bar][step]), 0.22, 0.11 * q, 'square', 0.004); tone(musicBus, t, N(mel[bar][step]) * 2, 0.12, 0.03 * q, 'sine');
      if (step === 0) ch.slice(1).forEach(n => tone(musicBus, t, N(n), e8 * 7.5, 0.035 * q, 'sine', 0.03));
    }
    // hook: shatter
    tone(sfxBus, startAt + 0.02, N(84), 0.3, 0.25); tone(sfxBus, startAt + 0.12, N(88), 0.3, 0.2);
    noise(sfxBus, startAt + 1.05, 0.5, 0.45, 'bandpass', 3000, 400); tone(sfxBus, startAt + 1.05, 900, 0.35, 0.25, 'triangle', 0.003, 200);
    // swap sfx
    const swapSfx = (ev, pitchIdx, vol = 1) => { const t = startAt + ev.t0; const t1 = startAt + ev.t1; const d = ev.t1 - ev.t0;
      tone(sfxBus, t, 1300, 0.05, 0.18 * vol, 'sine');            // pick tick
      noise(sfxBus, t + d * 0.25, d * 0.6, 0.12 * vol, 'bandpass', 600, 2400); // whoosh
      tone(sfxBus, t1, N(72 + pitchIdx), 0.18, 0.32 * vol, 'sine', 0.002); tone(sfxBus, t1, N(72 + pitchIdx) * 2, 0.08, 0.12 * vol, 'sine'); // pop
    };
    const scaleSteps = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24];
    ev1.forEach((e, i) => swapSfx(e, scaleSteps[i % scaleSteps.length]));
    // complete fanfare
    [72, 76, 79, 84].forEach((n, i) => { tone(sfxBus, startAt + 9.6 + i * 0.09, N(n), 0.5, 0.3, 'triangle'); });
    [84, 88, 91, 96].forEach((n, i) => tone(sfxBus, startAt + 9.95 + i * 0.06, N(n), 0.6, 0.12, 'sine'));
    [0, 0.15, 0.3].forEach((d, i) => tone(sfxBus, startAt + 9.8 + d, N(84 + i * 4), 0.25, 0.22, 'square', 0.002));
    // montage: rapid rising pops
    evM.forEach((evs, mi) => { evs.forEach((e, i) => { const t1 = startAt + e.t1; tone(sfxBus, t1, N(64 + Math.min(i, 24) + mi * 2), 0.09, 0.2, 'sine', 0.002); });
      const endT = evs[evs.length - 1].t1; [76, 79, 84].forEach((n, i) => tone(sfxBus, startAt + endT + i * 0.07, N(n + mi * 2), 0.35, 0.25, 'triangle'));
      tone(sfxBus, startAt + MT0 + mi * MD, N(60 + mi * 3), 0.2, 0.2, 'square'); });
    // thumbs pop
    const T4 = MT0 + 3 * MD; for (let i = 0; i < 21; i++) tone(sfxBus, startAt + T4 + i * 0.025, N(79 + (i % 5) * 2), 0.06, 0.08, 'sine');
    // CTA chime
    [77, 81, 84, 89].forEach((n, i) => tone(sfxBus, startAt + T4 + 3.2 + i * 0.1, N(n), 0.6, 0.22, 'triangle'));
    master.gain.setValueAtTime(gains.master, startAt + T_TOTAL - 1); master.gain.linearRampToValueAtTime(0.0001, startAt + T_TOTAL);
    // ---------- record ----------
    const vs = cv.captureStream(0); const vtrack = vs.getVideoTracks()[0];
    const rec = new MediaRecorder(new MediaStream([vtrack, ...dest.stream.getAudioTracks()]), {mimeType: 'video/mp4;codecs=avc1.640028,mp4a.40.2', videoBitsPerSecond: 9_000_000, audioBitsPerSecond: 160_000});
    const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    const done = new Promise(r => rec.onstop = r);
    draw(0); rec.start(500); vtrack.requestFrame();
    while (actx.currentTime < startAt) await new Promise(r => setTimeout(r, 2));
    let frames = 0;
    await new Promise(resolve => { const tick = () => { const t = actx.currentTime - startAt; draw(t); vtrack.requestFrame(); frames++; window.__prog = t;
      if (t < T_TOTAL) setTimeout(tick, Math.max(0, (frames + 1) / FPS - t) * 1000); else resolve(); }; tick(); });
    rec.stop(); await done;
    const blob = new Blob(chunks, {type: 'video/mp4'}); const buf = new Uint8Array(await blob.arrayBuffer()); let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    window.__res = {b64: btoa(bin), size: buf.length, frames};
  })().catch(e => window.__err = String(e && e.stack || e)); }, {once: true});
  return 'armed';
};
