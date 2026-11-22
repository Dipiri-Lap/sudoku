#!/usr/bin/env node
/**
 * 텃밭 3매치 효과음을 일레븐랩스(Sound Effects)로 만든다.
 *
 *   ELEVENLABS_API_KEY=... node scripts/gen-jewel-sfx.mjs            # 없는 것만 만든다
 *   ELEVENLABS_API_KEY=... node scripts/gen-jewel-sfx.mjs boom pop   # 골라서 다시 만든다
 *
 * 결과는 public/assets/3match/sfx/{이름}.mp3. 게임(ui/sound.ts)은 이 파일이 있으면 합성음 대신 쓴다.
 * 키는 환경 변수로만 받는다 - 파일에 적지 않는다.
 */
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) {
  console.error('ELEVENLABS_API_KEY 환경 변수가 없습니다.');
  process.exit(1);
}

const OUT = path.resolve('public/assets/3match/sfx');
fs.mkdirSync(OUT, { recursive: true });

// 이름: [설명, 길이(초)]. 짧고 또렷하게 - 캐주얼 모바일 퍼즐 게임 효과음
const SFX = {
  swap: ['quick soft airy whoosh, casual mobile puzzle game tile swap', 0.5],
  invalid: ['short cartoon boing bounce back, gentle, casual puzzle game wrong move', 0.6],
  pop: ['single juicy crisp vegetable pop with a tiny water splash, bright and satisfying, casual match-3 game', 0.5],
  land: ['very soft muted thud of a small fruit landing on soil', 0.5],
  spawn: ['short magical sparkle chime, power-up created, casual mobile game', 0.7],
  merge: ['magical whoosh that swirls into a bright pop, two power-ups merging, casual mobile game', 1.0],
  clash: ['two small metal garden shovels clanging together, bright metallic ring', 1.0],
  dig: ['fast shovel scraping and digging through soft garden dirt, quick swoosh', 0.7],
  stick: ['shovel stabbing firmly into the ground, solid earthy thunk', 0.5],
  fuse: ['short sizzling lit fuse crackle, cartoon bomb about to explode', 0.8],
  boom: ['punchy cartoon explosion of a fertilizer sack, deep satisfying boom with dirt burst, not scary', 1.2],
  acornLaunch: ['cute springy boing of an acorn bouncing up into the air', 0.5],
  acornHit: ['crisp wooden knock tok, acorn hitting a block, satisfying', 0.5],
  chime: ['bright magical rising chime, rainbow flower blooming, sparkly', 1.0],
  petal: ['single soft glassy magical ding, sparkle', 0.5],
  morph: ['tiny magical pop with sparkle, item transforming', 0.5],
  chirp: ['two quick cheerful swallow bird chirps', 0.6],
  ribbit: ['cute cartoon frog ribbit', 0.6],
  win: ['short cheerful victory jingle with bells and sparkles, casual mobile puzzle level complete', 2.0],
  lose: ['short gentle descending sad jingle, soft, casual mobile puzzle level failed', 1.6],
};

const pick = process.argv.slice(2);
const names = pick.length > 0 ? pick : Object.keys(SFX);

for (const name of names) {
  const spec = SFX[name];
  if (!spec) {
    console.log(`  ${name}: 모르는 이름`);
    continue;
  }
  const file = path.join(OUT, `${name}.mp3`);
  if (pick.length === 0 && fs.existsSync(file)) {
    console.log(`  ${name}: 이미 있음(건너뜀)`);
    continue;
  }
  const [text, duration] = spec;
  const res = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, duration_seconds: duration, prompt_influence: 0.5 }),
  });
  if (!res.ok) {
    console.log(`  ${name}: 실패 ${res.status} ${(await res.text()).slice(0, 200)}`);
    continue;
  }
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  console.log(`  ${name}: 완료`);
}
