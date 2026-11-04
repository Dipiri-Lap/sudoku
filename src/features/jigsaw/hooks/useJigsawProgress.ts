import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase';
import { JIGSAW_STAGES, loadStars, JIGSAW_PROGRESS_EVENT } from '../data/stages';

const FIRESTORE_DOC = (uid: string) => doc(db, 'users', uid, 'jigsawProgress', 'data');

/** 모은 별의 합계 */
export function loadJigsawStarTotal(): number {
    return Object.values(loadStars()).reduce((a, b) => a + (Number(b) || 0), 0);
}

/** 1번부터 이어서 깬 스테이지 수. 스테이지는 순서대로 열리므로 이것이 곧 '클리어한 최고 스테이지 번호'다. */
export function loadJigsawCleared(): number {
    const stars = loadStars();
    const i = JIGSAW_STAGES.findIndex((s) => !(stars[s.id] > 0));
    return i === -1 ? JIGSAW_STAGES.length : i;
}

/**
 * Tiny Pieces 스테이지 진행도(클리어 수). 뒤로 가지 않는다.
 *
 * 애로우웨이와 같이 로그인하면 users/{uid}/jigsawProgress/data.clearedStage 와 병합한다.
 * 별 기록 자체는 기기(localStorage)에 남고, 서버에는 도전과제·퍼즐력 계산용 클리어 수(clearedStage)와 별 합계(totalStars)만 올린다.
 */
export function useJigsawProgress() {
    const [progress, setProgress] = useState<number>(loadJigsawCleared);
    const [stars, setStars] = useState<number>(loadJigsawStarTotal);
    const cloudRef = useRef(0);
    const cloudStarsRef = useRef(0);

    // 게임에서 별을 저장하면 이벤트로 다시 읽는다 (같은 탭) / 다른 탭은 storage 이벤트
    useEffect(() => {
        const refresh = () => {
            setProgress((prev) => Math.max(prev, loadJigsawCleared(), cloudRef.current));
            setStars((prev) => Math.max(prev, loadJigsawStarTotal(), cloudStarsRef.current));
        };
        window.addEventListener(JIGSAW_PROGRESS_EVENT, refresh);
        window.addEventListener('storage', refresh);
        return () => {
            window.removeEventListener(JIGSAW_PROGRESS_EVENT, refresh);
            window.removeEventListener('storage', refresh);
        };
    }, []);

    useEffect(() => {
        return onAuthStateChanged(auth, async (user) => {
            if (!user) return;
            try {
                const ref = FIRESTORE_DOC(user.uid);
                const snap = await getDoc(ref);
                const cloud = snap.exists() ? Number(snap.data()?.clearedStage ?? 0) : 0;
                const cloudStars = snap.exists() ? Number(snap.data()?.totalStars ?? 0) : 0;
                cloudRef.current = Number.isFinite(cloud) ? cloud : 0;
                cloudStarsRef.current = Number.isFinite(cloudStars) ? cloudStars : 0;
                const merged = Math.max(cloudRef.current, loadJigsawCleared());
                const mergedStars = Math.max(cloudStarsRef.current, loadJigsawStarTotal());
                setProgress((prev) => Math.max(prev, merged));
                setStars((prev) => Math.max(prev, mergedStars));
                if (merged > cloudRef.current || mergedStars > cloudStarsRef.current) {
                    cloudRef.current = merged;
                    cloudStarsRef.current = mergedStars;
                    await setDoc(ref, { clearedStage: merged, totalStars: mergedStars }, { merge: true });
                }
            } catch (e) {
                console.error('Tiny Pieces 진행도 동기화 실패', e);
            }
        });
    }, []);

    // 로컬에서 앞서 나가면 서버에도 올린다
    useEffect(() => {
        const user = auth.currentUser;
        if (!user || (progress <= cloudRef.current && stars <= cloudStarsRef.current)) return;
        cloudRef.current = Math.max(cloudRef.current, progress);
        cloudStarsRef.current = Math.max(cloudStarsRef.current, stars);
        setDoc(FIRESTORE_DOC(user.uid), { clearedStage: cloudRef.current, totalStars: cloudStarsRef.current }, { merge: true }).catch(console.error);
    }, [progress, stars]);

    return { progress, stars };
}
