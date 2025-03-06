import { auth, db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

class VerifiedUsersManager {
    constructor() {
        this.debug = false;
        this.verifiedUsers = new Set();
    }

    log(...args) {
        if (this.debug) {
            console.log('[VerifiedUsers]', ...args);
        }
    }

    error(...args) {
        console.error('[VerifiedUsers Error]', ...args);
    }

    async loadVerifiedUsers() {
        try {
            const verifiedRef = collection(db, 'Verified');
            const querySnapshot = await getDocs(verifiedRef);
            
            this.verifiedUsers.clear();
            querySnapshot.forEach((doc) => {
                const userData = doc.data();
                if (userData.verified === true) {
                    this.verifiedUsers.add(userData.email);
                }
            });
        } catch (error) {
            this.error('Error loading verified users:', error);
            throw error;
        }
    }

    isUserVerified(email) {
        return this.verifiedUsers.has(email);
    }
}

export const verifiedUsersManager = new VerifiedUsersManager();