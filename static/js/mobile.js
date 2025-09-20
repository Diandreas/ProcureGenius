/* ====================================
   📱 OPTIMISATION MOBILE AVANCÉE
   ====================================*/

class MobileOptimizer {
    constructor() {
        this.isTouch = 'ontouchstart' in window;
        this.isMobile = window.innerWidth <= 768;
        this.swipeThreshold = 50;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.lastScrollY = 0;
        this.ticking = false;

        this.init();
    }

    init() {
        this.setupMobileNavigation();
        this.setupSwipeGestures();
        this.setupScrollOptimization();
        this.setupHapticFeedback();
        this.setupMobileInteractions();
        this.setupPullToRefresh();
        this.setupMobileSearch();
    }

    setupMobileNavigation() {
        const mobileTabBar = document.querySelector('.mobile-tab-bar');
        if (!mobileTabBar) return;

        // Améliorer la navigation avec des animations fluides
        const tabItems = mobileTabBar.querySelectorAll('.mobile-tab-item');

        tabItems.forEach((item, index) => {
            item.addEventListener('click', (e) => {
                this.handleTabClick(e, item, index);
            });

            // Ajouter des micro-interactions au touch
            if (this.isTouch) {
                item.addEventListener('touchstart', (e) => {
                    this.handleTouchStart(e, item);
                });

                item.addEventListener('touchend', (e) => {
                    this.handleTouchEnd(e, item);
                });
            }
        });

        // Auto-masquer la tab bar lors du scroll
        this.setupAutoHideTabBar();
    }

    handleTabClick(e, item, index) {
        e.preventDefault();

        // Retour haptique
        this.vibrate(10);

        // Animation de sélection
        this.animateTabSelection(item, index);

        // Gestion de la navigation
        this.handleNavigation(item);
    }

    animateTabSelection(item, index) {
        const tabBar = item.closest('.mobile-tab-bar');
        const tabItems = tabBar.querySelectorAll('.mobile-tab-item');

        // Retirer la classe active de tous les items
        tabItems.forEach(tab => {
            tab.classList.remove('active');
            tab.style.transform = '';
        });

        // Activer l'item sélectionné
        item.classList.add('active');

        // Animation de "bounce"
        item.style.transform = 'scale(1.1) translateY(-4px)';
        setTimeout(() => {
            item.style.transform = 'scale(1) translateY(-2px)';
        }, 150);

        // Animation ondulée des autres items
        tabItems.forEach((tab, i) => {
            if (i !== index) {
                const distance = Math.abs(i - index);
                const delay = distance * 50;
                const intensity = Math.max(0.3, 1 - distance * 0.2);

                setTimeout(() => {
                    tab.style.transform = `scale(${0.9 + intensity * 0.1}) translateY(${intensity * 2}px)`;
                    setTimeout(() => {
                        tab.style.transform = '';
                    }, 200);
                }, delay);
            }
        });

        // Créer un effet de ripple
        this.createRippleEffect(item);
    }

