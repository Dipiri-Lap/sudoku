// RULE: after scheduling/rescheduling/deleting any post, update C:\Projects\puzzles\SCHEDULE.md.
// Aside REPL helpers for Puzzle Garden shorts. Load with:
//   eval(await fs.readFile('C:\\Projects\\puzzles\\shorts\\helpers.js','utf8'))
// Requires globals from the Aside REPL: openTab, closeTab, snapshot, sleep, fs, path, fetch, Buffer.
// Plan item shape: {dA:'2026-11-04', stage:170, title:'...', emoji:'🐱', kw:'고양이', slot:'A'|'B', file}
//   slot A: YouTube 12:00, Instagram/Clip 08:00. slot B: all 19:00.

globalThis.stBase = 'https://images.tmhub.co.kr/spot-the-difference/stages/0001-0500/';
globalThis.ART = 'C:\\Users\\coolguy\\.aside\\u\\0\\sessions\\2026-10-27_oFvluJWir7KY0Gaa\\artifacts';
globalThis.YT_CH = 'UCSlQpyX-jPTDqsUPoSJ5fbw';

globalThis.loadRenderers = async () => {
  const src = await fs.readFile('C:\\Projects\\puzzles\\shorts\\renderer.js', 'utf8');
  const a = src.indexOf('export const shortsRenderer = '), b = src.indexOf('export const halloweenRenderer = ');
  globalThis.shortsRenderer = eval('(' + src.slice(a + 'export const shortsRenderer = '.length, b).trim().replace(/;\s*$/, '') + ')');
  globalThis.halloweenRenderer = eval('(' + src.slice(b + 'export const halloweenRenderer = '.length).trim().replace(/;\s*$/, '') + ')');
};

globalThis.renderShort = async (renderer, stage, outName, title, winners = [], style = null) => {
  const toData = async f => 'data:image/jpeg;base64,' + Buffer.from(await (await fetch(stBase + f)).arrayBuffer()).toString('base64');
  const diffs = JSON.parse(await (await fetch(stBase + stage + '.json')).text()).differences;
  const a = await toData(stage + '.jpg'), b = await toData(stage + '_1.jpg');
  const tab = await openTab('https://puzzles.tmhub.co.kr/robots.txt');
  await tab.evaluate(renderer, {a, b, diffs, stage, gains: {master: 2.6, music: 1.0, sfx: 1.3}, title, winners, style});
  await tab.locator('#go').click();
  for (let i = 0; i < 40; i++) { await sleep(2500); const st = await tab.evaluate(() => ({done: !!window.__res, err: window.__err})); if (st.err) throw new Error(st.err); if (st.done) break; }
  const len = await tab.evaluate(() => window.__res.b64.length);
  let s = ''; for (let off = 0; off < len; off += 4_000_000) s += await tab.evaluate(([o]) => window.__res.b64.slice(o, o + 4_000_000), [off]);
  const out = path.join(ART, outName);
  await fs.writeFile(out, Buffer.from(s, 'base64'));
  await closeTab(tab);
  return {out, size: (await fs.stat(out)).size};
};

