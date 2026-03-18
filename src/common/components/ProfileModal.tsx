import React, { useState, useEffect, useRef } from 'react';
import { X, Edit2, Check, Lock, Coins, Star } from 'lucide-react'; // Lock은 아바타 탭에서 사용
import { updateProfileInfo, getUserProfile, unlockAvatar, getTopRankings, getUserRank, updateActiveTitle } from '../../services/rankingService';
import type { UserProfile as UserProfileType } from '../../services/rankingService';
import { Trophy, Users } from 'lucide-react';
import { useCoins } from '../../context/CoinContext';
import { useChallenges } from '../../context/ChallengeContext';
import { ALL_CHALLENGES, CHALLENGE_MAP, type Challenge } from '../../data/challenges';
import { useSudokuProgress } from '../../context/SudokuProgressContext';

interface ProfileModalProps {
    uid: string;
    currentNickname: string;
    currentPhotoURL: string | null;
    onClose: () => void;
    onSaveSuccess: (newNickname: string, newPhotoURL: string | null) => void;
    onActiveTitleChange?: (titleId: string | null) => void;
}

// 1-40 local avatar IDs
const AVATAR_SEEDS = Array.from({ length: 40 }, (_, i) => String(i + 1));

export const getAvatarUrl = (seed: string) => {
    if (seed.startsWith('http') || seed.startsWith('/')) return seed;
    const num = parseInt(seed, 10);
    const validSeed = (!isNaN(num) && num >= 1 && num <= 40) ? seed : '1';
    return `/assets/profiles/${validSeed}.png`;
};

