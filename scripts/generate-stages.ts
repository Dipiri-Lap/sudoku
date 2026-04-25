import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generatePuzzles, type Difficulty } from '../src/engine/generator';

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

interface Stage {
    id: number;
    difficulty: Difficulty;
    board: (number | null)[][];
    solution: number[][];
}

async function main() {
    const TARGET = 1000;
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

main().catch(err => {
    console.error('Generation failed:', err);
    process.exit(1);
});
