/**
 * 소리 파일을 배포용으로 다시 인코딩한다.
 *
 *   npm run optimize-audio          변환
 *   npm run optimize-audio -- --dry 무엇이 얼마나 줄어드는지만
 *
 * **파일 이름도 형식도 그대로 둔다.** mp3는 mp3로, wav는 wav로 다시 굽는다.
 * 형식을 바꾸면 코드의 참조 24곳을 전부 손봐야 하는데, 그렇게 해서 더 줄어드는
 * 양은 1MB가 안 된다 - 줄이는 값에 비해 건드릴 곳이 많다.
 *
 * 원본은 `source-assets/audio/` 에 같은 경로 모양으로 둔다. 다시 굽고 싶으면
 * 거기서 시작하면 된다.
 */
import { execFileSync } from 'child_process';
import ffmpeg from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';

const DRY = process.argv.includes('--dry');
const PUBLIC = 'public';
const BACKUP = 'source-assets/audio';

/**
 * 배경음은 길어서 용량의 대부분을 차지하고, 효과음은 짧지만 무압축(wav)이라
 * 낭비가 크다. 둘의 처방이 달라서 나눠 잡는다.
 *
 * 96kbps 모노: 원본이 192kbps 스테레오였으니 절반이다. 게임 배경음은 이 정도면
 * 귀로 구분하기 어렵고, 더 낮추면 심벌즈 같은 고음에서 티가 나기 시작한다.
 */
const RULES = [
  {
    name: '배경음',
    match: /(bgm|wordbgm)[^/\\]*\.mp3$/i,
    args: ['-c:a', 'libmp3lame', '-b:a', '96k', '-ac', '1', '-ar', '44100'],
  },
  {
    name: '효과음(mp3)',
    match: /\.mp3$/i,
    args: ['-c:a', 'libmp3lame', '-b:a', '96k', '-ac', '1', '-ar', '44100'],
  },
  {
    // wav는 무압축이라 채널과 표본율만 줄여도 4분의 1이 된다.
    // 짧은 효과음이라 22kHz로도 충분하다.
    name: '효과음(wav)',
    match: /\.wav$/i,
    args: ['-c:a', 'pcm_s16le', '-ac', '1', '-ar', '22050'],
  },
];

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.(mp3|wav)$/i.test(f)) out.push(p);
  }
  return out;
}

const mb = n => (n / 1048576).toFixed(2) + 'MB';
const files = walk(PUBLIC);

let before = 0;
let after = 0;
const byRule = new Map();

for (const file of files) {
  const rule = RULES.find(r => r.match.test(file.replace(/\\/g, '/')));
  if (!rule) continue;

  const size = fs.statSync(file).size;
  before += size;

  if (DRY) {
    const e = byRule.get(rule.name) ?? { n: 0, before: 0, after: 0 };
    e.n++;
    e.before += size;
    byRule.set(rule.name, e);
    continue;
  }

  // 원본을 먼저 옮겨둔다. 이게 없으면 한 번 줄인 파일을 또 줄이게 되고,
  // 되돌릴 수도 없다.
  const backup = path.join(BACKUP, path.relative(PUBLIC, file));
  if (!fs.existsSync(backup)) {
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.copyFileSync(file, backup);
  }

  const tmp = file + '.tmp' + path.extname(file);
  execFileSync(ffmpeg, ['-y', '-i', backup, ...rule.args, tmp], { stdio: 'ignore' });
  fs.renameSync(tmp, file);

  const now = fs.statSync(file).size;
  after += now;

  const e = byRule.get(rule.name) ?? { n: 0, before: 0, after: 0 };
  e.n++;
  e.before += size;
  e.after += now;
  byRule.set(rule.name, e);
}

for (const [name, e] of byRule) {
  const pct = e.after ? ((1 - e.after / e.before) * 100).toFixed(0) + '% 감소' : '(--dry)';
  console.log(`  ${name.padEnd(12)} ${e.n}개  ${mb(e.before)}${e.after ? ' → ' + mb(e.after) : ''}  ${pct}`);
}
if (!DRY) console.log(`\n합계 ${mb(before)} → ${mb(after)}`);
