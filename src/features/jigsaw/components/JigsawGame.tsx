import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Eye, Shuffle, Home, Play, RotateCcw, LayoutGrid, Music, VolumeX, Check, Undo2, Magnet, Paintbrush, X, Share2, Download } from 'lucide-react';
import { useCoins } from '../../../context/CoinContext';
import { logEvent } from '../../../firebase';
import { bgm, BGM_TRACKS, loadBgmPref, saveBgmPref, loadVolumes, saveVolumes } from '../utils/bgm';
import { JIGSAW_STAGES, CHAPTER_SIZE, RANGE_SIZE, isStageUnlocked, lastUnlockedIdx, loadStars, saveStars, starsFor, type JigsawStage } from '../data/stages';
import {
    computeGroups,
    isConnectedDown,
    isConnectedRight,
    isSolved,
    moveGroup,
    shuffleBoard,
    type Board,
} from '../utils/board';
import '../styles/Jigsaw.css';
import '../styles/JigsawFrames.css';
import { useBoardFrames } from '../data/boardFrames';
import { GRADES, GRADE_ORDER, priceOf, type Cosmetic, type CosmeticStore } from '../data/cosmetics';
import { Buddy } from './Buddy';
import { shareClear, saveClearCard, type ShareCardInput } from '../utils/shareCard';
import { BUDDY_SKINS, useBuddySkins, type BuddySkin } from '../data/buddySkins';

/* ---------- sound ---------- */
let audioCtx: AudioContext | null = null;
/** sound-effect volume (0~1), changed from the sound menu */
let sfxVolume = loadVolumes().sfx;

/** coin prices of the in-game helpers */
const MAGNET_COST = 50;
const UNDO_COST = 20;
/** first-clear reward of a stage (same amounts as the other games) */
const CLEAR_COIN_REWARD = 10;
const PEEK_COST = 20;
/** free original-image peeks per round, by piece count */
const freePeeks = (pieces: number) => (pieces <= 12 ? 3 : pieces <= 20 ? 2 : 1);

