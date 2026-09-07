import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup, linkWithPopup } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getAnalytics, logEvent as firebaseLogEvent, setUserId as firebaseSetUserId, setUserProperties as firebaseSetUserProperties, isSupported } from "firebase/analytics";

// TODO: Replace the following with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/learn-more#config-object
const firebaseConfig = {
    apiKey: "AIzaSyAZ12cjnbISP3fCzQjvqWGW_z6x9DzOSao",
    authDomain: "sudoku-78eb5.firebaseapp.com",
    projectId: "sudoku-78eb5",
    storageBucket: "sudoku-78eb5.firebasestorage.app",
    messagingSenderId: "941666233372",
    appId: "1:941666233372:web:f4ce22173989ec041f03d9",
    measurementId: "G-36Y4WL3EQH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

// Analytics (not supported in some environments e.g. localhost without measurementId)
let analyticsInstance: ReturnType<typeof getAnalytics> | null = null;
isSupported().then(supported => {
    if (!supported) return;
    analyticsInstance = getAnalytics(app);
    if (pendingUserId !== null) {
        firebaseSetUserId(analyticsInstance, pendingUserId);
        pendingUserId = null;
    }
    if (pendingUserProps) {
        firebaseSetUserProperties(analyticsInstance, pendingUserProps);
        pendingUserProps = null;
    }
    // uid 를 먼저 심고 나서 흘려보내야 큐에 쌓인 이벤트도 같은 사람으로 묶인다.
    while (pendingEvents.length) {
        const e = pendingEvents.shift()!;
        firebaseLogEvent(analyticsInstance, e.name, e.params);
    }
});

/**
 * 사용자 속성도 초기화 전에 부르면 사라지므로 같이 큐에 담는다.
 */
let pendingUserProps: Record<string, string> | null = null;
export const setAnalyticsUserProperties = (props: Record<string, string>) => {
    if (analyticsInstance) firebaseSetUserProperties(analyticsInstance, props);
    else pendingUserProps = { ...(pendingUserProps ?? {}), ...props };
};

/**
 * analytics 초기화(isSupported)가 비동기라, 그 전에 부른 이벤트는 그냥 사라졌었다.
 * 화면 진입처럼 이른 시점에 보내는 이벤트가 통째로 누락되므로 큐에 담았다가 흘려보낸다.
 */
type EventParams = Record<string, unknown>;
const pendingEvents: { name: string; params?: EventParams }[] = [];

export const logEvent = (eventName: string, params?: EventParams) => {
    if (analyticsInstance) firebaseLogEvent(analyticsInstance, eventName, params);
    else pendingEvents.push({ name: eventName, params });
};

/**
 * 기기를 옮기거나 익명→구글 계정으로 넘어가도 같은 사람으로 묶기 위해 uid를 심는다.
 * 이게 없으면 유지율이 실제보다 낮게 나온다(같은 사람이 새 유저로 잡힘).
 *
 * analytics 초기화는 비동기라, 초기화 전에 불리면 값을 들고 있다가 나중에 넣는다.
 */
let pendingUserId: string | null = null;
export const setAnalyticsUserId = (uid: string | null) => {
    if (analyticsInstance) firebaseSetUserId(analyticsInstance, uid);
    else pendingUserId = uid;
};

export const googleProvider = new GoogleAuthProvider();
export { auth, db, functions, signInAnonymously, signInWithPopup, linkWithPopup };
