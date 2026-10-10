import React, { useState } from 'react';

interface OrderedIntroOverlayProps {
    categoryName: string;
    words: string[];
    language: 'ko' | 'en';
    onClose: () => void;
}

const GREEN = '#27ae60';

const TEXT = {
    ko: {
        skip: '건너뛰기',
        next: '다음 →',
        start: '시작하기',
        pages: [
            {
                title: '🔢 순서 카드가 등장했어요!',
                body: '초록 테두리에 숫자가 있는 카드는 번호 순서대로만 슬롯에 넣을 수 있어요.',
            },
            {
                title: '슬롯에는 1번부터 차례로',
                body: '카테고리 카드를 슬롯에 놓으면 "다음 1"처럼 넣을 번호가 표시돼요. 번호 순서가 아니면 들어가지 않아요.',
            },
            {
                title: '스택에는 번호 상관없이 쌓아요',
                body: '같은 카테고리 카드는 번호와 상관없이 스택 위에 얹을 수 있어요. 1→2→3처럼 번호 순으로 쌓아 두면 한 번에 슬롯으로 보낼 수 있어요!',
            },
            {
                title: '여러 장을 한 번에 끌어도 돼요',
                body: '1·2·4·5를 한꺼번에 끌어다 놓으면 이어지는 1·2만 들어가고, 나머지는 스택에 남아요.',
            },
            {
                title: '번호 순서가 아니면 안 들어가요',
                body: '끌고 있는 묶음의 맨 아래 카드가 다음 번호가 아니면 하나도 들어가지 않고 제자리로 돌아와요. 예) 다음 번호가 1인데 3·1·2를 끌면 안 들어가요.',
            },
        ],
    },
    en: {
        skip: 'Skip',
        next: 'Next →',
        start: 'Start',
        pages: [
            {
                title: '🔢 Numbered cards are here!',
                body: 'Cards with a green border and a number can only go into the slot in numeric order.',
            },
            {
                title: 'Fill the slot from number 1',
                body: 'Once the category card is in a slot, it shows the next number to place, like "Next 1". Cards out of order will not go in.',
            },
            {
                title: 'Stack in any order',
                body: 'Same-category cards can be stacked regardless of numbers. Stack them as 1→2→3 and you can send them to the slot in one move!',
            },
            {
                title: 'You can drag several cards at once',
                body: 'Drag 1·2·4·5 together and only the consecutive 1·2 go in; the rest stay in the stack.',
            },
            {
                title: 'Out of order will not go in',
                body: 'If the bottom card of the group you drag is not the next number, nothing goes in and the cards return. Example: next is 1 but you drag 3·1·2.',
            },
        ],
    },
};

const MiniCard: React.FC<{ n?: number; text?: string; dim?: boolean }> = ({ n, text, dim }) => (
    <div style={{
        width: '52px', height: '66px', boxSizing: 'border-box', borderRadius: '9px', background: '#fff',
        border: `3px solid ${n !== undefined ? GREEN : '#999'}`, position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#333', fontWeight: 900, fontSize: '0.72rem', textAlign: 'center', opacity: dim ? 0.45 : 1, flexShrink: 0,
    }}>
        {n !== undefined && (
            <div style={{
                position: 'absolute', top: '3px', left: '3px', width: '16px', height: '16px', borderRadius: '50%',
                background: GREEN, color: '#fff', fontSize: '0.58rem', fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{n}</div>
        )}
        <span style={{ marginTop: n !== undefined ? '9px' : 0, whiteSpace: 'nowrap' }}>{text}</span>
    </div>
);

const MiniStack: React.FC<{ items: { n: number; text: string }[] }> = ({ items }) => {
    const step = 22;
    return (
        <div style={{ position: 'relative', width: '52px', height: `${66 + (items.length - 1) * step}px`, flexShrink: 0 }}>
            {items.map((it, i) => (
                <div key={i} style={{ position: 'absolute', top: `${i * step}px`, left: 0 }}>
                    <MiniCard n={it.n} text={it.text} />
                </div>
            ))}
        </div>
    );
};

const Label: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color }) => (
    <div style={{ fontSize: '0.7rem', color: color ?? 'rgba(255,255,255,0.6)', marginBottom: '6px', fontWeight: 700 }}>{children}</div>
);

