// Puzzle Garden SnapSpot shorts renderer (runs inside a browser page; armed by clicking #go)
// v2 (2026-10-30): 30s countdown, 1.5s hint opening, ~40s total, winners end-card.
// Stage data: https://images.tmhub.co.kr/spot-the-difference/stages/0001-0500/{n}.jpg, {n}_1.jpg, {n}.json
// Coordinates: game space is 1000 wide; px = W/2 + (W/1000)*x, py = H/2 - (W/1000)*y. Only valid for 1232x928 images.
export const shortsRenderer = function ({a,b,diffs,stage,gains,title,winners,style}) {
  // v3 (2026-11-09): style = {bg:[top,bottom], accent, head:[line1,line2], hint:'circle'|'zoom'|'spot', music:0-3, badge, tip}
  const ST = Object.assign({bg:['#123f2f','#0b2a20'], accent:'#ffd84d', head:null, hint:'circle', music:0, badge:'', tip:'', brand:'퍼즐 가든', L:{}}, style||{});
  const L = Object.assign({timeUp:'시간 끝!', reveal:'정답 공개', ask1:'몇 개 찾으셨어요?', ask2:'댓글로 알려주세요!', hint:'힌트! 하나는 여기, 나머지는?', event:'"5개" 댓글 남기면 다음 영상에 닉네임 소개!', url:'puzzles.tmhub.co.kr', winners:'지난 영상 눈썰미 천재: '}, ST.L);
  window.__res=null; window.__err=null; window.__prog=0;
  document.body.innerHTML = '<button id="go" style="font-size:40px;padding:20px">start</button>';
  const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s; });
  const ready = Promise.all([load(a), load(b), document.fonts.load('900 80px "Malgun Gothic"').catch(()=>{})]);
  document.getElementById('go').addEventListener('click', () => { (async () => {
    const actx = new AudioContext(); await actx.resume();
    const [ia, ib] = await ready;
    const W=1080, H=1920, FPS=30;
    const cv = document.createElement('canvas'); cv.width=W; cv.height=H; document.body.appendChild(cv); cv.style.width='200px';
    const x = cv.getContext('2d');
    const IW=960, IH=Math.round(IW*ia.height/ia.width), IX=(W-IW)/2, Y1=300, GAP=14, Y2=Y1+IH+GAP;
    const k = IW/ia.width, S=ia.width/1000, CX=ia.width/2, CY=ia.height/2;
    const pts = diffs.map(d => ({px:(CX+S*d.topPosition.x)*k, py:(CY-S*d.topPosition.y)*k, r:Math.max(42, Math.max(d.colSize.x,d.colSize.y)*S*k/2+14)})).sort((p,q)=>p.px-q.px);
    const nD = pts.length;
    const T_HOOK=1.5, T_CD=30, T_END=T_HOOK+T_CD, T_REV=T_END+0.8, REV_STEP=0.7, T_CTA=T_REV+nD*REV_STEP+0.4, T_TOTAL=T_CTA+4.2;
    window.__total=T_TOTAL;
    const rr=(X,Y,w,h,r)=>{x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+w,Y,X+w,Y+h,r);x.arcTo(X+w,Y+h,X,Y+h,r);x.arcTo(X,Y+h,X,Y,r);x.arcTo(X,Y,X+w,Y,r);x.closePath();};
    const ease = t => 1-Math.pow(1-Math.min(Math.max(t,0),1),3);
    const txt = (s, X, Y, size, color, weight=900, align='center', stroke=null) => { x.font=`${weight} ${size}px "Malgun Gothic"`; x.textAlign=align; x.textBaseline='middle'; if(stroke){x.lineWidth=stroke[1]; x.strokeStyle=stroke[0]; x.lineJoin='round'; x.strokeText(s,X,Y);} x.fillStyle=color; x.fillText(s,X,Y); };
    function draw(t) {
      const g = x.createLinearGradient(0,0,0,H); g.addColorStop(0,ST.bg[0]); g.addColorStop(1,ST.bg[1]); x.fillStyle=g; x.fillRect(0,0,W,H);
      const pill = ST.badge ? `${title} · ${ST.badge}` : `${ST.brand} · ${title}`; x.font='700 32px "Malgun Gothic"'; const pw = Math.min(W-80, x.measureText(pill).width+80);
      x.fillStyle='rgba(255,255,255,0.12)'; rr(W/2-pw/2,36,pw,62,31); x.fill();
      txt(pill, W/2, 68, 32, '#eafff4', 700);
      if (t < T_END) { const sc = 0.6+0.4*ease(t/0.5); x.save(); x.translate(W/2,190); x.scale(sc,sc);
        const hd = ST.head || [`30초 안에 ${nD}개 다 찾으면`, '눈썰미 천재!'];
        txt(hd[0].replace('{n}', nD), 0, -44, 64, '#ffffff', 900, 'center', [ST.bg[1],10]);
        txt(hd[1].replace('{n}', nD), 0, 46, 88, ST.accent, 900, 'center', [ST.bg[1],12]); x.restore();
      } else if (t < T_CTA) { const found = Math.min(nD, Math.max(0, Math.floor((t-T_REV)/REV_STEP)+1));
        if (t < T_REV) txt(L.timeUp, W/2, 190, 110, '#ff5a4e', 900, 'center', [ST.bg[1],12]);
        else { txt(L.reveal, W/2, 150, 60, '#ffffff', 900); txt(`${found} / ${nD}`, W/2, 236, 84, ST.accent, 900, 'center', [ST.bg[1],10]); }
      } else { const sc = 0.7+0.3*ease((t-T_CTA)/0.4); x.save(); x.translate(W/2,190); x.scale(sc,sc);
        txt(L.ask1, 0, -44, 76, '#ffffff', 900, 'center', [ST.bg[1],10]);
        txt(L.ask2, 0, 50, 76, ST.accent, 900, 'center', [ST.bg[1],10]); x.restore(); }
      for (const [img, Y] of [[ia,Y1],[ib,Y2]]) { x.save(); rr(IX,Y,IW,IH,22); x.clip(); x.drawImage(img, IX, Y, IW, IH); x.restore(); x.lineWidth=6; x.strokeStyle='#ffffff'; rr(IX,Y,IW,IH,22); x.stroke(); }
      if (t < T_HOOK) { const hp = pts[Math.floor(pts.length/2)]; const pulse = 1 + 0.12*Math.sin(t*14);
        if (ST.hint === 'spot') { for (const Y of [Y1,Y2]) { x.save(); x.beginPath(); rr(IX,Y,IW,IH,22); x.arc(IX+hp.px, Y+hp.py, hp.r*1.6*pulse, 0, Math.PI*2, true); x.fillStyle='rgba(0,0,0,0.6)'; x.fill('evenodd'); x.restore(); x.beginPath(); x.arc(IX+hp.px, Y+hp.py, hp.r*1.6*pulse, 0, Math.PI*2); x.lineWidth=6; x.strokeStyle='#ffe14d'; x.stroke(); } }
        else if (ST.hint === 'zoom') { const R = 150, zx = Math.min(W-R-20, Math.max(R+20, IX+hp.px)), zy = Y2+hp.py; const sx = (hp.px/k), sy = (hp.py/k), sr = (R/2.2)/k; x.save(); x.beginPath(); x.arc(zx, zy, R, 0, Math.PI*2); x.clip(); x.drawImage(ib, sx-sr, sy-sr, sr*2, sr*2, zx-R, zy-R, R*2, R*2); x.restore(); x.beginPath(); x.arc(zx, zy, R, 0, Math.PI*2); x.lineWidth=12; x.strokeStyle='#ffe14d'; x.stroke(); x.save(); x.translate(zx+R*0.72, zy+R*0.72); x.rotate(Math.PI/4); x.fillStyle='#ffe14d'; rr(-16,0,32,90,12); x.fill(); x.restore(); }
        else { for (const Y of [Y1,Y2]) { x.save(); x.setLineDash([18,12]); x.beginPath(); x.arc(IX+hp.px, Y+hp.py, hp.r*pulse, 0, Math.PI*2); x.lineWidth=10; x.strokeStyle='#ffe14d'; x.stroke(); x.restore(); } } x.fillStyle='rgba(0,0,0,0.65)'; rr(W/2-300, Y2+IH+30, 600, 80, 40); x.fill(); txt(L.hint, W/2, Y2+IH+72, 44, '#ffe14d', 900); }
      if (t >= T_REV) pts.forEach((p,i) => { const t0 = T_REV + i*REV_STEP; if (t < t0) return; const pop = 1 + 0.35*(1-ease((t-t0)/0.25));
        for (const Y of [Y1,Y2]) { x.beginPath(); x.arc(IX+p.px, Y+p.py, p.r*pop, 0, Math.PI*2); x.lineWidth=14; x.strokeStyle='rgba(255,255,255,0.9)'; x.stroke(); x.lineWidth=8; x.strokeStyle='#ff2d2d'; x.stroke(); } });
      const BY = Y2+IH+20;
      if (ST.tip && t >= T_REV && t < T_CTA) { x.fillStyle='rgba(0,0,0,0.45)'; rr(70, BY+20, W-140, 90, 45); x.fill(); txt(ST.tip, W/2, BY+66, 40, '#ffffff', 700); }
      if (t >= T_HOOK && t < T_END) { const left = Math.max(0, T_END - Math.max(t, T_HOOK)); const frac = left / T_CD; const sec = Math.ceil(left); const urgent = sec <= 5 && t >= T_HOOK;
        x.fillStyle='rgba(255,255,255,0.15)'; rr(60,BY+30,W-260,40,20); x.fill();
        x.fillStyle= urgent ? '#ff5a4e' : ST.accent; rr(60,BY+30,Math.max(40,(W-260)*frac),40,20); x.fill();
        x.beginPath(); x.arc(W-110, BY+50, 62, 0, Math.PI*2); x.fillStyle= urgent ? '#ff5a4e' : ST.accent; x.fill();
        txt(String(sec), W-110, BY+54, 70, '#0b2a20', 900);
      } else if (t >= T_CTA) { txt(L.event, W/2, BY+40, 40, '#ffffff', 700); txt((winners && winners.length) ? (L.winners + winners.join(', ')) : L.url, W/2, BY+100, (winners && winners.length) ? 36 : 40, '#9fe3bf', 700); }
    }
    window.__draw = draw;
    const dest = actx.createMediaStreamDestination();
    const limiter = actx.createDynamicsCompressor(); limiter.threshold.value=-3; limiter.knee.value=0; limiter.ratio.value=20; limiter.attack.value=0.002; limiter.release.value=0.1; limiter.connect(dest);
    const master = actx.createGain(); master.gain.value = gains.master; master.connect(limiter);
    const comp = actx.createDynamicsCompressor(); comp.threshold.value=-20; comp.ratio.value=4; comp.connect(master);
    const musicBus = actx.createGain(); musicBus.gain.value = gains.music; musicBus.connect(comp);
    const sfxBus = actx.createGain(); sfxBus.gain.value = gains.sfx; sfxBus.connect(comp);
    const noiseBuf = actx.createBuffer(1, actx.sampleRate*0.2, actx.sampleRate); { const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; }
    const tone = (bus, t, f, dur, vol, type='sine', attack=0.005) => { const o=actx.createOscillator(), g=actx.createGain(); o.type=type; o.frequency.setValueAtTime(f,t); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+attack); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); o.connect(g); g.connect(bus); o.start(t); o.stop(t+dur+0.05); };
    const marimba = (t,f,v=0.22) => { tone(musicBus,t,f,0.35,v,'sine'); tone(musicBus,t,f*4,0.08,v*0.25,'sine'); };
    const hat = (t,v=0.05) => { const s=actx.createBufferSource(); s.buffer=noiseBuf; const hp=actx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=7000; const g=actx.createGain(); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.05); s.connect(hp); hp.connect(g); g.connect(musicBus); s.start(t); s.stop(t+0.1); };
    const kick = (t,v=0.5) => { const o=actx.createOscillator(), g=actx.createGain(); o.frequency.setValueAtTime(140,t); o.frequency.exponentialRampToValueAtTime(45,t+0.12); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.18); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t+0.2); };
    const N = n => 440*Math.pow(2,(n-69)/12);
    const startAt = actx.currentTime + 0.25;
    const MUS = [
      {bpm:116, chords:[[48,60,64,67],[45,57,60,64],[41,57,60,65],[43,55,59,62]], mel:[[72,76,79,76],[72,69,72,76],[72,77,81,77],[74,71,74,79]]},
      {bpm:104, chords:[[50,62,66,69],[47,59,62,66],[43,55,59,62],[45,57,61,64]], mel:[[74,78,81,78],[74,71,74,78],[71,74,79,74],[73,76,81,76]]},
      {bpm:124, chords:[[53,65,69,72],[50,62,65,69],[46,58,62,65],[48,60,64,67]], mel:[[77,81,84,81],[77,74,77,81],[74,77,82,77],[76,79,84,79]]},
      {bpm:96,  chords:[[43,55,59,62],[40,52,55,59],[36,48,52,55],[38,50,54,57]], mel:[[67,71,74,71],[67,64,67,71],[64,67,72,67],[66,69,74,69]]}][ST.music%4];
    const bpm = MUS.bpm, beat = 60/bpm, e8 = beat/2;
    const chords = MUS.chords;
    const mel = MUS.mel;
    for (let i=0; i*e8 < T_END; i++) { const t = startAt + i*e8, bar = Math.floor(i/8)%4, step = i%8; const ch = chords[bar];
      if (step%2===0) hat(t); if (step===0||step===4) kick(t, 0.35); if (step===0||step===3||step===4) tone(musicBus,t,N(ch[0]),0.4,0.22,'triangle');
      const tense = (i*e8) > T_END-5.2; const m = mel[bar][[0,1,2,1,3,2,1,0][step]%4]; if (step!==7) marimba(t, N(m + (tense?2:0)), tense?0.16:0.2); }
    for (let s=0; s<T_CD; s++) { const t = startAt + T_HOOK + s; const urgent = (T_CD-s)<=5; tone(sfxBus,t,urgent?1500:1100,0.05,urgent?0.3:0.09,'square'); }
    tone(sfxBus, startAt+T_END, 523, 0.18, 0.3, 'triangle'); tone(sfxBus, startAt+T_END+0.16, 392, 0.35, 0.3, 'triangle');
    [60,64,67].forEach(n => tone(musicBus, startAt+T_REV, N(n), T_CTA-T_REV, 0.06, 'sine', 0.3));
    pts.forEach((p,i) => { const t = startAt + T_REV + i*REV_STEP; const f = N([72,74,76,79,84,86,88][i]||88); tone(sfxBus,t,f,0.5,0.3,'sine'); tone(sfxBus,t,f*2,0.3,0.12,'sine'); tone(sfxBus,t,f*3.01,0.15,0.05,'sine'); });
    [72,76,79,84].forEach((n,i)=> marimba(startAt+T_CTA+i*0.09, N(n), 0.24));
    for (let i=0; T_CTA+0.5+i*e8 < T_TOTAL-0.3; i++) { const t = startAt+T_CTA+0.5+i*e8, step=i%8, bar=Math.floor(i/8)%4; const ch=chords[bar];
      if (step%2===0) hat(t,0.04); if (step===0||step===4) kick(t,0.3); if (step===0||step===4) tone(musicBus,t,N(ch[0]),0.4,0.2,'triangle'); if (step%2===0) marimba(t, N(mel[bar][(step/2)%4]), 0.16); }
    master.gain.setValueAtTime(gains.master, startAt+T_TOTAL-0.8); master.gain.linearRampToValueAtTime(0.0001, startAt+T_TOTAL);
    const vs = cv.captureStream(0); const vtrack = vs.getVideoTracks()[0];
    const rec = new MediaRecorder(new MediaStream([vtrack, ...dest.stream.getAudioTracks()]), {mimeType: 'video/mp4;codecs=avc1.640028,mp4a.40.2', videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 160_000});
    const chunks=[]; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    const done = new Promise(r => rec.onstop = r);
    draw(0); rec.start(500); vtrack.requestFrame();
    while (actx.currentTime < startAt) await new Promise(r=>setTimeout(r,2));
    let frames=0;
    await new Promise(resolve => { const tick = () => { const t = actx.currentTime - startAt; draw(t); vtrack.requestFrame(); frames++; window.__prog=t;
      if (t < T_TOTAL) setTimeout(tick, Math.max(0, (frames+1)/FPS - t)*1000); else resolve(); }; tick(); });
    rec.stop(); await done;
    const blob = new Blob(chunks, {type:'video/mp4'}); const buf = new Uint8Array(await blob.arrayBuffer()); let bin=''; for (let i=0;i<buf.length;i+=0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i,i+0x8000));
    window.__res = {b64: btoa(bin), size: buf.length, frames};
  })().catch(e => window.__err = String(e && e.stack || e)); }, {once: true});
  return 'armed';
};