function playTone(notes: number[], step = 0.08, vol = 0.07, len = 0.4, type: OscillatorType = 'square') {
    try {
        audioCtx = audioCtx ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const ctx = audioCtx;
        notes.forEach((freq, i) => {
            const t = ctx.currentTime + i * step;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(Math.max(0.0002, vol * sfxVolume), t + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
            osc.connect(gain).connect(ctx.destination);
            osc.start(t);
            osc.stop(t + len + 0.05);
        });
    } catch {
        /* audio unavailable */
    }
}
const identity = (n: number): Board => Array.from({ length: n }, (_, i) => i);
function randomPerm(n: number): Board {
    const b = identity(n);
    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
/** per-stage pseudo-random shine timing so 3-star cards glint at different moments */
const shineStyle = (id: number) =>
    ({
        '--shine-dur': `${4 + ((id * 37) % 30) / 10}s`,
        '--shine-delay': `${-((id * 53) % 50) / 10}s`,
    }) as React.CSSProperties;
const GRADE = ['GOOD', 'GOOD', 'GREAT', 'PERFECT'] as const;
const isMasterpiece = (st: JigsawStage) => st.subtitle === '명화 컬렉션';

/** deterministic flat confetti for the clear screen */
const CLEAR_CONFETTI = Array.from({ length: 18 }, (_, i) => ({
    left: (i * 37 + 11) % 100,
    delay: ((i * 53) % 40) / 10,
    dur: 4 + ((i * 29) % 30) / 10,
    color: ['#ffffff', '#ffcb2f', '#ff8fb5', '#9bf2b7', '#8fd3ff'][i % 5],
    rot: (i * 47) % 360,
    w: 8 + ((i * 13) % 8),
}));

/** Stage-clear fanfare: bouncy melody + chord stabs + a sparkle run, all scaled by the SFX volume. */
function playClearFanfare() {
    try {
        audioCtx = audioCtx ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const ctx = audioCtx;
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        const t0 = ctx.currentTime + 0.02;
        const note = (freq: number, at: number, len: number, type: OscillatorType, vol: number) => {
            const t = t0 + at;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(Math.max(0.0002, vol * sfxVolume), t + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
            osc.connect(gain).connect(ctx.destination);
            osc.start(t);
            osc.stop(t + len + 0.05);
        };
        const f = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
        // melody (C major): G C E G — E G C'(long)
        const mel: [number, number, number][] = [
            [67, 0, 0.16], [72, 0.12, 0.16], [76, 0.24, 0.16], [79, 0.36, 0.28],
            [76, 0.6, 0.14], [79, 0.72, 0.14], [84, 0.84, 0.9],
        ];
        mel.forEach(([m, at, len]) => {
            note(f(m), at, len, 'square', 0.035);
            note(f(m), at, len + 0.1, 'triangle', 0.06);
        });
        // chord stabs under the melody
        [[60, 64, 67, 0.36], [65, 69, 72, 0.6], [60, 64, 67, 0.84]].forEach(([a, b, c, at]) => {
            [a, b, c].forEach((m) => note(f(m - 12), at, at === 0.84 ? 1.1 : 0.22, 'triangle', 0.045));
        });
        note(f(36), 0.84, 1.1, 'triangle', 0.08);
        // sparkle run on top
        [96, 100, 103, 108].forEach((m, i) => note(f(m), 1.0 + i * 0.06, 0.35, 'sine', 0.03));
    } catch {
        /* audio unavailable */
    }
}

const sfx = {
    tick: () => playTone([660, 660], 0.5, 0.03, 0.12),
    go: () => playTone([784, 1175], 0.07, 0.05, 0.3),
    whoosh: (i: number) => playTone([300 + i * 70], 0, 0.02, 0.08, 'triangle'),
    pick: () => playTone([660], 0, 0.025, 0.08),
    drop: () => playTone([440], 0, 0.025, 0.1),
    pop: () => playTone([880, 1175], 0.05, 0.035, 0.18),
    win: () => playTone([523, 659, 784, 1047], 0.09, 0.04, 0.3),
    star: (i: number) => playTone([988 * Math.pow(1.19, i)], 0, 0.04, 0.25),
    tap: () => playTone([520], 0, 0.02, 0.06),
};

/* ---------- flat bits ---------- */
function FlatStar({ on = true, size = 28 }: { on?: boolean; size?: number }) {
    const outer = 'M24 2l6.5 13.4 14.7 2.1-10.6 10.4 2.5 14.6L24 35.6l-13.1 6.9 2.5-14.6L2.8 17.5l14.7-2.1z';
    return (
        <svg className={`jg-fstar ${on ? 'on' : 'off'}`} width={size} height={size} viewBox="0 0 48 48" aria-hidden>
            <path d={outer} fill={on ? '#ffcb2f' : 'rgba(0,0,0,0.16)'} />
            <path d={outer} fill={on ? '#f2901d' : 'rgba(0,0,0,0.1)'} transform="translate(24 25) scale(0.5) translate(-24 -24)" />
        </svg>
    );
}


function LockBadge() {
    return (
        <svg width="56" height="56" viewBox="0 0 48 48" aria-hidden>
            <path d="M15 22v-6a9 9 0 0 1 18 0v6" stroke="#fff" strokeWidth="5" fill="none" />
            <rect x="9" y="21" width="30" height="21" rx="4" fill="#fff" />
            <rect x="21.5" y="27" width="5" height="9" rx="2" fill="rgba(0,0,0,0.25)" />
        </svg>
    );
}

/* ---------- home (stage select) ---------- */
function HomeScreen({
    initial,
    onPlay,
    onColor,
    onOpenList,
    onOpenShop,
    buddy,
}: {
    buddy: BuddySkin;
    initial: number;
    onPlay: (s: JigsawStage) => void;
    onColor: (c: string) => void;
    onOpenList: (idx: number) => void;
    onOpenShop: () => void;
}) {
    const navigate = useNavigate();
    const stars = loadStars();
    const total = Object.values(stars).reduce((a, b) => a + b, 0);
    const [idx, setIdx] = useState(initial);
    const [dir, setDir] = useState<1 | -1>(1);
    const swipe = useRef<number | null>(null);
    const stage = JIGSAW_STAGES[idx];
    const unlocked = isStageUnlocked(idx, stars);
    const got = stars[stage.id] ?? 0;

    useEffect(() => onColor(stage.tint), [stage.tint, onColor]);

    // the carousel stops at the current (first uncleared) stage
    const maxIdx = lastUnlockedIdx(stars);
    const go = (d: 1 | -1) => {
        const ni = idx + d;
        if (ni < 0 || ni > maxIdx) return;
        sfx.tap();
        setDir(d);
        setIdx(ni);
    };

    return (
        <div className="jg-screen jg-home">
            <header className="jg-top">
                <button className="jg-ghost-btn" onClick={() => navigate('/')} aria-label="홈으로">
                    <ChevronLeft size={28} strokeWidth={3.2} />
                </button>
                <div className="jg-home-right">
                    <button className="jg-shop-btn" onClick={onOpenShop} aria-label="꾸미기">
                        <Paintbrush size={20} strokeWidth={2.6} />
                    </button>
                    <div className="jg-coin">
                        <span className="jg-coin-num">{total}</span>
                        <FlatStar size={34} />
                    </div>
                </div>
            </header>

            <h1 className="jg-logo" aria-label="Tiny Pieces">
                <span className="l1">Tiny</span>
                <span className="l2">Pieces</span>
            </h1>

            <div
                className="jg-carousel"
                onPointerDown={(e) => (swipe.current = e.clientX)}
                onPointerUp={(e) => {
                    if (swipe.current === null) return;
                    const dx = e.clientX - swipe.current;
                    swipe.current = null;
                    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
                }}
            >
                <button className="jg-arrow" onClick={() => go(-1)} disabled={idx === 0} aria-label="이전">
                    <ChevronLeft size={30} strokeWidth={3.4} />
                </button>
                <div key={stage.id} className={`jg-card ${dir > 0 ? 'from-r' : 'from-l'}`} onClick={() => unlocked && onPlay(stage)}>
                    <div className={`jg-card-img ${got > 0 ? '' : 'hidden'} ${got >= 3 ? 'jg-gold' : ''}`} style={got >= 3 ? shineStyle(stage.id) : undefined}>
                        {got >= 3 && <i className="jg-gold-spark" aria-hidden />}
                        {got > 0 ? (
                            <img src={stage.image} alt="" draggable={false} />
                        ) : unlocked ? (
                            <div className="jg-card-mystery" aria-label="아직 공개되지 않은 그림">
                                <span>?</span>
                            </div>
                        ) : (
                            <div className="jg-card-lock">
                                <LockBadge />
                            </div>
                        )}
                    </div>
                    <div className="jg-card-buddy">
                        <Buddy size={84} mood={got ? 'happy' : 'idle'} skin={buddy} />
                    </div>
                </div>
                <button className="jg-arrow" onClick={() => go(1)} disabled={idx >= maxIdx} aria-label="다음">
                    <ChevronRight size={30} strokeWidth={3.4} />
                </button>
            </div>

            <div className="jg-stage-meta" key={`m${stage.id}`}>
                <span className="jg-big-no">{stage.id}</span>
                <span className="jg-stage-title">{unlocked ? stage.title : '잠긴 그림'}</span>
                <div className="jg-meta-stars">
                    {[1, 2, 3].map((k) => (
                        <FlatStar key={k} on={got >= k} size={30} />
                    ))}
                </div>
            </div>

            <button className="jg-play-btn" disabled={!unlocked} onClick={() => onPlay(stage)}>
                <Play size={26} fill="currentColor" strokeWidth={0} />
                {unlocked ? '플레이' : '이전 그림을 완성하세요'}
            </button>

            <button className="jg-list-btn" onClick={() => onOpenList(idx)}>
                <LayoutGrid size={18} strokeWidth={2.8} />
                <span>
                    <b>{idx + 1}</b> / {JIGSAW_STAGES.length}
                </span>
                <span className="sep" />
                전체 보기
            </button>
        </div>
    );
}

/* ---------- stage list (all stages, chapters of 20, ranges of 100) ---------- */
function StageList({ current, onPick, onBack }: { current: number; onPick: (idx: number) => void; onBack: () => void }) {
    const stars = useMemo(() => loadStars(), []);
    const total = Object.values(stars).reduce((a, b) => a + b, 0);
    const N = JIGSAW_STAGES.length;
    const rangeCount = Math.ceil(N / RANGE_SIZE);
    const [range, setRange] = useState(Math.floor(current / RANGE_SIZE));
    const [focus, setFocus] = useState<number>(current);
    const [jump, setJump] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const tabsRef = useRef<HTMLDivElement>(null);

    // bring the focused tile (current stage or jump target) into view
    useLayoutEffect(() => {
        const box = scrollRef.current;
        if (!box) return;
        const tile = box.querySelector<HTMLElement>(`[data-idx="${focus}"]`);
        box.scrollTop = tile ? Math.max(0, tile.offsetTop - box.clientHeight * 0.45) : 0;
        const tab = tabsRef.current?.querySelector<HTMLElement>('.on');
        const bar = tabsRef.current;
        if (tab && bar) bar.scrollLeft = tab.offsetLeft - bar.clientWidth / 2 + tab.clientWidth / 2;
    }, [range, focus]);

    const goRange = (r: number) => {
        sfx.tap();
        setRange(r);
        setFocus(-1);
    };
    const submitJump = (e: React.FormEvent) => {
        e.preventDefault();
        const n = parseInt(jump, 10);
        if (!Number.isFinite(n)) return;
        const i = Math.min(N, Math.max(1, n)) - 1;
        sfx.tap();
        setRange(Math.floor(i / RANGE_SIZE));
        setFocus(i);
        setJump('');
        (document.activeElement as HTMLElement | null)?.blur();
    };

    const from = range * RANGE_SIZE;
    const to = Math.min(N, from + RANGE_SIZE);
    const chapters: number[] = [];
    for (let c = from; c < to; c += CHAPTER_SIZE) chapters.push(c);

    return (
        <div className="jg-list" ref={scrollRef}>
            <div className="jg-list-head">
                <header className="jg-top">
                    <button className="jg-ghost-btn" onClick={onBack} aria-label="돌아가기">
                        <ChevronLeft size={28} strokeWidth={3.2} />
                    </button>
                    <h2 className="jg-list-title">전체 스테이지</h2>
                    <div className="jg-coin">
                        <span className="jg-coin-num small">{total}</span>
                        <FlatStar size={26} />
                    </div>
                </header>
                <form className="jg-jump" onSubmit={submitJump}>
                    <input
                        inputMode="numeric"
                        placeholder={`번호로 이동 (1~${N})`}
                        value={jump}
                        onChange={(e) => setJump(e.target.value.replace(/\D/g, ''))}
                    />
                    <button type="submit">이동</button>
                </form>
                {rangeCount > 1 && (
                    <div className="jg-ranges" ref={tabsRef}>
                        {Array.from({ length: rangeCount }, (_, r) => (
                            <button key={r} className={r === range ? 'on' : ''} onClick={() => goRange(r)}>
                                {r * RANGE_SIZE + 1}~{Math.min(N, (r + 1) * RANGE_SIZE)}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="jg-list-body">
                {chapters.map((start) => {
                    const end = Math.min(N, start + CHAPTER_SIZE);
                    let got = 0;
                    for (let i = start; i < end; i++) got += stars[JIGSAW_STAGES[i].id] ?? 0;
                    return (
                        <section key={start} className="jg-chapter">
                            <div className="jg-chapter-head">
                                <span className="name">CHAPTER {Math.floor(start / CHAPTER_SIZE) + 1}</span>
                                <span className="range">
                                    {start + 1}~{end}
                                </span>
                                <span className="sum">
                                    <FlatStar size={18} />
                                    {got}/{(end - start) * 3}
                                </span>
                            </div>
                            <div className="jg-tiles">
                                {Array.from({ length: end - start }, (_, k) => {
                                    const i = start + k;
                                    const st = JIGSAW_STAGES[i];
                                    const g = stars[st.id] ?? 0;
                                    const open = isStageUnlocked(i, stars);
                                    const cls = [
                                        'jg-tile',
                                        g ? 'done' : open ? 'open' : 'locked',
                                        i === current ? 'current' : '',
                                        i === focus && focus !== current ? 'focus' : '',
                                    ].join(' ');
                                    return (
                                        <button key={st.id} data-idx={i} className={cls} disabled={!open} onClick={() => onPick(i)} aria-label={`스테이지 ${st.id}`}>
                                            <span className={`jg-tile-face ${g >= 3 ? 'jg-gold' : ''}`} style={g >= 3 ? shineStyle(st.id) : undefined}>
                                                {g >= 3 && <i className="jg-gold-spark" aria-hidden />}
                                                {g ? (
                                                    <img src={st.image} alt="" loading="lazy" decoding="async" draggable={false} />
                                                ) : open ? (
                                                    <span className="q">?</span>
                                                ) : (
                                                    <span className="lock" />
                                                )}
                                                <span className="no">{st.id}</span>
                                            </span>
                                            <span className="jg-tile-stars">
                                                {[1, 2, 3].map((s2) => (
                                                    <i key={s2} className={g >= s2 ? 'on' : ''} />
                                                ))}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}

/* ---------- cosmetics shop (board frames + buddy skins) ---------- */
function FramePreview({ id, image }: { id: string; image: string }) {
    return (
        <div className={`jg-frame mini frame-${id}`}>
            <img src={image} alt="" draggable={false} />
        </div>
    );
}

type ShopTab = 'frame' | 'buddy';

function CosmeticShop({
    frames,
    buddies,
    image,
    onClose,
}: {
    frames: CosmeticStore;
    buddies: CosmeticStore;
    image: string;
    onClose: () => void;
}) {
    const { coins } = useCoins();
    const [tab, setTab] = useState<ShopTab>('frame');
    const [msg, setMsg] = useState<string | null>(null);
    const [confirm, setConfirm] = useState<Cosmetic | null>(null);
    const store = tab === 'frame' ? frames : buddies;
    const preview = (item: Cosmetic, big = false) =>
        tab === 'frame' ? (
            <FramePreview id={item.id} image={image} />
        ) : (
            <div className="jg-buddy-prev">
                <Buddy size={big ? 110 : 76} mood="happy" skin={item as BuddySkin} />
            </div>
        );

    const tap = (item: Cosmetic) => {
        if (store.unlocked.includes(item.id)) {
            sfx.tap();
            store.select(item.id);
            return;
        }
        setConfirm(item);
    };
    const doBuy = async () => {
        if (!confirm) return;
        const item = confirm;
        const price = priceOf(item);
        setConfirm(null);
        if (coins < price) return setMsg(`코인이 부족해요 (${price}개 필요)`);
        if (await store.buy(item.id)) {
            sfx.win();
            setMsg(`'${item.name}' 장착했어요`);
        } else setMsg('코인이 부족해요');
    };

    return (
        <div className="jg-shop" onClick={onClose}>
            <div className="jg-shop-panel" onClick={(e) => e.stopPropagation()}>
                <div className="jg-shop-head">
                    <h2>꾸미기</h2>
                    <span className="jg-shop-coins">
                        <img src="/coin_Icon.png" alt="" />
                        {coins.toLocaleString()}
                    </span>
                    <button className="jg-shop-x" onClick={onClose} aria-label="닫기">
                        <X size={22} strokeWidth={3} />
                    </button>
                </div>
                <div className="jg-shop-tabs">
                    <button className={tab === 'frame' ? 'on' : ''} onClick={() => { setTab('frame'); setMsg(null); }}>
                        보드 테두리
                    </button>
                    <button className={tab === 'buddy' ? 'on' : ''} onClick={() => { setTab('buddy'); setMsg(null); }}>
                        캐릭터
                    </button>
                </div>
                <div className="jg-shop-sub">
                    {tab === 'frame' ? '퍼즐판 바깥을 꾸며요 · 그림은 가리지 않아요' : '판 위에서 함께 노는 조각 친구를 꾸며요'}
                </div>
                <div className="jg-shop-scroll" key={tab}>
                    {GRADE_ORDER.map((g) => {
                        const list = store.items.filter((x) => x.grade === g);
                        if (!list.length) return null;
                        return (
                            <section key={g}>
                                <div className="jg-shop-grade">
                                    <i style={{ background: GRADES[g].color }} />
                                    {GRADES[g].label}
                                    <small>
                                        <img src="/coin_Icon.png" alt="" />
                                        {GRADES[g].price}
                                    </small>
                                </div>
                                <div className="jg-shop-grid">
                                    {list.map((item) => {
                                        const owned = store.unlocked.includes(item.id);
                                        const using = store.selected === item.id;
                                        return (
                                            <button key={item.id} className={`jg-fr-card ${using ? 'using' : ''}`} onClick={() => tap(item)}>
                                                {preview(item)}
                                                <span className="nm">{item.name}</span>
                                                <span className={`tag ${using ? 'using' : owned ? 'owned' : 'price'}`}>
                                                    {using ? '사용 중' : owned ? '사용' : (
                                                        <>
                                                            <img src="/coin_Icon.png" alt="" />
                                                            {priceOf(item)}
                                                        </>
                                                    )}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>
                {msg && <div className="jg-shop-msg">{msg}</div>}
            </div>
            {confirm && (
                <div className="jg-shop-confirm" onClick={(e) => { e.stopPropagation(); setConfirm(null); }}>
                    <div className="box" onClick={(e) => e.stopPropagation()}>
                        {preview(confirm, true)}
                        <p>
                            <b>{confirm.name}</b>
                            <br />
                            <img src="/coin_Icon.png" alt="" /> {priceOf(confirm)} 코인으로 살까요?
                        </p>
                        <div className="row">
                            <button className="no" onClick={() => setConfirm(null)}>취소</button>
                            <button className="yes" onClick={doBuy}>구매</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ---------- play ---------- */
interface DragState {
    slots: number[];
    startX: number;
    startY: number;
    dx: number;
    dy: number;
    cellW: number;
    cellH: number;
}

function PlayView({
    stage,
    onExit,
    onNext,
    frame,
    onOpenShop,
    buddy,
}: {
    buddy: BuddySkin;
    stage: JigsawStage;
    onExit: () => void;
    onNext: (() => void) | null;
    frame: string;
    onOpenShop: () => void;
}) {
    const { rows, cols } = stage;
    const n = rows * cols;
    const [board, setBoard] = useState<Board>(() => identity(n));
    const [phase, setPhase] = useState<'ready' | 'go' | 'play'>('ready');
    const [bgmId, setBgmId] = useState<string>(loadBgmPref);
    const [bgmMenu, setBgmMenu] = useState(false);
    const [vols, setVols] = useState(loadVolumes);
    const { coins, spendCoins, addCoins } = useCoins();
    /** board/moves snapshots before each drag, for undo */
    const historyRef = useRef<{ board: Board; moves: number }[]>([]);
    const [historyLen, setHistoryLen] = useState(0);
    /** buddy celebrates a fresh join (bumped to restart the hop animation) */
    const [joy, setJoy] = useState(0);
    const joyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [peeksLeft, setPeeksLeft] = useState(() => freePeeks(n));
    const peekHeld = useRef(false);
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const showToast = (msg: string) => {
        setToast(msg);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 1800);
    };
    const [jitter, setJitter] = useState<number[] | null>(null);
    const [introKey, setIntroKey] = useState(0);
    const [moves, setMoves] = useState(0);
    const [bump, setBump] = useState(0);
    const [drag, setDrag] = useState<DragState | null>(null);
    const [pulse, setPulse] = useState<Set<number>>(new Set());
    const [peek, setPeek] = useState(false);
    const [won, setWon] = useState(false);
    const [result, setResult] = useState<{ stars: number; record: boolean; firstClear: boolean } | null>(null);
    const [shownStars, setShownStars] = useState(0);
    const [sharing, setSharing] = useState(false);
    const [splashes, setSplashes] = useState<{ id: number; x: number; y: number }[]>([]);
    const boardRef = useRef<HTMLDivElement>(null);

    const groups = useMemo(() => computeGroups(board, rows, cols), [board, rows, cols]);
    const slotOf = useMemo(() => {
        const m = new Array<number>(n);
        board.forEach((p, s) => (m[p] = s));
        return m;
    }, [board, n]);

    const reset = useCallback(() => {
        setMoves(0);
        setWon(false);
        setResult(null);
        setPeeksLeft(freePeeks(n));
        historyRef.current = [];
        setHistoryLen(0);
        setShownStars(0);
        setPulse(new Set());
        setIntroKey((k) => k + 1);
    }, [n]);

    /* intro: READY (solved picture) → GO! (wild shuffle) → play */
    useEffect(() => {
        const READY_MS = 5000;
        const STEPS = 6;
        const STEP_MS = 140;
        setPhase('ready');
        setBoard(identity(n));
        setJitter(null);
        const final = shuffleBoard(rows, cols);
        const timers: ReturnType<typeof setTimeout>[] = [];
        timers.push(setTimeout(() => sfx.tick(), 150));
        timers.push(
            setTimeout(() => {
                setPhase('go');
                sfx.go();
            }, READY_MS),
        );
        for (let i = 0; i < STEPS; i++) {
            timers.push(
                setTimeout(() => {
                    const last = i === STEPS - 1;
                    setBoard(last ? final : randomPerm(n));
                    setJitter(last ? null : Array.from({ length: n }, () => (Math.random() - 0.5) * 50));
                    sfx.whoosh(i);
                }, READY_MS + 120 + i * STEP_MS),
            );
        }
        timers.push(setTimeout(() => setPhase('play'), READY_MS + 120 + STEPS * STEP_MS + 380));
        return () => timers.forEach(clearTimeout);
    }, [introKey, n, rows, cols]);

    useEffect(() => {
        if (!won) return;
        const stars = starsFor(stage, moves);
        logEvent('stage_clear', { game: 'jigsaw', stage: stage.id });
        // reward only the first clear of a stage (matches the server-side puzzle-power recount, no farming by replays)
        const firstClear = !(loadStars()[stage.id] > 0);
        const record = saveStars(stage.id, stars);
        if (firstClear) {
            void addCoins(CLEAR_COIN_REWARD);
            import('../../../firebase').then(({ auth }) => {
                const uid = auth.currentUser?.uid;
                if (!uid) return;
                import('../../../services/rankingService').then((m) => m.incrementPuzzlePower(uid)).catch(console.error);
            });
        }
        // clear: the fanfare replaces the BGM (it comes back when the next round starts)
        bgm.stop();
        playClearFanfare();
        const timers: ReturnType<typeof setTimeout>[] = [];
        timers.push(setTimeout(() => setResult({ stars, record, firstClear }), 1100));
        for (let k = 1; k <= stars; k++) {
            timers.push(
                setTimeout(() => {
                    setShownStars(k);
                    sfx.star(k);
                }, 1100 + 300 + k * 260),
            );
        }
        return () => timers.forEach(clearTimeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [won]);

    const onPointerDown = (e: React.PointerEvent, slot: number) => {
        if (won || drag || phase !== 'play') return;
        const rect = boardRef.current?.getBoundingClientRect();
        if (!rect) return;
        e.preventDefault();
        const root = groups[slot];
        const slots: number[] = [];
        groups.forEach((g, s) => g === root && slots.push(s));
        sfx.pick();
        setDrag({ slots, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0, cellW: rect.width / cols, cellH: rect.height / rows });
    };

    useEffect(() => {
        if (!drag) return;
        const move = (e: PointerEvent) => {
            setDrag((d) => (d ? { ...d, dx: e.clientX - d.startX, dy: e.clientY - d.startY } : d));
        };
        const up = (e: PointerEvent) => {
            const d = drag;
            const dc = Math.round((e.clientX - d.startX) / d.cellW);
            const dr = Math.round((e.clientY - d.startY) / d.cellH);
            setDrag(null);
            const next = moveGroup(board, rows, cols, d.slots, dr, dc);
            if (!next) return;
            historyRef.current.push({ board, moves });
            if (historyRef.current.length > 50) historyRef.current.shift();
            setHistoryLen(historyRef.current.length);
            commit(board, next, true);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
        return () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('pointercancel', up);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [drag?.startX, drag?.startY, board]);

    /** apply a new board: count the move, detect fresh joins (glow + splash) and the win */
    function commit(prev: Board, next: Board, countMove: boolean, focusPiece?: number) {
        const before = new Set<string>();
        for (let s = 0; s < n; s++) {
            if (isConnectedRight(prev, s, cols)) before.add(`${prev[s]}r`);
            if (isConnectedDown(prev, s, rows, cols)) before.add(`${prev[s]}d`);
        }
        const fresh = new Set<number>();
        for (let s = 0; s < n; s++) {
            if (isConnectedRight(next, s, cols) && !before.has(`${next[s]}r`)) {
                fresh.add(next[s]);
                fresh.add(next[s + 1]);
            }
            if (isConnectedDown(next, s, rows, cols) && !before.has(`${next[s]}d`)) {
                fresh.add(next[s]);
                fresh.add(next[s + cols]);
            }
        }
        if (focusPiece !== undefined) fresh.add(focusPiece);
        setBoard(next);
        if (countMove) {
            setMoves((m) => m + 1);
            setBump((b) => b + 1);
        }
        if (isSolved(next)) {
            setWon(true);
        } else if (fresh.size) {
            sfx.pop();
            setJoy((j) => j + 1);
            if (joyTimer.current) clearTimeout(joyTimer.current);
            joyTimer.current = setTimeout(() => setJoy(0), 1100);
            setPulse(fresh);
            setTimeout(() => setPulse(new Set()), 500);
            const pos = new Array<number>(n);
            next.forEach((p, sl) => (pos[p] = sl));
            let sx = 0;
            let sy = 0;
            fresh.forEach((p) => {
                sx += (pos[p] % cols) + 0.5;
                sy += Math.floor(pos[p] / cols) + 0.5;
            });
            const id = Date.now();
            const sp = { id, x: (sx / fresh.size / cols) * 100, y: (sy / fresh.size / rows) * 100 };
            setSplashes((arr) => [...arr, sp]);
            setTimeout(() => setSplashes((arr) => arr.filter((a) => a.id !== id)), 700);
        } else {
            sfx.drop();
        }
    }

    const canHelp = phase === 'play' && !won && !drag && !busy;

    /** Magnet: snap one misplaced piece into its correct slot (prefers a piece that joins an already-placed one). */
    const applyMagnet = async () => {
        if (!canHelp) return;
        const misplaced = board.map((p, sl) => (p !== sl ? p : -1)).filter((p) => p >= 0);
        if (!misplaced.length) return;
        if (coins < MAGNET_COST) return showToast(`코인이 부족해요 (${MAGNET_COST}개 필요)`);
        setBusy(true);
        const ok = await spendCoins(MAGNET_COST);
        setBusy(false);
        if (!ok) return showToast('코인이 부족해요');
        const placed = (p: number) => board[p] === p;
        const touchesPlaced = (p: number) => {
            const r = Math.floor(p / cols), c = p % cols;
            return (c > 0 && placed(p - 1)) || (c < cols - 1 && placed(p + 1)) || (r > 0 && placed(p - cols)) || (r < rows - 1 && placed(p + cols));
        };
        const piece = misplaced.find(touchesPlaced) ?? misplaced[0];
        const from = board.indexOf(piece);
        const next = board.slice();
        next[piece] = piece;
        next[from] = board[piece];
        historyRef.current = []; // undo would otherwise rewind past the magnet
        setHistoryLen(0);
        // a magnet snap is still a piece move — count it so the result never reads "0 moves"
        commit(board, next, true, piece);
    };

    /** Undo: restore the board and move count from before the last drag. */
    const applyUndo = async () => {
        if (!canHelp || !historyRef.current.length) return;
        if (coins < UNDO_COST) return showToast(`코인이 부족해요 (${UNDO_COST}개 필요)`);
        setBusy(true);
        const ok = await spendCoins(UNDO_COST);
        setBusy(false);
        if (!ok) return showToast('코인이 부족해요');
        const last = historyRef.current.pop()!;
        setHistoryLen(historyRef.current.length);
        setBoard(last.board);
        setMoves(last.moves);
        setBump((b) => b + 1);
        sfx.drop();
    };

    /** Peek: free uses first, then each press costs PEEK_COST coins. */
    const startPeek = async () => {
        if (won || phase !== 'play') return;
        peekHeld.current = true;
        if (peeksLeft > 0) {
            setPeeksLeft((k) => k - 1);
            setPeek(true);
            return;
        }
        if (busy) return;
        if (coins < PEEK_COST) return showToast(`코인이 부족해요 (${PEEK_COST}개 필요)`);
        setBusy(true);
        const ok = await spendCoins(PEEK_COST);
        setBusy(false);
        if (!ok) return showToast('코인이 부족해요');
        // already released while paying → still show it briefly so the coins aren't wasted
        setPeek(true);
        if (!peekHeld.current) setTimeout(() => setPeek(false), 1200);
    };
    const endPeek = () => {
        peekHeld.current = false;
        setPeek(false);
    };

    // BGM: starts only once the game has actually started (after READY / GO)
    useEffect(() => {
        if (phase !== 'play' || bgmId === 'off' || won) {
            if (bgmId === 'off') bgm.stop();
            return;
        }
        bgm.play(bgmId);
    }, [phase, bgmId, won]);
    useEffect(() => () => bgm.stop(), []);

    const changeVol = (key: 'bgm' | 'sfx', v: number) => {
        const next = { ...vols, [key]: v };
        setVols(next);
        saveVolumes(next);
        if (key === 'bgm') bgm.setVolume(v);
        else sfxVolume = v;
    };
    const previewSfx = () => sfx.pop();

    const pickBgm = (id: string) => {
        setBgmId(id);
        saveBgmPref(id);
        setBgmMenu(false);
    };

    const cardInput = (): ShareCardInput => ({
        image: stage.image,
        title: stage.title,
        stageId: stage.id,
        stars: result?.stars ?? 0,
        moves,
        tint: stage.tint,
        masterpiece: isMasterpiece(stage),
        buddySvg: document.querySelector<SVGElement>('.jg-win-buddy svg'),
    });
    const doShare = async () => {
        if (sharing || !result) return;
        setSharing(true);
        try {
            if ((await shareClear(cardInput())) === 'saved') showToast('이미지를 저장했어요 · 공유 문구도 복사됐어요');
        } catch {
            showToast('공유하지 못했어요');
        }
        setSharing(false);
    };
    const doSave = async () => {
        if (sharing || !result) return;
        setSharing(true);
        try {
            await saveClearCard(cardInput());
            showToast('이미지를 저장했어요');
        } catch {
            showToast('저장하지 못했어요');
        }
        setSharing(false);
    };

    const collection = useMemo(() => {
        if (!result) return null;
        const all = loadStars();
        const ids = new Set(JIGSAW_STAGES.map((x) => x.id));
        const vals = Object.entries(all).filter(([id]) => ids.has(Number(id))).map(([, v]) => v);
        return { cleared: vals.filter((v) => v > 0).length, stars: vals.reduce((a, b) => a + b, 0) };
    }, [result]);

    const dragSet = useMemo(() => new Set(drag?.slots ?? []), [drag]);
    const placed = useMemo(() => board.filter((p, s) => p === s).length, [board]);
    const liveStars = starsFor(stage, moves);

    return (
        <div className="jg-screen jg-play">
            <header className="jg-top">
                <span key={bump} className="jg-score">
                    {moves}
                </span>
                <div className="jg-top-right">
                    <div className="jg-top-btns">
                    <button className="jg-bgm-btn" onClick={onExit} aria-label="나가기">
                        <Home size={18} strokeWidth={2.6} />
                    </button>
                    <button className="jg-bgm-btn" onClick={reset} disabled={won || phase !== 'play'} aria-label="다시 섞기">
                        <Shuffle size={17} strokeWidth={2.6} />
                    </button>
                    <button className="jg-bgm-btn" onClick={onOpenShop} aria-label="꾸미기">
                        <Paintbrush size={17} strokeWidth={2.6} />
                    </button>
                    <div className="jg-bgm">
                        <button
                            className={`jg-bgm-btn ${bgmId === 'off' ? 'off' : ''}`}
                            onClick={() => setBgmMenu((v) => !v)}
                            aria-label="배경음악"
                        >
                            {bgmId === 'off' ? <VolumeX size={18} strokeWidth={2.6} /> : <Music size={18} strokeWidth={2.6} />}
                        </button>
                        {bgmMenu && (
                            <>
                                <div className="jg-bgm-scrim" onClick={() => setBgmMenu(false)} />
                                <div className="jg-bgm-menu">
                                    <div className="jg-vol">
                                        <div className="jg-vol-row">
                                            <span>배경음악</span>
                                            <b>{Math.round(vols.bgm * 100)}</b>
                                        </div>
                                        <input type="range" min={0} max={100} value={Math.round(vols.bgm * 100)}
                                            onChange={(e) => changeVol('bgm', Number(e.target.value) / 100)} aria-label="배경음악 볼륨" />
                                        <div className="jg-vol-row">
                                            <span>효과음</span>
                                            <b>{Math.round(vols.sfx * 100)}</b>
                                        </div>
                                        <input type="range" min={0} max={100} value={Math.round(vols.sfx * 100)}
                                            onChange={(e) => changeVol('sfx', Number(e.target.value) / 100)}
                                            onPointerUp={previewSfx} aria-label="효과음 볼륨" />
                                    </div>
                                    <div className="jg-bgm-head">배경음악 선택</div>
                                    {BGM_TRACKS.map((t) => (
                                        <button key={t.id} className={bgmId === t.id ? 'on' : ''} onClick={() => pickBgm(t.id)}>
                                            <span className="nm">{t.name}</span>
                                            <span className="ds">{t.desc}</span>
                                            {bgmId === t.id && <Check size={16} strokeWidth={3} className="ck" />}
                                        </button>
                                    ))}
                                    <button className={bgmId === 'off' ? 'on' : ''} onClick={() => pickBgm('off')}>
                                        <span className="nm">끄기</span>
                                        {bgmId === 'off' && <Check size={16} strokeWidth={3} className="ck" />}
                                    </button>
                                    {phase !== 'play' && <div className="jg-bgm-note">게임이 시작되면 재생돼요</div>}
                                </div>
                            </>
                        )}
                    </div>
                    </div>
                    <div className="jg-live-stars">
                        {[1, 2, 3].map((k) => (
                            <FlatStar key={k} on={liveStars >= k} size={30} />
                        ))}
                    </div>
                    <span className="jg-placed">
                        {phase === 'play' ? placed : 0}/{n}
                    </span>
                </div>
            </header>

            <div className="jg-board-zone">
                {phase === 'ready' && (
                    <div className="jg-callout ready" key={`r${introKey}`}>
                        <span>READY</span>
                        <i className="jg-callout-bar" />
                    </div>
                )}
                <div key={joy ? `joy${joy}` : 'sit'} className={`jg-sit-buddy ${peek ? 'peeking' : ''} ${won ? 'cheer' : ''} ${joy ? 'joy' : ''}`}>
                    <Buddy size={76} mood={peek || won || joy ? 'happy' : 'idle'} skin={buddy} />
                </div>
                <div className={`jg-frame frame-${frame}`}>
                <div
                    ref={boardRef}
                    className={`jg-board ${won ? 'won' : ''} ${drag ? 'dragging' : ''} ${phase === 'go' ? 'intro-go' : ''}`}
                    style={
                        {
                            '--gap': `${Math.max(1.5, 4 - cols * 0.35)}px`,
                            '--depth': `${cols <= 3 ? 7 : cols <= 4 ? 6 : cols <= 5 ? 5 : 4}px`,
                        } as React.CSSProperties
                    }
                >
                    {Array.from({ length: n }, (_, piece) => {
                        const slot = slotOf[piece];
                        const r = Math.floor(slot / cols);
                        const c = slot % cols;
                        const pr = Math.floor(piece / cols);
                        const pc = piece % cols;
                        const right = isConnectedRight(board, slot, cols);
                        const down = isConnectedDown(board, slot, rows, cols);
                        const left = c > 0 && isConnectedRight(board, slot - 1, cols);
                        const up = r > 0 && isConnectedDown(board, slot - cols, rows, cols);
                        const dragging = dragSet.has(slot);
                        const rad = 'var(--rad)';
                        const CR = 'var(--corner-rad)';
                        const style: React.CSSProperties = {
                            width: `${100 / cols}%`,
                            height: `${100 / rows}%`,
                            transform: `translate(${c * 100}%, ${r * 100}%)${
                                dragging ? ` translate(${drag!.dx}px, ${drag!.dy}px)` : ''
                            }${jitter ? ` rotate(${jitter[piece]}deg) scale(0.9)` : ''}`,
                            // lower rows stack above upper rows so a block's front face tucks under the piece below
                            zIndex: dragging ? 20 : 1 + r,
                            transition: dragging ? 'none' : undefined,
                        };
                        // clip box = visible top face; the art layer always spans the full cell so slices line up
                        const G = 'var(--gap)';
                        const t = up ? '0px' : G;
                        const b = down ? '0px' : G;
                        const l = left ? '0px' : G;
                        const rr = right ? '0px' : G;
                        const inner = {
                            // exposed (not joined) edges; --eb drives the block's front face
                            '--et': up ? 0 : 1,
                            '--eb': down ? 0 : 1,
                            '--el': left ? 0 : 1,
                            '--er': right ? 0 : 1,
                            '--t': t,
                            '--b': b,
                            '--l': l,
                            '--r': rr,
                            top: t,
                            bottom: b,
                            left: l,
                            right: rr,
                            // pieces sitting in a board corner follow the board/frame curve (concentric radius)
                            borderTopLeftRadius: !up && !left ? (r === 0 && c === 0 ? CR : rad) : 0,
                            borderTopRightRadius: !up && !right ? (r === 0 && c === cols - 1 ? CR : rad) : 0,
                            borderBottomLeftRadius: !down && !left ? (r === rows - 1 && c === 0 ? CR : rad) : 0,
                            borderBottomRightRadius: !down && !right ? (r === rows - 1 && c === cols - 1 ? CR : rad) : 0,
                        } as React.CSSProperties;
                        const art: React.CSSProperties = {
                            backgroundImage: `url(${stage.image})`,
                            backgroundSize: `${cols * 100}% ${rows * 100}%`,
                            backgroundPosition: `${cols > 1 ? (pc / (cols - 1)) * 100 : 0}% ${
                                rows > 1 ? (pr / (rows - 1)) * 100 : 0
                            }%`,
                        };
                        const side = !down;
                        return (
                            <div
                                key={piece}
                                data-piece={piece}
                                data-slot={slot}
                                className={`jg-piece ${dragging ? 'is-drag' : ''} ${pulse.has(piece) ? 'is-pulse' : ''}`}
                                style={style}
                                onPointerDown={(e) => onPointerDown(e, slot)}
                            >
                                <div className={`jg-piece-img ${side ? 'has-side' : ''}`} style={inner}>
                                    <div className="jg-piece-art" style={art} />
                                </div>
                            </div>
                        );
                    })}
                    {splashes.map((sp) => (
                        <span key={sp.id} className="jg-splash" style={{ left: `${sp.x}%`, top: `${sp.y}%` }}>
                            {Array.from({ length: 8 }, (_, k) => (
                                <i key={k} style={{ '--a': `${k * 45}deg` } as React.CSSProperties} />
                            ))}
                        </span>
                    ))}
                    {phase === 'go' && (
                        <div className="jg-callout go" key={`g${introKey}`}>
                            <span>GO!</span>
                        </div>
                    )}
                    {peek && !won && <img className="jg-peek" src={stage.image} alt="" draggable={false} />}
                    {won && <img className="jg-reveal" src={stage.image} alt={stage.title} draggable={false} />}
                </div>
                </div>
            </div>

            <div className="jg-controls">
                <button className="jg-round item" onClick={applyUndo} disabled={!canHelp || historyLen === 0} aria-label="되돌리기">
                    <Undo2 size={22} strokeWidth={2.8} />
                    <span className="jg-cost"><img src="/coin_Icon.png" alt="" />{UNDO_COST}</span>
                </button>
                <button
                    className={`jg-round big item ${peek ? 'pressed' : ''}`}
                    onPointerDown={startPeek}
                    onPointerUp={endPeek}
                    onPointerLeave={endPeek}
                    onPointerCancel={endPeek}
                    onContextMenu={(e) => e.preventDefault()}
                    disabled={won || phase !== 'play'}
                    aria-label="원본 보기"
                >
                    <Eye size={30} strokeWidth={2.8} />
                    {peeksLeft > 0 ? (
                        <span className="jg-cost free">남은 {peeksLeft}회</span>
                    ) : (
                        <span className="jg-cost"><img src="/coin_Icon.png" alt="" />{PEEK_COST}</span>
                    )}
                </button>
                <button className="jg-round item" onClick={applyMagnet} disabled={!canHelp} aria-label="조각 자석">
                    <Magnet size={22} strokeWidth={2.8} />
                    <span className="jg-cost"><img src="/coin_Icon.png" alt="" />{MAGNET_COST}</span>
                </button>
            </div>
            <p className="jg-hint">
                {peeksLeft > 0 ? '눈 버튼을 꾹 누르면 원본이 보여요' : `원본 보기를 다 썼어요 · 한 번 더 보려면 ${PEEK_COST}코인`}
            </p>
            <div className="jg-coins-left">
                <img src="/coin_Icon.png" alt="" />
                {coins.toLocaleString()}
            </div>
            {toast && <div className="jg-toast">{toast}</div>}

            {result && (
                <div className="jg-win">
                    <div className="jg-pattern" aria-hidden />
                    <div className="jg-win-rays" aria-hidden />
                    <div className="jg-win-confetti" aria-hidden>
                        {CLEAR_CONFETTI.map((c, i) => (
                            <i
                                key={i}
                                style={{
                                    left: `${c.left}%`,
                                    width: c.w,
                                    height: c.w * 1.4,
                                    background: c.color,
                                    animationDelay: `${c.delay}s`,
                                    animationDuration: `${c.dur}s`,
                                    rotate: `${c.rot}deg`,
                                }}
                            />
                        ))}
                    </div>
                    <div className="jg-win-inner">
                        <div className="jg-win-top">
                            <span className="jg-win-stage">STAGE {pad2(stage.id)}</span>
                            <span className="jg-win-head">완성!</span>
                        </div>
                        <div className={`jg-win-card ${isMasterpiece(stage) ? 'masterpiece' : ''}`}>
                            {isMasterpiece(stage) && <span className="jg-win-mp">명화 컬렉션</span>}
                            <span className={`jg-win-stamp g${result.stars}`}>{GRADE[result.stars]}</span>
                            <div className="jg-win-stars">
                                {[1, 2, 3].map((k) => (
                                    <span key={k} className={`slot s${k} ${shownStars >= k ? 'lit' : ''}`}>
                                        <FlatStar on={false} size={k === 2 ? 76 : 60} />
                                        <span className="on-star">
                                            <FlatStar on size={k === 2 ? 76 : 60} />
                                        </span>
                                    </span>
                                ))}
                            </div>
                            <div className="jg-win-photo">
                                <img src={stage.image} alt="" />
                                <div className="jg-win-buddy">
                                    <Buddy size={78} mood="happy" skin={buddy} />
                                </div>
                            </div>
                            <div className="jg-win-title">{stage.title}</div>
                            <div className="jg-win-score">
                                <span className="num">{moves}</span>
                                <span className="lbl">번 만에 완성</span>
                                {result.record && <span className="jg-best">BEST</span>}
                            </div>
                        </div>
                        {result.firstClear ? (
                            <div className="jg-win-rewards">
                                <span className="jg-reward-chip" style={{ animationDelay: '0.9s' }}>
                                    <img src="/coin_Icon.png" alt="" />+{CLEAR_COIN_REWARD}
                                </span>
                                <span className="jg-reward-chip" style={{ animationDelay: '1.1s' }}>
                                    <FlatStar size={20} />퍼즐력 +1
                                </span>
                            </div>
                        ) : (
                            <div className="jg-win-rewards note">처음 클리어할 때만 보상을 받아요</div>
                        )}
                        {collection && (
                            <div className="jg-win-collect">
                                그림 <b>{collection.cleared}</b> / {JIGSAW_STAGES.length} 수집 · <FlatStar size={15} /> <b>{collection.stars}</b>
                            </div>
                        )}
                        <div className="jg-share-row">
                            <button className="jg-share-btn" onClick={doShare} disabled={sharing}>
                                <Share2 size={26} strokeWidth={3} /> 친구에게 자랑하기
                            </button>
                            <button className="jg-save-btn" onClick={doSave} disabled={sharing} aria-label="이미지 저장">
                                <Download size={24} strokeWidth={3} />
                            </button>
                        </div>
                        <p className="jg-share-hint">친구에게 도전장을 보내 보세요 ✉️</p>
                        <div className="jg-win-actions">
                            <button className="jg-round" onClick={onExit} aria-label="홈">
                                <Home size={24} strokeWidth={2.8} />
                            </button>
                            <button className="jg-round" onClick={reset} aria-label="다시 하기">
                                <RotateCcw size={22} strokeWidth={2.8} />
                            </button>
                            {onNext && (
                                <button className="jg-play-btn small" onClick={onNext}>
                                    다음 <ChevronRight size={24} strokeWidth={3.4} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/** first stage not cleared yet (the "current" stage); last stage when everything is cleared */
function frontierIdx(): number {
    const stars = loadStars();
    const i = JIGSAW_STAGES.findIndex((s) => !(stars[s.id] > 0));
    return i === -1 ? JIGSAW_STAGES.length - 1 : i;
}

export default function JigsawGame() {
    const [stage, setStage] = useState<JigsawStage | null>(null);
    const [homeIdx, setHomeIdx] = useState(frontierIdx);
    const [color, setColor] = useState(JIGSAW_STAGES[homeIdx].tint);
    const [listOpen, setListOpen] = useState(false);
    const [shopOpen, setShopOpen] = useState(false);
    // 게임 시작을 한 번만 기록한다(스테이지가 넘어갈 때마다 세면 게임별 비교가 망가진다).
    const hasLoggedPlay = useRef(false);
    useEffect(() => {
        if (!stage || hasLoggedPlay.current) return;
        hasLoggedPlay.current = true;
        logEvent('game_play', { game: 'jigsaw', stage: stage.id });
    }, [stage]);
    const frames = useBoardFrames();
    const buddies = useBuddySkins();
    const buddy = BUDDY_SKINS.find((b) => b.id === buddies.selected) ?? BUDDY_SKINS[0];
    const idx = stage ? JIGSAW_STAGES.findIndex((s) => s.id === stage.id) : -1;
    const next = idx >= 0 && idx < JIGSAW_STAGES.length - 1 ? JIGSAW_STAGES[idx + 1] : null;

    /** 스테이지를 깬 뒤 다음으로 넘어갈 때 — 전면 광고를 한 번 띄운다(다른 게임과 같은 방식) */
    const goNextWithAd = (s: JigsawStage) => {
        bgm.stop();
        if (import.meta.env.DEV || !window.adBreak) {
            play(s);
            return;
        }
        window.adBreak({ type: 'next', name: 'jigsaw-stage-complete', adBreakDone: () => play(s) });
    };

    const play = (s: JigsawStage) => {
        setStage(s);
        setColor(s.tint);
        setHomeIdx(JIGSAW_STAGES.findIndex((x) => x.id === s.id));
    };

    // back from a stage: jump to the new frontier if that stage was the frontier (just cleared → next one),
    // stay on it when replaying an older stage
    const exitToHome = () => {
        const f = frontierIdx();
        const target = idx >= f - 1 ? f : idx;
        setHomeIdx(target);
        setColor(JIGSAW_STAGES[target].tint);
        setStage(null);
    };

    return (
        <div className="jg-root" style={{ '--bg': color } as React.CSSProperties}>
            <div className="jg-pattern" aria-hidden />
            {stage ? (
                <PlayView
                    key={stage.id}
                    stage={stage}
                    onExit={exitToHome}
                    onNext={next ? () => goNextWithAd(next) : null}
                    frame={frames.selected}
                    buddy={buddy}
                    onOpenShop={() => setShopOpen(true)}
                />
            ) : listOpen ? (
                <StageList
                    current={homeIdx}
                    onBack={() => setListOpen(false)}
                    onPick={(i) => {
                        sfx.tap();
                        setHomeIdx(i);
                        setColor(JIGSAW_STAGES[i].tint);
                        setListOpen(false);
                    }}
                />
            ) : (
                <HomeScreen
                    key={homeIdx}
                    initial={homeIdx}
                    onPlay={play}
                    onColor={setColor}
                    onOpenList={(i) => {
                        setHomeIdx(i);
                        setListOpen(true);
                    }}
                    onOpenShop={() => setShopOpen(true)}
                    buddy={buddy}
                />
            )}
            {shopOpen && (
                <CosmeticShop frames={frames} buddies={buddies} image={(stage ?? JIGSAW_STAGES[homeIdx]).image} onClose={() => setShopOpen(false)} />
            )}
        </div>
    );
}
