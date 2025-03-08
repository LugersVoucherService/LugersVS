import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { doc, getDoc, updateDoc, setDoc, collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

class DashboardManager {
    constructor() {
        this.currentUser = null;
        this.userDoc = null;
        this.recentTrades = JSON.parse(sessionStorage.getItem('recentTrades')) || [];
        this.robloxCache = new Map();
        this.initialize();
    }

    async initialize() {
        try {
            this.showLoadingState();
            
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    this.currentUser = user;
                    await this.loadUserData();
                    await this.updateDashboard();
                    await this.loadTradeHistory();
                } else {
                    window.location.href = 'login.html';
                }
                this.hideLoadingState();
            });

            this.initializeTheme();
            this.initializeEventListeners();
        } catch (error) {
            console.error('Failed to initialize dashboard:', error);
            this.hideLoadingState();
            this.showError('Failed to load dashboard. Please try again later.');
        }
    }

    async loadUserData() {
        try {
            if (!this.currentUser) return;

            const verifiedRef = collection(db, 'Verified');
            const q = query(verifiedRef, where('email', '==', this.currentUser.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                this.userDoc = querySnapshot.docs[0].data();
                if (this.userDoc.robloxid) {
                    const robloxData = await this.fetchRobloxData(this.userDoc.robloxid);
                    if (robloxData) {
                        this.userDoc.robloxUsername = robloxData.name;
                        this.userDoc.robloxDisplayName = robloxData.displayName;
                        this.userDoc.robloxAvatar = robloxData.thumbnail;
                        
                        const userCredentials = {
                            robloxId: this.userDoc.robloxid,
                            robloxUsername: robloxData.name,
                            robloxDisplayName: robloxData.displayName,
                            robloxAvatar: robloxData.thumbnail,
                            discordId: this.userDoc.discordId || '',
                            email: this.currentUser.email
                        };
                        localStorage.setItem('userCredentials', JSON.stringify(userCredentials));
                    }
                }
            } else {
                console.error('User not found in Verified collection');
                this.showError('Account not verified. Please contact an administrator.');
                setTimeout(() => {
                    auth.signOut();
                    window.location.href = 'login.html';
                }, 3000);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showError('Failed to load user data');
        }
    }

    async fetchRobloxData(userId) {
        if (!userId) return null;
        
        if (this.robloxCache.has(userId)) {
            return this.robloxCache.get(userId);
        }

        try {
            const userResponse = await fetch(`https://lugersvsapi.pythonanywhere.com/roblox/user/${userId}`);
            const thumbnailResponse = await fetch(`https://lugersvsapi.pythonanywhere.com/roblox/thumbnail/user/${userId}`);
            
            const userData = await userResponse.json();
            const thumbnailData = await thumbnailResponse.json();
            
            const robloxData = {
                displayName: userData.displayName,
                name: userData.name,
                id: userId,
                thumbnail: thumbnailData.imageUrl
            };

            this.robloxCache.set(userId, robloxData);
            return robloxData;
        } catch (error) {
            console.warn('Failed to fetch Roblox data:', error);
            return null;
        }
    }

    async updateDashboard() {
        if (!this.currentUser || !this.userDoc) return;

        try {
            const usernameEl = document.getElementById('username');
            const userRoleEl = document.getElementById('userRole');
            const roleStatusEl = document.getElementById('roleStatus');

            if (usernameEl) {
                usernameEl.textContent = this.userDoc.robloxDisplayName || this.currentUser.email.split('@')[0];
            }
            if (userRoleEl) {
                userRoleEl.textContent = this.capitalizeFirstLetter(this.userDoc.role);
            }
            if (roleStatusEl) {
                roleStatusEl.innerHTML = this.getRoleBadgeIcon(this.userDoc.role);
                roleStatusEl.title = `Role: ${this.capitalizeFirstLetter(this.userDoc.role)}`;
            }

            const verifiedDate = this.userDoc.verifiedat instanceof Date ? 
                this.userDoc.verifiedat : 
                new Date(this.userDoc.verifiedat.seconds * 1000);
            const memberSince = verifiedDate.toLocaleDateString();

            const memberSinceEl = document.getElementById('memberSince');
            const accountStatusEl = document.getElementById('accountStatus');
            const verificationDateEl = document.getElementById('verificationDate');

            if (memberSinceEl) {
                memberSinceEl.textContent = memberSince;
                this.updateMembershipProgress(verifiedDate.getTime() / 1000);
            }
            if (accountStatusEl) {
                accountStatusEl.textContent = this.userDoc.verified ? 'Verified' : 'Unverified';
            }
            if (verificationDateEl) {
                verificationDateEl.textContent = `Verified on: ${memberSince}`;
            }

            const userEmailEl = document.getElementById('userEmail');
            if (userEmailEl) {
                userEmailEl.textContent = this.currentUser.email;
            }
            
            if (this.userDoc.robloxid) {
                const robloxData = await this.fetchRobloxData(this.userDoc.robloxid);
                if (robloxData) {
                    const profileAvatar = document.querySelector('.profile-avatar img');
                    const robloxProfile = document.getElementById('robloxProfile');

                    if (profileAvatar) {
                        profileAvatar.src = robloxData.thumbnail;
                        profileAvatar.alt = `${robloxData.name}'s avatar`;
                    }

                    if (robloxProfile) {
                        robloxProfile.href = `https://www.roblox.com/users/${this.userDoc.robloxid}/profile`;
                        robloxProfile.innerHTML = `@${robloxData.name}`;
                    }
                }
            }

            const discordIdEl = document.getElementById('discordId');
            if (discordIdEl && this.userDoc.discordId) {
                discordIdEl.textContent = this.userDoc.discordId;
            }

        } catch (error) {
            console.error('Error updating dashboard:', error);
            this.showError('Failed to update some dashboard elements');
        }
    }

    updateMembershipProgress(verifiedTimestamp) {
        const progressBar = document.getElementById('membershipProgress');
        if (!progressBar) return;

        const now = Math.floor(Date.now() / 1000);
        const daysSinceVerification = Math.floor((now - verifiedTimestamp) / (24 * 60 * 60));
        const progress = Math.min((daysSinceVerification / 30) * 100, 100);
        
        progressBar.style.width = `${progress}%`;
        progressBar.title = `Member for ${daysSinceVerification} days`;
    }

    updateSecurityTips(status) {
        const tipsContainer = document.getElementById('securityTips');
        const tips = {
            '🔴 Basic': [
                'Verify your email address',
                'Add a second authentication method'
            ],
            '🟡 Good': [
                'Consider adding another authentication method',
                'Regular password updates recommended'
            ],
            '🟢 Strong': [
                'Your account security is optimal',
                'Remember to maintain secure practices'
            ]
        };

        const currentTips = tips[status] || tips['🔴 Basic'];
        tipsContainer.innerHTML = currentTips.map(tip => `
            <div class="security-tip">
                <i class="fas fa-info-circle"></i>
                ${tip}
            </div>
        `).join('');
    }

    async loadTradeHistory() {
        try {
            const tradeList = document.querySelector('.trade-list');
            if (!tradeList) return;

            tradeList.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                    Loading trade history...
                </div>
            `;

            const historyRef = collection(db, 'Users', this.currentUser.email, 'TradeHistory');
            const q = query(historyRef, orderBy('createdAt', 'desc'), limit(5));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                tradeList.innerHTML = `
                    <div class="no-trades">
                        <i class="fas fa-inbox"></i>
                        <p>No trade history yet</p>
                    </div>
                `;
                return;
            }

            tradeList.innerHTML = '';

            const trades = await Promise.all(querySnapshot.docs.map(async doc => {
                const trade = doc.data();
                const partnerProfile = trade.partnerProfile || {};
                
                const userId = this.extractUserId(partnerProfile.robloxLink);
                const robloxData = userId ? await this.fetchRobloxData(userId) : null;
                
                return {
                    id: doc.id,
                    ...trade,
                    partnerInfo: {
                        displayName: robloxData?.displayName || 'Unknown User',
                        username: robloxData?.name || 'Unknown',
                        avatar: robloxData?.thumbnail || 'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-310966282D3529E36976BF6B07B1DC90-Png/150/150/AvatarHeadshot/Webp/noFilter'
                    }
                };
            }));

            trades.forEach(trade => {
                const date = trade.createdAt ? new Date(trade.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                }) : 'Unknown Date';

                const tradeItem = document.createElement('div');
                tradeItem.className = 'trade-item';
                tradeItem.innerHTML = `
                    <div class="trade-partner-info">
                        <div class="trade-partner-avatar">
                            <img src="${trade.partnerInfo.avatar}" alt="Partner Avatar">
                        </div>
                        <div class="trade-partner-details">
                            <span class="trade-partner-name">@${trade.partnerInfo.username}</span>
                            <span class="trade-date">
                                <i class="far fa-clock"></i>
                                ${date}
                            </span>
                        </div>
                    </div>
                    <div class="trade-details">
                        <div class="trade-offered">
                            <div class="trade-label">
                                <i class="fas fa-arrow-right"></i>
                                You Offered
                            </div>
                            <div class="trade-items">${trade.yourProfile?.offeredItems || 'No items specified'}</div>
                        </div>
                        <div class="trade-received">
                            <div class="trade-label">
                                <i class="fas fa-arrow-left"></i>
                                You Received
                            </div>
                            <div class="trade-items">${trade.partnerProfile?.offeredItems || 'No items specified'}</div>
                        </div>
                    </div>
                    <div class="trade-status ${trade.verified ? 'verified' : 'pending'}">
                        <i class="fas fa-${trade.verified ? 'shield-alt' : 'clock'}"></i>
                        ${trade.verified ? 'Verified' : 'Pending'}
                    </div>
                `;

                tradeList.appendChild(tradeItem);
            });

        } catch (error) {
            console.error('Error loading trade history:', error);
            const tradeList = document.querySelector('.trade-list');
            if (tradeList) {
                tradeList.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        Failed to load trade history. Please try again later.
                    </div>
                `;
            }
        }
    }

    extractUserId(robloxLink) {
        if (!robloxLink) return null;
        const match = robloxLink.match(/users\/(\d+)/);
        return match ? match[1] : null;
    }

    addTradeToHistory(trade) {
        this.recentTrades.unshift(trade);
        if (this.recentTrades.length > 5) {
            this.recentTrades.pop();
        }
        sessionStorage.setItem('recentTrades', JSON.stringify(this.recentTrades));
        this.loadTradeHistory();
    }

    determineSecurityStatus() {
        if (!this.currentUser) return '🔴 Basic';
        
        if (this.currentUser.emailVerified && this.currentUser.providerData.length > 1) {
            return '🟢 Strong';
        } else if (this.currentUser.emailVerified) {
            return '🟡 Good';
        }
        return '🔴 Basic';
    }

    getRoleBadgeIcon(role) {
        const icons = {
            owner: '<i class="fas fa-crown"></i>',
            admin: '<i class="fas fa-star"></i>',
            moderator: '<i class="fas fa-shield-alt"></i>',
            verified: '<i class="fas fa-check"></i>'
        };
        return icons[role.toLowerCase()] || '<i class="fas fa-user"></i>';
    }

    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    }

    initializeEventListeners() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.handleThemeToggle());
        }

        const editCredentials = document.getElementById('editCredentials');
        if (editCredentials) {
            editCredentials.addEventListener('click', () => this.showEditCredentialsModal());
        }

        const credentialsForm = document.getElementById('credentialsForm');
        if (credentialsForm) {
            credentialsForm.addEventListener('submit', (e) => this.handleCredentialsUpdate(e));
        }

        const closeModal = document.querySelector('.close-modal');
        if (closeModal) {
            closeModal.addEventListener('click', () => this.hideEditCredentialsModal());
        }

        const historyFilter = document.getElementById('historyFilter');
        if (historyFilter) {
            historyFilter.addEventListener('change', () => this.loadTradeHistory());
        }
    }

    showEditCredentialsModal() {
        const modal = document.getElementById('editCredentialsModal');
        if (modal) {
            modal.style.display = 'block';
            setTimeout(() => modal.classList.add('show'), 10);

            if (this.userDoc) {
                document.getElementById('editRobloxId').value = this.userDoc.robloxid || '';
                document.getElementById('editDiscordId').value = this.userDoc.discordId || '';
                
                if (this.userDoc.robloxUsername) {
                    document.getElementById('editRobloxId').placeholder = `Current: @${this.userDoc.robloxUsername}`;
                }
            }
        }
    }

    hideEditCredentialsModal() {
        const modal = document.getElementById('editCredentialsModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    }

    async handleCredentialsUpdate(e) {
        e.preventDefault();
        try {
            const robloxId = document.getElementById('editRobloxId').value.trim();
            const discordId = document.getElementById('editDiscordId').value.trim();

            if (!robloxId && !discordId) {
                this.showError('Please enter at least one credential to update');
                return;
            }

            if (robloxId) {
                const robloxData = await this.fetchRobloxData(robloxId);
                if (!robloxData) {
                    this.showError('Invalid Roblox ID. Please check and try again.');
                    return;
                }
            }

            const verifiedRef = collection(db, 'Verified');
            const q = query(verifiedRef, where('email', '==', this.currentUser.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const updateData = {};
                
                if (robloxId) updateData.robloxid = robloxId;
                if (discordId) updateData.discordId = discordId;

                await updateDoc(doc(db, 'Verified', userDoc.id), updateData);
                
                const cachedCredentials = JSON.parse(localStorage.getItem('userCredentials') || '{}');
                if (robloxId) {
                    const robloxData = await this.fetchRobloxData(robloxId);
                    if (robloxData) {
                        cachedCredentials.robloxId = robloxId;
                        cachedCredentials.robloxUsername = robloxData.name;
                        cachedCredentials.robloxDisplayName = robloxData.displayName;
                        cachedCredentials.robloxAvatar = robloxData.thumbnail;
                    }
                }
                if (discordId) {
                    cachedCredentials.discordId = discordId;
                }
                localStorage.setItem('userCredentials', JSON.stringify(cachedCredentials));
                
                await this.loadUserData();
                await this.updateDashboard();
                
                this.hideEditCredentialsModal();
                this.showSuccess('Credentials updated successfully!');
            } else {
                this.showError('Account not found. Please contact an administrator.');
            }
        } catch (error) {
            console.error('Error updating credentials:', error);
            this.showError('Failed to update credentials. Please try again.');
        }
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.body.classList.remove('light-mode', 'dark-mode');
        document.body.classList.add(`${savedTheme}-mode`);
        
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('.theme-toggle-icon');
            icon.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
        }
    }

    async handleLogout() {
        try {
            localStorage.removeItem('userCredentials');
            await auth.signOut();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Error logging out:', error);
            this.showError('Failed to log out. Please try again.');
        }
    }

    handleThemeToggle() {
        const isDark = document.body.classList.contains('dark-mode');
        const newTheme = isDark ? 'light' : 'dark';
        
        document.body.classList.toggle('light-mode');
        document.body.classList.toggle('dark-mode');
        
        const icon = document.querySelector('.theme-toggle-icon');
        if (icon) {
            icon.textContent = newTheme === 'dark' ? '🌙' : '☀️';
        }
        
        localStorage.setItem('theme', newTheme);
    }

    showLoadingState() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
    }

    hideLoadingState() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    showError(message) {
        const errorToast = document.createElement('div');
        errorToast.className = 'error-toast';
        errorToast.innerHTML = `
            <div class="error-content">
                <i class="fas fa-exclamation-circle"></i>
                <span>${message}</span>
            </div>
            <div class="toast-progress"></div>
            <button class="close-error">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(errorToast);
        
        setTimeout(() => errorToast.classList.add('show'), 10);
        
        const progress = errorToast.querySelector('.toast-progress');
        progress.style.animation = 'toast-progress 5s linear forwards';
        
        setTimeout(() => {
            errorToast.classList.remove('show');
            setTimeout(() => errorToast.remove(), 300);
        }, 5000);
        
        const closeBtn = errorToast.querySelector('.close-error');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                errorToast.classList.remove('show');
                setTimeout(() => errorToast.remove(), 300);
            });
        }
    }

    showSuccess(message) {
        const successToast = document.createElement('div');
        successToast.className = 'success-toast';
        successToast.innerHTML = `
            <div class="success-content">
                <i class="fas fa-check-circle"></i>
                <span>${message}</span>
            </div>
            <div class="toast-progress"></div>
            <button class="close-success">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(successToast);
        
        setTimeout(() => successToast.classList.add('show'), 10);
        
        const progress = successToast.querySelector('.toast-progress');
        progress.style.animation = 'toast-progress 5s linear forwards';
        
        setTimeout(() => {
            successToast.classList.remove('show');
            setTimeout(() => successToast.remove(), 300);
        }, 5000);
        
        const closeBtn = successToast.querySelector('.close-success');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                successToast.classList.remove('show');
                setTimeout(() => successToast.remove(), 300);
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DashboardManager();
}); 