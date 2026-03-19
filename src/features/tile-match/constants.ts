export const TILE_TYPES = [
    '🍎', '🍌', '🍇', '🍓', '🍒', '🥑', '🍔', '🍕',
    '🍦', '🍩', '🍪', '🍫', '⚽', '🏀', '🎮', '🎲'
];

export const TRAY_SIZE = 7;
export const BOARD_WIDTH = 8;
export const BOARD_HEIGHT = 10;
export const MAX_LAYERS = 5;

/**
 * Generate a randomized board with guaranteed matching tiles (sets of 3)
 */
export function generateLevel(level: number) {
    const tilesPerType = 6; // Sets of 3
    const numTypes = Math.min(TILE_TYPES.length, 6 + level);
    
    let tiles = [];
    const pool = [];
    
    // Fill pool with sets of 3
    for (let i = 0; i < numTypes; i++) {
        for (let j = 0; j < tilesPerType; j++) {
            pool.push(TILE_TYPES[i]);
        }
    }
    
    // Shuffle pool
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    
    // Assign to positions and layers
    // We create a layered pyramid-like structure
    let poolIdx = 0;
    for (let z = 0; z < MAX_LAYERS && poolIdx < pool.length; z++) {
        const sizeX = 6 - z;
        const sizeY = 7 - z;
        const offsetX = (BOARD_WIDTH - sizeX) / 2;
        const offsetY = (BOARD_HEIGHT - sizeY) / 2;
        
        for (let x = 0; x < sizeX && poolIdx < pool.length; x++) {
            for (let y = 0; y < sizeY && poolIdx < pool.length; y++) {
                // Sparsely populate layers to make it look interesting
                if (Math.random() > 0.3 || z === 0) {
                    tiles.push({
                        id: `t-${poolIdx}`,
                        type: pool[poolIdx],
                        x: offsetX + x,
                        y: offsetY + y,
                        z: z,
                        isBlocked: false,
                        status: 'board' as const
                    });
                    poolIdx++;
                }
            }
        }
    }
    
    // Initial blocked check
    return updateBlockedStatus(tiles);
}

function updateBlockedStatus(tiles: any[]) {
    return tiles.map(t => {
        const isBlocked = tiles.some(other => {
            if (other.z <= t.z || other.status !== 'board') return false;
            return Math.abs(other.x - t.x) < 0.6 && Math.abs(other.y - t.y) < 0.6;
        });
        return { ...t, isBlocked };
    });
}
