import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generatePuzzles, type Difficulty } from '../src/engine/generator';
import { rateSudoku } from '../src/engine/rater';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 레벨별 난이도 결정 규칙:
 * [1~500]
 * - 1레벨: 입문 (Very Easy)
 * - 2~5레벨: 쉬움, 초급, 보통, 어려움
 * - 6레벨~: 5개 사이클 (쉬움, 초급, 보통, 보통, 어려움)
 *   - 25의 배수: 어려움 → 고급 (Expert)
 *   - 100의 배수: 고급 → 전문가 (Master)
 * [501~1000]
 * - 5개 사이클: 쉬움, 쉬움, 보통, 보통, 어려움
 * - 50의 배수: Expert
 * - 1000: Master
 */
function getLevelDifficulty(level: number): Difficulty {
    // 501~1000 구간
    if (level >= 501 && level <= 1000) {
        if (level === 1000) return 'Master';
        if (level % 50 === 0) return 'Expert';
        const pos = (level - 501) % 5; // 0=Easy, 1=Easy, 2=Medium, 3=Medium, 4=Hard
        if (pos === 0 || pos === 1) return 'Easy';
        if (pos === 2 || pos === 3) return 'Medium';
        return 'Hard';
    }

    // 1~500 구간 (기존 로직)
    if (level === 1) return 'Very Easy';

    if (level <= 5) {
        const map: Difficulty[] = ['Easy', 'Beginner', 'Medium', 'Hard'];
        return map[level - 2];
    }

    const pos = (level - 6) % 5;

    if (pos === 4) {
        if (level % 100 === 0) return 'Master';
        if (level % 25 === 0) return 'Expert';
        return 'Hard';
    }

    const map: Difficulty[] = ['Easy', 'Beginner', 'Medium', 'Medium'];
    return map[pos];
}


/**
 * [1001~2000] 기법 단계(T1~T5) 기반 난이도.
 * 단서 개수가 아니라 rateSudoku()로 "반드시 필요한 기법"을 채점해 맞춘다.
 *   T1 싱글만·단서 45~50 (Easy)   T2 싱글만·단서 30~36 (Medium)
 *   T3 교차 후보 제거 (Hard)       T4 페어/트리플 (Expert)       T5 X-wing (Master)
 * 구간마다 10판 패턴을 반복하고, 50의 배수 판은 구간별 보스 단계로 덮어쓴다.
 */
type Tier = 1 | 2 | 3 | 4 | 5;
const T: Record<Tier, Difficulty> = { 1: 'Easy', 2: 'Medium', 3: 'Hard', 4: 'Expert', 5: 'Master' };
/** 기획 단계 → rateSudoku() 단계 (1 싱글, 2 교차, 3 페어/트리플, 4 X-wing). T1·T2는 둘 다 싱글만, 단서 수로 구분 */
const RATER_TIER: Record<Tier, number> = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 4 };

const TIER_PHASES: { from: number; to: number; pattern: Tier[]; boss: Tier }[] = [
    { from: 1001, to: 1100, pattern: [1, 1, 2, 1, 1, 2, 1, 2, 1, 3], boss: 3 }, // 적응
    { from: 1101, to: 1250, pattern: [1, 1, 2, 1, 2, 2, 3, 1, 2, 3], boss: 3 }, // 교차 기법 정착
    { from: 1251, to: 1500, pattern: [1, 2, 2, 3, 1, 2, 3, 3, 2, 4], boss: 4 },
    { from: 1501, to: 1750, pattern: [1, 2, 3, 2, 3, 4, 1, 3, 4, 3], boss: 4 },
    { from: 1751, to: 2000, pattern: [1, 2, 3, 4, 2, 3, 4, 1, 3, 4], boss: 5 },
];

export function getLevelTier(level: number): Tier {
    const ph = TIER_PHASES.find(p => level >= p.from && level <= p.to);
    if (!ph) throw new Error(`no tier phase for level ${level}`);
    if (level % 50 === 0) return ph.boss;
    return ph.pattern[(level - 1001) % 10];
}

/** 단계별 허용 단서 수 [min, max]. 1001~1100의 첫 T3는 단서를 넉넉하게 준다. */
export function givensRange(level: number, tier: Tier): [number, number] {
    if (tier === 3 && level <= 1100) return [32, 34];
    return ({ 1: [45, 50], 2: [30, 36], 3: [28, 34], 4: [26, 32], 5: [24, 28] } as Record<Tier, [number, number]>)[tier];
}

// ── 빠른 해 개수 세기(비트마스크, 2개에서 멈춤) ──
const ROW = (c: number) => Math.floor(c / 9), COL = (c: number) => c % 9;
const BOX = (c: number) => Math.floor(ROW(c) / 3) * 3 + Math.floor(COL(c) / 3);
function countSolutionsFast(cells: number[]): number {
    const r = new Array(9).fill(0), co = new Array(9).fill(0), b = new Array(9).fill(0);
    const v = [...cells];
    for (let c = 0; c < 81; c++) if (v[c]) { const m = 1 << v[c]; r[ROW(c)] |= m; co[COL(c)] |= m; b[BOX(c)] |= m; }
    let count = 0;
    const rec = (): void => {
        let best = -1, bestMask = 0, bestN = 10;
        for (let c = 0; c < 81; c++) {
            if (v[c]) continue;
            const mask = ~(r[ROW(c)] | co[COL(c)] | b[BOX(c)]) & 0x3fe;
            let n = 0; for (let x = mask; x; x &= x - 1) n++;
            if (n < bestN) { best = c; bestMask = mask; bestN = n; if (n <= 1) break; }
        }
        if (best < 0) { count++; return; }
        for (let d = 1; d <= 9 && count < 2; d++) {
            const m = 1 << d;
            if (!(bestMask & m)) continue;
            v[best] = d; r[ROW(best)] |= m; co[COL(best)] |= m; b[BOX(best)] |= m;
            rec();
            v[best] = 0; r[ROW(best)] &= ~m; co[COL(best)] &= ~m; b[BOX(best)] &= ~m;
        }
    };
    rec();
    return count;
}

