import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace the following with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/learn-more#config-object
const firebaseConfig = {
    apiKey: "AIzaSyAZ12cjnbISP3fCzQjvqWGW_z6x9DzOSao",
    authDomain: "sudoku-78eb5.firebaseapp.com",
    projectId: "sudoku-78eb5",
    storageBucket: "sudoku-78eb5.firebasestorage.app",
    messagingSenderId: "941666233372",
    appId: "1:941666233372:web:f4ce22173989ec041f03d9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, signInAnonymously };
