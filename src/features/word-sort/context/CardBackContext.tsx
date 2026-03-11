import React, { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase';
import { useCoins } from '../../../context/CoinContext';

export interface CardBackDesign {
    id: string;
    name: string;
    description: string;
    pattern: string; // CSS value for background or backgroundImage
    isImage?: boolean;
}

export const cardBackDesigns: CardBackDesign[] = [
    {
        id: 'default',
        name: '클래식 (기본)',
        description: 'Word Sort의 전통적인 카드 뒷면입니다.',
        pattern: "url('/assets/word-sort/card-back.png')",
        isImage: true
    },
    {
        id: 'checker-gray',
        name: '화이트 체커',
        description: '뚜렷한 대비가 느껴지는 깔끔한 패턴.',
        pattern: 'conic-gradient(#ffffff 25%, #333333 0 50%, #ffffff 0 75%, #333333 0)'
    },
    {
        id: 'royal-navy',
        name: '로얄 네이비',
        description: '우아하고 깊은 바다의 색상입니다.',
        pattern: 'linear-gradient(135deg, #1A237E, #311B92)'
    },
    {
        id: 'sunset-glow',
        name: '선셋 글로우',
        description: '저녁 노을의 따뜻한 감성을 담았습니다.',
        pattern: 'linear-gradient(135deg, #FF512F, #DD2476)'
    },
    {
        id: 'emerald-green',
        name: '에메랄드 그린',
        description: '자연의 신선함을 느낄 수 있습니다.',
        pattern: 'linear-gradient(135deg, #0cebeb, #20e3b2, #29ffc6)'
    },
    {
        id: 'purple-haze',
        name: '퍼플 헤이즈',
        description: '신비롭고 몽환적인 보라색 패턴.',
        pattern: 'linear-gradient(135deg, #7F00FF, #E100FF)'
    }
];

const LS_UNLOCKED_KEY = 'wordSort_unlockedBacks';
const LS_SELECTED_KEY = 'wordSort_selectedBack';
const UNLOCK_COST = 200;

interface CardBackContextValue {
    unlockedBacks: string[];
    selectedBackId: string;
    hasUnlocked: (id: string) => boolean;
    unlockBack: (id: string) => Promise<boolean>;
    selectBack: (id: string) => void;
    currentDesign: CardBackDesign;
}

const CardBackContext = createContext<CardBackContextValue | null>(null);

export const useCardBacks = () => {
    const context = useContext(CardBackContext);
    if (!context) {
        throw new Error('useCardBacks must be used within a CardBackProvider');
    }
    return context;
};

export const CardBackProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { spendCoins } = useCoins();
    
    const [selectedBackId, setSelectedBackId] = useState<string>(() => {
        return localStorage.getItem(LS_SELECTED_KEY) || 'default';
    });
    
    const [unlockedBacks, setUnlockedBacks] = useState<string[]>(() => {
        const stored = localStorage.getItem(LS_UNLOCKED_KEY);
        try {
            const parsed = stored ? JSON.parse(stored) : [];
            return Array.isArray(parsed) && parsed.includes('default') ? parsed : ['default', ...parsed];
        } catch {
            return ['default'];
        }
    });

    const syncedRef = useRef(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user || user.isAnonymous || syncedRef.current) return;
            syncedRef.current = true;

            try {
                const userRef = doc(db, 'users', user.uid);
                const snap = await getDoc(userRef);
                const cloudUnlocked: string[] = snap.exists() ? (snap.data().unlockedWordSortBacks || ['default']) : ['default'];
                
                const localUnlockedStr = localStorage.getItem(LS_UNLOCKED_KEY);
                let localUnlocked: string[] = ['default'];
                try {
                    localUnlocked = localUnlockedStr ? JSON.parse(localUnlockedStr) : ['default'];
                } catch (e) {}

                const mergedSet = new Set([...localUnlocked, ...cloudUnlocked, 'default']);
                const mergedArray = Array.from(mergedSet);

                if (mergedArray.length !== localUnlocked.length || !mergedArray.every(id => localUnlocked.includes(id))) {
                    setUnlockedBacks(mergedArray);
                    localStorage.setItem(LS_UNLOCKED_KEY, JSON.stringify(mergedArray));
                }

                if (mergedArray.length !== cloudUnlocked.length || !mergedArray.every(id => cloudUnlocked.includes(id))) {
                    await setDoc(userRef, { unlockedWordSortBacks: mergedArray }, { merge: true });
                }

            } catch (err) {
                console.error("Failed to sync card backs with Firebase", err);
            }
        });

        return unsubscribe;
    }, []);

    const hasUnlocked = useCallback((id: string) => {
        return unlockedBacks.includes(id);
    }, [unlockedBacks]);

    const unlockBack = async (id: string): Promise<boolean> => {
        if (hasUnlocked(id)) return true;

        const success = await spendCoins(UNLOCK_COST);
        if (!success) {
            return false;
        }

        const newUnlocked = [...unlockedBacks, id];
        setUnlockedBacks(newUnlocked);
        localStorage.setItem(LS_UNLOCKED_KEY, JSON.stringify(newUnlocked));

        const user = auth.currentUser;
        if (user && !user.isAnonymous) {
            try {
                const userRef = doc(db, 'users', user.uid);
                await setDoc(userRef, { unlockedWordSortBacks: newUnlocked }, { merge: true });
            } catch (err) {
                console.error("Failed to update Firebase after purchase", err);
            }
        }
        
        selectBack(id);
        
        return true;
    };

    const selectBack = (id: string) => {
        if (!hasUnlocked(id)) return;
        setSelectedBackId(id);
        localStorage.setItem(LS_SELECTED_KEY, id);
    };

    const currentDesign = cardBackDesigns.find(d => d.id === selectedBackId) || cardBackDesigns[0];

    return (
        <CardBackContext.Provider value={{ unlockedBacks, selectedBackId, hasUnlocked, unlockBack, selectBack, currentDesign }}>
            {children}
        </CardBackContext.Provider>
    );
};
