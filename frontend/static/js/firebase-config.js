import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBDzyWfwB54Bo-ZrIykJCJHVQe6nQriqUU",
    authDomain: "voucher-df8cc.firebaseapp.com",
    projectId: "voucher-df8cc",
    storageBucket: "voucher-df8cc.firebasestorage.app",
    messagingSenderId: "1066514451346",
    appId: "1:1066514451346:web:1bf82433cc460b6775cf4b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db }; 