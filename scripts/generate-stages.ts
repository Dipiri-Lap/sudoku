import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generatePuzzles, type Difficulty } from '../src/engine/generator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 레벨별 난이도 결정 규칙:
 * - 1레벨: 입문 (Very Easy)
 * - 2~5레벨: 쉬움, 초급, 보통, 어려움
 * - 6레벨~: 5개 사이클 (쉬움, 초급, 보통, 보통, 어려움)
 *   - 25의 배수: 어려움 → 고급 (Expert)
 *   - 100의 배수: 고급 → 전문가 (Master)
 */
function getLevelDifficulty(level: number): Difficulty {
    if (level === 1) return 'Very Easy'; // 입문

    if (level <= 5) {
        const map: Difficulty[] = ['Easy', 'Beginner', 'Medium', 'Hard'];
        return map[level - 2];
    }

    const pos = (level - 6) % 5; // 0=쉬움, 1=초급, 2=보통, 3=보통, 4=어려움/고급/전문가

    if (pos === 4) {
        if (level % 100 === 0) return 'Master';  // 전문가
        if (level % 25 === 0) return 'Expert';   // 고급
        return 'Hard';                            // 어려움
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
    const TARGET = 500;
    const dataDir = path.join(__dirname, '../src/data');
    const outputPath = path.join(dataDir, 'stages.json');

    const stages: Stage[] = [];
    const seenPuzzles = new Set<string>();

    console.log(`Generating ${TARGET} stages with new difficulty pattern...`);

    for (let level = 1; level <= TARGET; level++) {
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
