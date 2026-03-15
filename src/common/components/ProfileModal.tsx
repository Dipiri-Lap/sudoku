import React, { useState, useEffect, useRef } from 'react';
import { X, Edit2, Check, Lock, Coins } from 'lucide-react';
import { updateProfileInfo, getUserProfile, unlockAvatar, getTopRankings, getUserRank } from '../../services/rankingService';
import type { UserProfile as UserProfileType } from '../../services/rankingService';
import { Trophy, Users } from 'lucide-react';
import { useCoins } from '../../context/CoinContext';

interface ProfileModalProps {
    uid: string;
    currentNickname: string;
    currentPhotoURL: string | null;
    onClose: () => void;
    onSaveSuccess: (newNickname: string, newPhotoURL: string | null) => void;
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
    onSaveSuccess
}) => {
    const { coins, spendCoins } = useCoins();
    const [nickname, setNickname] = useState(currentNickname);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(currentPhotoURL);
    const [unlockedAvatars, setUnlockedAvatars] = useState<string[]>(['1', '2', '3', '4', '5', '6', '7', '8']);
    const [isSaving, setIsSaving] = useState(false);
    const [pendingUnlockAvatar, setPendingUnlockAvatar] = useState<string | null>(null);

    // Tab & Ranking state
    const [activeTab, setActiveTab] = useState<'avatar' | 'ranking'>('avatar');
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
            
            // Initial rank fetch
            const r = await getUserRank(profile.puzzlePower || 0);
            setUserRank(r);
        };
        fetchProfile();
    }, [uid]);

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

    const handleSave = async () => {
        if (!nickname.trim()) return;
        setIsSaving(true);
        try {
            await updateProfileInfo(uid, { nickname: nickname.trim(), photoURL: selectedPhoto || undefined });
            onSaveSuccess(nickname.trim(), selectedPhoto);
            onClose();
        } catch (e) {
            console.error('Failed to update profile:', e);
            alert('프로필 업데이트에 실패했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAvatarClick = async (avatarId: string) => {
        const url = getAvatarUrl(avatarId);

        // If already unlocked, just select
        if (unlockedAvatars.includes(avatarId)) {
            setSelectedPhoto(url);
            return;
        }

        // Show custom confirm modal instead of window.confirm
        setPendingUnlockAvatar(avatarId);
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
                                        onClick={() => setIsEditing(false)}
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
                        <button
                            onClick={() => setActiveTab('avatar')}
                            style={{
                                flex: 1,
                                padding: '0.6rem',
                                border: 'none',
                                borderRadius: '8px',
                                background: activeTab === 'avatar' ? '#475569' : 'transparent',
                                color: activeTab === 'avatar' ? 'white' : '#94a3b8',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Edit2 size={16} /> 아바타
                        </button>
                        <button
                            onClick={() => setActiveTab('ranking')}
                            style={{
                                flex: 1,
                                padding: '0.6rem',
                                border: 'none',
                                borderRadius: '8px',
                                background: activeTab === 'ranking' ? '#475569' : 'transparent',
                                color: activeTab === 'ranking' ? 'white' : '#94a3b8',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Trophy size={16} /> 랭킹
                        </button>
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
                                            {topRankings.map((user, index) => {
                                                const rank = index + 1;
                                                const isMe = user.uid === uid;
                                                const avatar = user.photoURL ? getAvatarUrl(user.photoURL) : '/assets/profiles/1.png';
                                                
                                                return (
                                                    <div 
                                                        key={user.uid}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '12px',
                                                            padding: '0.6rem 0.8rem',
                                                            borderRadius: '10px',
                                                            backgroundColor: isMe ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                                            border: isMe ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent'
                                                        }}
                                                    >
                                                        <div style={{ 
                                                            width: '24px', 
                                                            fontSize: '0.85rem', 
                                                            fontWeight: '900',
                                                            color: rank === 1 ? '#fde047' : rank === 2 ? '#e2e8f0' : rank === 3 ? '#fb923c' : '#94a3b8',
                                                            textAlign: 'center'
                                                        }}>
                                                            {rank}
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
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                {user.nickname} {isMe && <span style={{ fontSize: '0.7rem', color: '#3b82f6' }}>(나)</span>}
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
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer / Save Button */}
                <div style={{ padding: '1rem 1.5rem 1.5rem', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{
                            width: '100%',
                            padding: '0.8rem',
                            borderRadius: '12px',
                            background: 'linear-gradient(to bottom, #4ade80, #22c55e)',
                            border: 'none',
                            color: 'white',
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                            cursor: isSaving ? 'default' : 'pointer',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1), inset 0 2px 2px rgba(255,255,255,0.3)',
                            opacity: isSaving ? 0.7 : 1
                        }}
                    >
                        {isSaving ? '저장 중...' : '저장'}
                    </button>
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
                        <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>🔓</div>
                        <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.4rem' }}>잠금 해제</div>
                        <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                            🪙 100 코인을 사용하여<br />
                            {pendingUnlockAvatar}번 프로필을 여시겠습니까?
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
    );
};

export default ProfileModal;
