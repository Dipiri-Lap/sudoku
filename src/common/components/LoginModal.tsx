import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { signInWithGoogle, hasGuestData } from '../../services/authService';

interface LoginModalProps {
    onClose: () => void;
    onSuccess: (user: User) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const guestDataExists = hasGuestData();

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const user = await signInWithGoogle();
            onSuccess(user);
        } catch (err: any) {
            if (err.code === 'auth/popup-blocked') {
                setError('팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도해 주세요.');
            } else if (err.code === 'auth/popup-closed-by-user') {
                setError(null);
            } else {
                setError('로그인에 실패했습니다. 다시 시도해 주세요.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <button style={styles.closeBtn} onClick={onClose} aria-label="닫기">✕</button>

                <h2 style={styles.title}>로그인하면 뭐가 달라요?</h2>

                <div style={styles.compareGrid}>
                    <div style={{ ...styles.compareCard, ...styles.guestCard }}>
                        <div style={styles.cardLabel}>게스트</div>
                        <ul style={styles.featureList}>
                            <li style={styles.featureItem}>
                                <span style={styles.iconBad}>✗</span>
                                이 기기에서만 저장
                            </li>
                            <li style={styles.featureItem}>
                                <span style={styles.iconBad}>✗</span>
                                앱 삭제 시 데이터 소실
                            </li>
                            <li style={styles.featureItem}>
                                <span style={styles.iconBad}>✗</span>
                                랭킹 익명 참여
                            </li>
                        </ul>
                    </div>

                    <div style={{ ...styles.compareCard, ...styles.loginCard }}>
                        <div style={{ ...styles.cardLabel, ...styles.loginLabel }}>로그인</div>
                        <ul style={styles.featureList}>
                            <li style={styles.featureItem}>
                                <span style={styles.iconGood}>✓</span>
                                기기 간 데이터 동기화
                            </li>
                            <li style={styles.featureItem}>
                                <span style={styles.iconGood}>✓</span>
                                안전한 데이터 백업
                            </li>
                            <li style={styles.featureItem}>
                                <span style={styles.iconGood}>✓</span>
                                랭킹 실명 참여
                            </li>
                        </ul>
                    </div>
                </div>

                {guestDataExists && (
                    <div style={styles.migrationNotice}>
                        🎮 기존 플레이 데이터를 계정에 옮겨드려요!
                    </div>
                )}

                {error && <p style={styles.errorText}>{error}</p>}

                <button
                    style={{ ...styles.googleBtn, ...(loading ? styles.googleBtnDisabled : {}) }}
                    onClick={handleGoogleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <span>로그인 중...</span>
                    ) : (
                        <>
                            <GoogleIcon />
                            Google로 로그인
                        </>
                    )}
                </button>

                <button style={styles.guestLink} onClick={onClose}>
                    게스트로 계속하기
                </button>
            </div>
        </div>
    );
};

const GoogleIcon: React.FC = () => (
    <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
);

const styles: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
    },
    modal: {
        backgroundColor: '#fff',
        borderRadius: '1.25rem',
        padding: '2rem 1.5rem 1.5rem',
        width: '100%',
        maxWidth: '420px',
        position: 'relative',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    closeBtn: {
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        background: 'none',
        border: 'none',
        fontSize: '1.2rem',
        cursor: 'pointer',
        color: '#888',
        lineHeight: 1,
        padding: '0.25rem',
    },
    title: {
        margin: 0,
        fontSize: '1.2rem',
        fontWeight: 700,
        textAlign: 'center',
        color: '#222',
    },
    compareGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.75rem',
    },
    compareCard: {
        borderRadius: '0.75rem',
        padding: '0.875rem 0.75rem',
        border: '1.5px solid',
    },
    guestCard: {
        borderColor: '#ddd',
        backgroundColor: '#f9f9f9',
    },
    loginCard: {
        borderColor: '#4a90e2',
        backgroundColor: '#f0f6ff',
    },
    cardLabel: {
        fontWeight: 700,
        fontSize: '0.85rem',
        marginBottom: '0.5rem',
        color: '#666',
    },
    loginLabel: {
        color: '#4a90e2',
    },
    featureList: {
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
    },
    featureItem: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.35rem',
        fontSize: '0.8rem',
        color: '#444',
        lineHeight: 1.4,
    },
    iconGood: {
        color: '#2ecc71',
        fontWeight: 700,
        flexShrink: 0,
    },
    iconBad: {
        color: '#bbb',
        fontWeight: 700,
        flexShrink: 0,
    },
    migrationNotice: {
        backgroundColor: '#fff9e6',
        border: '1px solid #ffe58f',
        borderRadius: '0.5rem',
        padding: '0.625rem 0.875rem',
        fontSize: '0.85rem',
        color: '#7a5c00',
        textAlign: 'center',
    },
    errorText: {
        margin: 0,
        fontSize: '0.82rem',
        color: '#e74c3c',
        textAlign: 'center',
    },
    googleBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.625rem',
        width: '100%',
        padding: '0.8rem',
        borderRadius: '0.625rem',
        border: '1.5px solid #dadce0',
        backgroundColor: '#fff',
        color: '#3c4043',
        fontWeight: 600,
        fontSize: '0.95rem',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        transition: 'background 0.15s',
    },
    googleBtnDisabled: {
        opacity: 0.6,
        cursor: 'not-allowed',
    },
    guestLink: {
        background: 'none',
        border: 'none',
        color: '#888',
        fontSize: '0.85rem',
        cursor: 'pointer',
        textDecoration: 'underline',
        textAlign: 'center',
        padding: '0.25rem',
    },
};

export default LoginModal;
