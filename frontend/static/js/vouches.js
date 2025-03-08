import { verifiedUsersManager } from './verifiedUsers.js';
import { auth, db } from './firebase-config.js';
import { collection, addDoc, getDocs, query, orderBy, limit, getDoc, doc, where } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

class VouchManager {
    constructor() {
        this.currentUser = null;
        this.isVerified = false;
        this.currentPage = 1;
        this.itemsPerPage = 9;
        this.totalPages = 10;
        this.searchTimeout = null;
        this.initialize();
    }

    async initialize() {
        try {
            await verifiedUsersManager.loadVerifiedUsers();
            
            onAuthStateChanged(auth, (user) => {
                this.currentUser = user;
                if (user) {
                    this.isVerified = verifiedUsersManager.isUserVerified(user.email);
                    this.updateUI();
                } else {
                    this.isVerified = false;
                    this.updateUI();
                }
            });

            this.initializeEventListeners();
            this.loadVouches();
        } catch (error) {
            this.showError('Failed to initialize. Please try again later.');
        }
    }

    updateUI() {
        const createVouchBtn = document.getElementById('createVouchBtn');
        if (createVouchBtn) {
            createVouchBtn.style.display = this.isVerified ? 'flex' : 'none';
            
            if (this.isVerified) {
                createVouchBtn.onclick = () => this.showCreateVouchModal();
            }
        }
    }

