const shapes = document.querySelectorAll('.shape');
shapes.forEach(shape => {
    const randomDelay = Math.random() * 5;
    shape.style.animationDelay = `${randomDelay}s`;
});

document.addEventListener('DOMContentLoaded', () => {
    const scrollbar = document.createElement('div');
    scrollbar.className = 'custom-scrollbar';
    const thumb = document.createElement('div');
    thumb.className = 'custom-scrollbar-thumb';
    scrollbar.appendChild(thumb);
    document.body.appendChild(scrollbar);

    function updateScrollbar() {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrolled = window.scrollY;
        
        const thumbHeight = Math.max(
            (windowHeight / documentHeight) * windowHeight,
            40
        );
        
        const thumbPosition = (scrolled / (documentHeight - windowHeight)) * (windowHeight - thumbHeight);
        
        thumb.style.height = `${thumbHeight}px`;
        thumb.style.transform = `translateY(${thumbPosition}px)`;
    }

    updateScrollbar();

    window.addEventListener('scroll', updateScrollbar);
    window.addEventListener('resize', updateScrollbar);

    let isDragging = false;
    let startY;
    let scrollStart;

    thumb.addEventListener('mousedown', (e) => {
        isDragging = true;
        startY = e.clientY;
        scrollStart = window.scrollY;
        document.body.style.userSelect = 'none';
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

    showScrollbar();
});

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

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.classList.remove('light-mode', 'dark-mode');
    document.body.classList.add(`${savedTheme}-mode`);
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        if (icon) {
            icon.className = savedTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }
}

document.addEventListener('DOMContentLoaded', initializeTheme);

const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.contains('dark-mode');
        const newTheme = isDark ? 'light' : 'dark';
        
        document.body.classList.toggle('light-mode');
        document.body.classList.toggle('dark-mode');
        
        const icon = themeToggle.querySelector('i');
        if (icon) {
            icon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        }
        
        localStorage.setItem('theme', newTheme);
    });
}

document.addEventListener('DOMContentLoaded', function() {
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

            indicators.forEach(indicator => indicator.classList.remove('active'));
            indicators[index].classList.add('active');

            if (direction === 'next') {
                nextSlideElement.style.transform = 'translateX(100%)';
            } else {
                nextSlideElement.style.transform = 'translateX(-100%)';
            }
            nextSlideElement.style.opacity = '0';
            nextSlideElement.style.display = 'block';

            setTimeout(() => {
                currentSlideElement.style.transform = direction === 'next' ? 'translateX(-100%)' : 'translateX(100%)';
                currentSlideElement.style.opacity = '0';
                nextSlideElement.style.transform = 'translateX(0)';
                nextSlideElement.style.opacity = '1';

                currentSlide = index;

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

        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => {
                if (index === currentSlide) return;
                stopSlideshow();
                showSlide(index, index > currentSlide ? 'next' : 'prev');
                startSlideshow();
            });
        });

        startSlideshow();

        slideshow.addEventListener('mouseenter', stopSlideshow);
        slideshow.addEventListener('mouseleave', startSlideshow);
    }

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

    const securityCards = document.querySelectorAll('.security-card');
    const requirementCards = document.querySelectorAll('.requirement-card');
    const trustLevels = document.querySelectorAll('.trust-level');

    createStaggeredObserver(securityCards, 'fade-in-up');
    createStaggeredObserver(requirementCards, 'fade-in-up', 0.2);
    createStaggeredObserver(trustLevels, 'fade-in-up', 0.3);

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

// Mobile menu functionality
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        mobileMenuBtn.querySelector('i').classList.toggle('fa-bars');
        mobileMenuBtn.querySelector('i').classList.toggle('fa-times');
    });
}

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (navLinks.classList.contains('active') && 
        !e.target.closest('.nav-links') && 
        !e.target.closest('.mobile-menu-btn')) {
        navLinks.classList.remove('active');
        mobileMenuBtn.querySelector('i').classList.add('fa-bars');
        mobileMenuBtn.querySelector('i').classList.remove('fa-times');
    }
});