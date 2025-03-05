const shapes = document.querySelectorAll('.shape');
shapes.forEach(shape => {
    const randomDelay = Math.random() * 5;
    shape.style.animationDelay = `${randomDelay}s`;
});

// Custom Scrollbar Implementation
document.addEventListener('DOMContentLoaded', () => {
    // Create scrollbar elements
    const scrollbar = document.createElement('div');
    scrollbar.className = 'custom-scrollbar';
    const thumb = document.createElement('div');
    thumb.className = 'custom-scrollbar-thumb';
    scrollbar.appendChild(thumb);
    document.body.appendChild(scrollbar);

    // Calculate and update thumb size and position
    function updateScrollbar() {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrolled = window.scrollY;
        
        // Calculate thumb height
        const thumbHeight = Math.max(
            (windowHeight / documentHeight) * windowHeight,
            40 // Minimum thumb height in pixels
        );
        
        // Calculate thumb position
        const thumbPosition = (scrolled / (documentHeight - windowHeight)) * (windowHeight - thumbHeight);
        
        // Update thumb style
        thumb.style.height = `${thumbHeight}px`;
        thumb.style.transform = `translateY(${thumbPosition}px)`;
    }

    // Initial update
    updateScrollbar();

    // Update on scroll
    window.addEventListener('scroll', updateScrollbar);
    
    // Update on window resize
    window.addEventListener('resize', updateScrollbar);

    // Drag functionality
    let isDragging = false;
    let startY;
    let scrollStart;

    thumb.addEventListener('mousedown', (e) => {
        isDragging = true;
        startY = e.clientY;
        scrollStart = window.scrollY;
        document.body.style.userSelect = 'none'; // Prevent text selection while dragging
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const delta = e.clientY - startY;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const maxScroll = documentHeight - windowHeight;
        
        const percentage = delta / windowHeight;
        const scroll = scrollStart + (percentage * documentHeight);
        
        window.scrollTo(0, Math.max(0, Math.min(maxScroll, scroll)));
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        document.body.style.userSelect = '';
    });

    let scrollbarTimeout;
    function showScrollbar() {
        scrollbar.style.opacity = '1';
        clearTimeout(scrollbarTimeout);
        scrollbarTimeout = setTimeout(() => {
            scrollbar.style.opacity = '0';
        }, 1500);
    }

    window.addEventListener('scroll', showScrollbar);
    scrollbar.addEventListener('mouseover', () => {
        scrollbar.style.opacity = '1';
        clearTimeout(scrollbarTimeout);
    });
    scrollbar.addEventListener('mouseleave', () => {
        if (!isDragging) {
            scrollbarTimeout = setTimeout(() => {
                scrollbar.style.opacity = '0';
            }, 1500);
        }
    });

    // Initial visibility
    showScrollbar();
});

// Vouch Details Modal
const modal = document.getElementById('vouchModal');
const closeModal = document.querySelector('.close-modal');

if (closeModal) {
    closeModal.onclick = function() {
        modal.style.display = "none";
    }
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

function showVouchDetails(card) {
    const vouchId = card.getAttribute('data-vouch-id');
    // Here you would typically fetch the vouch details from your backend
    const mockData = {
        transactionDetails: "Web Development Service - Portfolio Website",
        date: "2024-03-15",
        voucher: {
            name: "John Doe",
            contact: "john@example.com",
            role: "Service Provider"
        },
        recipient: {
            name: "Jane Smith",
            contact: "jane@example.com",
            role: "Client"
        },
        screenshots: [
            "path/to/screenshot1.jpg",
            "path/to/screenshot2.jpg"
        ]
    };

    // Update modal content
    document.getElementById('transactionDetails').textContent = mockData.transactionDetails;
    document.getElementById('transactionDate').textContent = mockData.date;
    document.getElementById('voucherInfo').innerHTML = `
        <strong>Name:</strong> ${mockData.voucher.name}<br>
        <strong>Contact:</strong> ${mockData.voucher.contact}<br>
        <strong>Role:</strong> ${mockData.voucher.role}
    `;
    document.getElementById('recipientInfo').innerHTML = `
        <strong>Name:</strong> ${mockData.recipient.name}<br>
        <strong>Contact:</strong> ${mockData.recipient.contact}<br>
        <strong>Role:</strong> ${mockData.recipient.role}
    `;

    // Show modal
    modal.style.display = "block";
}

// Theme management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.classList.remove('light-mode', 'dark-mode');
    document.body.classList.add(`${savedTheme}-mode`);
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('.theme-toggle-icon');
        icon.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
    }
}

// Call initializeTheme when the DOM loads
document.addEventListener('DOMContentLoaded', initializeTheme);

// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.contains('dark-mode');
        const newTheme = isDark ? 'light' : 'dark';
        
        document.body.classList.toggle('light-mode');
        document.body.classList.toggle('dark-mode');
        
        const icon = themeToggle.querySelector('.theme-toggle-icon');
        icon.textContent = newTheme === 'dark' ? '🌙' : '☀️';
        
        localStorage.setItem('theme', newTheme);
    });
}

