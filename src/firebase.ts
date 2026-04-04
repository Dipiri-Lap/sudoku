import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup, linkWithPopup } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, logEvent as firebaseLogEvent, isSupported } from "firebase/analytics";

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

// Analytics (not supported in some environments e.g. localhost without measurementId)
let analyticsInstance: ReturnType<typeof getAnalytics> | null = null;
isSupported().then(supported => {
    if (supported) analyticsInstance = getAnalytics(app);
});

export const logEvent = (eventName: string, params?: Record<string, any>) => {
    if (analyticsInstance) firebaseLogEvent(analyticsInstance, eventName, params);
};

export const googleProvider = new GoogleAuthProvider();
export { auth, db, signInAnonymously, signInWithPopup, linkWithPopup };
