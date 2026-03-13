import React from 'react';
import { Sparkles } from 'lucide-react';
import { useWordSort } from '../context/WordSortContext';
import { useWordSortUI } from '../context/WordSortUIContext';

export const SlotArea: React.FC = () => {
    const { state } = useWordSort();
    const {
        finalCardWidth,
        slotCardStyle,
        cardBadgeSize,
        cardNameSize,
        cardWordSize,
        gatheringCat,
        gatherPhase,
        gatherOffsets,
        isRemoveMode,
        isRemovingAction,
        handleRemoveClick,
        completingSlot,
        tutorialHighlightSlots,
        tutorialStep,
        setUnlockConfirm,
        handleDrop,
        splitText,
        slotRefs,
    } = useWordSortUI();

    const { lockedSlots } = state;
    const gap = 12;

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Object.keys(state.activeSlots).length + (tutorialStep === null ? lockedSlots : 0)}, ${finalCardWidth}px)`,
            gap: `${gap}px`,
            marginBottom: '1.5rem',
            maxWidth: 'fit-content',
            marginInline: 'auto',
            position: 'relative',
            zIndex: gatheringCat ? 6000 : 1
        }}>
            {/* 1. Locks on the left */}
            {tutorialStep === null && Array.from({ length: lockedSlots }).map((_, i) => (
                <div key={`locked-slot-${i}`} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    <div style={{ height: '25px' }} />
                    <div
                        onClick={() => setUnlockConfirm('slot')}
                        style={{
                            ...slotCardStyle,
                            width: `${finalCardWidth}px`,
                            background: 'rgba(255,255,255,0.05)',
                            border: '1.5px dashed rgba(255,255,255,0.25)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',
                            color: 'rgba(255,255,255,0.5)',
                        }}
                    >
                        <span style={{ fontSize: '1.1rem' }}>🔒</span>
                        <span style={{ fontSize: '0.55rem', textAlign: 'center', lineHeight: 1.2 }}>잠금 해제</span>
                        <span style={{ fontSize: '0.6rem', color: '#fda085', fontWeight: '700' }}>🪙 50</span>
                    </div>
                </div>
            ))}

            {/* 2. Active Slots - Sorted ASCENDING: lowest index (newly unlocked) appears leftmost */}
            {Object.keys(state.activeSlots)
                .map(Number)
                .sort((a, b) => a - b)
                .map(i => {
                    const slot = state.activeSlots[i];

                    return (
                        <div key={i} ref={el => { slotRefs.current[i] = el; }} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            <div style={{ height: '25px' }} />
                            <div
                                onDragOver={e => e.preventDefault()}
                                onDrop={(e) => { handleDrop(e); e.stopPropagation(); }}
                                className={[
                                    !isRemovingAction && completingSlot === i ? 'animate-slot-complete' : '',
                                    tutorialHighlightSlots.has(i) ? 'tutorial-highlight' : ''
                                ].filter(Boolean).join(' ')}
                                style={{
                                    ...slotCardStyle,
                                    backgroundColor: slot ? '#ffffff' : 'rgba(255,255,255,0.03)',
                                    backgroundImage: 'none',
                                    color: '#333',
                                    border: slot
                                        ? '3px solid #ff9f43'
                                        : '1px dashed rgba(255,255,255,0.2)',
                                    opacity: 1,
                                    width: `${finalCardWidth}px`,
                                    boxShadow: slot ? '0 0 15px rgba(255,159,67,0.3)' : 'none',
                                    borderRadius: '6px',
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    visibility: (gatheringCat === slot?.catId && gatherOffsets.current.has(`slot-${i}`) && (gatherOffsets.current.get(`slot-${i}`)?.seq ?? 0) <= gatherPhase) ? 'hidden' : 'visible',
                                } as any}
                                onClick={() => isRemoveMode && slot && handleRemoveClick(slot.catId)}
                            >
                                {slot ? (
                                    <>
                                        <div style={{
                                            position: 'absolute',
                                            inset: '2px',
                                            border: '1px solid #ffba75',
                                            borderRadius: '3px',
                                            pointerEvents: 'none',
                                            zIndex: 1
                                        }} />
                                        <div style={{
                                            position: 'absolute', top: '4px', left: '4px', right: '4px',
                                            display: 'flex',
                                            flexDirection: finalCardWidth < 65 ? 'column' : 'row',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            zIndex: 2,
                                            lineHeight: 1.1
                                        }}>
                                            <span style={{
                                                fontSize: cardBadgeSize,
                                                color: '#a0522d',
                                                fontWeight: '700',
                                                opacity: 0.9
                                            }}>
                                                {slot.collected.length}/{slot.target}
                                            </span>
                                            <span style={{
                                                fontSize: cardNameSize,
                                                color: '#a0522d',
                                                fontWeight: '900',
                                                marginLeft: finalCardWidth < 65 ? '0' : '4px',
                                                textAlign: 'center',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {slot.name}
                                            </span>
                                        </div>
                                        <div style={{
                                            fontSize: cardWordSize,
                                            fontWeight: '900',
                                            color: '#2c3e50',
                                            marginTop: finalCardWidth < 65 ? '20px' : '12px',
                                            zIndex: 2,
                                            textAlign: 'center',
                                            whiteSpace: 'nowrap',
                                            lineHeight: 1.2
                                        }}>
                                            {splitText(slot.collected.length > 0 ? slot.collected[slot.collected.length - 1] : slot.name)}
                                        </div>
                                    </>
                                ) : (
                                    <Sparkles size={24} style={{ opacity: 0.1, color: 'white' }} />
                                )}
                            </div>
                        </div>
                    );
                })}
        </div>
    );
};
