import { getAuth, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";

const firebaseConfig = {
    apiKey: "AIzaSyBDzyWfwB54Bo-ZrIykJCJHVQe6nQriqUU",
    authDomain: "voucher-df8cc.firebaseapp.com",
    projectId: "voucher-df8cc",
    storageBucket: "voucher-df8cc.firebasestorage.app",
    messagingSenderId: "1066514451346",
    appId: "1:1066514451346:web:1bf82433cc460b6775cf4b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

function usernameToEmail(username) {
    return `${username}@voucher-df8cc.firebaseapp.com`;
}

async function createAccount(username, password) {
    try {
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            throw new Error('Username can only contain letters, numbers, underscores, and hyphens');
        }
        if (username.length < 3 || username.length > 30) {
            throw new Error('Username must be between 3 and 30 characters');
        }

        const email = usernameToEmail(username);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        window.location.href = 'https://lugers-vs.netlify.app/templates/dashboard';
        return userCredential.user;
    } catch (error) {
        console.error('Error creating account:', error);
        throw error;
    }
}

async function signIn(username, password) {
    try {
        const email = usernameToEmail(username);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        window.location.href = 'https://lugers-vs.netlify.app/templates/dashboard';
        return userCredential.user;
    } catch (error) {
        console.error('Error signing in:', error);
        throw error;
    }
}

async function signInWithGoogle() {
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        window.location.href = 'https://lugers-vs.netlify.app/templates/dashboard';
        return result.user;
    } catch (error) {
        console.error('Error signing in with Google:', error);
        throw error;
    }
}

async function checkAuthStatus() {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
            resolve(user);
        });
    });
}

async function logout() {
    try {
        await signOut(auth);
        window.location.href = 'https://lugers-vs.netlify.app/templates/login';
    } catch (error) {
        console.error('Error logging out:', error);
        throw error;
    }
}

async function checkAndRedirectIfLoggedIn() {
    const user = await checkAuthStatus();
    if (user) {
        window.location.href = 'https://lugers-vs.netlify.app/templates/dashboard';
    }
}

window.createAccount = createAccount;
window.signIn = signIn;
window.signInWithGoogle = signInWithGoogle;
window.checkAuthStatus = checkAuthStatus;
window.logout = logout;
window.checkAndRedirectIfLoggedIn = checkAndRedirectIfLoggedIn;
