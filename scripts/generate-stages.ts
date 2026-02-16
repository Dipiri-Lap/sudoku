import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generatePuzzles, Difficulty } from '../src/engine/generator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Stage {
    id: number;
    difficulty: Difficulty;
    board: (number | null)[][];
    solution: number[][];
}

async function main() {
    const STAGES_COUNT = 100;
    const stages: Stage[] = [];
    const seenPuzzles = new Set<string>();

    console.log(`Generating ${STAGES_COUNT} unique stages...`);

    for (let i = 1; i <= STAGES_COUNT; i++) {
        // Determine difficulty based on pattern: Easy-Easy-Medium-Medium-Hard
        let difficulty: Difficulty;
        const patternIndex = (i - 1) % 5;

        if (i % 20 === 0) {
            difficulty = 'Expert'; // Boss level every 20 stages
        } else {
            switch (patternIndex) {
                case 0:
                case 1:
                    difficulty = 'Easy';
                    break;
                case 2:
                case 3:
                    difficulty = 'Medium';
                    break;
                default:
                    difficulty = 'Hard';
                    break;
            }
        }

        let puzzleData;
        let puzzleKey: string;

        // Ensure uniqueness
        do {
            puzzleData = generatePuzzles(difficulty);
            puzzleKey = puzzleData.puzzle.flat().map(v => v === null ? '0' : v).join('');
        } while (seenPuzzles.has(puzzleKey));

        seenPuzzles.add(puzzleKey);

        stages.push({
            id: i,
            difficulty,
            board: puzzleData.puzzle,
            solution: puzzleData.solution as number[][]
        });

        if (i % 10 === 0) {
            console.log(`Generated ${i}/${STAGES_COUNT} stages...`);
        }
    }

    const dataDir = path.join(__dirname, '../src/data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const outputPath = path.join(dataDir, 'stages.json');
    fs.writeFileSync(outputPath, JSON.stringify(stages, null, 2));

    console.log(`Success! 100 stages saved to ${outputPath}`);
}

main().catch(err => {
    console.error('Generation failed:', err);
    process.exit(1);
});
