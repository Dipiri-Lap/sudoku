import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePuzzles } from '../engine/generator.js';
import type { Difficulty } from '../engine/generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STAGES_FILE = path.join(__dirname, '../data/stages.json');

const stages = [];

for (let i = 1; i <= 500; i++) {
    let difficulty: Difficulty;

    if (i === 500) {
        difficulty = 'Expert';
    } else if (i % 20 === 0) {
        difficulty = 'Hard';
    } else {
        const patternIndex = (i - 1) % 5;
        // 아주 쉬움 -> 아주 쉬움 -> 쉬움 -> 쉬움 -> 보통
        if (patternIndex === 0 || patternIndex === 1) difficulty = 'Very Easy';
        else if (patternIndex === 2 || patternIndex === 3) difficulty = 'Easy';
        else difficulty = 'Medium';
    }

    const { puzzle, solution } = generatePuzzles(difficulty);
    stages.push({
        id: i,
        difficulty,
        board: puzzle,
        solution
    });

    if (i % 10 === 0) console.log(`Generated ${i}/500 stages...`);
}

fs.writeFileSync(STAGES_FILE, JSON.stringify(stages, null, 2));
console.log('Stages generation complete.');
