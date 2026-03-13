import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, query, orderBy, limit, getDocs, collectionGroup, increment, collection, where, getCountFromServer } from 'firebase/firestore';

export interface UserProfile {
    uid: string;
    nickname: string;
    photoURL?: string;
    puzzlePower: number;
    unlockedAvatars: string[];
    bestTimes: {
        [key: string]: number; // difficulty -> seconds
    };
}

export const getUserProfile = async (uid: string): Promise<UserProfile> => {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    let nickname = uid.slice(0, 8);
    let photoURL = undefined;
    let puzzlePower = 0;
    let unlockedAvatars: string[] = ['1', '2', '3', '4', '5', '6', '7', '8'];
    let bestTimes: { [key: string]: number } = {};

    if (userSnap.exists()) {
        const userData = userSnap.data();
        nickname = userData.nickname || nickname;
        photoURL = userData.photoURL;
        puzzlePower = userData.puzzlePower || 0;
        unlockedAvatars = userData.unlockedAvatars || unlockedAvatars;
        bestTimes = userData.bestTimes || {};
    } else {
        // Create new profile if not exists
        await setDoc(userRef, { uid, nickname, photoURL: '1', coins: 0, puzzlePower: 0, createdAt: new Date().toISOString() });
        photoURL = '1';
    }

    const progressRef = doc(db, 'users', uid, 'sudokuProgress', 'data');
    const progressSnap = await getDoc(progressRef);

    if (progressSnap.exists()) {
        const progressData = progressSnap.data();
        if (progressData.bestTimes) {
            bestTimes = progressData.bestTimes;
        }
    }

    return { uid, nickname, photoURL, puzzlePower, unlockedAvatars, bestTimes };
};

export const updateProfileInfo = async (uid: string, data: { nickname: string; photoURL?: string }): Promise<void> => {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { nickname: data.nickname, photoURL: data.photoURL || null });

    const progressRef = doc(db, 'users', uid, 'sudokuProgress', 'data');
    const progressSnap = await getDoc(progressRef);
    if (progressSnap.exists()) {
        await updateDoc(progressRef, { nickname: data.nickname });
    }
};

export const incrementPuzzlePower = async (uid: string): Promise<void> => {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { puzzlePower: increment(1) });
};

export const unlockAvatar = async (uid: string, avatarId: string): Promise<void> => {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    const current = snap.data()?.unlockedAvatars || ['1', '2', '3', '4', '5', '6', '7', '8'];
    if (!current.includes(avatarId)) {
        await updateDoc(userRef, {
            unlockedAvatars: [...current, avatarId]
        });
    }
};

export const saveRecord = async (uid: string, difficulty: string, time: number): Promise<{ isNewRecord: boolean }> => {
    const profile = await getUserProfile(uid);
    const currentBest = profile.bestTimes[difficulty];

    if (currentBest === undefined || time < currentBest) {
        profile.bestTimes[difficulty] = time;

        const progressRef = doc(db, 'users', uid, 'sudokuProgress', 'data');
        await setDoc(progressRef, {
            bestTimes: profile.bestTimes,
            nickname: profile.nickname
        }, { merge: true });

        return { isNewRecord: true };
    }

    return { isNewRecord: false };
};


export const getGlobalBestTime = async (difficulty: string): Promise<{ time: number, nickname: string } | null> => {
    try {
        const progressGroupRef = collectionGroup(db, 'sudokuProgress');
        const q = query(progressGroupRef, orderBy(`bestTimes.${difficulty}`, 'asc'), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const data = querySnapshot.docs[0].data();
            const time = data.bestTimes?.[difficulty];
            if (time !== undefined) {
                return { time, nickname: data.nickname || 'Unknown' };
            }
        }
    } catch (e) {
        console.error('Failed to get global best time (You might need to create a Firestore Index):', e);
    }
    return null;
};

export const getUserRank = async (puzzlePower: number): Promise<string> => {
    if (puzzlePower < 1) return '+999';
    
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('puzzlePower', '>', puzzlePower));
        const snapshot = await getCountFromServer(q);
        const count = snapshot.data().count;
        const rank = count + 1;
        
        return rank > 999 ? '+999' : `${rank}`;
    } catch (e) {
        console.error('Failed to get user rank:', e);
        return '-';
    }
};

export const getTopRankings = async (limitCount: number = 100): Promise<UserProfile[]> => {
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('puzzlePower', 'desc'), limit(limitCount));
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                uid: doc.id,
                nickname: data.nickname || doc.id.slice(0, 8),
                photoURL: data.photoURL,
                puzzlePower: data.puzzlePower || 0,
                unlockedAvatars: data.unlockedAvatars || [],
                bestTimes: data.bestTimes || {}
            };
        });
    } catch (e) {
        console.error('Failed to get top rankings:', e);
        return [];
    }
};

// Word Sort progress: save cleared level number
export const saveWordSortProgress = async (uid: string, clearedLevel: number): Promise<void> => {
    try {
        const progressRef = doc(db, 'users', uid, 'wordSortProgress', 'data');
        const snap = await getDoc(progressRef);
        const currentCleared = snap.exists() ? (snap.data().clearedLevel ?? 0) : 0;
        // Only update if this is a new higher level
        if (clearedLevel > currentCleared) {
            await setDoc(progressRef, { clearedLevel }, { merge: true });
        }
    } catch (e) {
        console.error('Failed to save wordSort progress:', e);
    }
};

// Word Sort progress: get the last cleared level (0 = none cleared)
export const getWordSortProgress = async (uid: string): Promise<number> => {
    try {
        const progressRef = doc(db, 'users', uid, 'wordSortProgress', 'data');
        const snap = await getDoc(progressRef);
        if (snap.exists()) {
            return snap.data().clearedLevel ?? 0;
        }
    } catch (e) {
        console.error('Failed to get wordSort progress:', e);
    }
    return 0;
};
