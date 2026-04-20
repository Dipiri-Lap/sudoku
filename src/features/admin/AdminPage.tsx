import React, { useState, useCallback } from 'react';
import { auth } from '../../firebase';
import {
    collection, doc, getDoc, getDocs, setDoc,
    query, where, orderBy,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { ALL_CHALLENGES } from '../../data/challenges';

// ── Types ────────────────────────────────────────────────────────────────────

interface UserDoc {
    uid: string;
    nickname: string;
    photoURL: string;
    coins: number;
    puzzlePower: number;
    unlockedAvatars: string[];
    activeTitle: string | null;
    bestTimes: Record<string, number>;
    unlockedWordSortBacks: string[];
    selectedWordSortBack: string;
    createdAt?: string;
}

interface SudokuProgressDoc {
    sudokuStageProgress: number;
    beginnerProgress: number;
    bestTimes: Record<string, number>;
    nickname?: string;
}

interface ChallengesDoc {
    clearedIds: string[];
    claimedIds: string[];
    puzzlePower: number;
    mainDocSyncedPP: number;
}

interface WordSortProgressDoc {
    clearedLevel: number;
}

interface UserRow {
    uid: string;
    nickname: string;
    coins: number;
    puzzlePower: number;
}

const ALL_CHALLENGE_LIST = [
    ...ALL_CHALLENGES['sudoku'],
    ...ALL_CHALLENGES['word-sort'],
];

const SUDOKU_DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Expert', 'Master'];

// ── Styles ───────────────────────────────────────────────────────────────────

const S = {
    page: {
        display: 'flex', height: '100vh', fontFamily: 'monospace',
        fontSize: '13px', background: '#0f172a', color: '#e2e8f0',
    } as React.CSSProperties,
    sidebar: {
        width: '260px', flexShrink: 0, borderRight: '1px solid #1e293b',
        display: 'flex', flexDirection: 'column' as const, overflow: 'hidden',
    },
    sidebarHeader: {
        padding: '12px', borderBottom: '1px solid #1e293b',
        background: '#1e293b', fontWeight: 700, fontSize: '14px',
    },
    searchBox: {
        width: '100%', boxSizing: 'border-box' as const,
        padding: '8px 10px', background: '#0f172a', border: 'none',
        borderBottom: '1px solid #1e293b', color: '#e2e8f0',
        fontFamily: 'monospace', fontSize: '12px', outline: 'none',
    },
    userList: { flex: 1, overflowY: 'auto' as const },
    userRow: (selected: boolean): React.CSSProperties => ({
        padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #1e293b',
        background: selected ? '#334155' : 'transparent',
        borderLeft: selected ? '3px solid #3b82f6' : '3px solid transparent',
    }),
    main: { flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' },
    topbar: {
        padding: '10px 16px', background: '#1e293b', borderBottom: '1px solid #334155',
        display: 'flex', alignItems: 'center', gap: '10px',
    },
    tabs: {
        display: 'flex', borderBottom: '1px solid #1e293b', background: '#0f172a',
    },
    tab: (active: boolean): React.CSSProperties => ({
        padding: '10px 18px', cursor: 'pointer', borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
        color: active ? '#3b82f6' : '#94a3b8', fontWeight: active ? 700 : 400,
    }),
    content: { flex: 1, overflowY: 'auto' as const, padding: '20px' },
    section: { marginBottom: '24px' },
    sectionTitle: {
        fontWeight: 700, fontSize: '12px', color: '#64748b',
        textTransform: 'uppercase' as const, letterSpacing: '0.05em',
        marginBottom: '10px', borderBottom: '1px solid #1e293b', paddingBottom: '6px',
    },
    fieldRow: {
        display: 'flex', alignItems: 'center', gap: '8px',
        marginBottom: '8px',
    },
    label: { width: '180px', flexShrink: 0, color: '#94a3b8' },
    input: {
        flex: 1, padding: '5px 8px', background: '#1e293b', border: '1px solid #334155',
        color: '#e2e8f0', fontFamily: 'monospace', fontSize: '12px',
        borderRadius: '4px', outline: 'none',
    },
    btn: (color?: string): React.CSSProperties => ({
        padding: '5px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer',
        fontFamily: 'monospace', fontSize: '12px', fontWeight: 700,
        background: color ?? '#3b82f6', color: 'white',
    }),
    btnSmall: (color?: string): React.CSSProperties => ({
        padding: '3px 8px', border: 'none', borderRadius: '3px', cursor: 'pointer',
        fontFamily: 'monospace', fontSize: '11px',
        background: color ?? '#334155', color: '#e2e8f0',
    }),
    tag: (active: boolean, color?: string): React.CSSProperties => ({
        padding: '2px 8px', borderRadius: '12px', fontSize: '11px', cursor: 'pointer',
        background: active ? (color ?? '#3b82f6') : '#1e293b',
        color: active ? 'white' : '#64748b',
        border: `1px solid ${active ? (color ?? '#3b82f6') : '#334155'}`,
    }),
    toast: {
        position: 'fixed' as const, bottom: '20px', right: '20px',
        background: '#22c55e', color: 'white', padding: '10px 16px',
        borderRadius: '8px', fontWeight: 700, zIndex: 9999,
    },
    errorToast: {
        position: 'fixed' as const, bottom: '20px', right: '20px',
        background: '#ef4444', color: 'white', padding: '10px 16px',
        borderRadius: '8px', fontWeight: 700, zIndex: 9999,
    },
};

// ── Component ────────────────────────────────────────────────────────────────

const AdminPage: React.FC = () => {
    const [searchInput, setSearchInput] = useState('');
    const [searchResults, setSearchResults] = useState<UserRow[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedUid, setSelectedUid] = useState<string | null>(null);
    const [tab, setTab] = useState<'profile' | 'sudoku' | 'wordsort' | 'challenges'>('profile');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    // Data states
    const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
    const [sudokuDoc, setSudokuDoc] = useState<SudokuProgressDoc | null>(null);
    const [challengesDoc, setChallengesDoc] = useState<ChallengesDoc | null>(null);
    const [wordSortDoc, setWordSortDoc] = useState<WordSortProgressDoc | null>(null);

    // Edit states (local drafts)
    const [editUser, setEditUser] = useState<Partial<UserDoc>>({});
    const [editSudoku, setEditSudoku] = useState<Partial<SudokuProgressDoc>>({});
    const [editChallenges, setEditChallenges] = useState<Partial<ChallengesDoc>>({});
    const [editWordSort, setEditWordSort] = useState<Partial<WordSortProgressDoc>>({});

    const showToast = useCallback((msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 2500);
    }, []);

    // Search users by nickname prefix
    const handleSearch = async () => {
        const term = searchInput.trim();
        if (!term) return;
        setSearching(true);
        try {
            const q = query(
                collection(db, 'users'),
                where('nickname', '>=', term),
                where('nickname', '<=', term + '\uf8ff'),
                orderBy('nickname'),
            );
            const snap = await getDocs(q);
            setSearchResults(snap.docs.map(d => {
                const data = d.data();
                return { uid: d.id, nickname: data.nickname ?? d.id.slice(0, 8), coins: data.coins ?? 0, puzzlePower: data.puzzlePower ?? 0 };
            }));
        } finally {
            setSearching(false);
        }
    };

    // Load selected user's all subcollection data
    const loadUser = useCallback(async (uid: string) => {
        setSelectedUid(uid);
        setLoading(true);
        try {
            const [uSnap, sSnap, cSnap, wSnap] = await Promise.all([
                getDoc(doc(db, 'users', uid)),
                getDoc(doc(db, 'users', uid, 'sudokuProgress', 'data')),
                getDoc(doc(db, 'users', uid, 'challenges', 'data')),
                getDoc(doc(db, 'users', uid, 'wordSortProgress', 'data')),
            ]);

            const u: UserDoc = uSnap.exists() ? uSnap.data() as UserDoc : {
                uid, nickname: '', photoURL: '1', coins: 0, puzzlePower: 0,
                unlockedAvatars: [], activeTitle: null, bestTimes: {},
                unlockedWordSortBacks: [], selectedWordSortBack: '1',
            };
            const s: SudokuProgressDoc = sSnap.exists() ? sSnap.data() as SudokuProgressDoc
                : { sudokuStageProgress: 0, beginnerProgress: 0, bestTimes: {} };
            const c: ChallengesDoc = cSnap.exists() ? cSnap.data() as ChallengesDoc
                : { clearedIds: [], claimedIds: [], puzzlePower: 0, mainDocSyncedPP: 0 };
            const w: WordSortProgressDoc = wSnap.exists() ? wSnap.data() as WordSortProgressDoc
                : { clearedLevel: 0 };

            setUserDoc(u);
            setSudokuDoc(s);
            setChallengesDoc(c);
            setWordSortDoc(w);
            setEditUser({});
            setEditSudoku({});
            setEditChallenges({});
            setEditWordSort({});
        } catch (e) {
            showToast(`권한 오류: ${String(e)}`, false);
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    // ── Save helpers ──────────────────────────────────────────────────────────

    const saveUser = async () => {
        if (!selectedUid || !userDoc) return;
        try {
            const merged = { ...userDoc, ...editUser };
            await setDoc(doc(db, 'users', selectedUid), merged, { merge: true });
            setUserDoc(merged);
            setEditUser({});
            setSearchResults(prev => prev.map(u => u.uid === selectedUid
                ? { ...u, nickname: merged.nickname, coins: merged.coins, puzzlePower: merged.puzzlePower }
                : u));
            showToast('프로필 저장 완료');
        } catch (e) { showToast(String(e), false); }
    };

    const saveSudoku = async () => {
        if (!selectedUid || !sudokuDoc) return;
        try {
            const merged = { ...sudokuDoc, ...editSudoku };
            await setDoc(doc(db, 'users', selectedUid, 'sudokuProgress', 'data'), merged, { merge: true });
            setSudokuDoc(merged);
            setEditSudoku({});
            showToast('스도쿠 저장 완료');
        } catch (e) { showToast(String(e), false); }
    };

    const saveChallenges = async () => {
        if (!selectedUid || !challengesDoc) return;
        try {
            const merged = { ...challengesDoc, ...editChallenges };
            await setDoc(doc(db, 'users', selectedUid, 'challenges', 'data'), merged, { merge: true });
            setChallengesDoc(merged);
            setEditChallenges({});
            showToast('챌린지 저장 완료');
        } catch (e) { showToast(String(e), false); }
    };

    const saveWordSort = async () => {
        if (!selectedUid || !wordSortDoc) return;
        try {
            const merged = { ...wordSortDoc, ...editWordSort };
            await setDoc(doc(db, 'users', selectedUid, 'wordSortProgress', 'data'), merged, { merge: true });
            setWordSortDoc(merged);
            setEditWordSort({});
            showToast('워드소트 저장 완료');
        } catch (e) { showToast(String(e), false); }
    };

    // ── Computed values ───────────────────────────────────────────────────────

    const curUser = userDoc ? { ...userDoc, ...editUser } : null;
    const curSudoku = sudokuDoc ? { ...sudokuDoc, ...editSudoku } : null;
    const curChallenges = challengesDoc ? { ...challengesDoc, ...editChallenges } : null;
    const curWordSort = wordSortDoc ? { ...wordSortDoc, ...editWordSort } : null;

    // ── Toggle helpers ────────────────────────────────────────────────────────

    const toggleAvatar = (id: string) => {
        if (!curUser) return;
        const cur = curUser.unlockedAvatars ?? [];
        setEditUser(prev => ({
            ...prev,
            unlockedAvatars: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id],
        }));
    };

    const toggleWordSortBack = (id: string) => {
        if (!curUser) return;
        const cur = curUser.unlockedWordSortBacks ?? [];
        setEditUser(prev => ({
            ...prev,
            unlockedWordSortBacks: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id],
        }));
    };

    const toggleChallengeCleared = (id: string) => {
        if (!curChallenges) return;
        const cur = curChallenges.clearedIds ?? [];
        setEditChallenges(prev => ({
            ...prev,
            clearedIds: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id],
        }));
    };

    const toggleChallengeClaimed = (id: string) => {
        if (!curChallenges) return;
        const cur = curChallenges.claimedIds ?? [];
        setEditChallenges(prev => ({
            ...prev,
            claimedIds: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id],
        }));
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div style={S.page}>
            {/* Sidebar */}
            <div style={S.sidebar}>
                <div style={S.sidebarHeader}>🛠 Admin</div>
                <div style={{ display: 'flex', borderBottom: '1px solid #1e293b' }}>
                    <input
                        style={{ ...S.searchBox, borderBottom: 'none', flex: 1 }}
                        placeholder="닉네임 검색..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    />
                    <button
                        onClick={handleSearch}
                        disabled={searching}
                        style={{ ...S.btn(), borderRadius: 0, padding: '0 12px', flexShrink: 0 }}
                    >{searching ? '...' : '검색'}</button>
                </div>
                <div style={S.userList}>
                    {searchResults.length === 0 && (
                        <div style={{ padding: '16px 12px', color: '#334155', fontSize: '12px' }}>
                            닉네임을 입력 후 검색하세요
                        </div>
                    )}
                    {searchResults.map(u => (
                        <div
                            key={u.uid}
                            style={S.userRow(u.uid === selectedUid)}
                            onClick={() => loadUser(u.uid)}
                        >
                            <div style={{ fontWeight: 700, color: '#e2e8f0' }}>{u.nickname}</div>
                            <div style={{ color: '#64748b', fontSize: '11px' }}>
                                {u.uid.slice(0, 16)}... · 🪙{u.coins} · ⚡{u.puzzlePower}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main */}
            <div style={S.main}>
                <div style={S.topbar}>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>
                        {selectedUid
                            ? `${curUser?.nickname ?? '...'} — ${selectedUid}`
                            : '유저를 선택하세요'}
                    </span>
                    {loading && <span style={{ color: '#64748b' }}>로딩 중...</span>}
                </div>

                {selectedUid && !loading && (
                    <>
                        <div style={S.tabs}>
                            {(['profile', 'sudoku', 'wordsort', 'challenges'] as const).map(t => (
                                <div key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>
                                    {{ profile: '프로필', sudoku: '스도쿠', wordsort: '워드소트', challenges: '챌린지' }[t]}
                                </div>
                            ))}
                        </div>

                        <div style={S.content}>

                            {/* ── Profile Tab ── */}
                            {tab === 'profile' && curUser && (
                                <>
                                    <div style={S.section}>
                                        <div style={S.sectionTitle}>기본 정보</div>

                                        {([
                                            ['nickname', '닉네임', 'text'],
                                            ['coins', '코인', 'number'],
                                            ['puzzlePower', '퍼즐 파워', 'number'],
                                            ['photoURL', '아바타 ID (photoURL)', 'text'],
                                            ['activeTitle', '활성 타이틀 ID', 'text'],
                                        ] as [keyof UserDoc, string, string][]).map(([key, label, type]) => (
                                            <div key={key} style={S.fieldRow}>
                                                <span style={S.label}>{label}</span>
                                                <input
                                                    style={S.input}
                                                    type={type}
                                                    value={String(curUser[key] ?? '')}
                                                    onChange={e => setEditUser(prev => ({
                                                        ...prev,
                                                        [key]: type === 'number' ? Number(e.target.value) : e.target.value || null,
                                                    }))}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div style={S.section}>
                                        <div style={S.sectionTitle}>잠금해제된 아바타 (1–40)</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {Array.from({ length: 40 }, (_, i) => String(i + 1)).map(id => (
                                                <span
                                                    key={id}
                                                    style={S.tag((curUser.unlockedAvatars ?? []).includes(id))}
                                                    onClick={() => toggleAvatar(id)}
                                                >{id}</span>
                                            ))}
                                        </div>
                                        <div style={{ marginTop: '6px', color: '#64748b', fontSize: '11px' }}>
                                            클릭으로 토글 · 파란색 = 잠금해제됨
                                        </div>
                                    </div>

                                    <div style={S.section}>
                                        <div style={S.sectionTitle}>타임어택 베스트 기록 (초)</div>
                                        {SUDOKU_DIFFICULTIES.map(diff => (
                                            <div key={diff} style={S.fieldRow}>
                                                <span style={S.label}>{diff}</span>
                                                <input
                                                    style={S.input}
                                                    type="number"
                                                    placeholder="없음"
                                                    value={curUser.bestTimes?.[diff] ?? ''}
                                                    onChange={e => {
                                                        const val = e.target.value === '' ? undefined : Number(e.target.value);
                                                        const next = { ...(curUser.bestTimes ?? {}) };
                                                        if (val === undefined) delete next[diff]; else next[diff] = val;
                                                        setEditUser(prev => ({ ...prev, bestTimes: next }));
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <button style={S.btn()} onClick={saveUser}>프로필 저장</button>
                                </>
                            )}

                            {/* ── Sudoku Tab ── */}
                            {tab === 'sudoku' && curSudoku && (
                                <>
                                    <div style={S.section}>
                                        <div style={S.sectionTitle}>스테이지 진행</div>

                                        {([
                                            ['sudokuStageProgress', '일반 스테이지 진행도', 'number'],
                                            ['beginnerProgress', '입문 스테이지 진행도 (max 5)', 'number'],
                                        ] as [keyof SudokuProgressDoc, string, string][]).map(([key, label]) => (
                                            <div key={key} style={S.fieldRow}>
                                                <span style={S.label}>{label}</span>
                                                <input
                                                    style={S.input}
                                                    type="number"
                                                    value={String(curSudoku[key] ?? 0)}
                                                    onChange={e => setEditSudoku(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div style={S.section}>
                                        <div style={S.sectionTitle}>서브컬렉션 베스트 기록 (sudokuProgress/data)</div>
                                        {SUDOKU_DIFFICULTIES.map(diff => (
                                            <div key={diff} style={S.fieldRow}>
                                                <span style={S.label}>{diff}</span>
                                                <input
                                                    style={S.input}
                                                    type="number"
                                                    placeholder="없음"
                                                    value={curSudoku.bestTimes?.[diff] ?? ''}
                                                    onChange={e => {
                                                        const val = e.target.value === '' ? undefined : Number(e.target.value);
                                                        const next = { ...(curSudoku.bestTimes ?? {}) };
                                                        if (val === undefined) delete next[diff]; else next[diff] = val;
                                                        setEditSudoku(prev => ({ ...prev, bestTimes: next }));
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <button style={S.btn()} onClick={saveSudoku}>스도쿠 저장</button>
                                </>
                            )}

                            {/* ── Word Sort Tab ── */}
                            {tab === 'wordsort' && curWordSort && curUser && (
                                <>
                                    <div style={S.section}>
                                        <div style={S.sectionTitle}>워드소트 진행</div>
                                        <div style={S.fieldRow}>
                                            <span style={S.label}>클리어 레벨</span>
                                            <input
                                                style={S.input}
                                                type="number"
                                                value={curWordSort.clearedLevel ?? 0}
                                                onChange={e => setEditWordSort(prev => ({ ...prev, clearedLevel: Number(e.target.value) }))}
                                            />
                                        </div>
                                    </div>

                                    <div style={S.section}>
                                        <div style={S.sectionTitle}>잠금해제된 카드백 (1–20)</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {Array.from({ length: 20 }, (_, i) => String(i + 1)).map(id => (
                                                <span
                                                    key={id}
                                                    style={S.tag((curUser.unlockedWordSortBacks ?? []).includes(id), '#8b5cf6')}
                                                    onClick={() => toggleWordSortBack(id)}
                                                >{id}</span>
                                            ))}
                                        </div>
                                        <div style={{ marginTop: '6px', color: '#64748b', fontSize: '11px' }}>
                                            클릭으로 토글 · 보라색 = 잠금해제됨
                                        </div>
                                    </div>

                                    <div style={S.section}>
                                        <div style={S.sectionTitle}>선택된 카드백</div>
                                        <div style={S.fieldRow}>
                                            <span style={S.label}>selectedWordSortBack</span>
                                            <input
                                                style={S.input}
                                                type="text"
                                                value={curUser.selectedWordSortBack ?? '1'}
                                                onChange={e => setEditUser(prev => ({ ...prev, selectedWordSortBack: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button style={S.btn()} onClick={saveWordSort}>워드소트 진행 저장</button>
                                        <button style={S.btn('#8b5cf6')} onClick={saveUser}>카드백 저장 (프로필)</button>
                                    </div>
                                </>
                            )}

                            {/* ── Challenges Tab ── */}
                            {tab === 'challenges' && curChallenges && (
                                <>
                                    <div style={S.section}>
                                        <div style={S.sectionTitle}>챌린지 수치</div>
                                        {([
                                            ['puzzlePower', '챌린지 퍼즐파워 합계'],
                                            ['mainDocSyncedPP', '메인 doc 싱크된 PP'],
                                        ] as [keyof ChallengesDoc, string][]).map(([key, label]) => (
                                            <div key={key} style={S.fieldRow}>
                                                <span style={S.label}>{label}</span>
                                                <input
                                                    style={S.input}
                                                    type="number"
                                                    value={String(curChallenges[key] ?? 0)}
                                                    onChange={e => setEditChallenges(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div style={S.section}>
                                        <div style={S.sectionTitle}>챌린지 상태 (cleared = 조건 달성, claimed = 보상 수령)</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                            {ALL_CHALLENGE_LIST.map(ch => {
                                                const cleared = (curChallenges.clearedIds ?? []).includes(ch.id);
                                                const claimed = (curChallenges.claimedIds ?? []).includes(ch.id);
                                                return (
                                                    <div key={ch.id} style={{
                                                        padding: '8px 10px', background: '#1e293b',
                                                        borderRadius: '6px', border: '1px solid #334155',
                                                    }}>
                                                        <div style={{ fontWeight: 700, marginBottom: '4px', fontSize: '12px' }}>
                                                            {ch.title}
                                                        </div>
                                                        <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '6px' }}>
                                                            {ch.id} · {ch.game}
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                            <span
                                                                style={S.tag(cleared, '#f59e0b')}
                                                                onClick={() => toggleChallengeCleared(ch.id)}
                                                            >달성</span>
                                                            <span
                                                                style={S.tag(claimed, '#22c55e')}
                                                                onClick={() => toggleChallengeClaimed(ch.id)}
                                                            >수령</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <button style={S.btn()} onClick={saveChallenges}>챌린지 저장</button>
                                </>
                            )}
                        </div>
                    </>
                )}

                {!selectedUid && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
                        ← 왼쪽에서 유저를 선택하세요
                    </div>
                )}
            </div>

            {toast && (
                <div style={toast.ok ? S.toast : S.errorToast}>{toast.msg}</div>
            )}
        </div>
    );
};

export default AdminPage;
