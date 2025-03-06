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
            
            // Add search filter if provided
            if (options.search) {
                const searchTerm = options.search.trim();
                // Search by Roblox ID in the profile link
                q = query(q, where('yourProfile.robloxLink', '>=', searchTerm), 
                         where('yourProfile.robloxLink', '<=', searchTerm + '\uf8ff'));
            }
            
            // Add sorting
            const sortDirection = options.sort === 'oldest' ? 'asc' : 'desc';
            q = query(q, orderBy('createdAt', sortDirection));
            
            // Add pagination
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            q = query(q, limit(this.itemsPerPage));

            const querySnapshot = await getDocs(q);
            const vouches = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                vouches.push({ id: doc.id, ...data });
            });

            // Get total count for pagination
            const totalSnapshot = await getDocs(query(vouchesRef));
            this.totalPages = Math.ceil(totalSnapshot.size / this.itemsPerPage);

            this.renderVouches(vouches);
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

    renderVouches(vouches) {
        const grid = document.querySelector('.vouches-grid');
        if (!grid) return;

        grid.innerHTML = vouches.map(vouch => this.createVouchCard(vouch)).join('');
        this.initializeObserver();
    }

    createVouchCard(vouch) {
        const date = vouch.createdAt ? new Date(vouch.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown Date';

        const getUserId = (profileData) => {
            if (!profileData?.robloxLink) return null;
            const match = profileData.robloxLink.match(/users\/(\d+)/);
            return match ? match[1] : null;
        };

        const userId = getUserId(vouch.yourProfile);
        const defaultImage = 'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-310966282D3529E36976BF6B07B1DC90-Png/150/150/AvatarHeadshot/Webp/noFilter';

        const fetchRobloxUsername = async (userId) => {
            if (!userId) return 'Unknown User';
            try {
                const response = await fetch(`https://users.roblox.com/v1/users/${userId}`);
                if (!response.ok) throw new Error('Failed to fetch username');
                const data = await response.json();
                return data.name || `${userId}`;
            } catch (error) {
                console.warn('Failed to fetch username:', error);
                return `${userId}`;
            }
        };
        
        const fetchProfileImage = async (imgElement) => {
            if (!userId) {
                imgElement.src = defaultImage;
                return;
            }
            try {
                // Request the thumbnail JSON data
                const response = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const jsonData = await response.json();
                // Assuming the API returns an object with a "data" array that contains an "imageUrl" property:
                const imageUrl = jsonData.data && jsonData.data[0] && jsonData.data[0].imageUrl;
                
                // If a valid imageUrl is returned, use it; otherwise, use the default image.
                imgElement.src = imageUrl ? imageUrl : defaultImage;
                
                // Fallback in case the image fails to load in the browser
                imgElement.onerror = () => {
                    console.warn('Failed to load profile image, using default');
                    imgElement.src = defaultImage;
                };
            } catch (error) {
                console.warn('Failed to load profile image:', error);
                imgElement.src = defaultImage;
            }
        };
        

        const card = document.createElement('div');
        card.className = 'vouch-card';
        card.dataset.vouchId = vouch.id;
        
        card.innerHTML = `
                <div class="vouch-header">
                    <div class="vouch-meta">
                    <div class="profile-section">
                        <div class="profile-image">
                            <img src="${defaultImage}" alt="Profile" class="avatar-image">
                    </div>
                        <div class="user-details">
                            <span class="user-email">${userId || 'Unknown User'}</span>
                    <span class="vouch-date">
                        <i class="far fa-clock"></i> ${date}
                        </span>
                    </div>
                </div>
                    <div class="verification-status ${vouch.verified ? 'verified' : 'pending'}">
                        <i class="fas ${vouch.verified ? 'fa-check-circle' : 'fa-clock'}"></i>
                        ${vouch.verified ? 'Verified' : 'Pending'}
                    </div>
                </div>
            </div>
            <div class="vouch-content">
                <p>${vouch.description || ''}</p>
            </div>
        `;

        // Fetch profile image once after card is created
        const imgElement = card.querySelector('.avatar-image');
        fetchProfileImage(imgElement);

        return card.outerHTML;
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

        // Reset to first page when searching
        this.currentPage = 1;
        this.loadVouches({ search: query.trim() });
    }

    handleFilters() {
        const sortSelect = document.querySelector('.filter-select[name="sort"]');
        const sort = sortSelect ? sortSelect.value : 'recent';
        
        // Reset to first page when changing filters
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

        // Update prev/next buttons
        const prevBtn = document.querySelector('.pagination-btn:first-child');
        const nextBtn = document.querySelector('.pagination-btn:last-child');
        
        if (prevBtn) prevBtn.classList.toggle('disabled', this.currentPage === 1);
        if (nextBtn) nextBtn.classList.toggle('disabled', this.currentPage === this.totalPages);

        // Add click handlers
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
        
        // Animate in
        setTimeout(() => errorToast.classList.add('show'), 10);
        
        // Auto dismiss after 5 seconds
        setTimeout(() => {
            errorToast.classList.remove('show');
            setTimeout(() => errorToast.remove(), 300);
        }, 5000);
        
        // Handle manual close
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

        // Setup form handlers
        const form = document.getElementById('createVouchForm');
        const verifyYourRoblox = document.getElementById('verifyYourRoblox');
        const verifyPartnerRoblox = document.getElementById('verifyPartnerRoblox');
        const screenshot1 = document.getElementById('screenshot1');
        const screenshot2 = document.getElementById('screenshot2');
        const preview1 = document.getElementById('preview1');
        const preview2 = document.getElementById('preview2');

        // Handle Roblox profile verification
        const verifyRobloxProfile = async (input, previewDiv) => {
            const url = input.value;
            if (!url) return;

            try {
                const userId = url.match(/users\/(\d+)/)?.[1];
                if (!userId) {
                    throw new Error('Invalid Roblox profile URL');
                }

                // Here you would typically make an API call to verify the Roblox profile
                // For now, we'll just show a success message
                previewDiv.innerHTML = `
                    <div class="verified-profile">
                        <i class="fas fa-check-circle"></i>
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

        // Handle screenshot previews
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

        // Handle form submission
        form.onsubmit = async (e) => {
            e.preventDefault();
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;

            try {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

                const formData = new FormData(form);
                
                // Get the files
                const screenshot1 = document.getElementById('screenshot1').files[0];
                const screenshot2 = document.getElementById('screenshot2').files[0];

                // Validate that both screenshots are selected
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
                
                // Show success message
                const successMessage = document.createElement('div');
                successMessage.className = 'success-message';
                successMessage.innerHTML = `
                    <i class="fas fa-check-circle"></i>
                    Vouch created successfully!
                `;
                form.appendChild(successMessage);

                // Close modal after delay
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

        // Handle close button
        const closeBtn = modalContainer.querySelector('.close-modal');
        closeBtn.onclick = () => {
            modalContainer.classList.remove('modal-show');
            setTimeout(() => modalContainer.style.display = 'none', 300);
        };

        // Handle click outside
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
            // Reload verified users to ensure we have the latest data
            await verifiedUsersManager.loadVerifiedUsers();
            const isVerified = verifiedUsersManager.isUserVerified(this.currentUser.email);
            
            return isVerified;
        } catch (error) {
            this.showError('Error checking verification status.');
            return false;
        }
    }
}

class VouchModal {
    constructor() {
        this.modal = document.getElementById('vouchModal');
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Close button
        const closeBtn = this.modal.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        // Click outside to close
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });

        // Prevent modal content clicks from closing
        const modalContent = this.modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => e.stopPropagation());
        }

        // Handle Discord ID copying
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
                this.populateModalContent(vouchData);
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

    async fetchRobloxUsername(userId) {
        if (!userId) return 'Unknown User';
        try {
            const response = await fetch(`https://users.roblox.com/v1/users/${userId}`);
            if (!response.ok) throw new Error('Failed to fetch username');
            const data = await response.json();
            return data.name || userId;
        } catch (error) {
            console.warn('Failed to fetch username:', error);
            return userId;
        }
    }

    async populateModalContent(vouchData) {
        // Update verification badge
        const verificationBadge = document.querySelector('.verification-badge');
        if (vouchData.verified) {
            verificationBadge.innerHTML = '<i class="fas fa-shield-check"></i> Verified Trade';
            verificationBadge.style.background = 'rgba(76, 175, 80, 0.1)';
            verificationBadge.style.color = '#4CAF50';
        } else {
            verificationBadge.innerHTML = '<i class="fas fa-clock"></i> Pending Verification';
            verificationBadge.style.background = 'rgba(255, 193, 7, 0.1)';
            verificationBadge.style.color = '#FFC107';
        }

        // Extract Roblox usernames and IDs from profile links
        const getUserInfo = async (url) => {
            try {
                const match = url.match(/users\/(\d+)/);
                const userId = match ? match[1] : null;
                const username = userId ? await this.fetchRobloxUsername(userId) : 'Unknown';
                return {
                    id: userId,
                    username: username
                };
            } catch {
                return { id: null, username: 'Unknown' };
            }
        };

        // Function to load profile image
        const loadProfileImage = async (userId, imageElement) => {
            if (!userId) {
                imageElement.src = defaultImage;
                return;
            }
            try {
                const response = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const jsonData = await response.json();
                const imageUrl = jsonData.data && jsonData.data[0] && jsonData.data[0].imageUrl;
                imageElement.src = imageUrl || defaultImage;
                
                imageElement.onerror = () => {
                    console.warn('Failed to load profile image, using default');
                    imageElement.src = defaultImage;
                };
            } catch (error) {
                console.warn('Failed to load profile image:', error);
                imageElement.src = defaultImage;
            }
        };

        // Update trader information
        if (vouchData.yourProfile) {
            const traderInfo = await getUserInfo(vouchData.yourProfile.robloxLink);
            document.getElementById('traderRobloxName').textContent = traderInfo.username;
            document.getElementById('traderRobloxLink').href = vouchData.yourProfile.robloxLink;
            
            const traderDiscordElement = document.getElementById('traderDiscordId');
            traderDiscordElement.querySelector('.discord-username').textContent = vouchData.yourProfile.discordId;
            
            // Load trader profile image
            const traderImage = document.querySelector('#traderProfileImage img');
            if (traderImage) {
                loadProfileImage(traderInfo.id, traderImage);
            }
            
            document.getElementById('traderItems').textContent = vouchData.yourProfile.offeredItems;
        }

        // Update partner information
        if (vouchData.partnerProfile) {
            const partnerInfo = await getUserInfo(vouchData.partnerProfile.robloxLink);
            document.getElementById('partnerRobloxName').textContent = partnerInfo.username;
            document.getElementById('partnerRobloxLink').href = vouchData.partnerProfile.robloxLink;
            
            const partnerDiscordElement = document.getElementById('partnerDiscordId');
            partnerDiscordElement.querySelector('.discord-username').textContent = vouchData.partnerProfile.discordId;
            
            // Load partner profile image
            const partnerImage = document.querySelector('#partnerProfileImage img');
            if (partnerImage) {
                loadProfileImage(partnerInfo.id, partnerImage);
            }
            
            document.getElementById('partnerItems').textContent = vouchData.partnerProfile.offeredItems;
        }

        // Set up copy functionality for Discord IDs
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.onclick = async function() {
                const discordId = this.closest('.discord-tag').querySelector('.discord-username').textContent;
                try {
                    await navigator.clipboard.writeText(discordId);
                    this.classList.add('copied');
                    setTimeout(() => this.classList.remove('copied'), 1500);
                } catch (err) {
                    console.error('Failed to copy:', err);
                }
            };
        });

        // Update screenshots
        if (vouchData.screenshots && vouchData.screenshots.length > 0) {
            document.getElementById('screenshot1Link').href = vouchData.screenshots[0];
            
            if (vouchData.screenshots.length > 1) {
                document.getElementById('screenshot2Link').href = vouchData.screenshots[1];
            }
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
    const vouchModal = new VouchModal();

    document.querySelector('.vouches-grid')?.addEventListener('click', (e) => {
        const card = e.target.closest('.vouch-card');
        if (card) {
            const vouchId = card.dataset.vouchId;
            vouchModal.show(vouchId);
        }
    });
});

export const vouchManager = new VouchManager(); 