    initializeEventListeners() {
        const searchInput = document.querySelector('.search-bar input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.handleSearch(e.target.value);
                }, 300);
            });
        }

        const filterSelects = document.querySelectorAll('.filter-select');
        filterSelects.forEach(select => {
            select.addEventListener('change', () => this.handleFilters());
        });

        const prevBtn = document.querySelector('.pagination-btn:first-child');
        const nextBtn = document.querySelector('.pagination-btn:last-child');
        if (prevBtn) prevBtn.addEventListener('click', () => this.changePage('prev'));
        if (nextBtn) nextBtn.addEventListener('click', () => this.changePage('next'));

        document.querySelectorAll('.page-number').forEach(num => {
            num.addEventListener('click', () => {
                const page = parseInt(num.textContent);
                if (!isNaN(page)) this.goToPage(page);
            });
        });

        const createVouchBtn = document.getElementById('createVouchBtn');
        if (createVouchBtn) {
            createVouchBtn.addEventListener('click', () => {
                this.showCreateVouchModal();
            });
        }

        this.initializeObserver();
    }

    initializeObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.vouch-card').forEach(card => {
            observer.observe(card);
        });
    }

    async loadVouches(options = {}) {
        try {
            this.showLoadingState();
            const vouchesRef = collection(db, 'Vouches');
            
            let q = query(vouchesRef);
            
            if (options.search) {
                const searchTerm = options.search.trim();
                q = query(q, where('yourProfile.robloxLink', '>=', searchTerm), 
                         where('yourProfile.robloxLink', '<=', searchTerm + '\uf8ff'));
            }
            
            const sortDirection = options.sort === 'oldest' ? 'asc' : 'desc';
            q = query(q, orderBy('createdAt', sortDirection));
            
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            q = query(q, limit(this.itemsPerPage));

            const querySnapshot = await getDocs(q);
            const vouches = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                vouches.push({ id: doc.id, ...data });
            });

            const totalSnapshot = await getDocs(query(vouchesRef));
            this.totalPages = Math.ceil(totalSnapshot.size / this.itemsPerPage);

            await this.renderVouches(vouches);
            this.updatePaginationUI();
        } catch (error) {
            console.error('Load error:', error);
            this.showError('Failed to load vouches. Please try again later.');
        } finally {
            this.hideLoadingState();
        }
    }

    async upload_GoFile(file) {
        try {    
            if (!file) {
                throw new Error('No file provided');
            }
    
            if (typeof file === 'string') {
                return file;
            }
    
            if (!file.name || typeof file.name !== 'string') {
                throw new Error('File must have a valid name property');
            }
    
            const fileName = file.name;
            const lowerCaseName = fileName.toLowerCase();
            if (
                !lowerCaseName.endsWith('.jpg') &&
                !lowerCaseName.endsWith('.jpeg') &&
                !lowerCaseName.endsWith('.png')
            ) {
                throw new Error('Only .jpg, .jpeg and .png files are allowed');
            }
    
            if (file.size > 1024 * 1024) {
                throw new Error('File size must be under 1MB');
            }
    
            const serverResponse = await fetch('https://api.gofile.io/servers');
            const serverData = await serverResponse.json();
    
            if (!serverResponse.ok || serverData.status !== 'ok' || !serverData.data?.servers) {
                throw new Error('Failed to get upload server');
            }
    
            const servers = Object.values(serverData.data.servers);    
            const naServer = servers.find(s => s.zone === 'na');
            if (!naServer) {
                throw new Error('No North American servers available');
            }
    
            console.log('Selected NA server:', naServer);
    
            const formData = new FormData();
            formData.append('file', file);
    
            const uploadResponse = await fetch(`https://${naServer.name}.gofile.io/uploadFile`, {
                method: 'POST',
                body: formData
            });
    
            if (!uploadResponse.ok) {
                throw new Error(`Upload failed with status: ${uploadResponse.status}`);
            }
    
            const uploadData = await uploadResponse.json();
    
            if (uploadData.status !== 'ok' || !uploadData.data?.downloadPage) {
                throw new Error('Invalid response from upload service');
            }
    
            return uploadData.data.directLink || uploadData.data.downloadPage;
    
        } catch (error) {
            console.error('Upload error:', error);
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Network error: Please check your internet connection');
            }
            throw new Error(`Failed to upload file: ${error.message}`);
        }
    }
    

    async createVouch(vouchData) {
        try {
            if (!this.currentUser) {
                throw new Error('You must be logged in to create a vouch');
            }

            if (!this.isVerified) {
                throw new Error('Only verified users can create vouches');
            }

            const imageUrls = await Promise.all(
                vouchData.screenshots.map(file => this.upload_GoFile(file))
            );

            const vouchesRef = collection(db, 'Vouches');
            const newVouch = {
                ...vouchData,
                screenshots: imageUrls,
                createdBy: {
                    email: this.currentUser.email,
                    role: 'owner'
                },
                createdAt: new Date(),
                verified: true,
                verifiedat: new Date()
            };

            const docRef = await addDoc(vouchesRef, newVouch);
            return docRef.id;
        } catch (error) {
            throw error;
        }
    }

    async fetchRobloxData(userId) {
        if (!userId) return null;
        try {
            const userResponse = await fetch(`https://lugersvsapi.pythonanywhere.com/roblox/user/${userId}`);
            const thumbnailResponse = await fetch(`https://lugersvsapi.pythonanywhere.com/roblox/thumbnail/user/${userId}`);
            
            const userData = await userResponse.json();
            const thumbnailData = await thumbnailResponse.json();
            
            return {
                displayName: userData.displayName,
                name: userData.name,
                id: userData.id,
                thumbnail: thumbnailData.imageUrl
            };
        } catch (error) {
            console.warn('Failed to fetch Roblox data:', error);
            return null;
        }
    }

    async createVouchCard(vouch) {
        const date = vouch.createdAt ? new Date(vouch.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown Date';

        const getUserId = (profileData) => {
            if (!profileData?.robloxLink) return null;
            const match = profileData.robloxLink.match(/users\/(\d+)/);
            return match ? match[1] : null;
        };

        const truncateText = (text, maxLength) => {
            if (!text) return '';
            return text.length > maxLength ? text.substring(0, maxLength - 2) + '..' : text;
        };

        const userId = getUserId(vouch.yourProfile);
        const defaultImage = 'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-310966282D3529E36976BF6B07B1DC90-Png/150/150/AvatarHeadshot/Webp/noFilter';
        
        const robloxData = await this.fetchRobloxData(userId);
        const displayName = truncateText(robloxData?.displayName || 'Unknown User', 14);
        const username = truncateText(robloxData?.name || userId || 'Unknown User', 17);
        const avatarUrl = robloxData?.thumbnail || defaultImage;

        const card = document.createElement('div');
        card.className = 'trade-card fade-in';
        card.dataset.vouchId = vouch.id;
        
        card.innerHTML = `
            <div class="trade-verification-status ${vouch.verified ? 'verified' : 'pending'}">
                <i class="fas fa-shield-alt"></i>
                <span>${vouch.verified ? 'Verified' : 'Pending'}</span>
            </div>
            
            <div class="trade-card-header">
                <div class="trade-card-meta">
                    <div class="trade-profile-section">
                        <div class="trade-profile-image">
                            <img src="${avatarUrl}" alt="Profile" class="avatar-image">
                        </div>
                        <div class="trade-user-info">
                            <div class="trade-user-basic-info">
                                <span class="trade-displayname">${displayName}</span>
                                <span class="trade-username">@${username}</span>
                                <span class="trade-date">
                                    <i class="far fa-clock"></i>
                                    <span class="date-text">${date}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <button class="trade-details-btn">
                <i class="fas fa-eye"></i>
                View Trade Details
            </button>
        `;

        return card;
    }

    async renderVouches(vouches) {
        const grid = document.querySelector('.vouches-grid');
        if (!grid) return;

        grid.innerHTML = '';
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading vouches...';
        grid.appendChild(loadingIndicator);

        try {
            const vouchCards = await Promise.all(vouches.map(vouch => this.createVouchCard(vouch)));
            grid.innerHTML = '';
            vouchCards.forEach(card => grid.appendChild(card));
            this.initializeObserver();
        } catch (error) {
            console.error('Error rendering vouches:', error);
            grid.innerHTML = '<div class="error-message">Failed to load vouches. Please try again later.</div>';
        }
    }

    generateBadges(badges) {
        const badgeConfig = {
            verified: {
                icon: 'fa-check-circle',
                tooltip: 'Verified by Moderator'
            },
            trusted: {
                icon: 'fa-shield-alt',
                tooltip: 'Trusted Member'
            },
            new: {
                icon: 'fa-star',
                tooltip: 'New User'
            },
            premium: {
                icon: 'fa-crown',
                tooltip: 'Premium Member'
            },
            expert: {
                icon: 'fa-award',
                tooltip: 'Trading Expert'
            }
        };

        return badges.map(badge => `
            <div class="badge ${badge}" title="${badgeConfig[badge].tooltip}">
                <i class="fas ${badgeConfig[badge].icon}"></i>
                ${badge.charAt(0).toUpperCase() + badge.slice(1)}
                <span class="badge-tooltip">${badgeConfig[badge].tooltip}</span>
            </div>
        `).join('');
    }

    handleSearch(query) {
        if (!query.trim()) {
            this.currentPage = 1;
            this.loadVouches();
            return;
        }

        this.currentPage = 1;
        this.loadVouches({ search: query.trim() });
    }

    handleFilters() {
        const sortSelect = document.querySelector('.filter-select[name="sort"]');
        const sort = sortSelect ? sortSelect.value : 'recent';
        
        this.currentPage = 1;
        this.loadVouches({ sort });
    }

    changePage(direction) {
        const newPage = direction === 'next' 
            ? Math.min(this.currentPage + 1, this.totalPages)
            : Math.max(this.currentPage - 1, 1);
        this.goToPage(newPage);
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        this.currentPage = page;
        this.loadVouches();
    }

    updatePaginationUI() {
        const paginationContainer = document.querySelector('.page-numbers');
        if (!paginationContainer) return;

        let html = '';
        const maxVisiblePages = 5;
        const halfVisible = Math.floor(maxVisiblePages / 2);
        
        let startPage = Math.max(1, this.currentPage - halfVisible);
        let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // First page
        if (startPage > 1) {
            html += `<span class="page-number" data-page="1">1</span>`;
            if (startPage > 2) html += `<span class="page-dots">...</span>`;
        }

        // Visible pages
        for (let i = startPage; i <= endPage; i++) {
            html += `<span class="page-number${i === this.currentPage ? ' active' : ''}" data-page="${i}">${i}</span>`;
        }

        // Last page
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) html += `<span class="page-dots">...</span>`;
            html += `<span class="page-number" data-page="${this.totalPages}">${this.totalPages}</span>`;
        }

        paginationContainer.innerHTML = html;

        const prevBtn = document.querySelector('.pagination-btn:first-child');
        const nextBtn = document.querySelector('.pagination-btn:last-child');
        
        if (prevBtn) prevBtn.classList.toggle('disabled', this.currentPage === 1);
        if (nextBtn) nextBtn.classList.toggle('disabled', this.currentPage === this.totalPages);

        document.querySelectorAll('.page-number').forEach(num => {
            num.addEventListener('click', () => {
                const page = parseInt(num.dataset.page);
                if (!isNaN(page)) this.goToPage(page);
            });
        });
    }

    showLoadingState() {
        const grid = document.querySelector('.vouches-grid');
        if (grid) {
            grid.style.opacity = '0.5';
            grid.style.pointerEvents = 'none';
        }
    }

    hideLoadingState() {
        const grid = document.querySelector('.vouches-grid');
        if (grid) {
            grid.style.opacity = '1';
            grid.style.pointerEvents = 'auto';
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
            <button class="close-error">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(errorToast);
        
        setTimeout(() => errorToast.classList.add('show'), 10);
        setTimeout(() => {
            errorToast.classList.remove('show');
            setTimeout(() => errorToast.remove(), 300);
        }, 5000);
        
        errorToast.querySelector('.close-error').addEventListener('click', () => {
            errorToast.classList.remove('show');
            setTimeout(() => errorToast.remove(), 300);
        });
    }

    async showCreateVouchModal() {
        if (!this.currentUser) {
            this.showError('Please log in to create a vouch');
            return;
        }

        if (!this.isVerified) {
            this.showError('Only verified users can create vouches');
            return;
        }

        const modalContainer = document.getElementById('createVouchModal');
        modalContainer.style.display = 'block';
        setTimeout(() => modalContainer.classList.add('modal-show'), 10);

        const form = document.getElementById('createVouchForm');
        const verifyYourRoblox = document.getElementById('verifyYourRoblox');
        const verifyPartnerRoblox = document.getElementById('verifyPartnerRoblox');
        const screenshot1 = document.getElementById('screenshot1');
        const screenshot2 = document.getElementById('screenshot2');
        const preview1 = document.getElementById('preview1');
        const preview2 = document.getElementById('preview2');

        const verifyRobloxProfile = async (input, previewDiv) => {
            const url = input.value;
            if (!url) return;

            try {
                const userId = url.match(/users\/(\d+)/)?.[1];
                if (!userId) {
                    throw new Error('Invalid Roblox profile URL');
                }


                previewDiv.innerHTML = `
                    <div class="verified-profile">
                        <i class="fas fa-shield-check"></i>
                        <span>Profile Verified</span>
                    </div>
                `;
            } catch (error) {
                this.showError(error.message);
            }
        };

        verifyYourRoblox.onclick = () => {
            verifyRobloxProfile(
                document.getElementById('yourRobloxLink'),
                document.getElementById('yourProfilePreview')
            );
        };

        verifyPartnerRoblox.onclick = () => {
            verifyRobloxProfile(
                document.getElementById('partnerRobloxLink'),
                document.getElementById('partnerProfilePreview')
            );
        };

        const handleFileSelect = (file, previewDiv) => {
            if (file) {
                if (file.size > 1024 * 1024) {
                    this.showError('Image must be under 1MB');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    previewDiv.innerHTML = `
                        <img src="${e.target.result}" alt="Screenshot preview" style="
                            max-width: 100%;
                            height: 150px;
                            object-fit: cover;
                            border-radius: 6px;
                            margin-top: 0.5rem;
                        ">
                    `;
                };
                reader.readAsDataURL(file);
            }
        };

        screenshot1.onchange = (e) => handleFileSelect(e.target.files[0], preview1);
        screenshot2.onchange = (e) => handleFileSelect(e.target.files[0], preview2);

        form.onsubmit = async (e) => {
            e.preventDefault();
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;

            try {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

                const formData = new FormData(form);
                
                const screenshot1 = document.getElementById('screenshot1').files[0];
                const screenshot2 = document.getElementById('screenshot2').files[0];

                if (!screenshot1 || !screenshot2) {
                    throw new Error('Please select both screenshots');
                }

                const vouchData = {
                    yourProfile: {
                        robloxLink: formData.get('yourRobloxLink'),
                        discordId: formData.get('yourDiscordId'),
                        offeredItems: formData.get('yourItems')
                    },
                    partnerProfile: {
                        robloxLink: formData.get('partnerRobloxLink'),
                        discordId: formData.get('partnerDiscordId'),
                        offeredItems: formData.get('partnerItems')
                    },
                    screenshots: [
                        await this.upload_GoFile(screenshot1),
                        await this.upload_GoFile(screenshot2)
                    ]
                };

                await this.createVouch(vouchData);
                
                const successMessage = document.createElement('div');
                successMessage.className = 'success-message';
                successMessage.innerHTML = `
                    <i class="fas fa-check-circle"></i>
                    Vouch created successfully!
                `;
                form.appendChild(successMessage);

                setTimeout(() => {
                    modalContainer.classList.remove('modal-show');
                    setTimeout(() => {
                        modalContainer.style.display = 'none';
                        this.loadVouches();
                    }, 300);
                }, 2000);

            } catch (error) {
                this.showError(error.message);
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
            }
        };

        const closeBtn = modalContainer.querySelector('.close-modal');
        closeBtn.onclick = () => {
            modalContainer.classList.remove('modal-show');
            setTimeout(() => modalContainer.style.display = 'none', 300);
        };

        modalContainer.onclick = (e) => {
            if (e.target === modalContainer) {
                modalContainer.classList.remove('modal-show');
                setTimeout(() => modalContainer.style.display = 'none', 300);
            }
        };
    }

    async checkVerificationStatus() {
        if (!this.currentUser) {
            return false;
        }

        try {
            await verifiedUsersManager.loadVerifiedUsers();
            const isVerified = verifiedUsersManager.isUserVerified(this.currentUser.email);
            
            return isVerified;
        } catch (error) {
            this.showError('Error checking verification status.');
            return false;
        }
    }

    async populateModalContent(vouchData) {
        const getUserInfo = async (profileData) => {
            if (!profileData?.robloxLink) return { id: null, username: 'Unknown', displayName: 'Unknown User' };
            const match = profileData.robloxLink.match(/users\/(\d+)/);
            const userId = match ? match[1] : null;
            const robloxData = await this.fetchRobloxData(userId);
            return {
                id: userId,
                username: robloxData?.name || 'Unknown',
                displayName: robloxData?.displayName || 'Unknown User',
                thumbnail: robloxData?.thumbnail || 'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-310966282D3529E36976BF6B07B1DC90-Png/150/150/AvatarHeadshot/Webp/noFilter'
            };
        };

        const traderInfo = await getUserInfo(vouchData.yourProfile);
        const partnerInfo = await getUserInfo(vouchData.partnerProfile);

        const updateTraderSection = (prefix, info, profile) => {
            document.querySelector(`#${prefix}ProfileImage img`).src = info.thumbnail;
            document.querySelector(`#${prefix}DisplayName`).textContent = info.displayName;
            document.querySelector(`#${prefix}Username`).textContent = '@' + info.username;
            
            const robloxLink = document.querySelector(`#${prefix}RobloxLink`);
            robloxLink.href = profile?.robloxLink || '#';
            
            const discordId = document.querySelector(`#${prefix}DiscordId`);
            discordId.textContent = profile?.discordId || 'N/A';
            const copyBtn = discordId.nextElementSibling;
            if (copyBtn) {
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(profile?.discordId || '');
                    this.showCopyFeedback(copyBtn);
                };
            }
            
            const items = document.querySelector(`#${prefix}Items`);
            items.textContent = profile?.offeredItems || 'No items specified';
        };

        updateTraderSection('trader', traderInfo, vouchData.yourProfile);
        updateTraderSection('partner', partnerInfo, vouchData.partnerProfile);

        const screenshot1Link = document.querySelector('#screenshot1Link');
        const screenshot2Link = document.querySelector('#screenshot2Link');
        
        if (vouchData.screenshots && vouchData.screenshots.length > 0) {
            screenshot1Link.href = vouchData.screenshots[0];
            screenshot1Link.classList.remove('disabled');
            
            if (vouchData.screenshots.length > 1) {
                screenshot2Link.href = vouchData.screenshots[1];
                screenshot2Link.classList.remove('disabled');
            } else {
                screenshot2Link.classList.add('disabled');
            }
        } else {
            screenshot1Link.classList.add('disabled');
            screenshot2Link.classList.add('disabled');
        }
    }

    showCopyFeedback(element) {
        const originalText = element.innerHTML;
        element.innerHTML = '<i class="fas fa-check"></i> Copied!';
        element.style.background = 'rgba(76, 175, 80, 0.15)';
        element.style.color = '#4CAF50';
        
        setTimeout(() => {
            element.innerHTML = originalText;
            element.style.background = '';
            element.style.color = '';
        }, 2000);
    }
}

