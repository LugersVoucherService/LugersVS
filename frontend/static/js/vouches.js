// Vouch Card Management
class VouchManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 9;
        this.totalPages = 10; // This would be dynamic based on API response
        this.searchTimeout = null;
        this.initializeEventListeners();
        this.loadVouches();
    }

    initializeEventListeners() {
        // Search functionality
        const searchInput = document.querySelector('.search-bar input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.handleSearch(e.target.value);
                }, 300);
            });
        }

        // Filter functionality
        const filterSelects = document.querySelectorAll('.filter-select');
        filterSelects.forEach(select => {
            select.addEventListener('change', () => this.handleFilters());
        });

        // Pagination
        const prevBtn = document.querySelector('.pagination-btn:first-child');
        const nextBtn = document.querySelector('.pagination-btn:last-child');
        if (prevBtn) prevBtn.addEventListener('click', () => this.changePage('prev'));
        if (nextBtn) nextBtn.addEventListener('click', () => this.changePage('next'));

        // Page numbers
        document.querySelectorAll('.page-number').forEach(num => {
            num.addEventListener('click', () => {
                const page = parseInt(num.textContent);
                if (!isNaN(page)) this.goToPage(page);
            });
        });

        // Create Vouch Button
        const createVouchBtn = document.getElementById('createVouchBtn');
        if (createVouchBtn) {
            createVouchBtn.addEventListener('click', () => this.showCreateVouchModal());
        }

        // Initialize Intersection Observer for animations
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

    async loadVouches(filters = {}) {
        // Simulate loading state
        this.showLoadingState();

        try {
            // This would be replaced with actual API call
            const vouches = await this.fetchVouches(filters);
            this.renderVouches(vouches);
        } catch (error) {
            console.error('Error loading vouches:', error);
            this.showError('Failed to load vouches. Please try again later.');
        }

        this.hideLoadingState();
    }

    async fetchVouches(filters) {
        // Simulate API call - replace with actual API integration
        return new Promise(resolve => {
            setTimeout(() => {
                resolve([
                    {
                        id: 1,
                        user: {
                            name: 'John Doe',
                            avatar: '../static/img/default-avatar.png',
                            discordId: '123456789'
                        },
                        badges: ['verified', 'trusted', 'premium'],
                        content: 'Excellent service provider! Completed the project ahead of schedule and exceeded expectations.',
                        verified: true,
                        date: '2 days ago',
                        likes: 24,
                        comments: 3
                    },
                    // Add more mock data as needed
                ]);
            }, 1000);
        });
    }

    renderVouches(vouches) {
        const grid = document.querySelector('.vouches-grid');
        if (!grid) return;

        grid.innerHTML = vouches.map(vouch => this.createVouchCard(vouch)).join('');
        this.initializeObserver();
    }

    createVouchCard(vouch) {
        const badges = this.generateBadges(vouch.badges);
        return `
            <div class="vouch-card" data-vouch-id="${vouch.id}">
                <div class="vouch-header">
                    <img src="${vouch.user.avatar}" alt="${vouch.user.name}" class="user-avatar">
                    <div class="vouch-meta">
                        <h3>${vouch.user.name}</h3>
                        <div class="badges-container">
                            ${badges}
                        </div>
                    </div>
                </div>
                <div class="vouch-content">
                    <p>${vouch.content}</p>
                </div>
                <div class="vouch-footer">
                    <span class="vouch-date">
                        <i class="far fa-clock"></i> ${vouch.date}
                    </span>
                    <div class="vouch-stats">
                        <span class="stat-item">
                            <i class="far fa-thumbs-up"></i> ${vouch.likes}
                        </span>
                        <span class="stat-item">
                            <i class="far fa-comment"></i> ${vouch.comments}
                        </span>
                    </div>
                </div>
            </div>
        `;
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
        // Implement search logic
        this.loadVouches({ search: query });
    }

    handleFilters() {
        const filters = {};
        document.querySelectorAll('.filter-select').forEach(select => {
            filters[select.name] = select.value;
        });
        this.loadVouches(filters);
    }

    changePage(direction) {
        const newPage = direction === 'next' 
            ? Math.min(this.currentPage + 1, this.totalPages)
            : Math.max(this.currentPage - 1, 1);
        this.goToPage(newPage);
    }

    goToPage(page) {
        this.currentPage = page;
        this.updatePaginationUI();
        this.loadVouches();
    }

    updatePaginationUI() {
        document.querySelectorAll('.page-number').forEach(num => {
            const pageNum = parseInt(num.textContent);
            if (!isNaN(pageNum)) {
                num.classList.toggle('active', pageNum === this.currentPage);
            }
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
        // Implement error notification
        console.error(message);
    }

    showCreateVouchModal() {
        // Implement create vouch modal
        console.log('Show create vouch modal');
    }
}

// Modal Management
class VouchModal {
    constructor() {
        this.modal = document.getElementById('vouchModal');
        this.currentScreenshot = null;
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

        // Handle screenshot expansion
        document.addEventListener('click', (e) => {
            const expandBtn = e.target.closest('.expand-screenshot');
            if (expandBtn) {
                const screenshot = expandBtn.closest('.screenshot-item').querySelector('img');
                this.expandScreenshot(screenshot);
            }
        });

        // Close expanded screenshot on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentScreenshot) {
                this.closeExpandedScreenshot();
            }
        });
    }

    show(vouchData) {
        this.modal.style.display = 'block';
        setTimeout(() => this.modal.classList.add('modal-show'), 10);
        this.populateModalContent(vouchData);
    }

    hide() {
        this.modal.classList.remove('modal-show');
        setTimeout(() => {
            this.modal.style.display = 'none';
            if (this.currentScreenshot) {
                this.closeExpandedScreenshot();
            }
        }, 300);
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback for browsers that don't support clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                textArea.remove();
                return true;
            } catch (err) {
                console.error('Failed to copy:', err);
                textArea.remove();
                return false;
            }
        }
    }

    showCopyFeedback(element) {
        const tooltip = document.createElement('div');
        tooltip.className = 'copy-tooltip';
        tooltip.textContent = 'Copied!';
        
        const rect = element.getBoundingClientRect();
        tooltip.style.position = 'fixed';
        tooltip.style.top = `${rect.top - 30}px`;
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        
        document.body.appendChild(tooltip);
        
        setTimeout(() => {
            tooltip.remove();
        }, 2000);
    }

    expandScreenshot(screenshot) {
        if (this.currentScreenshot) {
            this.closeExpandedScreenshot();
        }

        const expandedView = document.createElement('div');
        expandedView.className = 'expanded-screenshot';
        expandedView.innerHTML = `
            <div class="expanded-screenshot-content">
                <img src="${screenshot.src}" alt="Expanded Screenshot">
                <button class="close-expanded">
                    <i class="fas fa-times"></i>
                </button>
                <button class="fullscreen-btn">
                    <i class="fas fa-expand"></i>
                </button>
            </div>
        `;

        document.body.appendChild(expandedView);
        this.currentScreenshot = expandedView;

        // Add event listeners
        const closeBtn = expandedView.querySelector('.close-expanded');
        const fullscreenBtn = expandedView.querySelector('.fullscreen-btn');
        const img = expandedView.querySelector('img');

        closeBtn.addEventListener('click', () => this.closeExpandedScreenshot());
        
        fullscreenBtn.addEventListener('click', () => {
            if (img.requestFullscreen) {
                img.requestFullscreen();
            } else if (img.webkitRequestFullscreen) {
                img.webkitRequestFullscreen();
            } else if (img.msRequestFullscreen) {
                img.msRequestFullscreen();
            }
        });

        expandedView.addEventListener('click', (e) => {
            if (e.target === expandedView) {
                this.closeExpandedScreenshot();
            }
        });

        // Show with animation
        requestAnimationFrame(() => {
            expandedView.style.opacity = '1';
        });

        // Handle fullscreen change
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
                fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            } else {
                fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
            }
        });
    }

    closeExpandedScreenshot() {
        if (this.currentScreenshot) {
            this.currentScreenshot.style.opacity = '0';
            setTimeout(() => {
                this.currentScreenshot.remove();
                this.currentScreenshot = null;
            }, 300);
        }
    }

    populateModalContent(vouchData) {
        // This would be replaced with actual data from your backend
        const mockData = {
            id: vouchData.id,
            client1: {
                roblox: {
                    username: 'RobloxTrader123',
                    avatar: '../static/img/default-avatar.png'
                },
                discord: {
                    username: 'Trader#1234',
                    id: '123456789'
                },
                offer: {
                    items: '15x Premium Items',
                    description: 'Limited Edition Collection Items'
                }
            },
            client2: {
                roblox: {
                    username: 'RobloxBuyer456',
                    avatar: '../static/img/default-avatar.png'
                },
                discord: {
                    username: 'Buyer#5678',
                    id: '987654321'
                },
                offer: {
                    items: '500 Robux',
                    description: 'Direct transfer through gamepass'
                }
            },
            evidence: {
                firstExchange: ['../static/img/screenshot-1.jpg'],
                secondExchange: ['../static/img/screenshot-2.jpg']
            },
            details: {
                date: 'March 15, 2024',
                status: 'Completed',
                notes: 'Smooth transaction, both parties were professional and trade was completed quickly.'
            }
        };

        // Update Client 1 information
        const client1Section = this.modal.querySelector('.client1');
        if (client1Section) {
            const username = client1Section.querySelector('.username');
            const avatar = client1Section.querySelector('.party-avatar');
            const itemCount = client1Section.querySelector('.item-count');
            const description = client1Section.querySelector('.offer-description');
            const discordTooltip = client1Section.querySelector('.discord-id');

            username.textContent = mockData.client1.roblox.username;
            username.dataset.discordId = mockData.client1.discord.id;
            avatar.src = mockData.client1.roblox.avatar;
            itemCount.textContent = mockData.client1.offer.items;
            description.textContent = mockData.client1.offer.description;
            discordTooltip.textContent = `Discord: ${mockData.client1.discord.username}`;
        }

        // Update Client 2 information
        const client2Section = this.modal.querySelector('.client2');
        if (client2Section) {
            const username = client2Section.querySelector('.username');
            const avatar = client2Section.querySelector('.party-avatar');
            const itemCount = client2Section.querySelector('.item-count');
            const description = client2Section.querySelector('.offer-description');
            const discordTooltip = client2Section.querySelector('.discord-id');

            username.textContent = mockData.client2.roblox.username;
            username.dataset.discordId = mockData.client2.discord.id;
            avatar.src = mockData.client2.roblox.avatar;
            itemCount.textContent = mockData.client2.offer.items;
            description.textContent = mockData.client2.offer.description;
            discordTooltip.textContent = `Discord: ${mockData.client2.discord.username}`;
        }

        // Update evidence screenshots
        this.updateScreenshots('firstExchangeScreenshots', mockData.evidence.firstExchange);
        this.updateScreenshots('secondExchangeScreenshots', mockData.evidence.secondExchange);

        // Update additional details
        document.getElementById('tradeDate').textContent = mockData.details.date;
        document.getElementById('tradeStatus').textContent = mockData.details.status;
        document.getElementById('tradeNotes').textContent = mockData.details.notes;
    }

    updateScreenshots(containerId, screenshots) {
        const container = document.getElementById(containerId);
        if (container && screenshots.length > 0) {
            container.innerHTML = screenshots.map(src => `
                <div class="screenshot-item">
                    <img src="${src}" alt="Trade Screenshot">
                    <div class="screenshot-overlay">
                        <button class="expand-screenshot">
                            <i class="fas fa-expand"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const vouchManager = new VouchManager();
    const vouchModal = new VouchModal();

    // Handle vouch card clicks
    document.querySelector('.vouches-grid')?.addEventListener('click', (e) => {
        const card = e.target.closest('.vouch-card');
        if (card) {
            const vouchId = card.dataset.vouchId;
            vouchModal.show({ id: vouchId });
        }
    });
}); 