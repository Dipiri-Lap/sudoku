import React from 'react';

interface Props {
    boardSize: 6 | 9;
    onClose: () => void;
}

const DEMO_BOARD_6 = [
    [1, 2, 3, 4, 5, 6],
    [4, 5, 6, 1, 2, 3],
    [2, 1, 4, 3, 6, 5],
    [3, 6, 5, 2, 1, 4],
    [5, 4, 1, 6, 3, 2],
    [6, 3, 2, 5, 4, 1],
];

const DEMO_BOARD_9 = [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

// row/col/box chosen so they don't overlap each other
const HL6 = { row: 2, col: 1, box: { r0: 0, r1: 1, c0: 3, c1: 5 } };
const HL9 = { row: 4, col: 2, box: { r0: 0, r1: 2, c0: 6, c1: 8 } };

const BeginnerTutorialModal: React.FC<Props> = ({ boardSize, onClose }) => {
    const is6 = boardSize === 6;
    const board = is6 ? DEMO_BOARD_6 : DEMO_BOARD_9;
    const hl = is6 ? HL6 : HL9;

    const getCellBg = (r: number, c: number) => {
        const inRow = r === hl.row;
        const inCol = c === hl.col;
        const inBox = r >= hl.box.r0 && r <= hl.box.r1 && c >= hl.box.c0 && c <= hl.box.c1;
        if (inRow && inCol) return '#ffc0d4';
        if (inRow) return '#fff3c0';
        if (inCol) return '#ffe0ec';
        if (inBox) return '#e8d5f5';
        return '#fff';
    };

    const getCellBorder = (r: number, c: number) => {
        const last = boardSize - 1;
        const borderRight = c === last ? 'none'
            : (is6 ? (c === 2 ? '2px solid #4a90e2' : '1px solid #b8cdd8')
                   : (c === 2 || c === 5 ? '2px solid #4a90e2' : '1px solid #b8cdd8'));
        const borderBottom = r === last ? 'none'
            : (is6 ? (r === 1 || r === 3 ? '2px solid #4a90e2' : '1px solid #b8cdd8')
                   : (r === 2 || r === 5 ? '2px solid #4a90e2' : '1px solid #b8cdd8'));
        const borderTop = r === hl.row ? '2px solid #f4a200' : (r === 0 ? 'none' : undefined);
        const borderBottomFinal = r === hl.row ? '2px solid #f4a200' : borderBottom;
        return { borderRight, borderBottom: borderBottomFinal, borderTop };
    };

    return (
        <div
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 300, padding: '1.5rem',
            }}
        >
            <div
                className="animate-fade-in"
                style={{
                    background: '#fff',
                    borderRadius: '20px',
                    padding: '1.5rem 1.5rem 1.25rem',
                    width: '100%',
                    maxWidth: '420px',
                    textAlign: 'center',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                }}
            >
                <h2 style={{ margin: '0 0 1rem', fontSize: '1.3rem', fontWeight: 700 }}>플레이 방법</h2>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
                    border: '2px solid #4a90e2',
                    borderRadius: '4px',
                    margin: '0 auto 1rem',
                    maxWidth: '340px',
                    aspectRatio: '1',
                    overflow: 'hidden',
                }}>
                    {board.map((rowData, r) =>
                        rowData.map((val, c) => {
                            const borders = getCellBorder(r, c);
                            return (
                                <div key={`${r}-${c}`} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: is6 ? '1rem' : '0.78rem',
                                    fontWeight: 500,
                                    aspectRatio: '1',
                                    background: getCellBg(r, c),
                                    ...borders,
                                }}>
                                    {val}
                                </div>
                            );
                        })
                    )}
                </div>

                <p style={{ fontSize: '0.88rem', lineHeight: 1.7, margin: '0 0 1.25rem', color: '#444' }}>
                    빈칸을 채우되 각{' '}
                    <strong style={{ color: '#f4a200' }}>행</strong>이나{' '}
                    <strong style={{ color: '#e53935' }}>열</strong>,{' '}
                    <strong style={{ color: '#7c3aed' }}>{is6 ? '2×3' : '3×3'} 박스</strong>에{' '}
                    <br />숫자가 중복되지 않게 하세요
                </p>

                <button
                    className="primary-btn"
                    style={{ width: '100%', fontSize: '1rem' }}
                    onClick={onClose}
                >
                    확인
                </button>
            </div>
        </div>
    );
};

export default BeginnerTutorialModal;