// Learn More Page Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Slideshow functionality - only run if elements exist
    const slides = document.querySelectorAll('.slide');
    const slideshow = document.querySelector('.process-slideshow');
    
    if (slides.length > 0 && slideshow) {
        const indicators = document.querySelectorAll('.indicator');
        const prevButton = document.querySelector('.prev-slide');
        const nextButton = document.querySelector('.next-slide');
        let currentSlide = 0;
        let slideInterval;
        let isTransitioning = false;

        function showSlide(index, direction = 'next') {
            if (isTransitioning) return;
            isTransitioning = true;

            const currentSlideElement = slides[currentSlide];
            const nextSlideElement = slides[index];

            // Update indicators
            indicators.forEach(indicator => indicator.classList.remove('active'));
            indicators[index].classList.add('active');

            // Set initial positions
            if (direction === 'next') {
                nextSlideElement.style.transform = 'translateX(100%)';
            } else {
                nextSlideElement.style.transform = 'translateX(-100%)';
            }
            nextSlideElement.style.opacity = '0';
            nextSlideElement.style.display = 'block';

            // Trigger transition
            setTimeout(() => {
                currentSlideElement.style.transform = direction === 'next' ? 'translateX(-100%)' : 'translateX(100%)';
                currentSlideElement.style.opacity = '0';
                nextSlideElement.style.transform = 'translateX(0)';
                nextSlideElement.style.opacity = '1';

                // Update current slide
                currentSlide = index;

                // Reset transition state
                setTimeout(() => {
                    currentSlideElement.style.display = 'none';
                    isTransitioning = false;
                }, 500);
            }, 50);
        }

        function nextSlide() {
            const next = (currentSlide + 1) % slides.length;
            showSlide(next, 'next');
        }

        function prevSlide() {
            const prev = (currentSlide - 1 + slides.length) % slides.length;
            showSlide(prev, 'prev');
        }

        function startSlideshow() {
            slideInterval = setInterval(nextSlide, 3000);
        }

        function stopSlideshow() {
            clearInterval(slideInterval);
        }

        // Event listeners for controls
        if (prevButton && nextButton) {
            prevButton.addEventListener('click', () => {
                stopSlideshow();
                prevSlide();
                startSlideshow();
            });

            nextButton.addEventListener('click', () => {
                stopSlideshow();
                nextSlide();
                startSlideshow();
            });
        }

        // Manual navigation with indicators
        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => {
                if (index === currentSlide) return;
                stopSlideshow();
                showSlide(index, index > currentSlide ? 'next' : 'prev');
                startSlideshow();
            });
        });

        // Start automatic slideshow
        startSlideshow();

        // Pause on hover
        slideshow.addEventListener('mouseenter', stopSlideshow);
        slideshow.addEventListener('mouseleave', startSlideshow);
    }

    // Animate trust score progress bars on scroll
    const progressBars = document.querySelectorAll('.progress-bar');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const progressBar = entry.target;
                const progress = progressBar.dataset.progress;
                progressBar.style.width = progress;
            }
        });
    }, { threshold: 0.5 });

    progressBars.forEach(bar => observer.observe(bar));

    // Animate cards on scroll with stagger effect
    function createStaggeredObserver(elements, className, baseDelay = 0, increment = 0.1) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    element.style.transitionDelay = `${baseDelay + (index * increment)}s`;
                    element.classList.add(className);
                    observer.unobserve(element);
                }
            });
        }, { threshold: 0.2 });

        elements.forEach(element => observer.observe(element));
    }

    // Apply staggered animations to different card types
    const securityCards = document.querySelectorAll('.security-card');
    const requirementCards = document.querySelectorAll('.requirement-card');
    const trustLevels = document.querySelectorAll('.trust-level');

    createStaggeredObserver(securityCards, 'fade-in-up');
    createStaggeredObserver(requirementCards, 'fade-in-up', 0.2);
    createStaggeredObserver(trustLevels, 'fade-in-up', 0.3);

    // Add CSS classes for animations
    const style = document.createElement('style');
    style.textContent = `
        .security-card, .requirement-card, .trust-level {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        
        .fade-in-up {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
        
        .security-card:hover, .requirement-card:hover {
            transform: translateY(-10px) !important;
        }
    `;
    document.head.appendChild(style);

    // Animate CTA button with smooth pulse
    const ctaButton = document.querySelector('.cta-section .btn');
    if (ctaButton) {
        let isPulsing = false;

        function pulseAnimation() {
            if (isPulsing) return;
            isPulsing = true;
            
            ctaButton.style.transform = 'scale(1.05)';
            ctaButton.style.boxShadow = '0 0 30px rgba(187, 134, 252, 0.3)';
            
            setTimeout(() => {
                ctaButton.style.transform = 'scale(1)';
                ctaButton.style.boxShadow = 'none';
                isPulsing = false;
            }, 1000);
        }

        setInterval(pulseAnimation, 3000);

        // Add hover effect
        ctaButton.addEventListener('mouseenter', () => {
            ctaButton.style.transform = 'scale(1.05)';
            ctaButton.style.boxShadow = '0 0 30px rgba(187, 134, 252, 0.3)';
        });

        ctaButton.addEventListener('mouseleave', () => {
            ctaButton.style.transform = 'scale(1)';
            ctaButton.style.boxShadow = 'none';
        });
    }
});