const OrderedIntroOverlay: React.FC<OrderedIntroOverlayProps> = ({ categoryName, words, language, onClose }) => {
    const [page, setPage] = useState(0);
    const tx = TEXT[language];
    const cfg = tx.pages[page];
    const isLast = page === tx.pages.length - 1;
    const w = (i: number) => words[i] ?? '';

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(8,8,22,0.82)', zIndex: 15000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }}>
            <div style={{
                background: '#2c2e49', borderRadius: '18px', padding: '1.3rem 1.2rem 1.2rem', width: '100%', maxWidth: '360px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.55)', border: `2px solid ${GREEN}`,
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {tx.pages.map((_, i) => (
                            <div key={i} style={{
                                width: i === page ? '22px' : '8px', height: '8px', borderRadius: '4px',
                                background: i <= page ? GREEN : 'rgba(255,255,255,0.18)', transition: 'all 0.3s ease',
                            }} />
                        ))}
                    </div>
                    <button onClick={onClose} style={{
                        background: 'none', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.5)',
                        padding: '3px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'inherit',
                    }}>{tx.skip}</button>
                </div>

                <div style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.5rem' }}>{cfg.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1rem' }}>{cfg.body}</div>

                {/* 그림 */}
                <div style={{
                    background: 'rgba(0,0,0,0.22)', borderRadius: '12px', padding: '14px 8px', marginBottom: '1.1rem',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', minHeight: '110px', overflow: 'hidden', flexWrap: 'wrap',
                }}>
                    {page === 0 && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                            <div><Label>{language === 'ko' ? '순서 카드' : 'Numbered'}</Label><div style={{ display: 'flex', gap: '8px' }}>
                                <MiniCard n={1} text={w(0)} /><MiniCard n={2} text={w(1)} /><MiniCard n={3} text={w(2)} />
                            </div></div>
                            <div><Label>{language === 'ko' ? '일반 카드' : 'Normal'}</Label><MiniCard text="…" /></div>
                        </div>
                    )}
                    {page === 1 && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                display: 'inline-block', background: '#fff9f2', border: '3px solid #ff9f43', borderRadius: '10px',
                                padding: '8px 16px', color: '#a0522d', fontWeight: 900, fontSize: '0.8rem', marginBottom: '10px',
                            }}>
                                0/{words.length} · {language === 'ko' ? '다음' : 'Next'} 1
                                <div style={{ fontSize: '0.9rem' }}>{categoryName}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                                <MiniCard n={1} text={w(0)} /><span style={{ color: '#fff' }}>→</span>
                                <MiniCard n={2} text={w(1)} /><span style={{ color: '#fff' }}>→</span>
                                <MiniCard n={3} text={w(2)} />
                            </div>
                        </div>
                    )}
                    {page === 4 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div>
                                <Label>{language === 'ko' ? '다음 번호: 1' : 'Next: 1'}</Label>
                                <MiniStack items={[{ n: 3, text: w(2) }, { n: 1, text: w(0) }, { n: 2, text: w(1) }]} />
                            </div>
                            <span style={{ color: '#fff' }}>→</span>
                            <div style={{ color: '#e74c3c', fontWeight: 800, fontSize: '0.8rem', lineHeight: 1.5 }}>
                                {language === 'ko' ? <>맨 아래가 3이라<br />안 들어가요 ✗</> : <>Bottom is 3,<br />so none go in ✗</>}
                            </div>
                        </div>
                    )}
                    {page === 3 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                            <div>
                                <Label>{language === 'ko' ? '한 번에 끌기' : 'Drag all'}</Label>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <MiniCard n={1} text={w(0)} /><MiniCard n={2} text={w(1)} />
                                    <MiniCard n={4} text={w(3)} dim /><MiniCard n={5} text={w(4)} dim />
                                </div>
                            </div>
                            <span style={{ color: '#fff', fontSize: '1.1rem', lineHeight: 1 }}>↓</span>
                            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                                <div>
                                    <Label color={GREEN}>{language === 'ko' ? '슬롯에 들어감 ✓' : 'Into slot ✓'}</Label>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <MiniCard n={1} text={w(0)} /><MiniCard n={2} text={w(1)} />
                                    </div>
                                </div>
                                <div>
                                    <Label>{language === 'ko' ? '스택에 남음' : 'Stays'}</Label>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <MiniCard n={4} text={w(3)} dim /><MiniCard n={5} text={w(4)} dim />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {page === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div><Label>{language === 'ko' ? '끌어서' : 'Drag'}</Label><MiniCard n={3} text={w(2)} /></div>
                                <span style={{ color: '#fff' }}>→</span>
                                <div>
                                    <Label>{language === 'ko' ? '번호 상관없이 OK' : 'Any order OK'}</Label>
                                    <MiniStack items={[{ n: 5, text: w(4) }, { n: 3, text: w(2) }]} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div>
                                    <Label>{language === 'ko' ? '번호 순으로 쌓으면' : 'Stacked in order'}</Label>
                                    <MiniStack items={[{ n: 1, text: w(0) }, { n: 2, text: w(1) }, { n: 3, text: w(2) }]} />
                                </div>
                                <span style={{ color: '#fff' }}>→</span>
                                <div style={{ color: GREEN, fontWeight: 800, fontSize: '0.8rem' }}>{language === 'ko' ? '한 번에 슬롯으로 ✓' : 'One move to slot ✓'}</div>
                            </div>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => (isLast ? onClose() : setPage(page + 1))}
                    style={{
                        background: `linear-gradient(135deg, #4ade80, ${GREEN})`, color: '#0f1a10', border: 'none',
                        padding: '0.7rem 1rem', borderRadius: '24px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                        width: '100%', fontFamily: 'inherit',
                    }}
                >
                    {isLast ? tx.start : tx.next}
                </button>
            </div>
        </div>
    );
};

export default OrderedIntroOverlay;