const toGrid = (cells: number[]) => Array.from({ length: 9 }, (_, i) => cells.slice(i * 9, i * 9 + 9).map(x => x || null));

/**
 * 완성판에서 칸을 하나씩 지워 가며(정답 유일 유지) 단서가 범위 안에 들어오면 매번 채점한다.
 * 목표 단계가 나오면 채택, 목표보다 어려워지면 그 판은 버리고 새로 시작한다.
 */
export function generateTiered(tier: Tier, [lo, hi]: [number, number]) {
    const want = RATER_TIER[tier];
    for (;;) {
        const { solution } = generatePuzzles('Easy', 81);
        const sol = (solution as number[][]).flat();
        const cells = [...sol];
        const order = [...Array(81).keys()].sort(() => Math.random() - 0.5);
        let givens = 81;
        for (const c of order) {
            if (givens <= lo) break;
            const bak = cells[c];
            cells[c] = 0;
            if (countSolutionsFast(cells) !== 1) { cells[c] = bak; continue; }
            givens--;
            if (givens > hi) continue;
            const { tier: got, steps } = rateSudoku(toGrid(cells));
            if (got === want) return { puzzle: toGrid(cells), solution: solution as number[][], givens, steps };
            if (got > want) break; // 목표보다 어려워짐 → 새 판으로
        }
    }
}

interface Stage {
    id: number;
    difficulty: Difficulty;
    board: (number | null)[][];
    solution: number[][];
}

async function main() {
    const TARGET = Number(process.env.TARGET ?? 2000);
    const dataDir = path.join(__dirname, '../src/data');
    const outputPath = path.join(dataDir, 'stages.json');

    // 기존 스테이지 로드 (있으면)
    let stages: Stage[] = [];
    if (fs.existsSync(outputPath)) {
        stages = JSON.parse(fs.readFileSync(outputPath, 'utf-8')) as Stage[];
        console.log(`Loaded ${stages.length} existing stages.`);
    }

    const startLevel = stages.length + 1;
    if (startLevel > TARGET) {
        console.log('All stages already generated.');
        return;
    }

    const seenPuzzles = new Set<string>(
        stages.map(s => s.board.flat().map(v => v === null ? '0' : v).join(''))
    );

    console.log(`Generating stages ${startLevel}~${TARGET}...`);

    for (let level = startLevel; level <= TARGET; level++) {
        if (level > 1000) {
            const tier = getLevelTier(level);
            const range = givensRange(level, tier);
            // 최종판(2000)은 T5 후보 여러 개 중 X-wing을 가장 많이 쓰고 단서가 가장 적은 판
            const tries = level === 2000 ? 40 : 1;
            let best: ReturnType<typeof generateTiered> | null = null;
            for (let i = 0; i < tries; i++) {
                const p = generateTiered(tier, range);
                const key = p.puzzle.flat().map(x => x ?? 0).join('');
                if (seenPuzzles.has(key)) { i--; continue; }
                if (!best || p.steps.xwing > best.steps.xwing ||
                    (p.steps.xwing === best.steps.xwing && p.givens < best.givens)) best = p;
            }
            seenPuzzles.add(best!.puzzle.flat().map(x => x ?? 0).join(''));
            stages.push({ id: level, difficulty: T[tier], board: best!.puzzle, solution: best!.solution });
            if (level % 50 === 0 || level === TARGET) {
                console.log(`  ${level}/${TARGET} (T${tier} ${T[tier]}, givens ${best!.givens})`);
                fs.writeFileSync(outputPath, JSON.stringify(stages, null, 2)); // 중간 저장
            }
            continue;
        }

        const difficulty = getLevelDifficulty(level);

        let puzzleData;
        let puzzleKey: string;

        do {
            puzzleData = generatePuzzles(difficulty);
            puzzleKey = puzzleData.puzzle.flat().map(v => v === null ? '0' : v).join('');
        } while (seenPuzzles.has(puzzleKey));

        seenPuzzles.add(puzzleKey);
        stages.push({
            id: level,
            difficulty,
            board: puzzleData.puzzle,
            solution: puzzleData.solution as number[][],
        });

        if (level % 50 === 0 || level === TARGET) {
            console.log(`  ${level}/${TARGET} (level ${level}: ${difficulty})`);
        }
    }

    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(stages, null, 2));
    console.log(`\nDone! ${stages.length} stages saved to ${outputPath}`);

    // 분포 출력
    const dist: Record<string, number> = {};
    stages.forEach(s => { dist[s.difficulty] = (dist[s.difficulty] || 0) + 1; });
    console.log('\nDifficulty distribution:');
    Object.entries(dist).forEach(([d, c]) => console.log(`  ${d}: ${c}`));
}

if (!process.env.NO_MAIN) main().catch(err => {
    console.error('Generation failed:', err);
    process.exit(1);
});
