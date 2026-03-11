import React, { useState } from 'react';
import { X, Edit2, Check } from 'lucide-react';
import { updateProfileInfo } from '../../services/rankingService';

interface ProfileModalProps {
    uid: string;
    currentNickname: string;
    currentPhotoURL: string | null;
    onClose: () => void;
    onSaveSuccess: (newNickname: string, newPhotoURL: string | null) => void;
}

// Fallback nice cute animal seeds for dicebear fun-emoji
const AVATAR_SEEDS = [
    'chick', 'rabbit', 'frog',
    'kitty', 'puppy', 'panda',
    'piglet', 'penguin', 'teddy'
];

export const getAvatarUrl = (seed: string) => `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${seed}&backgroundColor=transparent`;

const ProfileModal: React.FC<ProfileModalProps> = ({
    uid,
    currentNickname,
    currentPhotoURL,
    onClose,
    onSaveSuccess
}) => {
    const [nickname, setNickname] = useState(currentNickname);
    const [isEditing, setIsEditing] = useState(false);

    // Default to the first seed if no photoURL exists, but keeping track of raw URL vs seed can be tricky.
    // We will just store the full URL or seed. Let's just store the URL.
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(currentPhotoURL);
    const [isSaving, setIsSaving] = useState(false);

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
                backgroundColor: '#64748b', // Blue-grey theme
                borderRadius: '16px',
                width: '100%',
                maxWidth: '360px',
                position: 'relative',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1rem',
                    textAlign: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    position: 'relative'
                }}>
                    <h2 style={{ margin: 0, color: 'white', fontSize: '1.2rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>프로필</h2>
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

                {/* Content */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Top Row: Current Avatar & Nickname Edit */}
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{
                            width: '72px',
                            height: '72px',
                            borderRadius: '16px',
                            border: '3px solid #fde047', // Yellow border
                            backgroundColor: '#1e293b',
                            overflow: 'hidden',
                            flexShrink: 0
                        }}>
                            <img
                                src={selectedPhoto || getAvatarUrl(nickname.trim() || 'guest')}
                                alt="Current"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        </div>

                        <div style={{ flex: 1, position: 'relative' }}>
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
                                            fontSize: '1.1rem',
                                            outline: 'none',
                                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
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

                    {/* Avatar Grid */}
                    <div style={{
                        backgroundColor: '#475569',
                        borderRadius: '16px',
                        padding: '1rem',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '0.8rem',
                        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                        {AVATAR_SEEDS.map((seed) => {
                            const url = getAvatarUrl(seed);
                            const isSelected = selectedPhoto === url;
                            return (
                                <div
                                    key={seed}
                                    onClick={() => setSelectedPhoto(url)}
                                    style={{
                                        position: 'relative',
                                        aspectRatio: '1',
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        backgroundColor: '#1e293b',
                                        cursor: 'pointer',
                                        border: isSelected ? '3px solid #4ade80' : 'none',
                                        transition: 'transform 0.1s',
                                        transform: isSelected ? 'scale(1.05)' : 'scale(1)'
                                    }}
                                >
                                    <img src={url} alt={seed} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    {isSelected && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '-2px',
                                            right: '-2px',
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

                {/* Footer / Save Button */}
                <div style={{ padding: '0 1.5rem 1.5rem' }}>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{
                            width: '100%',
                            padding: '1rem',
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
        </div>
    );
};

export default ProfileModal;