const ProfileModal: React.FC<ProfileModalProps> = ({
    uid,
    currentNickname,
    currentPhotoURL,
    onClose,
    onSaveSuccess,
    onActiveTitleChange,
}) => {
    const { coins, spendCoins } = useCoins();
    const [nickname, setNickname] = useState(currentNickname);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(currentPhotoURL);
    const [unlockedAvatars, setUnlockedAvatars] = useState<string[]>(['1', '2', '3', '4', '5', '6', '7', '8']);
    const [pendingUnlockAvatar, setPendingUnlockAvatar] = useState<string | null>(null);
    const [activeTitle, setActiveTitle] = useState<string | null>(null);

    const challenges = useChallenges();
    const { stageProgress, beginnerProgress } = useSudokuProgress();

    /** Returns { current, target } for the challenge's progress bar */
    const getProgress = (challenge: Challenge): { current: number; target: number } => {
        const { source, target } = challenge.progressConfig;
        switch (source) {
            case 'regular_stage':
                return { current: Math.min(stageProgress - 1, target), target };
            case 'beginner_stage':
                return { current: Math.min(beginnerProgress, target), target };
            case 'time_attack': {
                const cleared = challenges.isChallengeCleared(challenge.id) || challenges.isChallengeCompleted(challenge.id);
                return { current: cleared ? 1 : 0, target: 1 };
            }
        }
    };

    /** True when condition is met but reward not yet claimed */
    const isReadyToClaim = (challenge: Challenge): boolean => {
        if (challenges.isChallengeCompleted(challenge.id)) return false;
        const { source } = challenge.progressConfig;
        if (source === 'time_attack') return challenges.isChallengeCleared(challenge.id);
        const { current, target } = getProgress(challenge);
        return current >= target;
    };

    const hasUnclaimed = Object.values(ALL_CHALLENGES).flat().some(c => isReadyToClaim(c));

    // Tab & Ranking state
    const [activeTab, setActiveTab] = useState<'avatar' | 'ranking' | 'challenge'>('avatar');
    const [topRankings, setTopRankings] = useState<UserProfileType[]>([]);
    const [userRank, setUserRank] = useState<string>('');
    const [isLoadingRankings, setIsLoadingRankings] = useState(false);

    // Mouse drag scroll state
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setStartY(e.pageY - scrollRef.current.offsetTop);
        setScrollLeft(scrollRef.current.scrollLeft);
        setScrollTop(scrollRef.current.scrollTop);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const y = e.pageY - scrollRef.current.offsetTop;
        const walkX = (x - startX) * 1.5; // Scroll speed
        const walkY = (y - startY) * 1.5;
        scrollRef.current.scrollLeft = scrollLeft - walkX;
        scrollRef.current.scrollTop = scrollTop - walkY;
    };

    useEffect(() => {
        const fetchProfile = async () => {
            const profile = await getUserProfile(uid);
            if (profile.unlockedAvatars) {
                setUnlockedAvatars(profile.unlockedAvatars);
            }
            if (profile.activeTitle !== undefined) {
                setActiveTitle(profile.activeTitle ?? null);
            }

            // Initial rank fetch
            const r = await getUserRank(profile.puzzlePower || 0);
            setUserRank(r);
        };
        fetchProfile();
    }, [uid]);

    const handleSetTitle = async (id: string | null) => {
        setActiveTitle(id);
        onActiveTitleChange?.(id);
        await updateActiveTitle(uid, id);
    };

    useEffect(() => {
        if (activeTab === 'ranking') {
            const fetchRankings = async () => {
                setIsLoadingRankings(true);
                const rankings = await getTopRankings(100);
                setTopRankings(rankings);
                setIsLoadingRankings(false);
            };
            fetchRankings();
        }
    }, [activeTab]);

    const handleAvatarClick = async (avatarId: string) => {
        const url = getAvatarUrl(avatarId);

        if (unlockedAvatars.includes(avatarId)) {
            setSelectedPhoto(url);
            await updateProfileInfo(uid, { nickname: nickname.trim(), photoURL: url || undefined });
            onSaveSuccess(nickname.trim(), url);
            return;
        }

        setPendingUnlockAvatar(avatarId);
    };

    const handleNicknameSave = async () => {
        if (!nickname.trim()) return;
        setIsEditing(false);
        try {
            await updateProfileInfo(uid, { nickname: nickname.trim(), photoURL: selectedPhoto || undefined });
            onSaveSuccess(nickname.trim(), selectedPhoto);
        } catch (e) {
            console.error('Failed to update nickname:', e);
        }
    };

    const handleConfirmUnlock = async () => {
        if (!pendingUnlockAvatar) return;

        const avatarId = pendingUnlockAvatar;
        const url = getAvatarUrl(avatarId);
        const cost = 100;

        const success = await spendCoins(cost);
        if (success) {
            try {
                await unlockAvatar(uid, avatarId);
                setUnlockedAvatars(prev => [...prev, avatarId]);
                setSelectedPhoto(url);
                setPendingUnlockAvatar(null);
                await updateProfileInfo(uid, { nickname: nickname.trim(), photoURL: url || undefined });
                onSaveSuccess(nickname.trim(), url);
            } catch (e) {
                console.error('Failed to unlock avatar:', e);
                alert('잠금 해제 중 오류가 발생했습니다.');
            }
        } else {
            alert('코인이 부족합니다!');
            setPendingUnlockAvatar(null);
        }
    };

    return (
        <>
        <style>{`
            @keyframes shimmer {
                0%   { transform: skewX(-20deg) translateX(-200%); }
                100% { transform: skewX(-20deg) translateX(600%); }
            }
        `}</style>
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '1rem'
        }}>
            <div style={{
                backgroundColor: '#64748b',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '400px',
                height: '650px',
                position: 'relative',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1rem',
                    textAlign: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    position: 'relative',
                    flexShrink: 0
                }}>
                    <h2 style={{ margin: 0, color: 'white', fontSize: '1.2rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>프로필 설정</h2>
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            right: '1rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <X size={24} style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }} />
                    </button>
                </div>

                {/* Content Area */}
                <div style={{
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.2rem',
                    flex: 1,
                    overflow: 'hidden' // Main area doesn't scroll
                }}>

                    {/* Top Row: Current Avatar & Nickname Edit */}
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{
                            width: '70px',
                            height: '70px',
                            borderRadius: '16px',
                            border: '3px solid #fde047',
                            backgroundColor: '#cbd5e1',
                            overflow: 'hidden',
                            flexShrink: 0,
                            boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                        }}>
                            <img
                                src={selectedPhoto || '/assets/profiles/1.png'}
                                alt="Current"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        </div>

                        <div style={{ flex: 1, position: 'relative' }}>
                            <div style={{ color: '#e2e8f0', fontSize: '0.8rem', marginBottom: '4px', fontWeight: 'bold' }}>닉네임</div>
                            {isEditing ? (
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    <input
                                        type="text"
                                        value={nickname}
                                        onChange={e => setNickname(e.target.value)}
                                        maxLength={12}
                                        autoFocus
                                        style={{
                                            flex: 1,
                                            padding: '0.5rem 0.8rem',
                                            borderRadius: '8px',
                                            border: 'none',
                                            backgroundColor: '#334155',
                                            color: 'white',
                                            fontSize: '1rem',
                                            outline: 'none',
                                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
                                            width: '100%'
                                        }}
                                    />
                                    <button
                                        onClick={handleNicknameSave}
                                        style={{
                                            background: '#22c55e',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: 'white',
                                            cursor: 'pointer',
                                            padding: '0.5rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <Check size={18} />
                                    </button>
                                </div>
                            ) : (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    backgroundColor: '#334155',
                                    padding: '0.5rem 0.8rem',
                                    borderRadius: '8px',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                                }}>
                                    <span style={{ color: 'white', fontSize: '1.1rem', fontWeight: 600 }}>
                                        {nickname}
                                    </span>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        style={{
                                            background: '#22c55e',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: 'white',
                                            cursor: 'pointer',
                                            padding: '0.4rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div style={{
                        display: 'flex',
                        background: '#1e293b',
                        borderRadius: '12px',
                        padding: '4px',
                        gap: '4px',
                        flexShrink: 0
                    }}>
                        {([
                            { key: 'avatar',    icon: <Edit2 size={14} />,  label: '아바타' },
                            { key: 'ranking',   icon: <Trophy size={14} />, label: '랭킹' },
                            { key: 'challenge', icon: <Star size={14} />,   label: '도전과제' },
                        ] as const).map(({ key, icon, label }) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                style={{
                                    flex: 1,
                                    padding: '0.55rem 0.2rem',
                                    border: 'none',
                                    borderRadius: '8px',
                                    background: activeTab === key ? '#475569' : 'transparent',
                                    color: activeTab === key ? 'white' : '#94a3b8',
                                    cursor: 'pointer',
                                    fontSize: '0.78rem',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {icon}{label}
                                {key === 'challenge' && hasUnclaimed && (
                                    <span style={{
                                        width: '14px', height: '14px', borderRadius: '50%',
                                        background: '#ef4444', color: 'white',
                                        fontSize: '0.6rem', fontWeight: '900',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0
                                    }}>!</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'avatar' ? (
                        <>
                            {/* Coins Info */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.7rem 1rem',
                                backgroundColor: '#1e293b',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                flexShrink: 0
                            }}>
                                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>보유 코인</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Coins size={16} color="#fde047" />
                                    <span style={{ color: '#fde047', fontWeight: 'bold', fontSize: '1rem' }}>{coins.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Avatar Grid - ONLY THIS AREA SCROLLS */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1, minHeight: 0 }}>
                                <div style={{ color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 'bold', flexShrink: 0 }}>아바타 선택</div>
                                <div 
                                    ref={scrollRef}
                                    onMouseDown={handleMouseDown}
                                    onMouseLeave={handleMouseLeave}
                                    onMouseUp={handleMouseUp}
                                    onMouseMove={handleMouseMove}
                                    style={{
                                        backgroundColor: '#475569',
                                        borderRadius: '16px',
                                        padding: '1rem',
                                        overflowY: 'auto',
                                        cursor: isDragging ? 'grabbing' : 'grab',
                                        userSelect: 'none',
                                        flex: 1,
                                        scrollBehavior: isDragging ? 'auto' : 'smooth'
                                    }}
                                >
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(4, 1fr)',
                                        gap: '0.8rem',
                                    }}>
                                        {AVATAR_SEEDS.map((seed) => {
                                            const url = getAvatarUrl(seed);
                                            const isSelected = selectedPhoto === url;
                                            const isUnlocked = unlockedAvatars.includes(seed);

                                            return (
                                                <div
                                                    key={seed}
                                                    onClick={() => !isDragging && handleAvatarClick(seed)}
                                                    style={{
                                                        position: 'relative',
                                                        aspectRatio: '1',
                                                        borderRadius: '12px',
                                                        overflow: 'hidden',
                                                        backgroundColor: '#cbd5e1',
                                                        cursor: 'pointer',
                                                        border: isSelected ? '3px solid #4ade80' : 'none',
                                                        transition: 'transform 0.1s',
                                                        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                                        filter: isUnlocked ? 'none' : 'grayscale(0.8) brightness(0.7)'
                                                    }}
                                                >
                                                    <img draggable={false} src={url} alt={seed} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                                                    {!isUnlocked && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            inset: 0,
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            background: 'rgba(0,0,0,0.3)',
                                                            gap: '2px'
                                                        }}>
                                                            <Lock size={16} color="white" />
                                                            <span style={{ color: 'white', fontSize: '0.6rem', fontWeight: 'bold' }}>100</span>
                                                        </div>
                                                    )}

                                                    {isSelected && isUnlocked && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            bottom: '2px',
                                                            right: '2px',
                                                            background: '#4ade80',
                                                            borderRadius: '50%',
                                                            padding: '2px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            border: '2px solid #475569'
                                                        }}>
                                                            <Check size={12} color="white" strokeWidth={4} />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : activeTab === 'challenge' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1, minHeight: 0 }}>
                            {/* Puzzle Power summary */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.7rem 1rem',
                                backgroundColor: '#1e293b',
                                borderRadius: '12px',
                                flexShrink: 0
                            }}>
                                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>퍼즐력</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Star size={14} color="#f59e0b" fill="#f59e0b" />
                                    <span style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '1rem' }}>
                                        {challenges.puzzlePower.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Challenge list */}
                            <div
                                ref={scrollRef}
                                onMouseDown={handleMouseDown}
                                onMouseLeave={handleMouseLeave}
                                onMouseUp={handleMouseUp}
                                onMouseMove={handleMouseMove}
                                style={{
                                    backgroundColor: '#475569',
                                    borderRadius: '16px',
                                    padding: '0.6rem',
                                    overflowY: 'auto',
                                    cursor: isDragging ? 'grabbing' : 'grab',
                                    userSelect: 'none',
                                    flex: 1,
                                }}
                            >
                                {Object.entries(ALL_CHALLENGES).map(([game, list]) =>
                                    list.length === 0 ? null : (
                                        <div key={game}>
                                            {/* Game section header */}
                                            <div style={{
                                                fontSize: '0.72rem',
                                                fontWeight: 'bold',
                                                color: '#94a3b8',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.06em',
                                                padding: '0.3rem 0.4rem 0.5rem',
                                            }}>
                                                {game === 'sudoku' ? '스도쿠' : 'Word Sort'}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {list.map((challenge) => {
                                                    const completed = challenges.isChallengeCompleted(challenge.id);
                                                    const cleared = isReadyToClaim(challenge);
                                                    const { current, target } = getProgress(challenge);
                                                    const emoji = challenge.title.split(' ')[0];
                                                    const titleText = challenge.title.split(' ').slice(1).join(' ');
                                                    const done = cleared || completed;
                                                    return (
                                                        <div
                                                            key={challenge.id}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '10px',
                                                                padding: '0.7rem 0.75rem',
                                                                borderRadius: '12px',
                                                                backgroundColor: completed
                                                                    ? 'rgba(34,197,94,0.07)'
                                                                    : cleared
                                                                        ? 'rgba(251,191,36,0.08)'
                                                                        : 'rgba(0,0,0,0.18)',
                                                                border: completed
                                                                    ? '1px solid rgba(34,197,94,0.22)'
                                                                    : cleared
                                                                        ? '1px solid rgba(251,191,36,0.32)'
                                                                        : '1px solid transparent',
                                                            }}
                                                        >
                                                            {/* Emoji icon */}
                                                            <div style={{
                                                                width: '46px',
                                                                height: '46px',
                                                                borderRadius: '12px',
                                                                backgroundColor: completed
                                                                    ? 'rgba(34,197,94,0.18)'
                                                                    : cleared
                                                                        ? 'rgba(251,191,36,0.18)'
                                                                        : 'rgba(255,255,255,0.07)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                flexShrink: 0,
                                                                fontSize: '1.5rem',
                                                                filter: done ? 'none' : 'grayscale(0.7) opacity(0.5)',
                                                            }}>
                                                                {emoji}
                                                            </div>

                                                            {/* Middle: title / condition / progress */}
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{
                                                                    color: completed ? '#86efac' : cleared ? '#fde047' : '#e2e8f0',
                                                                    fontSize: '0.83rem',
                                                                    fontWeight: 'bold',
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                }}>
                                                                    {titleText}
                                                                </div>
                                                                <div style={{ color: '#94a3b8', fontSize: '0.68rem', marginTop: '2px', lineHeight: 1.3 }}>
                                                                    {challenge.condition}
                                                                </div>
                                                                {/* Progress bar */}
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
                                                                    <div style={{
                                                                        flex: 1,
                                                                        height: '4px',
                                                                        borderRadius: '2px',
                                                                        backgroundColor: 'rgba(255,255,255,0.08)',
                                                                    }}>
                                                                        <div style={{
                                                                            height: '100%',
                                                                            borderRadius: '2px',
                                                                            width: `${Math.min((current / target) * 100, 100)}%`,
                                                                            backgroundColor: completed ? '#4ade80' : '#fbbf24',
                                                                            transition: 'width 0.4s ease',
                                                                        }} />
                                                                    </div>
                                                                    <span style={{ fontSize: '0.62rem', color: '#64748b', flexShrink: 0 }}>
                                                                        {current}/{target}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Reward box / action */}
                                                            {completed ? (
                                                                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '62px' }}>
                                                                    <button
                                                                        onClick={() => handleSetTitle(activeTitle === challenge.id ? null : challenge.id)}
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: '0.35rem 0.4rem',
                                                                            borderRadius: '8px',
                                                                            border: activeTitle === challenge.id
                                                                                ? '1px solid rgba(251,191,36,0.6)'
                                                                                : '1px solid rgba(255,255,255,0.12)',
                                                                            background: activeTitle === challenge.id
                                                                                ? 'linear-gradient(135deg, rgba(245,158,11,0.35), rgba(251,191,36,0.2))'
                                                                                : 'rgba(255,255,255,0.06)',
                                                                            color: activeTitle === challenge.id ? '#fde047' : '#94a3b8',
                                                                            cursor: 'pointer',
                                                                            fontSize: '0.6rem',
                                                                            fontWeight: 'bold',
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            alignItems: 'center',
                                                                            gap: '2px',
                                                                        }}
                                                                    >
                                                                        {activeTitle === challenge.id
                                                                            ? <><span>🏷</span><span>사용 중</span></>
                                                                            : <><Check size={12} color="#4ade80" strokeWidth={3} /><span style={{ color: '#4ade80' }}>칭호 설정</span></>
                                                                        }
                                                                    </button>
                                                                </div>
                                                            ) : cleared ? (
                                                                <button
                                                                    onClick={() => challenges.claimReward(challenge.id)}
                                                                    style={{
                                                                        flexShrink: 0,
                                                                        padding: '0.45rem 0.6rem',
                                                                        borderRadius: '10px',
                                                                        border: '1px solid rgba(251,191,36,0.5)',
                                                                        background: 'linear-gradient(160deg, rgba(245,158,11,0.35), rgba(251,191,36,0.2))',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        alignItems: 'flex-start',
                                                                        gap: '3px',
                                                                        minWidth: '62px',
                                                                        boxShadow: '0 0 8px rgba(251,191,36,0.15)',
                                                                    }}
                                                                >
                                                                    <span style={{ fontSize: '0.65rem', color: '#fde047', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                        <Star size={10} fill="#fde047" color="#fde047" />퍼즐력 +{challenge.reward.puzzle_power}
                                                                    </span>
                                                                    <span style={{ fontSize: '0.65rem', color: '#fde047', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                        <Coins size={10} color="#fde047" />코인 +{challenge.reward.coin}
                                                                    </span>
                                                                    <span style={{ fontSize: '0.58rem', color: '#fbbf24', marginTop: '1px', alignSelf: 'center' }}>보상받기</span>
                                                                </button>
                                                            ) : (
                                                                <div style={{
                                                                    flexShrink: 0,
                                                                    padding: '0.45rem 0.6rem',
                                                                    borderRadius: '10px',
                                                                    backgroundColor: 'rgba(0,0,0,0.2)',
                                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    alignItems: 'flex-start',
                                                                    justifyContent: 'center',
                                                                    gap: '3px',
                                                                    minWidth: '62px',
                                                                }}>
                                                                    <span style={{ fontSize: '0.65rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                        <Star size={10} fill="#475569" color="#475569" />퍼즐력 +{challenge.reward.puzzle_power}
                                                                    </span>
                                                                    <span style={{ fontSize: '0.65rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                        <Coins size={10} color="#475569" />코인 +{challenge.reward.coin}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Current User Ranking Info */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.8rem 1.2rem',
                                backgroundColor: '#1e293b',
                                borderRadius: '12px',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                flexShrink: 0
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        border: '2px solid #fde047'
                                    }}>
                                        <img src={selectedPhoto || '/assets/profiles/1.png'} alt="Me" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                    <span style={{ fontSize: '0.9rem', color: 'white', fontWeight: 'bold' }}>나의 순위</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1rem', color: '#3b82f6', fontWeight: '900' }}>#{userRank}</div>
                                </div>
                            </div>

                            {/* Global Ranking - ONLY THIS AREA SCROLLS */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1, minHeight: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                                    <div style={{ color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 'bold' }}>Top 100 랭킹</div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Users size={12} /> {topRankings.length}명
                                    </div>
                                </div>
                                <div 
                                    ref={scrollRef}
                                    onMouseDown={handleMouseDown}
                                    onMouseLeave={handleMouseLeave}
                                    onMouseUp={handleMouseUp}
                                    onMouseMove={handleMouseMove}
                                    style={{
                                        backgroundColor: '#475569',
                                        borderRadius: '16px',
                                        padding: '0.5rem',
                                        overflowY: 'auto',
                                        cursor: isDragging ? 'grabbing' : 'grab',
                                        userSelect: 'none',
                                        flex: 1,
                                        scrollBehavior: isDragging ? 'auto' : 'smooth'
                                    }}
                                >
                                    {isLoadingRankings ? (
                                        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>불러오는 중...</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {(() => {
                                                // 동점 처리: 같은 puzzlePower는 같은 등수, 다음 등수는 건너뜀
                                                const ranks: number[] = [];
                                                let currentRank = 1;
                                                for (let i = 0; i < topRankings.length; i++) {
                                                    if (i > 0 && topRankings[i].puzzlePower !== topRankings[i - 1].puzzlePower) {
                                                        currentRank = i + 1;
                                                    }
                                                    ranks.push(currentRank);
                                                }
                                                return topRankings.map((user, index) => {
                                                const rank = ranks[index];
                                                const isMe = user.uid === uid;
                                                const avatar = user.photoURL ? getAvatarUrl(user.photoURL) : '/assets/profiles/1.png';
                                                const opacity = Math.max(0.06, 1 - (index / topRankings.length) * 0.82);
                                                const barColor = rank === 1
                                                    ? `rgba(253,224,71,${(0.35 * opacity).toFixed(2)})`
                                                    : rank === 2
                                                        ? `rgba(226,232,240,${(0.28 * opacity).toFixed(2)})`
                                                        : rank === 3
                                                            ? `rgba(251,146,60,${(0.32 * opacity).toFixed(2)})`
                                                            : isMe
                                                                ? `rgba(59,130,246,${(0.30 * opacity).toFixed(2)})`
                                                                : `rgba(148,163,184,${(0.18 * opacity).toFixed(2)})`;

                                                return (
                                                    <div
                                                        key={user.uid}
                                                        style={{
                                                            position: 'relative',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '12px',
                                                            padding: '0.6rem 0.8rem',
                                                            borderRadius: '10px',
                                                            backgroundColor: isMe ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                                                            border: isMe ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                                                            overflow: 'hidden'
                                                        }}
                                                    >
                                                        {/* Background bar */}
                                                        <div style={{
                                                            position: 'absolute', left: 0, top: 0, bottom: 0,
                                                            width: '100%',
                                                            background: barColor,
                                                            borderRadius: '10px',
                                                            pointerEvents: 'none',
                                                            overflow: 'hidden'
                                                        }}>
                                                            {/* shimmer 주석처리
                                                            {rank <= 3 && (
                                                                <div style={{
                                                                    position: 'absolute', top: '-50%', bottom: '-50%',
                                                                    width: '25%',
                                                                    background: rank === 1
                                                                        ? 'linear-gradient(90deg, transparent, rgba(255,220,50,0.7), transparent)'
                                                                        : rank === 2
                                                                            ? 'linear-gradient(90deg, transparent, rgba(220,230,255,0.6), transparent)'
                                                                            : 'linear-gradient(90deg, transparent, rgba(255,160,80,0.6), transparent)',
                                                                    animation: 'shimmer 2.2s ease-in-out infinite',
                                                                    animationDelay: rank === 1 ? '0s' : rank === 2 ? '0.5s' : '1s'
                                                                }} />
                                                            )}
                                                            */}
                                                        </div>
                                                        <div style={{
                                                            width: '24px',
                                                            fontSize: rank <= 3 ? '1.5rem' : '0.85rem',
                                                            fontWeight: '900',
                                                            color: '#94a3b8',
                                                            textAlign: 'center',
                                                            marginLeft: rank <= 3 ? '-6px' : '0'
                                                        }}>
                                                            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                                                        </div>
                                                        <div style={{
                                                            width: '36px',
                                                            height: '36px',
                                                            borderRadius: '8px',
                                                            overflow: 'hidden',
                                                            backgroundColor: '#cbd5e1',
                                                            flexShrink: 0
                                                        }}>
                                                            <img draggable={false} src={avatar} alt={user.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{
                                                                color: 'white',
                                                                fontSize: '0.9rem',
                                                                fontWeight: 'bold',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '5px',
                                                                overflow: 'hidden'
                                                            }}>
                                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.nickname}</span>
                                                                {isMe && <span style={{ fontSize: '0.7rem', color: '#3b82f6', flexShrink: 0 }}>(나)</span>}
                                                                {user.activeTitle && CHALLENGE_MAP[user.activeTitle] && (
                                                                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#fde047', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '3px', padding: '0 4px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                                                        {CHALLENGE_MAP[user.activeTitle].title}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                                                                퍼즐력 {user.puzzlePower.toLocaleString()}
                                                            </div>
                                                        </div>
                                                        <div style={{ color: '#ef4444', fontWeight: '900', fontSize: '0.85rem' }}>
                                                            {user.puzzlePower}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

            </div>

            {/* Custom Unlock Confirmation Modal */}
            {pendingUnlockAvatar && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000
                }}>
                    <div style={{
                        background: '#3a3c5a', borderRadius: '16px', padding: '1.5rem',
                        textAlign: 'center', width: '240px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        color: 'white'
                    }}>
                        <div style={{
                            width: '72px', height: '72px', borderRadius: '14px',
                            overflow: 'hidden', margin: '0 auto 0.75rem',
                            border: '3px solid rgba(255,255,255,0.2)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                        }}>
                            <img src={getAvatarUrl(pendingUnlockAvatar)} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.5rem' }}>잠금 해제</div>
                        <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.75)', marginBottom: '0.75rem', lineHeight: 1.8 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: '700', color: '#fde047' }}>
                                <Coins size={15} color="#fde047" />100
                            </span> 코인을 사용하여 해제 하시겠습니까?
                        </div>
                        {coins < 100 && (
                            <div style={{ fontSize: '0.78rem', color: '#ff6b6b', marginBottom: '0.6rem' }}>
                                코인 부족 (현재 {coins}개)
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setPendingUnlockAvatar(null)}
                                style={{ padding: '0.45rem 1.1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', cursor: 'pointer', fontSize: '0.9rem' }}
                            >취소</button>
                            <button
                                onClick={handleConfirmUnlock}
                                disabled={coins < 100}
                                style={{ padding: '0.45rem 1.1rem', borderRadius: '8px', border: 'none', background: coins >= 100 ? 'linear-gradient(135deg, #f6d365, #fda085)' : 'rgba(255,255,255,0.15)', color: 'white', fontWeight: '700', cursor: coins >= 100 ? 'pointer' : 'not-allowed', fontSize: '0.9rem' }}
                            >확인</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </>
    );
};

export default ProfileModal;
