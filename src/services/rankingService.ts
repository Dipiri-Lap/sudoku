import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, query, orderBy, limit, getDocs, collectionGroup, increment } from 'firebase/firestore';

export interface UserProfile {
    uid: string;
    nickname: string;
    photoURL?: string;
    puzzlePower: number;
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
    let bestTimes: { [key: string]: number } = {};

    if (userSnap.exists()) {
        const userData = userSnap.data();
        nickname = userData.nickname || nickname;
        photoURL = userData.photoURL;
        puzzlePower = userData.puzzlePower || 0;
        bestTimes = userData.bestTimes || {};
    } else {
        // Create new profile if not exists
        await setDoc(userRef, { uid, nickname, coins: 0, createdAt: new Date().toISOString() });
    }

    const progressRef = doc(db, 'users', uid, 'sudokuProgress', 'data');
    const progressSnap = await getDoc(progressRef);

    if (progressSnap.exists()) {
        const progressData = progressSnap.data();
        if (progressData.bestTimes) {
            bestTimes = progressData.bestTimes;
        }
    }

    return { uid, nickname, photoURL, puzzlePower, bestTimes };
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