// ---------- text ----------
globalThis.ytTitleW = p => `5개 찾으면 천재 🧠 ${p.title} | 30초 틀린그림찾기 #shorts`;
globalThis.ytDescW = p => `30초 안에 다른 곳 5개를 모두 찾아보세요! (처음 1초에 힌트 하나 있어요)
몇 개 찾으셨는지 댓글로 알려주세요. 다 찾으신 분은 "5개"!

이벤트: "5개" 댓글을 남겨주신 분 중 몇 분의 닉네임을 다음 영상에서 소개해 드려요.

더 많은 틀린그림찾기와 두뇌 퍼즐은 퍼즐 가든에서 무료로 즐길 수 있어요.
https://puzzles.tmhub.co.kr/snapspot

#${p.kw.replace(/\s/g, '')} #틀린그림찾기 #다른그림찾기 #두뇌운동 #퍼즐가든 #spotthedifference`;
globalThis.igCapW = p => `${p.emoji} ${p.title}
30초 안에 5개 다 찾으면 눈썰미 천재!

저는 4개까지 찾았어요 😅 여러분은 몇 개 찾으셨어요? 댓글로 알려주세요!
"5개" 댓글 남겨주시면 다음 영상에서 닉네임을 소개해 드려요.

더 많은 틀린그림찾기는 설치 없이 퍼즐 가든에서 바로 플레이할 수 있어요.
puzzles.tmhub.co.kr

#${p.kw.replace(/\s/g, '')} #틀린그림찾기 #다른그림찾기 #두뇌운동 #퍼즐가든 #spotthedifference #brainteaser #집중력`;
globalThis.ncDescW = p => `${p.kw} 틀린그림찾기 | ${p.emoji} ${p.title}
30초 안에 5개 다 찾으면 눈썰미 천재!
저는 4개까지 찾았어요. 여러분은 몇 개? "5개" 댓글 남기면 다음 영상에서 닉네임 소개해 드려요!
더 많은 틀린그림찾기는 네이버에서 '퍼즐 가든' 검색!
#${p.kw.replace(/\s/g, '')} #틀린그림찾기 #두뇌운동 #퍼즐가든 #집중력`;
globalThis.slotHour = (p, platform) => p.slot === 'B' ? 19 : (platform === 'yt' ? 12 : 8);

// ---------- YouTube ----------
globalThis.ytSchedule = async (p) => {
  await yt.goto(`https://studio.youtube.com/channel/${YT_CH}`); await sleep(3000);
  await snapshot(yt, {interactive: true});
  await yt.getByRole('button', {name: '동영상 업로드'}).first().click(); await sleep(1500);
  await yt.locator('input[type=file]').first().setInputFiles(path.join(ART, p.file));
  for (let i = 0; i < 25; i++) { await sleep(1000); if (await yt.locator('#title-textarea #textbox').count()) break; }
  await sleep(1500);
  await yt.locator('#title-textarea #textbox').first().click(); await yt.keyboard.press('Control+A'); await yt.keyboard.press('Delete'); await yt.keyboard.insertText(ytTitleW(p));
  await yt.locator('#description-textarea #textbox').first().click(); await yt.keyboard.insertText(ytDescW(p));
  await yt.locator('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]').click(); await sleep(500);
  for (let i = 0; i < 3; i++) { await yt.locator('#next-button').click(); await sleep(1200); }
  await yt.getByRole('button', {name: 'Click to expand'}).last().click(); await sleep(900);
  await yt.locator('ytcp-visibility-scheduler #datepicker-trigger').first().click(); await sleep(800);
  const [Y, M, D] = p.date.split('-').map(Number);
  await yt.locator('ytcp-date-picker tp-yt-paper-input input, ytcp-date-picker input').first().fill(`${Y}. ${M}. ${D}.`); await yt.keyboard.press('Enter'); await sleep(800);
  await yt.mouse.click(5, 300); await sleep(400);
  const hh = slotHour(p, 'yt'); const tstr = hh < 12 ? `오전 ${hh}:00` : `오후 ${hh === 12 ? 12 : hh - 12}:00`;
  const tInp = yt.locator('ytcp-visibility-scheduler input').first();
  await tInp.click(); await sleep(300); await tInp.fill(tstr); await yt.keyboard.press('Enter'); await sleep(800);
  await yt.mouse.click(5, 300); await sleep(300);
  const dateShown = (await yt.evaluate(() => document.querySelector('ytcp-visibility-scheduler #datepicker-trigger')?.innerText || '')).trim();
  const timeShown = await yt.evaluate(() => document.querySelector('ytcp-visibility-scheduler input')?.value);
  if (dateShown !== `${Y}. ${M}. ${D}.` || timeShown !== tstr) return {ok: false, dateShown, timeShown};
  await yt.locator('ytcp-uploads-dialog #done-button').click(); await sleep(3500);
  const cb = yt.locator('ytcp-video-share-dialog #close-button, ytcp-uploads-still-processing-dialog #close-button');
  if (await cb.count()) await cb.first().click().catch(() => {});
  return {ok: true, dateShown, timeShown};
};

