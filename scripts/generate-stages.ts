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
    const TARGET_STAGES_COUNT = 500;
    const dataDir = path.join(__dirname, '../src/data');
    const outputPath = path.join(dataDir, 'stages.json');

    let stages: Stage[] = [];
    const seenPuzzles = new Set<string>();

    // 1. Load existing stages if they exist
    if (fs.existsSync(outputPath)) {
        const existingData = fs.readFileSync(outputPath, 'utf8');
        try {
            stages = JSON.parse(existingData);
            console.log(`Loaded ${stages.length} existing stages.`);

            // Populate seen puzzles for duplicate checking
            stages.forEach(s => {
                const key = s.board.flat().map(v => v === null ? '0' : v).join('');
                seenPuzzles.add(key);
            });
        } catch (e) {
            console.warn('Failed to parse existing stages.json, starting fresh.');
        }
    }

    const currentCount = stages.length;
    if (currentCount >= TARGET_STAGES_COUNT) {
        console.log(`Already have ${currentCount} stages. No more needed.`);
        return;
    }

    console.log(`Generating ${TARGET_STAGES_COUNT - currentCount} more unique stages (Total target: ${TARGET_STAGES_COUNT})...`);

    for (let i = currentCount + 1; i <= TARGET_STAGES_COUNT; i++) {
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

        if (i % 50 === 0 || i === TARGET_STAGES_COUNT) {
            console.log(`Generated ${i}/${TARGET_STAGES_COUNT} stages...`);
        }
    }

    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(stages, null, 2));

    console.log(`Success! Total ${stages.length} stages saved to ${outputPath}`);
}

main().catch(err => {
    console.error('Generation failed:', err);
    process.exit(1);
});