class VouchModal {
    constructor(vouchManager) {
        this.modal = document.getElementById('vouchModal');
        this.vouchManager = vouchManager;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const closeBtn = this.modal.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        window.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });

        const modalContent = this.modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => e.stopPropagation());
        }

        document.addEventListener('click', async (e) => {
            const copyBtn = e.target.closest('.copy-id');
            if (copyBtn) {
                const discordId = copyBtn.dataset.id;
                await this.copyToClipboard(discordId);
                this.showCopyFeedback(copyBtn);
            }
        });
    }

    show(vouchId) {
        this.modal.style.display = 'block';
        setTimeout(() => this.modal.classList.add('modal-show'), 10);
        this.fetchAndDisplayVouch(vouchId);
    }

    hide() {
        this.modal.classList.remove('modal-show');
        setTimeout(() => {
            this.modal.style.display = 'none';
        }, 300);
    }

    async fetchAndDisplayVouch(vouchId) {
        try {
            const vouchDoc = await getDoc(doc(db, 'Vouches', vouchId));
            if (vouchDoc.exists()) {
                const vouchData = vouchDoc.data();
                this.vouchManager.populateModalContent(vouchData);
            } else {
                throw new Error('Vouch not found');
            }
        } catch (error) {
            console.error('Error fetching vouch:', error);
            const errorToast = document.createElement('div');
            errorToast.className = 'error-toast';
            errorToast.textContent = 'Failed to load vouch details';
            document.body.appendChild(errorToast);
            setTimeout(() => errorToast.remove(), 3000);
        }
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Failed to copy:', err);
            return false;
        }
    }

    showCopyFeedback(element, success = true) {
        const tooltip = document.createElement('div');
        tooltip.className = 'copy-tooltip';
        tooltip.textContent = success ? 'Copied!' : 'Failed to copy';
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top - 10}px`;
        
        document.body.appendChild(tooltip);
        
        setTimeout(() => {
            tooltip.remove();
        }, 2000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const vouchManager = new VouchManager();
    const vouchModal = new VouchModal(vouchManager);

    document.querySelector('.vouches-grid').addEventListener('click', (e) => {
        const card = e.target.closest('.trade-card');
        if (card) {
            e.preventDefault();
            e.stopPropagation();
            const vouchId = card.dataset.vouchId;
            if (vouchId) {
                vouchModal.show(vouchId);
            }
        }
    });

    document.addEventListener('click', (e) => {
        const detailsBtn = e.target.closest('.trade-details-btn');
        if (detailsBtn) {
            e.preventDefault();
            e.stopPropagation();
            const card = detailsBtn.closest('.trade-card');
            if (card) {
                const vouchId = card.dataset.vouchId;
                if (vouchId) {
                    vouchModal.show(vouchId);
                }
            }
        }
    });
});

export const vouchManager = new VouchManager(); 