// ---------- Instagram ----------
globalThis.igHead = async () => { const s = await snapshot(ig, {interactive: true}); return (s.tree.match(/dialog "([^"]+)"/) || [])[1] + ' / ' + (s.tree.match(/heading "([^"]+)" \[level=1\]/) || [])[1]; };
globalThis.igWaitHead = async (re, n = 25) => { for (let i = 0; i < n; i++) { const h = await igHead(); if (re.test(h)) return h; await sleep(1000); } return null; };
globalThis.igClickNext = async () => { const s = await snapshot(ig, {interactive: true}); const m = [...s.tree.matchAll(/button "다음" \[ref=(e\d+)\]/g)].pop(); if (!m) return false; await ig.locator(m[1]).click(); return true; };
globalThis.igWho = async () => { await ig.goto('https://www.instagram.com/accounts/edit/'); await sleep(2500); return await ig.evaluate(() => [...document.querySelectorAll('img[alt$="님의 프로필 사진"]')].map(i => i.alt)[0] || ''); };
globalThis.igSwitchPuzzle = async () => {
  await ig.goto('https://www.instagram.com/'); await sleep(3000);
  const mo = await snapshot(ig, {interactive: true});
  const r = mo.tree.match(/link \[ref=(e\d+)\]:\n\s+- img "설정"/) || mo.tree.match(/link \[ref=(e\d+)\]:\n\s+- img "더 보기"/);
  await ig.locator(r[1]).click(); await sleep(1000);
  await ig.getByRole('button', {name: '계정 전환'}).click(); await sleep(1500);
  const s = await snapshot(ig, {selector: '[role="dialog"]', interactive: true});
  const b = s.tree.match(/button \[ref=(e\d+)\]:\n\s+- link "puzzlesgarden님의 프로필 사진"/);
  if (b) { await ig.locator(b[1]).click(); await sleep(5000); }
  return await igWho();
};
globalThis.igOne = async (p) => {
  if (!/puzzlesgarden/.test(await igWho())) { const w = await igSwitchPuzzle(); if (!/puzzlesgarden/.test(w)) return {ok: false, step: 'account'}; }
  await ig.goto('https://www.instagram.com/puzzlesgarden/'); await sleep(3000);
  await ig.locator('svg[aria-label="새로운 게시물"]').first().click(); await sleep(1500);
  if (await ig.locator('[role="dialog"] input[type=file]').count() === 0) { const pi = ig.getByText('게시물', {exact: true}); if (await pi.count()) { await pi.first().click().catch(() => {}); await sleep(1200); } }
  await ig.locator('[role="dialog"] input[type=file]').first().setInputFiles(path.join(ART, p.file));
  let cropped = false;
  for (let k = 0; k < 30; k++) {
    if (await ig.locator('[role="dialog"] [aria-label="캡션 추가..."]').count()) break;
    const h = await igHead();
    const notice = ig.getByRole('button', {name: '확인'});
    if (/이제 동영상|릴스로 공유/.test(h) || (await notice.count() && !/자르기|편집/.test(h))) { await notice.first().click().catch(() => {}); await sleep(1000); continue; }
    if (/자르기/.test(h)) {
      if (!cropped) {
        await ig.locator('svg[aria-label="자르기 선택"]').first().click().catch(() => {}); await sleep(700);
        const s0 = await snapshot(ig, {selector: '[role="dialog"]', interactive: true});
        const mo = s0.tree.match(/button \[ref=(e\d+)\]:\n\s+- text: "원본"/);
        if (mo) { await ig.locator(mo[1]).click(); await sleep(600); }
        cropped = true;
      }
      await igClickNext(); await sleep(2500); continue;
    }
    if (/편집/.test(h)) { await igClickNext(); await sleep(2500); continue; }
    await sleep(1500);
  }
  await ig.locator('[role="dialog"] [aria-label="캡션 추가..."]').first().click(); await ig.keyboard.insertText(igCapW(p)); await sleep(500);
  const s1 = await snapshot(ig, {selector: '[role="dialog"]', interactive: true});
  if (!/puzzlesgarden/.test(s1.tree)) return {ok: false, step: 'account in dialog'};
  const m = s1.tree.match(/text: "콘텐츠 예약"\n\s+- switch \[ref=(e\d+)\]/);
  if (!m) return {ok: false, step: 'switch'};
  await ig.locator(m[1]).click(); await sleep(1000);
  const s2 = await snapshot(ig, {selector: '[role="dialog"]', interactive: true});
  await ig.locator(s2.tree.match(/text: "날짜"\n\s+- button \[ref=(e\d+)\]/)[1]).click(); await sleep(800);
  const [Y, M, D] = p.date.split('-').map(Number);
  for (let k = 0; k < 3; k++) { const hdr = await ig.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].pop(); return d.innerText.match(/(\d{4})년 (\d+)월/); }); if (hdr && Number(hdr[2]) === M) break; await ig.getByRole('button', {name: 'Next month'}).click(); await sleep(500); }
  const s3 = await snapshot(ig, {interactive: true});
  const mg = s3.tree.match(new RegExp(`gridcell "${D}" \\[ref=(e\\d+)\\](?! \\[disabled\\])`));
  if (!mg) return {ok: false, step: 'day'};
  await ig.locator(mg[1]).click(); await sleep(600);
  const hh = slotHour(p, 'ig'); const h12 = hh % 12 === 0 ? 12 : hh % 12; const ap = hh < 12 ? 'A' : 'P';
  const sp = await snapshot(ig, {selector: '[role="dialog"]', interactive: true});
  await ig.locator(sp.tree.match(/spinbutton "Hours" \[ref=(e\d+)\]/)[1]).click(); await ig.keyboard.type(String(h12).padStart(2, '0'));
  await ig.locator(sp.tree.match(/spinbutton "Minutes" \[ref=(e\d+)\]/)[1]).click(); await ig.keyboard.type('00');
  await ig.locator(sp.tree.match(/spinbutton "AM PM" \[ref=(e\d+)\]/)[1]).click(); await ig.keyboard.type(ap);
  await sleep(600);
  const shown = await ig.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find(x => /콘텐츠 예약/.test(x.innerText)); const t = d.innerText; const i = t.indexOf('날짜'); return t.slice(i, i + 40).replace(/\s+/g, ' '); });
  const expect = `${Y}년 ${M}월 ${D}일`, expT = `${String(h12).padStart(2, '0')} : 00 ${hh < 12 ? 'AM' : 'PM'}`;
  if (!shown.includes(expect) || !shown.includes(expT)) return {ok: false, step: 'verify', shown};
  await ig.getByRole('button', {name: '예약', exact: true}).first().click();
  for (let i = 0; i < 30; i++) { await sleep(3000); const t = await ig.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].map(d => d.innerText).join(' ')); if (/예약되었습니다/.test(t)) { await ig.getByRole('button', {name: '완료'}).first().click().catch(() => {}); return {ok: true, shown}; } }
  return {ok: false, step: 'submit'};
};

