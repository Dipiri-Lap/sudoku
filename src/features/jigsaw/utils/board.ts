/**
 * Board model: board[slot] = pieceId. A piece's id equals its correct slot index.
 * Two adjacent slots are "connected" when the pieces they hold are also
 * neighbours in the original image in the same direction.
 *
 * Rotation gimmick: `rot[pieceId]` = quarter turns (0..3). A turned piece never
 * connects to anything and the puzzle isn't solved until every piece is upright.
 * Omitting `rot` means "nothing is turned" (stages without the gimmick).
 */

export type Rot = readonly number[] | undefined;
const upright = (rot: Rot, p: number) => !rot || rot[p] === 0;

export type Board = number[];

export function isConnectedRight(board: Board, slot: number, cols: number, rot?: Rot): boolean {
    if (slot % cols === cols - 1) return false;
    const p = board[slot];
    const q = board[slot + 1];
    return p % cols !== cols - 1 && q === p + 1 && upright(rot, p) && upright(rot, q);
}

export function isConnectedDown(board: Board, slot: number, rows: number, cols: number, rot?: Rot): boolean {
    if (Math.floor(slot / cols) === rows - 1) return false;
    const p = board[slot];
    const q = board[slot + cols];
    return Math.floor(p / cols) !== rows - 1 && q === p + cols && upright(rot, p) && upright(rot, q);
}

/** Returns groupId per slot (root slot index) using union-find. */
export function computeGroups(board: Board, rows: number, cols: number, rot?: Rot): number[] {
    const n = rows * cols;
    const parent = Array.from({ length: n }, (_, i) => i);
    const find = (x: number): number => {
        while (parent[x] !== x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    };
    const union = (a: number, b: number) => {
        const ra = find(a);
        const rb = find(b);
        if (ra !== rb) parent[rb] = ra;
    };
    for (let s = 0; s < n; s++) {
        if (isConnectedRight(board, s, cols, rot)) union(s, s + 1);
        if (isConnectedDown(board, s, rows, cols, rot)) union(s, s + cols);
    }
    return Array.from({ length: n }, (_, i) => find(i));
}

export function countConnections(board: Board, rows: number, cols: number): number {
    let c = 0;
    for (let s = 0; s < board.length; s++) {
        if (isConnectedRight(board, s, cols)) c++;
        if (isConnectedDown(board, s, rows, cols)) c++;
    }
    return c;
}

export function isSolved(board: Board, rot?: Rot): boolean {
    return board.every((p, s) => p === s && upright(rot, p));
}

/**
 * Pick `count` random pieces and turn them. Square cells can sit at 90/180/270°;
 * rectangular cells (rows ≠ cols on a square board) only flip 180° so the slice still fits.
 */
export function randomRotation(n: number, count: number, square: boolean): number[] {
    const rot = new Array<number>(n).fill(0);
    const ids = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    for (const p of ids.slice(0, Math.min(count, n))) rot[p] = square ? 1 + Math.floor(Math.random() * 3) : 2;
    return rot;
}

/** Shuffle with as few initial connections as possible. */
export function shuffleBoard(rows: number, cols: number): Board {
    const n = rows * cols;
    let best: Board = [];
    let bestScore = Infinity;
    for (let attempt = 0; attempt < 200; attempt++) {
        const b = Array.from({ length: n }, (_, i) => i);
        for (let i = n - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [b[i], b[j]] = [b[j], b[i]];
        }
        const fixed = b.filter((p, s) => p === s).length;
        const score = countConnections(b, rows, cols) * 2 + fixed;
        if (score < bestScore) {
            best = b;
            bestScore = score;
            if (score === 0) break;
        }
    }
    return best;
}

/**
 * Move every slot in `groupSlots` by (dr, dc). Pieces displaced from the
 * destination slide back along the move vector into the vacated slots.
 * Returns null when the move leaves the board or is a no-op.
 */
export function moveGroup(
    board: Board,
    rows: number,
    cols: number,
    groupSlots: number[],
    dr: number,
    dc: number,
): Board | null {
    if (dr === 0 && dc === 0) return null;
    const off = dr * cols + dc;
    const groupSet = new Set(groupSlots);
    for (const s of groupSlots) {
        const r = Math.floor(s / cols) + dr;
        const c = (s % cols) + dc;
        if (r < 0 || r >= rows || c < 0 || c >= cols) return null;
    }
    const targetSet = new Set(groupSlots.map((s) => s + off));
    const next = board.slice();
    // displaced pieces: in target but not in group → walk back by offset until a vacated slot
    for (const t of targetSet) {
        if (groupSet.has(t)) continue;
        let dest = t - off;
        while (targetSet.has(dest)) dest -= off;
        next[dest] = board[t];
    }
    for (const s of groupSlots) next[s + off] = board[s];
    return next;
}
