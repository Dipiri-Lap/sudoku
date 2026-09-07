import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generatePuzzles, type Difficulty } from '../src/engine/generator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 오늘의 퍼즐 전용 문제 생성기.
 *
 * 스테이지 문제를 재사용하지 않는 이유:
 * - 스테이지는 레벨이 오를수록 어려워지는 곡선이지만, 데일리는 매일 비슷한
 *   시간에 끝나야 습관이 붙는다.
 * - 전 유저가 같은 문제를 푼다는 전제가 깨지면(이미 푼 사람이 답을 앎)
 *   기록 비교/랭킹이 의미를 잃는다.
 * - 스테이지 풀을 하루 한 개씩 태우면 컨텐츠가 고갈된다.
 *
 * 사용법: npm run generate-daily -- 2026-09 [--from 2026-09-07]
 */

interface DailyPuzzle {
    date: string;          // YYYY-MM-DD
    difficulty: Difficulty;
    board: (number | null)[][];
    solution: number[][];
}

/** v1은 중간 난이도 고정. 요일별 변주를 넣게 되면 여기만 고치면 된다. */
function getDailyDifficulty(_date: string): Difficulty {
    return 'Medium';
}

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

function daysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

function parseArgs() {
    const args = process.argv.slice(2);
    const monthArg = args.find(a => /^\d{4}-\d{2}$/.test(a));
    const fromIdx = args.indexOf('--from');
    const from = fromIdx >= 0 ? args[fromIdx + 1] : undefined;
    if (!monthArg) {
        console.error('Usage: npm run generate-daily -- YYYY-MM [--from YYYY-MM-DD]');
        process.exit(1);
    }
    return { month: monthArg, from };
}

function main() {
    const { month, from } = parseArgs();
    const [year, mon] = month.split('-').map(Number);

    const outDir = path.join(__dirname, '../src/data/daily');
    const outputPath = path.join(outDir, `${month}.json`);

    // 이미 배포된 날짜의 문제를 바꾸면 캘린더 기록과 어긋나므로,
    // 기존 파일이 있으면 그 날짜들은 그대로 두고 없는 날짜만 채운다.
    let puzzles: DailyPuzzle[] = [];
    if (fs.existsSync(outputPath)) {
        puzzles = JSON.parse(fs.readFileSync(outputPath, 'utf-8')) as DailyPuzzle[];
        console.log(`Loaded ${puzzles.length} existing puzzles from ${month}.json`);
    }
    const existing = new Set(puzzles.map(p => p.date));

    // 같은 문제가 두 번 나오지 않도록 전체 데일리 풀을 훑는다.
    const seen = new Set<string>();
    if (fs.existsSync(outDir)) {
        for (const f of fs.readdirSync(outDir)) {
            if (!f.endsWith('.json')) continue;
            const list = JSON.parse(fs.readFileSync(path.join(outDir, f), 'utf-8')) as DailyPuzzle[];
            for (const p of list) {
                seen.add(p.board.flat().map(v => v === null ? '0' : v).join(''));
            }
        }
    }

    const total = daysInMonth(year, mon);
    const startDay = from ? Number(from.split('-')[2]) : 1;

    for (let day = startDay; day <= total; day++) {
        const date = `${year}-${pad(mon)}-${pad(day)}`;
        if (existing.has(date)) continue;

        const difficulty = getDailyDifficulty(date);

        let data: { puzzle: (number | null)[][]; solution: number[][] };
        let key: string;
        do {
            const generated = generatePuzzles(difficulty);
            data = { puzzle: generated.puzzle, solution: generated.solution as number[][] };
            key = data.puzzle.flat().map(v => v === null ? '0' : v).join('');
        } while (seen.has(key));

        seen.add(key);
        puzzles.push({ date, difficulty, board: data.puzzle, solution: data.solution });
        console.log(`  ${date}: ${difficulty}`);
    }

    puzzles.sort((a, b) => a.date.localeCompare(b.date));

    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(puzzles, null, 2));
    console.log(`\nDone! ${puzzles.length} daily puzzles saved to ${outputPath}`);
}

main();
