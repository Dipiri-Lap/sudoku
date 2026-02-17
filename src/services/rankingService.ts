import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

export interface UserProfile {
    uid: string;
    nickname: string;
    bestTimes: {
        [key: string]: number; // difficulty -> seconds
    };
}

export const getUserProfile = async (uid: string): Promise<UserProfile> => {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        return userSnap.data() as UserProfile;
    } else {
        // Create new profile if not exists
        const newProfile: UserProfile = {
            uid,
            nickname: uid.slice(0, 8),
            bestTimes: {}
        };
        await setDoc(userRef, newProfile);
        return newProfile;
    }
};

export const updateNickname = async (uid: string, newNickname: string): Promise<void> => {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { nickname: newNickname });
};

export const saveRecord = async (uid: string, difficulty: string, time: number): Promise<{ isNewRecord: boolean }> => {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        // Should have been created by getUserProfile, but just in case
        await getUserProfile(uid);
    }

    const userData = (await getDoc(userRef)).data() as UserProfile;
    const currentBest = userData.bestTimes[difficulty];

    if (currentBest === undefined || time < currentBest) {
        await updateDoc(userRef, {
            [`bestTimes.${difficulty}`]: time
        });
        return { isNewRecord: true };
    }

    return { isNewRecord: false };
};

export const getGlobalBestTime = async (difficulty: string): Promise<{ time: number, nickname: string } | null> => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy(`bestTimes.${difficulty}`, 'asc'), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data() as UserProfile;
        const time = userData.bestTimes[difficulty];
        if (time !== undefined) {
            return { time, nickname: userData.nickname };
        }
    }
    return null;
};