export const halloweenRenderer = function ({a,b,diffs,stage,gains,title,winners}) {
  window.__res=null; window.__err=null; window.__prog=0;
  document.body.innerHTML = '<button id="go" style="font-size:40px;padding:20px">start</button>';
  const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s; });
  const ready = Promise.all([load(a), load(b), document.fonts.load('900 80px "Malgun Gothic"').catch(()=>{})]);
  document.getElementById('go').addEventListener('click', () => { (async () => {
    const actx = new AudioContext(); await actx.resume();
    const [ia, ib] = await ready;
    const W=1080, H=1920, FPS=30;
    const cv = document.createElement('canvas'); cv.width=W; cv.height=H; document.body.appendChild(cv); cv.style.width='200px';
    const x = cv.getContext('2d');
    const IW=960, IH=Math.round(IW*ia.height/ia.width), IX=(W-IW)/2, Y1=300, GAP=14, Y2=Y1+IH+GAP;
    const k = IW/ia.width, S=ia.width/1000, CX=ia.width/2, CY=ia.height/2;
    const pts = diffs.map(d => ({px:(CX+S*d.topPosition.x)*k, py:(CY-S*d.topPosition.y)*k, r:Math.max(42, Math.max(d.colSize.x,d.colSize.y)*S*k/2+14)})).sort((p,q)=>p.px-q.px);
    const nD = pts.length;
    const T_HOOK=1.5, T_CD=30, T_END=T_HOOK+T_CD, T_REV=T_END+0.8, REV_STEP=0.7, T_CTA=T_REV+nD*REV_STEP+0.4, T_TOTAL=T_CTA+4.2;
    window.__total=T_TOTAL;
    const rr=(X,Y,w,h,r)=>{x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+w,Y,X+w,Y+h,r);x.arcTo(X+w,Y+h,X,Y+h,r);x.arcTo(X,Y+h,X,Y,r);x.arcTo(X,Y,X+w,Y,r);x.closePath();};
    const ease = t => 1-Math.pow(1-Math.min(Math.max(t,0),1),3);
    const txt = (s, X, Y, size, color, weight=900, align='center', stroke=null) => { x.font=`${weight} ${size}px "Malgun Gothic"`; x.textAlign=align; x.textBaseline='middle'; if(stroke){x.lineWidth=stroke[1]; x.strokeStyle=stroke[0]; x.lineJoin='round'; x.strokeText(s,X,Y);} x.fillStyle=color; x.fillText(s,X,Y); };
    function draw(t) {
      const g = x.createLinearGradient(0,0,0,H); g.addColorStop(0,'#3a145a'); g.addColorStop(1,'#14061f'); x.fillStyle=g; x.fillRect(0,0,W,H);
      x.fillStyle='rgba(255,255,255,0.12)'; rr(W/2-250,36,500,62,31); x.fill();
      txt(`퍼즐 가든 · ${title}`, W/2, 68, 32, '#d8f5e6', 700);
      if (t < T_END) { const sc = 0.6+0.4*ease(t/0.5); x.save(); x.translate(W/2,190); x.scale(sc,sc);
        txt(`30초 안에 ${nD}개 다 찾으면`, 0, -44, 64, '#ffffff', 900, 'center', ['#14061f',10]);
        txt('유령도 놀랄 눈썰미!', 0, 46, 88, '#ff8a1f', 900, 'center', ['#14061f',12]); x.restore();
      } else if (t < T_CTA) { const found = Math.min(nD, Math.max(0, Math.floor((t-T_REV)/REV_STEP)+1));
        if (t < T_REV) txt('시간 끝!', W/2, 190, 110, '#ff5a4e', 900, 'center', ['#14061f',12]);
        else { txt('정답 공개', W/2, 150, 60, '#ffffff', 900); txt(`${found} / ${nD}`, W/2, 236, 84, '#ff8a1f', 900, 'center', ['#14061f',10]); }
      } else { const sc = 0.7+0.3*ease((t-T_CTA)/0.4); x.save(); x.translate(W/2,190); x.scale(sc,sc);
        txt('몇 개 찾으셨어요?', 0, -44, 76, '#ffffff', 900, 'center', ['#14061f',10]);
        txt('댓글로 알려주세요!', 0, 50, 76, '#ff8a1f', 900, 'center', ['#14061f',10]); x.restore(); }
      for (const [img, Y] of [[ia,Y1],[ib,Y2]]) { x.save(); rr(IX,Y,IW,IH,22); x.clip(); x.drawImage(img, IX, Y, IW, IH); x.restore(); x.lineWidth=6; x.strokeStyle='#ffffff'; rr(IX,Y,IW,IH,22); x.stroke(); }
      if (t < T_HOOK) { const hp = pts[Math.floor(pts.length/2)]; const pulse = 1 + 0.12*Math.sin(t*14); for (const Y of [Y1,Y2]) { x.save(); x.setLineDash([18,12]); x.beginPath(); x.arc(IX+hp.px, Y+hp.py, hp.r*pulse, 0, Math.PI*2); x.lineWidth=10; x.strokeStyle='#ffe14d'; x.stroke(); x.restore(); } x.fillStyle='rgba(0,0,0,0.65)'; rr(W/2-300, Y2+IH+30, 600, 80, 40); x.fill(); txt('힌트! 하나는 여기, 나머지는?', W/2, Y2+IH+72, 44, '#ffe14d', 900); }
      if (t >= T_REV) pts.forEach((p,i) => { const t0 = T_REV + i*REV_STEP; if (t < t0) return; const pop = 1 + 0.35*(1-ease((t-t0)/0.25));
        for (const Y of [Y1,Y2]) { x.beginPath(); x.arc(IX+p.px, Y+p.py, p.r*pop, 0, Math.PI*2); x.lineWidth=14; x.strokeStyle='rgba(255,255,255,0.9)'; x.stroke(); x.lineWidth=8; x.strokeStyle='#ff2d2d'; x.stroke(); } });
      const BY = Y2+IH+20;
      if (t >= T_HOOK && t < T_END) { const left = Math.max(0, T_END - Math.max(t, T_HOOK)); const frac = left / T_CD; const sec = Math.ceil(left); const urgent = sec <= 5 && t >= T_HOOK;
        x.fillStyle='rgba(255,255,255,0.15)'; rr(60,BY+30,W-260,40,20); x.fill();
        x.fillStyle= urgent ? '#ff5a4e' : '#ff8a1f'; rr(60,BY+30,Math.max(40,(W-260)*frac),40,20); x.fill();
        x.beginPath(); x.arc(W-110, BY+50, 62, 0, Math.PI*2); x.fillStyle= urgent ? '#ff5a4e' : '#ff8a1f'; x.fill();
        txt(String(sec), W-110, BY+54, 70, '#14061f', 900);
      } else if (t >= T_CTA) { txt('"5개" 댓글 남기면 다음 영상에 닉네임 소개!', W/2, BY+40, 40, '#ffffff', 700); txt((winners && winners.length) ? ('지난 영상 눈썰미 천재: ' + winners.join(', ')) : 'puzzles.tmhub.co.kr', W/2, BY+100, (winners && winners.length) ? 36 : 40, '#9fe3bf', 700); }
    }
    window.__draw = draw;
    const dest = actx.createMediaStreamDestination();
    const limiter = actx.createDynamicsCompressor(); limiter.threshold.value=-3; limiter.knee.value=0; limiter.ratio.value=20; limiter.attack.value=0.002; limiter.release.value=0.1; limiter.connect(dest);
    const master = actx.createGain(); master.gain.value = gains.master; master.connect(limiter);
    const comp = actx.createDynamicsCompressor(); comp.threshold.value=-20; comp.ratio.value=4; comp.connect(master);
    const musicBus = actx.createGain(); musicBus.gain.value = gains.music; musicBus.connect(comp);
    const sfxBus = actx.createGain(); sfxBus.gain.value = gains.sfx; sfxBus.connect(comp);
    const noiseBuf = actx.createBuffer(1, actx.sampleRate*0.2, actx.sampleRate); { const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; }
    const tone = (bus, t, f, dur, vol, type='sine', attack=0.005) => { const o=actx.createOscillator(), g=actx.createGain(); o.type=type; o.frequency.setValueAtTime(f,t); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+attack); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); o.connect(g); g.connect(bus); o.start(t); o.stop(t+dur+0.05); };
    const marimba = (t,f,v=0.22) => { tone(musicBus,t,f,0.35,v,'sine'); tone(musicBus,t,f*4,0.08,v*0.25,'sine'); };
    const hat = (t,v=0.05) => { const s=actx.createBufferSource(); s.buffer=noiseBuf; const hp=actx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=7000; const g=actx.createGain(); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.05); s.connect(hp); hp.connect(g); g.connect(musicBus); s.start(t); s.stop(t+0.1); };
    const kick = (t,v=0.5) => { const o=actx.createOscillator(), g=actx.createGain(); o.frequency.setValueAtTime(140,t); o.frequency.exponentialRampToValueAtTime(45,t+0.12); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.18); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t+0.2); };
    const N = n => 440*Math.pow(2,(n-69)/12);
    const startAt = actx.currentTime + 0.25;
    const bpm = 96, beat = 60/bpm, e8 = beat/2;
    const chords = [[45,57,60,64],[41,53,57,60],[38,50,53,57],[40,52,56,59]];
    const mel = [[69,72,76,72],[69,65,69,72],[74,77,81,77],[71,68,71,76]];
    for (let i=0; i*e8 < T_END; i++) { const t = startAt + i*e8, bar = Math.floor(i/8)%4, step = i%8; const ch = chords[bar];
      if (step%2===0) hat(t); if (step===0||step===4) kick(t, 0.35); if (step===0||step===3||step===4) tone(musicBus,t,N(ch[0]),0.4,0.22,'triangle');
      const tense = (i*e8) > T_END-5.2; const m = mel[bar][[0,1,2,1,3,2,1,0][step]%4]; if (step!==7) marimba(t, N(m + (tense?2:0)), tense?0.16:0.2); }
    for (let s=0; s<T_CD; s++) { const t = startAt + T_HOOK + s; const urgent = (T_CD-s)<=5; tone(sfxBus,t,urgent?1500:1100,0.05,urgent?0.3:0.09,'square'); }
    tone(sfxBus, startAt+T_END, 523, 0.18, 0.3, 'triangle'); tone(sfxBus, startAt+T_END+0.16, 392, 0.35, 0.3, 'triangle');
    [60,64,67].forEach(n => tone(musicBus, startAt+T_REV, N(n), T_CTA-T_REV, 0.06, 'sine', 0.3));
    pts.forEach((p,i) => { const t = startAt + T_REV + i*REV_STEP; const f = N([72,74,76,79,84,86,88][i]||88); tone(sfxBus,t,f,0.5,0.3,'sine'); tone(sfxBus,t,f*2,0.3,0.12,'sine'); tone(sfxBus,t,f*3.01,0.15,0.05,'sine'); });
    [72,76,79,84].forEach((n,i)=> marimba(startAt+T_CTA+i*0.09, N(n), 0.24));
    for (let i=0; T_CTA+0.5+i*e8 < T_TOTAL-0.3; i++) { const t = startAt+T_CTA+0.5+i*e8, step=i%8, bar=Math.floor(i/8)%4; const ch=chords[bar];
      if (step%2===0) hat(t,0.04); if (step===0||step===4) kick(t,0.3); if (step===0||step===4) tone(musicBus,t,N(ch[0]),0.4,0.2,'triangle'); if (step%2===0) marimba(t, N(mel[bar][(step/2)%4]), 0.16); }
    master.gain.setValueAtTime(gains.master, startAt+T_TOTAL-0.8); master.gain.linearRampToValueAtTime(0.0001, startAt+T_TOTAL);
    const vs = cv.captureStream(0); const vtrack = vs.getVideoTracks()[0];
    const rec = new MediaRecorder(new MediaStream([vtrack, ...dest.stream.getAudioTracks()]), {mimeType: 'video/mp4;codecs=avc1.640028,mp4a.40.2', videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 160_000});
    const chunks=[]; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    const done = new Promise(r => rec.onstop = r);
    draw(0); rec.start(500); vtrack.requestFrame();
    while (actx.currentTime < startAt) await new Promise(r=>setTimeout(r,2));
    let frames=0;
    await new Promise(resolve => { const tick = () => { const t = actx.currentTime - startAt; draw(t); vtrack.requestFrame(); frames++; window.__prog=t;
      if (t < T_TOTAL) setTimeout(tick, Math.max(0, (frames+1)/FPS - t)*1000); else resolve(); }; tick(); });
    rec.stop(); await done;
    const blob = new Blob(chunks, {type:'video/mp4'}); const buf = new Uint8Array(await blob.arrayBuffer()); let bin=''; for (let i=0;i<buf.length;i+=0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i,i+0x8000));
    window.__res = {b64: btoa(bin), size: buf.length, frames};
  })().catch(e => window.__err = String(e && e.stack || e)); }, {once: true});
  return 'armed';
};