    createRippleEffect(element) {
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const ripple = document.createElement('div');

        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(0, 102, 204, 0.3);
            transform: scale(0);
            animation: ripple 0.6s linear;
            width: ${size}px;
            height: ${size}px;
            left: ${rect.width / 2 - size / 2}px;
            top: ${rect.height / 2 - size / 2}px;
            pointer-events: none;
            z-index: 1;
        `;

        element.style.position = 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    handleTouchStart(e, item) {
        item.style.transform = 'scale(0.95)';
        item.style.transition = 'transform 0.1s ease-out';
    }

    handleTouchEnd(e, item) {
        setTimeout(() => {
            item.style.transform = '';
            item.style.transition = '';
        }, 100);
    }

    setupAutoHideTabBar() {
        const tabBar = document.querySelector('.mobile-tab-bar');
        if (!tabBar) return;

        let lastScrollY = window.scrollY;
        let ticking = false;

        const updateTabBar = () => {
            const currentScrollY = window.scrollY;
            const scrollingDown = currentScrollY > lastScrollY;
            const scrolledEnough = Math.abs(currentScrollY - lastScrollY) > 10;

            if (scrolledEnough) {
                if (scrollingDown && currentScrollY > 100) {
                    // Masquer la tab bar
                    tabBar.style.transform = 'translateY(100%)';
                    tabBar.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                } else {
                    // Afficher la tab bar
                    tabBar.style.transform = 'translateY(0)';
                    tabBar.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                }

                lastScrollY = currentScrollY;
            }

            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateTabBar);
                ticking = true;
            }
        });
    }

    setupSwipeGestures() {
        if (!this.isTouch) return;

        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        let startX, startY, startTime;

        mainContent.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            startX = touch.pageX;
            startY = touch.pageY;
            startTime = Date.now();
        });

        mainContent.addEventListener('touchmove', (e) => {
            if (!startX || !startY) return;

            const touch = e.touches[0];
            const deltaX = touch.pageX - startX;
            const deltaY = touch.pageY - startY;

            // Swipe horizontal détecté
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > this.swipeThreshold) {
                e.preventDefault();
                this.handleSwipe(deltaX > 0 ? 'right' : 'left');
            }
        });

        mainContent.addEventListener('touchend', () => {
            startX = null;
            startY = null;
            startTime = null;
        });
    }

    handleSwipe(direction) {
        const tabBar = document.querySelector('.mobile-tab-bar');
        const activeTab = tabBar?.querySelector('.mobile-tab-item.active');
        const tabs = Array.from(tabBar?.querySelectorAll('.mobile-tab-item') || []);

        if (!activeTab || tabs.length === 0) return;

        const currentIndex = tabs.indexOf(activeTab);
        let newIndex;

        if (direction === 'left' && currentIndex < tabs.length - 1) {
            newIndex = currentIndex + 1;
        } else if (direction === 'right' && currentIndex > 0) {
            newIndex = currentIndex - 1;
        }

        if (newIndex !== undefined) {
            tabs[newIndex].click();
            this.vibrate(15);
        }
    }

    setupScrollOptimization() {
        // Optimisation du scroll avec momentum
        let isScrolling = false;
        let scrollTimeout;

        const scrollStart = () => {
            isScrolling = true;
            document.body.classList.add('is-scrolling');
        };

        const scrollEnd = () => {
            isScrolling = false;
            document.body.classList.remove('is-scrolling');
        };

        window.addEventListener('scroll', () => {
            scrollStart();
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(scrollEnd, 150);
        });

        // Améliorer les performances de scroll
        window.addEventListener('scroll', this.throttle(() => {
            this.updateScrollIndicators();
        }, 16)); // 60fps
    }

    updateScrollIndicators() {
        const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;

        // Mettre à jour l'indicateur de progression dans la tab bar
        const progressBar = document.querySelector('.mobile-scroll-progress');
        if (progressBar) {
            progressBar.style.width = `${scrollPercent}%`;
        }
    }

    setupHapticFeedback() {
        if (!('vibrate' in navigator)) return;

        // Ajouter des retours haptiques aux interactions importantes
        document.addEventListener('click', (e) => {
            const target = e.target.closest('button, .btn, .mobile-tab-item');
            if (target) {
                this.vibrate(5);
            }
        });

        // Retour haptique pour les erreurs
        document.addEventListener('invalid', () => {
            this.vibrate([50, 50, 50]);
        });

        // Retour haptique pour les succès
        document.addEventListener('submit', () => {
            this.vibrate(25);
        });
    }

    vibrate(pattern) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }

    setupMobileInteractions() {
        // Améliorer les interactions tactiles
        const interactiveElements = document.querySelectorAll('button, .btn, a, .card, .form-control');

        interactiveElements.forEach(element => {
            if (this.isTouch) {
                element.addEventListener('touchstart', () => {
                    element.classList.add('touch-active');
                });

                element.addEventListener('touchend', () => {
                    setTimeout(() => {
                        element.classList.remove('touch-active');
                    }, 150);
                });

                element.addEventListener('touchcancel', () => {
                    element.classList.remove('touch-active');
                });
            }
        });
    }

    setupPullToRefresh() {
        if (!this.isTouch) return;

        let startY = 0;
        let pullDistance = 0;
        let isPulling = false;
        const threshold = 100;

        const pullIndicator = this.createPullIndicator();

        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].pageY;
                isPulling = true;
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (!isPulling || window.scrollY > 0) return;

            pullDistance = e.touches[0].pageY - startY;

            if (pullDistance > 0) {
                e.preventDefault();
                const progress = Math.min(pullDistance / threshold, 1);
                this.updatePullIndicator(pullIndicator, progress);

                // Effet élastique
                document.body.style.transform = `translateY(${pullDistance * 0.5}px)`;
                document.body.style.transition = 'transform 0.1s ease-out';
            }
        });

        document.addEventListener('touchend', () => {
            if (isPulling && pullDistance > threshold) {
                this.triggerRefresh();
            }

            // Réinitialiser
            document.body.style.transform = '';
            document.body.style.transition = 'transform 0.3s ease-out';
            pullIndicator.style.opacity = '0';
            isPulling = false;
            pullDistance = 0;
        });
    }

    createPullIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'pull-refresh-indicator';
        indicator.innerHTML = `
            <div class="pull-refresh-icon">
                <i class="bi bi-arrow-clockwise"></i>
            </div>
            <div class="pull-refresh-text">Tirez pour actualiser</div>
        `;

        indicator.style.cssText = `
            position: fixed;
            top: -60px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            padding: 10px 20px;
            border-radius: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 9999;
            opacity: 0;
            transition: all 0.3s ease;
        `;

        document.body.appendChild(indicator);
        return indicator;
    }

    updatePullIndicator(indicator, progress) {
        indicator.style.opacity = progress;
        indicator.style.top = `${-60 + (progress * 80)}px`;

        const icon = indicator.querySelector('.bi-arrow-clockwise');
        if (icon) {
            icon.style.transform = `rotate(${progress * 360}deg)`;
        }

        if (progress >= 1) {
            indicator.querySelector('.pull-refresh-text').textContent = 'Relâchez pour actualiser';
            this.vibrate(10);
        } else {
            indicator.querySelector('.pull-refresh-text').textContent = 'Tirez pour actualiser';
        }
    }

    triggerRefresh() {
        this.vibrate(25);
        showSuccessToast('Actualisation en cours...');

        // Simuler une actualisation
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }

    setupMobileSearch() {
        const searchInputs = document.querySelectorAll('input[type="search"], input[name*="search"]');

        searchInputs.forEach(input => {
            // Améliorer l'UX de recherche mobile
            if (this.isMobile) {
                input.addEventListener('focus', () => {
                    // Faire défiler pour montrer le champ
                    setTimeout(() => {
                        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300);
                });

                // Ajouter un bouton de fermeture
                this.addClearButton(input);
            }
        });
    }

    addClearButton(input) {
        const wrapper = input.parentElement;
        if (wrapper.querySelector('.clear-button')) return;

        const clearButton = document.createElement('button');
        clearButton.type = 'button';
        clearButton.className = 'clear-button';
        clearButton.innerHTML = '<i class="bi bi-x-circle"></i>';
        clearButton.style.cssText = `
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #6c757d;
            font-size: 16px;
            padding: 0;
            width: 20px;
            height: 20px;
            display: none;
            z-index: 3;
        `;

        wrapper.style.position = 'relative';
        wrapper.appendChild(clearButton);

        // Afficher/masquer le bouton selon le contenu
        input.addEventListener('input', () => {
            clearButton.style.display = input.value ? 'block' : 'none';
        });

        // Effacer le contenu
        clearButton.addEventListener('click', () => {
            input.value = '';
            input.focus();
            clearButton.style.display = 'none';
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
    }

    handleNavigation(item) {
        const href = item.getAttribute('href');
        const targetId = item.getAttribute('data-target');

        if (href && href !== '#') {
            // Navigation normale
            window.location.href = href;
        } else if (targetId) {
            // Navigation vers une section de la page
            const target = document.getElementById(targetId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        } else {
            // Gestion spéciale pour certains items
            const itemId = item.id;
            switch (itemId) {
                case 'mobile-ai-toggle':
                    this.toggleAIPanel();
                    break;
                case 'mobile-menu':
                    this.toggleMobileMenu();
                    break;
                default:
                    // Action par défaut
                    break;
            }
        }
    }

    toggleAIPanel() {
        const aiModal = document.getElementById('aiAssistantModal');
        if (aiModal) {
            const modal = new bootstrap.Modal(aiModal);
            modal.show();
        }
    }

    toggleMobileMenu() {
        // Créer un menu mobile contextuel
        this.showMobileMenu();
    }

    showMobileMenu() {
        const menu = document.createElement('div');
        menu.className = 'mobile-context-menu';
        menu.innerHTML = `
            <div class="mobile-menu-overlay"></div>
            <div class="mobile-menu-content">
                <div class="mobile-menu-header">
                    <h5>Menu</h5>
                    <button type="button" class="btn-close-menu">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
                <div class="mobile-menu-items">
                    <a href="/dashboard/" class="mobile-menu-item">
                        <i class="bi bi-speedometer2"></i>
                        <span>Tableau de bord</span>
                    </a>
                    <a href="/suppliers/" class="mobile-menu-item">
                        <i class="bi bi-building"></i>
                        <span>Fournisseurs</span>
                    </a>
                    <a href="/purchase-orders/" class="mobile-menu-item">
                        <i class="bi bi-cart-check"></i>
                        <span>Commandes</span>
                    </a>
                    <a href="/invoices/" class="mobile-menu-item">
                        <i class="bi bi-receipt"></i>
                        <span>Factures</span>
                    </a>
                    <a href="/analytics/" class="mobile-menu-item">
                        <i class="bi bi-graph-up"></i>
                        <span>Analytics</span>
                    </a>
                    <hr>
                    <a href="/settings/" class="mobile-menu-item">
                        <i class="bi bi-gear"></i>
                        <span>Paramètres</span>
                    </a>
                    <a href="/logout/" class="mobile-menu-item">
                        <i class="bi bi-box-arrow-right"></i>
                        <span>Déconnexion</span>
                    </a>
                </div>
            </div>
        `;

        menu.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 9999;
            display: flex;
            align-items: flex-end;
            animation: slideUp 0.3s ease-out;
        `;

        document.body.appendChild(menu);

        // Événements
        menu.querySelector('.mobile-menu-overlay, .btn-close-menu').addEventListener('click', () => {
            this.closeMobileMenu(menu);
        });

        // Vibration
        this.vibrate(10);
    }

