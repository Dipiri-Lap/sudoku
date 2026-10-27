import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app, auth, db, logEvent } from '../firebase';

/**
 * 오늘의 퍼즐 웹 푸시 알림 (클라이언트).
 * 허용하면 FCM 토큰을 users/{uid}/pushTokens/{token} 에 저장하고,
 * 실제 발송은 Cloud Functions(dailyPuzzlePushMorning / dailyPuzzlePushEvening)가 한다.
 *
 * VITE_FIREBASE_VAPID_KEY(Firebase 콘솔 > 프로젝트 설정 > 클라우드 메시징 > 웹 푸시 인증서)가
 * 없으면 아무것도 보여 주지 않는다.
 */

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
const SW_URL = '/firebase-messaging-sw.js';
// 앱의 메인 서비스 워커(범위 '/')와 겹치지 않게 FCM 전용 범위를 쓴다.
const SW_SCOPE = '/firebase-cloud-messaging-push-scope';

const DISMISS_KEY = 'push_prompt_dismissed_at';
/** "나중에"를 누른 뒤 다시 묻기까지의 일수 */
const DISMISS_DAYS = 14;

export type PushState = 'unsupported' | 'unconfigured' | 'denied' | 'granted' | 'default';

export async function getPushState(): Promise<PushState> {
    if (!VAPID_KEY) return 'unconfigured';
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported';
    try {
        if (!(await isSupported())) return 'unsupported';
    } catch {
        return 'unsupported';
    }
    return Notification.permission as PushState;
}

function dismissedRecently(): boolean {
    try {
        const raw = localStorage.getItem(DISMISS_KEY);
        if (!raw) return false;
        return Date.now() - Number(raw) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
    } catch {
        return false;
    }
}

/** 지금 "알림 받을까요?"를 물어도 되는지 (처음이고, 최근에 거절하지 않았을 때만) */
export async function shouldAskPush(): Promise<boolean> {
    if (dismissedRecently()) return false;
    return (await getPushState()) === 'default';
}

export function dismissPushPrompt(): void {
    try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
        /* 저장소를 못 써도 앱은 계속 돌아간다 */
    }
}

async function fetchToken(): Promise<string | null> {
    const registration = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    return token || null;
}

async function saveToken(uid: string, token: string): Promise<void> {
    await setDoc(
        doc(db, 'users', uid, 'pushTokens', token),
        { token, updatedAt: serverTimestamp(), userAgent: navigator.userAgent.slice(0, 200) },
        { merge: true },
    );
}

export type EnablePushResult = 'granted' | 'denied' | 'unsupported' | 'error';

/** 브라우저 허용 창을 띄우고, 허용되면 토큰을 저장한다. */
export async function enablePush(): Promise<EnablePushResult> {
    const state = await getPushState();
    if (state === 'unsupported' || state === 'unconfigured') return 'unsupported';
    if (state === 'denied') return 'denied';

    try {
        const permission = state === 'granted' ? 'granted' : await Notification.requestPermission();
        if (permission !== 'granted') {
            logEvent('push_opt_in', { result: permission });
            return 'denied';
        }
        const user = auth.currentUser;
        const token = await fetchToken();
        if (!user || !token) return 'error';
        await saveToken(user.uid, token);
        logEvent('push_opt_in', { result: 'granted' });
        return 'granted';
    } catch (e) {
        console.error('pushNotification enable error:', e);
        logEvent('push_opt_in', { result: 'error' });
        return 'error';
    }
}

/**
 * 이미 허용한 사용자의 토큰을 조용히 다시 저장한다.
 * (토큰은 바뀔 수 있고, 익명 계정이 바뀌면 새 uid 아래에도 있어야 한다.)
 */
export async function syncPushTokenIfGranted(uid: string): Promise<void> {
    try {
        if ((await getPushState()) !== 'granted') return;
        const token = await fetchToken();
        if (token) await saveToken(uid, token);
    } catch (e) {
        console.error('pushNotification sync error:', e);
    }
}
