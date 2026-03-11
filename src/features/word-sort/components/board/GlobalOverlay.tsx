import React from 'react';
import { Crown } from 'lucide-react';

interface GlobalOverlayProps {
    gatheringCat: string | null;
    gatherOffsets: React.MutableRefObject<Map<string, any>>;
    gatherPhase: number;
    categories: any[];
    finalCardWidth: number;
    cardHeight: number;
}

const slotCardStyle = {
    borderRadius: '10px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative' as const,
    userSelect: 'none' as const,
};

const GlobalOverlay: React.FC<GlobalOverlayProps> = ({
    gatheringCat,
    gatherOffsets,
    gatherPhase,
    categories,
    finalCardWidth,
    cardHeight
}) => {
    if (!gatheringCat) return null;

    return (
        <div style={{
            position: 'fixed' as const,
            inset: 0,
            zIndex: 20000,
            pointerEvents: 'none',
            perspective: '1000px'
        }}>
            {Array.from(gatherOffsets.current.entries()).map(([id, info]) => {
                const { x, y, startX, startY, seq, card } = info;
                const isMoving = seq <= gatherPhase;
                const category = categories.find(c => c.id === card.cat);

                return (
                    <div
                        key={id}
                        style={{
                            ...slotCardStyle,
                            position: 'absolute' as const,
                            left: `${startX}px`,
                            top: `${startY}px`,
                            width: `${finalCardWidth}px`,
                            height: `${cardHeight}px`,
                            backgroundColor: card.type === 'category' ? '#fff9f2' : '#ffffff',
                            backgroundImage: 'none',
                            border: (card.type === 'category' || !card.isRevealed && isMoving) ? '3px solid #ff9f43' : '3px solid #999999',
                            boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
                            color: '#333',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            zIndex: 20000 + seq,
                            padding: '5px',
                            transform: isMoving 
                                ? `translate(${x - startX}px, ${y - startY}px) scale(1.15)` 
                                : 'translate(0, 0) scale(1)',
                            transition: isMoving ? 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
                            opacity: isMoving ? 1 : 0,
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            inset: '2px',
                            border: card.type === 'category' ? '1px solid #ffba75' : '1px solid #777777',
                            borderRadius: '3px',
                            pointerEvents: 'none',
                            zIndex: 1
                        }} />
                        {card.type === 'category' && (
                            <>
                                <div style={{ position: 'absolute', top: '4px', left: '6px', color: '#ff9f43', fontSize: '0.65rem', fontWeight: '900', zIndex: 2 }}>
                                    0/{category?.words?.length ?? 5}
                                </div>
                                <div style={{ position: 'absolute', top: '4px', right: '6px', color: '#ff9f43', zIndex: 2 }}>
                                    <Crown size={14} fill="#ff9f43" fillOpacity={0.2} />
                                </div>
                            </>
                        )}
                        <span style={{
                            fontWeight: '900',
                            fontSize: finalCardWidth < 60 ? '0.75rem' : '0.9rem',
                            lineHeight: '1.2',
                            zIndex: 2,
                            textAlign: 'center'
                        }}>
                            {card.value}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

export default GlobalOverlay;