    closeMobileMenu(menu) {
        menu.style.animation = 'slideDown 0.3s ease-out';
        setTimeout(() => {
            menu.remove();
        }, 300);
    }

    throttle(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Méthodes utilitaires pour redimensionnement
    handleResize() {
        this.isMobile = window.innerWidth <= 768;

        if (this.isMobile) {
            document.body.classList.add('mobile-view');
        } else {
            document.body.classList.remove('mobile-view');
        }
    }
}

// ====================================
// 🎨 MICRO-INTERACTIONS AVANCÉES
// ====================================

class MicroInteractions {
    constructor() {
        this.init();
    }

    init() {
        this.setupHoverEffects();
        this.setupClickEffects();
        this.setupLoadingStates();
        this.setupNotificationAnimations();
        this.setupProgressAnimations();
    }

    setupHoverEffects() {
        // Effet de survol fluide pour les cartes
        const cards = document.querySelectorAll('.card, .stat-card, .metric-card');
        cards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                this.animateCardHover(card, true);
            });

            card.addEventListener('mouseleave', () => {
                this.animateCardHover(card, false);
            });
        });

        // Effet magnetique pour les boutons
        const buttons = document.querySelectorAll('.btn-primary, .btn-success');
        buttons.forEach(button => {
            this.addMagneticEffect(button);
        });
    }

    animateCardHover(card, isHovering) {
        if (isHovering) {
            card.style.transform = 'translateY(-8px) scale(1.02)';
            card.style.boxShadow = 'var(--shadow-2xl)';
            card.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        } else {
            card.style.transform = '';
            card.style.boxShadow = '';
            card.style.transition = 'all 0.3s ease-out';
        }
    }

    addMagneticEffect(button) {
        button.addEventListener('mousemove', (e) => {
            const rect = button.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            const intensity = 0.3;
            button.style.transform = `translate(${x * intensity}px, ${y * intensity}px)`;
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = '';
        });
    }

    setupClickEffects() {
        // Effet de ripple avancé
        document.addEventListener('click', (e) => {
            const target = e.target.closest('button, .btn, .mobile-tab-item');
            if (target && !target.classList.contains('no-ripple')) {
                this.createAdvancedRipple(e, target);
            }
        });
    }

    createAdvancedRipple(event, element) {
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 1.5;
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        const ripple = document.createElement('span');
        ripple.className = 'advanced-ripple';
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: radial-gradient(circle, rgba(255,255,255,0.6) 0%, transparent 70%);
            border-radius: 50%;
            transform: scale(0);
            pointer-events: none;
            z-index: 1;
        `;

        element.style.position = 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(ripple);

        // Animation
        ripple.animate([
            { transform: 'scale(0)', opacity: 1 },
            { transform: 'scale(1)', opacity: 0 }
        ], {
            duration: 600,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
        }).onfinish = () => ripple.remove();
    }

    setupLoadingStates() {
        // États de chargement animés
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
                if (submitButton) {
                    this.animateLoadingButton(submitButton);
                }
            });
        });
    }

    animateLoadingButton(button) {
        const originalText = button.textContent;
        const originalHTML = button.innerHTML;

        button.disabled = true;
        button.innerHTML = `
            <span class="loading-spinner"></span>
            <span class="loading-text">Traitement...</span>
        `;

        // Animation du spinner
        const spinner = button.querySelector('.loading-spinner');
        if (spinner) {
            spinner.style.cssText = `
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid rgba(255,255,255,0.3);
                border-top: 2px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-right: 8px;
            `;
        }

        // Restaurer après 3 secondes (ou quand la page se recharge)
        setTimeout(() => {
            if (button) {
                button.disabled = false;
                button.innerHTML = originalHTML;
            }
        }, 3000);
    }

    setupNotificationAnimations() {
        // Observer les nouvelles notifications
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList.contains('toast')) {
                        this.animateNotification(node);
                    }
                });
            });
        });

        const toastContainer = document.querySelector('.toast-container');
        if (toastContainer) {
            observer.observe(toastContainer, { childList: true });
        }
    }

    animateNotification(notification) {
        // Animation d'entrée sophistiquée
        notification.style.transform = 'translateX(100%) scale(0.8)';
        notification.style.opacity = '0';

        setTimeout(() => {
            notification.style.transition = 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            notification.style.transform = 'translateX(0) scale(1)';
            notification.style.opacity = '1';
        }, 50);

        // Animation de sortie
        setTimeout(() => {
            notification.style.transition = 'all 0.3s ease-in';
            notification.style.transform = 'translateX(100%) scale(0.8)';
            notification.style.opacity = '0';
        }, 4500);
    }

    setupProgressAnimations() {
        // Animer les barres de progression
        const progressBars = document.querySelectorAll('.progress-bar, .form-progress-fill');

        const animateProgress = (bar) => {
            const targetWidth = bar.style.width || '0%';
            bar.style.width = '0%';

            setTimeout(() => {
                bar.style.transition = 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                bar.style.width = targetWidth;
            }, 100);
        };

        // Observer les changements de progression
        const progressObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const target = mutation.target;
                    if (target.classList.contains('progress-bar') || target.classList.contains('form-progress-fill')) {
                        animateProgress(target);
                    }
                }
            });
        });

        progressBars.forEach(bar => {
            progressObserver.observe(bar, { attributes: true });
        });
    }
}

// ====================================
// 🚀 INITIALISATION AUTOMATIQUE
// ====================================

document.addEventListener('DOMContentLoaded', function () {
    // Initialiser les optimisations mobile
    window.mobileOptimizer = new MobileOptimizer();

    // Initialiser les micro-interactions
    window.microInteractions = new MicroInteractions();

    // Gérer le redimensionnement
    window.addEventListener('resize', () => {
        window.mobileOptimizer.handleResize();
    });

    // Ajouter les animations CSS nécessaires
    addRequiredAnimations();
});

function addRequiredAnimations() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to { transform: scale(4); opacity: 0; }
        }
        
        @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes slideDown {
            from { transform: translateY(0); opacity: 1; }
            to { transform: translateY(100%); opacity: 0; }
        }
        
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        .touch-active {
            transform: scale(0.95) !important;
            transition: transform 0.1s ease-out !important;
        }
        
        .is-scrolling * {
            pointer-events: none;
        }
        
        .mobile-context-menu .mobile-menu-content {
            background: white;
            border-radius: 20px 20px 0 0;
            padding: 20px;
            box-shadow: 0 -10px 40px rgba(0,0,0,0.1);
            max-height: 70vh;
            overflow-y: auto;
        }
        
        .mobile-menu-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
        }
        
        .mobile-menu-item {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 15px 0;
            text-decoration: none;
            color: #333;
            border-bottom: 1px solid #f5f5f5;
            transition: all 0.2s ease;
        }
        
        .mobile-menu-item:hover {
            color: var(--primary-blue);
            transform: translateX(5px);
        }
        
        .mobile-menu-item i {
            font-size: 18px;
            width: 20px;
        }
        
        .btn-close-menu {
            background: none;
            border: none;
            font-size: 24px;
            color: #666;
        }
        
        .pull-refresh-indicator {
            font-size: 14px;
            color: #666;
        }
        
        .mobile-scroll-progress {
            position: fixed;
            top: 0;
            left: 0;
            height: 2px;
            background: var(--gradient-primary);
            z-index: 1001;
            transition: width 0.1s ease-out;
        }
    `;

    document.head.appendChild(style);
}

// Exposer les classes globalement pour usage externe
window.MobileOptimizer = MobileOptimizer;
window.MicroInteractions = MicroInteractions;