// ---------- Naver Clip ----------
globalThis.ncSchedule = async (p) => {
  await nc.goto('https://clipcreators.naver.com/web/upload'); await sleep(2500);
  await nc.locator('input[type=file]').setInputFiles(path.join(ART, p.file));
  for (let i = 0; i < 25; i++) { await sleep(1000); if (/draft/.test(nc.url())) break; }
  await sleep(2000);
  await nc.locator('[placeholder="경험을 기록해보세요."]').first().click();
  await nc.keyboard.insertText(ncDescW(p));
  await nc.getByRole('button', {name: '1차 카테고리'}).click(); await sleep(500);
  await nc.getByRole('button', {name: '게임', exact: true}).first().click(); await sleep(500);
  await nc.getByRole('button', {name: '2차 카테고리'}).click(); await sleep(500);
  const s = await snapshot(nc, {interactive: true});
  await nc.locator(s.tree.match(/button "2차 카테고리" \[ref=e\d+\][^\n]*\n\s+- button "게임" \[ref=(e\d+)\]/)[1]).click(); await sleep(500);
  let ok = false; for (let i = 0; i < 40; i++) { const sc = await snapshot(nc, {interactive: true}); const cm = sc.tree.match(/button "커버 1" \[ref=(e\d+)\]/); if (cm) { await nc.locator(cm[1]).click(); ok = true; break; } await sleep(1500); }
  if (!ok) return {ok: false, step: 'cover'};
  await sleep(400);
  const sc2 = await snapshot(nc, {interactive: true});
  await nc.locator(sc2.tree.match(/checkbox "공개 예약" \[ref=(e\d+)\]/)[1]).click(); await sleep(800);
  const [Y, M, D] = p.date.split('-').map(Number);
  await nc.locator('button').filter({hasText: /^2026\.\d+\.\d+$/}).first().click(); await sleep(800);
  for (let k = 0; k < 2; k++) { const hdr = await nc.evaluate(() => (document.querySelector('[role="grid"]')?.getAttribute('aria-label')) || ''); if (hdr.startsWith(`${M}월`)) break; await nc.getByRole('button', {name: '다음월'}).click(); await sleep(500); }
  const s3 = await snapshot(nc, {interactive: true});
  const dm = s3.tree.match(new RegExp(`button "(?:Today, )?${Y}년 ${M}월 ${D}일 [^"]*" \\[ref=(e\\d+)\\]`));
  if (!dm) return {ok: false, step: 'day'};
  await nc.locator(dm[1]).click(); await sleep(400);
  await nc.getByRole('button', {name: '저장', exact: true}).click(); await sleep(600);
  const hh = String(slotHour(p, 'nc')).padStart(2, '0');
  const s4 = await snapshot(nc, {interactive: true});
  await nc.locator(s4.tree.match(/button "시간" \[ref=(e\d+)\]/)[1]).click(); await sleep(500);
  const s5 = await snapshot(nc, {interactive: true});
  await nc.locator(s5.tree.match(new RegExp(`option "${hh}" \\[ref=(e\\d+)\\]`))[1]).click(); await sleep(500);
  const s6 = await snapshot(nc, {interactive: true});
  const shownD = (s6.tree.match(/button "(2026\.\d+\.\d+)"/) || [])[1], shownH = (s6.tree.match(/button "시간" \[ref=e\d+\][^:]*: "(\d+)"/) || [])[1];
  const want = `${Y}.${String(M).padStart(2, '0')}.${String(D).padStart(2, '0')}`;
  if (shownD !== want || shownH !== hh) return {ok: false, step: 'verify', shownD, shownH};
  await nc.getByRole('button', {name: '등록', exact: true}).click(); await sleep(3000);
  const t = await nc.evaluate(() => document.querySelector('[role="dialog"]')?.innerText || '');
  if (/공개될 예정/.test(t)) { await nc.getByRole('button', {name: '확인'}).click().catch(() => {}); return {ok: true, msg: t.replace(/\s+/g, ' ').slice(6, 40)}; }
  return {ok: false, step: 'register', t: t.slice(0, 100)};
};

// ---------- runners (one item per call to stay under REPL time limit) ----------
globalThis.doneMap = globalThis.doneMap || {yt: {}, ig: {}, nc: {}, render: {}};
globalThis.nextFor = async (platform, fn) => {
  const p = weekPlan.find(q => !doneMap[platform][q.stage]); if (!p) return platform + ' all done';
  doneMap[platform][p.stage] = 'trying';
  let r; try { r = await fn(p); } catch (e) { r = {ok: false, err: String(e.message).slice(0, 120)}; }
  if (r.ok) doneMap[platform][p.stage] = true; else delete doneMap[platform][p.stage];
  return `${platform} ${p.stage} ${p.title} ${JSON.stringify(r)}`;
};
