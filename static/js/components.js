/* ====================================
   🧩 COMPOSANTS RESPONSIVE RÉUTILISABLES
   ====================================*/

class ResponsiveComponents {
    constructor() {
        this.breakpoints = {
            xs: 0,
            sm: 576,
            md: 768,
            lg: 992,
            xl: 1200,
            xxl: 1400
        };

        this.currentBreakpoint = this.getCurrentBreakpoint();
        this.init();
    }

    init() {
        this.setupResponsiveTables();
        this.setupResponsiveCards();
        this.setupResponsiveModals();
        this.setupResponsiveNavigation();
        this.setupResizeListener();
        this.initializeComponentLibrary();
    }

    getCurrentBreakpoint() {
        const width = window.innerWidth;

        if (width >= this.breakpoints.xxl) return 'xxl';
        if (width >= this.breakpoints.xl) return 'xl';
        if (width >= this.breakpoints.lg) return 'lg';
        if (width >= this.breakpoints.md) return 'md';
        if (width >= this.breakpoints.sm) return 'sm';
        return 'xs';
    }

    setupResponsiveTables() {
        const tables = document.querySelectorAll('.table-responsive-custom');

        tables.forEach(table => {
            this.makeTableResponsive(table);
        });

        // Observer pour les nouvelles tables
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        const newTables = node.querySelectorAll('.table-responsive-custom');
                        newTables.forEach(table => this.makeTableResponsive(table));
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    makeTableResponsive(tableElement) {
        if (tableElement.dataset.responsiveInit) return;
        tableElement.dataset.responsiveInit = 'true';

        const table = tableElement.querySelector('table') || tableElement;

        // Créer la version mobile
        this.createMobileTableView(table);

        // Ajouter les contrôles de colonne
        this.addColumnToggle(table);

        // Ajouter la recherche rapide
        this.addTableSearch(table);

        // Ajouter la pagination si nécessaire
        this.addTablePagination(table);
    }

    createMobileTableView(table) {
        const mobileView = document.createElement('div');
        mobileView.className = 'mobile-table-view d-md-none';

        const rows = Array.from(table.querySelectorAll('tbody tr'));
        const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());

        rows.forEach((row, index) => {
            const cells = Array.from(row.querySelectorAll('td'));
            const cardHtml = this.createMobileTableCard(cells, headers, index);
            mobileView.appendChild(cardHtml);
        });

        table.parentNode.insertBefore(mobileView, table.nextSibling);

        // Masquer le tableau original sur mobile
        table.classList.add('d-none', 'd-md-table');
    }

    createMobileTableCard(cells, headers, index) {
        const card = document.createElement('div');
        card.className = 'mobile-table-card';

        let cardContent = '';

        cells.forEach((cell, i) => {
            if (i < headers.length) {
                const value = cell.textContent.trim();
                const isAction = cell.querySelector('button, .btn, a[href]');

                if (isAction) {
                    cardContent += `
                        <div class="mobile-table-actions">
                            ${cell.innerHTML}
                        </div>
                    `;
                } else if (value) {
                    cardContent += `
                        <div class="mobile-table-row">
                            <div class="mobile-table-label">${headers[i]}</div>
                            <div class="mobile-table-value">${cell.innerHTML}</div>
                        </div>
                    `;
                }
            }
        });

        card.innerHTML = `
            <div class="mobile-table-card-header">
                <span class="mobile-table-index">#${index + 1}</span>
                <button class="mobile-table-expand" data-bs-toggle="collapse" data-bs-target="#mobile-card-${index}">
                    <i class="bi bi-chevron-down"></i>
                </button>
            </div>
            <div class="collapse" id="mobile-card-${index}">
                <div class="mobile-table-card-body">
                    ${cardContent}
                </div>
            </div>
        `;

        return card;
    }

    addColumnToggle(table) {
        const wrapper = table.closest('.table-responsive-custom') || table.parentElement;

        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'table-column-toggle d-none d-md-block mb-3';

        const headers = Array.from(table.querySelectorAll('thead th'));

        toggleContainer.innerHTML = `
            <div class="d-flex flex-wrap gap-2">
                <small class="text-muted align-self-center me-2">Colonnes visibles :</small>
                ${headers.map((header, index) => `
                    <div class="form-check form-check-inline">
                        <input class="form-check-input column-toggle" type="checkbox" 
                               id="col-${index}" value="${index}" checked>
                        <label class="form-check-label" for="col-${index}">
                            ${header.textContent.trim()}
                        </label>
                    </div>
                `).join('')}
            </div>
        `;

        wrapper.insertBefore(toggleContainer, table);

        // Événements
        toggleContainer.querySelectorAll('.column-toggle').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.toggleColumn(table, checkbox.value, checkbox.checked);
            });
        });
    }

    toggleColumn(table, columnIndex, show) {
        const rows = table.querySelectorAll('tr');

        rows.forEach(row => {
            const cell = row.children[columnIndex];
            if (cell) {
                cell.style.display = show ? '' : 'none';
            }
        });
    }

    addTableSearch(table) {
        const wrapper = table.closest('.table-responsive-custom') || table.parentElement;

        const searchContainer = document.createElement('div');
        searchContainer.className = 'table-search mb-3';
        searchContainer.innerHTML = `
            <div class="input-group">
                <span class="input-group-text">
                    <i class="bi bi-search"></i>
                </span>
                <input type="text" class="form-control" placeholder="Rechercher dans le tableau...">
                <button class="btn btn-outline-secondary" type="button" id="clear-search">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        `;

        wrapper.insertBefore(searchContainer, wrapper.firstChild);

        const searchInput = searchContainer.querySelector('input');
        const clearButton = searchContainer.querySelector('#clear-search');

        // Recherche en temps réel
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filterTable(table, searchInput.value);
            }, 300);
        });

        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            this.filterTable(table, '');
        });
    }

    filterTable(table, searchTerm) {
        const rows = table.querySelectorAll('tbody tr');
        const mobileCards = document.querySelectorAll('.mobile-table-card');

        const term = searchTerm.toLowerCase();

        rows.forEach((row, index) => {
            const text = row.textContent.toLowerCase();
            const show = !term || text.includes(term);

            row.style.display = show ? '' : 'none';

            if (mobileCards[index]) {
                mobileCards[index].style.display = show ? '' : 'none';
            }
        });

        // Afficher un message si aucun résultat
        this.updateNoResultsMessage(table, rows, term);
    }

    updateNoResultsMessage(table, rows, searchTerm) {
        const visibleRows = Array.from(rows).filter(row => row.style.display !== 'none');

        let noResultsRow = table.querySelector('.no-results-row');

        if (visibleRows.length === 0 && searchTerm) {
            if (!noResultsRow) {
                noResultsRow = document.createElement('tr');
                noResultsRow.className = 'no-results-row';

                const colCount = table.querySelectorAll('thead th').length;
                noResultsRow.innerHTML = `
                    <td colspan="${colCount}" class="text-center py-4 text-muted">
                        <i class="bi bi-search me-2"></i>
                        Aucun résultat trouvé pour "${searchTerm}"
                    </td>
                `;

                table.querySelector('tbody').appendChild(noResultsRow);
            }
        } else if (noResultsRow) {
            noResultsRow.remove();
        }
    }

    addTablePagination(table) {
        const rows = table.querySelectorAll('tbody tr');
        if (rows.length <= 10) return; // Pas de pagination nécessaire

        const wrapper = table.closest('.table-responsive-custom') || table.parentElement;
        const itemsPerPage = 10;
        let currentPage = 1;

        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'table-pagination mt-3';

        const totalPages = Math.ceil(rows.length / itemsPerPage);

        const renderPagination = () => {
            paginationContainer.innerHTML = `
                <nav>
                    <ul class="pagination justify-content-center">
                        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                            <a class="page-link" href="#" data-page="${currentPage - 1}">
                                <i class="bi bi-chevron-left"></i>
                            </a>
                        </li>
                        ${this.generatePageNumbers(currentPage, totalPages)}
                        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                            <a class="page-link" href="#" data-page="${currentPage + 1}">
                                <i class="bi bi-chevron-right"></i>
                            </a>
                        </li>
                    </ul>
                </nav>
                <div class="text-center text-muted">
                    <small>
                        Page ${currentPage} sur ${totalPages} 
                        (${rows.length} éléments au total)
                    </small>
                </div>
            `;
        };

        wrapper.appendChild(paginationContainer);
        renderPagination();

        // Événements de pagination
        paginationContainer.addEventListener('click', (e) => {
            if (e.target.closest('.page-link') && !e.target.closest('.disabled')) {
                e.preventDefault();
                const newPage = parseInt(e.target.closest('.page-link').dataset.page);
                if (newPage >= 1 && newPage <= totalPages) {
                    currentPage = newPage;
                    this.showTablePage(rows, currentPage, itemsPerPage);
                    renderPagination();
                }
            }
        });

        // Afficher la première page
        this.showTablePage(rows, currentPage, itemsPerPage);
    }

    generatePageNumbers(current, total) {
        let pages = [];
        const delta = 2;

        for (let i = Math.max(2, current - delta);
            i <= Math.min(total - 1, current + delta);
            i++) {
            pages.push(i);
        }

        if (current - delta > 2) {
            pages.unshift('...');
        }
        if (current + delta < total - 1) {
            pages.push('...');
        }

        pages.unshift(1);
        if (total > 1) {
            pages.push(total);
        }

        return pages.map(page => {
            if (page === '...') {
                return '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
            return `
                <li class="page-item ${page === current ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${page}">${page}</a>
                </li>
            `;
        }).join('');
    }

    showTablePage(rows, page, itemsPerPage) {
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;

        rows.forEach((row, index) => {
            const shouldShow = index >= start && index < end;
            row.style.display = shouldShow ? '' : 'none';
        });
    }

    setupResponsiveCards() {
        const cards = document.querySelectorAll('.responsive-card');

        cards.forEach(card => {
            this.enhanceCard(card);
        });
    }

    enhanceCard(card) {
        if (card.dataset.cardEnhanced) return;
        card.dataset.cardEnhanced = 'true';

        // Ajouter l'effet parallax subtil
        this.addCardParallax(card);

        // Ajouter l'expansion au clic sur mobile
        this.addCardExpansion(card);

        // Ajouter les actions de swipe sur mobile
        this.addCardSwipeActions(card);
    }

    addCardParallax(card) {
        if (this.currentBreakpoint === 'xs' || this.currentBreakpoint === 'sm') return;

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;

            const intensity = 10;
            const rotateX = (y - 0.5) * intensity;
            const rotateY = (0.5 - x) * intensity;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    }

    addCardExpansion(card) {
        const expandable = card.querySelector('.card-expandable');
        if (!expandable) return;

        const header = card.querySelector('.card-header');
        if (header) {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                this.toggleCardExpansion(card, expandable);
            });
        }
    }

    toggleCardExpansion(card, expandable) {
        const isExpanded = expandable.classList.contains('show');

        if (isExpanded) {
            expandable.classList.remove('show');
            card.classList.remove('card-expanded');
        } else {
            expandable.classList.add('show');
            card.classList.add('card-expanded');
        }

        // Vibration pour mobile
        if ('vibrate' in navigator) {
            navigator.vibrate(5);
        }
    }

    addCardSwipeActions(card) {
        if (!('ontouchstart' in window)) return;

        let startX, startY, isDragging = false;

        card.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            startX = touch.pageX;
            startY = touch.pageY;
            isDragging = false;
        });

        card.addEventListener('touchmove', (e) => {
            if (!startX || !startY) return;

            const touch = e.touches[0];
            const deltaX = touch.pageX - startX;
            const deltaY = touch.pageY - startY;

            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
                isDragging = true;
                card.style.transform = `translateX(${deltaX * 0.5}px)`;

                // Afficher les actions de swipe
                this.showSwipeActions(card, deltaX);
            }
        });

        card.addEventListener('touchend', () => {
            if (isDragging) {
                card.style.transform = '';
                this.hideSwipeActions(card);
            }
            startX = null;
            startY = null;
            isDragging = false;
        });
    }

    showSwipeActions(card, deltaX) {
        let actionsContainer = card.querySelector('.swipe-actions');

        if (!actionsContainer) {
            actionsContainer = document.createElement('div');
            actionsContainer.className = 'swipe-actions';
            actionsContainer.innerHTML = `
                <div class="swipe-action swipe-action-left">
                    <i class="bi bi-pencil"></i>
                </div>
                <div class="swipe-action swipe-action-right">
                    <i class="bi bi-trash"></i>
                </div>
            `;
            card.appendChild(actionsContainer);
        }

        actionsContainer.style.display = 'flex';

        if (deltaX > 0) {
            actionsContainer.querySelector('.swipe-action-left').classList.add('active');
            actionsContainer.querySelector('.swipe-action-right').classList.remove('active');
        } else {
            actionsContainer.querySelector('.swipe-action-right').classList.add('active');
            actionsContainer.querySelector('.swipe-action-left').classList.remove('active');
        }
    }

    hideSwipeActions(card) {
        const actionsContainer = card.querySelector('.swipe-actions');
        if (actionsContainer) {
            actionsContainer.style.display = 'none';
        }
    }

    setupResponsiveModals() {
        // Améliorer les modaux pour mobile
        const modals = document.querySelectorAll('.modal');

        modals.forEach(modal => {
            this.enhanceModal(modal);
        });
    }

    enhanceModal(modal) {
        if (modal.dataset.modalEnhanced) return;
        modal.dataset.modalEnhanced = 'true';

        // Ajuster la taille sur mobile
        this.adjustModalForMobile(modal);

        // Ajouter le swipe pour fermer sur mobile
        this.addModalSwipeToClose(modal);

        // Améliorer l'accessibilité
        this.enhanceModalAccessibility(modal);
    }

    adjustModalForMobile(modal) {
        const dialog = modal.querySelector('.modal-dialog');

        if (this.currentBreakpoint === 'xs' || this.currentBreakpoint === 'sm') {
            dialog.classList.add('modal-fullscreen-sm-down');
        }
    }

    addModalSwipeToClose(modal) {
        if (!('ontouchstart' in window)) return;

        const dialog = modal.querySelector('.modal-dialog');
        let startY, isDragging = false;

        modal.addEventListener('touchstart', (e) => {
            startY = e.touches[0].pageY;
            isDragging = false;
        });

        modal.addEventListener('touchmove', (e) => {
            if (!startY) return;

            const deltaY = e.touches[0].pageY - startY;

            if (deltaY > 20) {
                isDragging = true;
                dialog.style.transform = `translateY(${deltaY * 0.5}px)`;
                dialog.style.opacity = Math.max(0.5, 1 - deltaY / 300);
            }
        });

        modal.addEventListener('touchend', () => {
            if (isDragging) {
                const deltaY = event.changedTouches[0].pageY - startY;

                if (deltaY > 100) {
                    // Fermer le modal
                    const bsModal = bootstrap.Modal.getInstance(modal);
                    if (bsModal) {
                        bsModal.hide();
                    }
                } else {
                    // Remettre en place
                    dialog.style.transform = '';
                    dialog.style.opacity = '';
                }
            }
            startY = null;
            isDragging = false;
        });
    }

    enhanceModalAccessibility(modal) {
        // Améliorer la navigation au clavier
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length > 0) {
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    if (e.shiftKey) {
                        if (document.activeElement === firstElement) {
                            e.preventDefault();
                            lastElement.focus();
                        }
                    } else {
                        if (document.activeElement === lastElement) {
                            e.preventDefault();
                            firstElement.focus();
                        }
                    }
                }
            });
        }
    }

    setupResponsiveNavigation() {
        // Améliorer la navigation responsive
        const navbars = document.querySelectorAll('.navbar');

        navbars.forEach(navbar => {
            this.enhanceNavbar(navbar);
        });
    }

    enhanceNavbar(navbar) {
        if (navbar.dataset.navbarEnhanced) return;
        navbar.dataset.navbarEnhanced = 'true';

        // Ajouter le comportement de scroll intelligent
        this.addSmartNavbar(navbar);

        // Améliorer le menu burger
        this.enhanceBurgerMenu(navbar);
    }

    addSmartNavbar(navbar) {
        let lastScrollY = window.scrollY;
        let ticking = false;

        const updateNavbar = () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY > 100) {
                if (currentScrollY > lastScrollY) {
                    // Scroll vers le bas - masquer
                    navbar.classList.add('navbar-hidden');
                } else {
                    // Scroll vers le haut - afficher
                    navbar.classList.remove('navbar-hidden');
                }
            } else {
                navbar.classList.remove('navbar-hidden');
            }

            lastScrollY = currentScrollY;
            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateNavbar);
                ticking = true;
            }
        });
    }

    enhanceBurgerMenu(navbar) {
        const toggler = navbar.querySelector('.navbar-toggler');
        const collapse = navbar.querySelector('.navbar-collapse');

        if (toggler && collapse) {
            // Animation du burger
            toggler.addEventListener('click', () => {
                toggler.classList.toggle('active');
            });

            // Fermer le menu au clic sur un lien
            const navLinks = collapse.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    if (window.innerWidth < 992) {
                        const bsCollapse = new bootstrap.Collapse(collapse, {
                            hide: true
                        });
                        toggler.classList.remove('active');
                    }
                });
            });
        }
    }

    setupResizeListener() {
        let resizeTimeout;

        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const newBreakpoint = this.getCurrentBreakpoint();

                if (newBreakpoint !== this.currentBreakpoint) {
                    this.currentBreakpoint = newBreakpoint;
                    this.handleBreakpointChange();
                }
            }, 250);
        });
    }

    handleBreakpointChange() {
        // Réinitialiser les composants si nécessaire
        document.body.className = document.body.className.replace(/\bbp-\w+\b/g, '');
        document.body.classList.add(`bp-${this.currentBreakpoint}`);

        // Redéclencher les initialisations spécifiques
        this.setupResponsiveCards();
        this.setupResponsiveModals();
    }

    initializeComponentLibrary() {
        // Créer des composants prêts à l'emploi
        this.createUtilityComponents();
        this.addGlobalStyles();
    }

    createUtilityComponents() {
        // Composant Loading Skeleton
        window.createLoadingSkeleton = (type = 'text', count = 3) => {
            const skeleton = document.createElement('div');
            skeleton.className = 'loading-skeleton';

            for (let i = 0; i < count; i++) {
                const item = document.createElement('div');
                item.className = `skeleton-${type}`;
                skeleton.appendChild(item);
            }

            return skeleton;
        };

        // Composant Progress Circle
        window.createProgressCircle = (percentage, size = 100) => {
            const circle = document.createElement('div');
            circle.className = 'progress-circle';
            circle.style.width = `${size}px`;
            circle.style.height = `${size}px`;

            const circumference = 2 * Math.PI * (size / 2 - 5);
            const offset = circumference * (1 - percentage / 100);

            circle.innerHTML = `
                <svg width="${size}" height="${size}">
                    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 5}" 
                            stroke-width="4" stroke="#e0e0e0" fill="transparent"/>
                    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 5}" 
                            stroke-width="4" stroke="var(--primary-blue)" fill="transparent"
                            stroke-dasharray="${circumference}" 
                            stroke-dashoffset="${offset}"
                            transform="rotate(-90 ${size / 2} ${size / 2})"/>
                </svg>
                <div class="progress-text">${percentage}%</div>
            `;

            return circle;
        };

        // Composant Notification moderne
        window.showModernNotification = (message, type = 'info', duration = 5000) => {
            const notification = document.createElement('div');
            notification.className = `modern-notification modern-notification-${type}`;

            const icons = {
                success: 'bi-check-circle',
                error: 'bi-x-circle',
                warning: 'bi-exclamation-triangle',
                info: 'bi-info-circle'
            };

            notification.innerHTML = `
                <div class="notification-content">
                    <i class="bi ${icons[type]} notification-icon"></i>
                    <span class="notification-message">${message}</span>
                    <button class="notification-close">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
                <div class="notification-progress"></div>
            `;

            // Ajouter au container
            let container = document.querySelector('.notification-container');
            if (!container) {
                container = document.createElement('div');
                container.className = 'notification-container';
                document.body.appendChild(container);
            }

            container.appendChild(notification);

            // Animation d'entrée
            setTimeout(() => {
                notification.classList.add('show');
            }, 10);

            // Progress bar
            const progressBar = notification.querySelector('.notification-progress');
            progressBar.style.animation = `notificationProgress ${duration}ms linear`;

            // Auto-remove
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, duration);

            // Bouton de fermeture
            notification.querySelector('.notification-close').addEventListener('click', () => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            });

            return notification;
        };
    }

    addGlobalStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Tables responsives */
            .mobile-table-card {
                background: white;
                border-radius: var(--radius-lg);
                margin-bottom: 1rem;
                box-shadow: var(--shadow);
                overflow: hidden;
                transition: all var(--transition-normal);
            }
            
            .mobile-table-card:hover {
                box-shadow: var(--shadow-lg);
                transform: translateY(-2px);
            }
            
            .mobile-table-card-header {
                background: var(--gray-50);
                padding: 1rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid var(--gray-200);
            }
            
            .mobile-table-index {
                font-weight: 600;
                color: var(--primary-blue);
            }
            
            .mobile-table-expand {
                background: none;
                border: none;
                color: var(--gray-600);
                font-size: 1.2rem;
                padding: 0;
                transition: transform var(--transition-fast);
            }
            
            .mobile-table-expand[aria-expanded="true"] {
                transform: rotate(180deg);
            }
            
            .mobile-table-card-body {
                padding: 1rem;
            }
            
            .mobile-table-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.5rem 0;
                border-bottom: 1px solid var(--gray-100);
            }
            
            .mobile-table-row:last-child {
                border-bottom: none;
            }
            
            .mobile-table-label {
                font-weight: 500;
                color: var(--gray-600);
                flex: 0 0 40%;
            }
            
            .mobile-table-value {
                flex: 1;
                text-align: right;
            }
            
            .mobile-table-actions {
                padding: 1rem 0 0;
                border-top: 1px solid var(--gray-200);
                display: flex;
                gap: 0.5rem;
                justify-content: center;
            }
            
            /* Cartes avec actions swipe */
            .swipe-actions {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                display: none;
                justify-content: space-between;
                z-index: 1;
                pointer-events: none;
            }
            
            .swipe-action {
                width: 60px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 1.5rem;
                transition: all var(--transition-fast);
            }
            
            .swipe-action-left {
                background: var(--primary-blue);
            }
            
            .swipe-action-right {
                background: var(--danger);
            }
            
            .swipe-action.active {
                width: 80px;
                pointer-events: auto;
            }
            
            /* Navigation intelligente */
            .navbar-hidden {
                transform: translateY(-100%);
                transition: transform 0.3s ease-in-out;
            }
            
            .navbar-toggler.active .navbar-toggler-icon {
                transform: rotate(45deg);
            }
            
            /* Loading skeletons */
            .loading-skeleton {
                animation: pulse 1.5s ease-in-out infinite;
            }
            
            .skeleton-text {
                height: 1rem;
                background: var(--gray-200);
                border-radius: var(--radius-sm);
                margin-bottom: 0.5rem;
            }
            
            .skeleton-text:nth-child(even) {
                width: 80%;
            }
            
            .skeleton-text:last-child {
                width: 60%;
            }
            
            /* Cercles de progression */
            .progress-circle {
                position: relative;
                display: inline-block;
            }
            
            .progress-circle .progress-text {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-weight: 600;
                color: var(--primary-blue);
            }
            
            /* Notifications modernes */
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                max-width: 400px;
            }
            
            .modern-notification {
                background: white;
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-xl);
                margin-bottom: 1rem;
                overflow: hidden;
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                position: relative;
            }
            
            .modern-notification.show {
                transform: translateX(0);
                opacity: 1;
            }
            
            .notification-content {
                padding: 1rem;
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            
            .notification-icon {
                font-size: 1.25rem;
                flex-shrink: 0;
            }
            
            .notification-message {
                flex: 1;
                font-weight: 500;
            }
            
            .notification-close {
                background: none;
                border: none;
                color: var(--gray-400);
                cursor: pointer;
                padding: 0;
                flex-shrink: 0;
            }
            
            .notification-progress {
                height: 3px;
                background: var(--gray-200);
                position: relative;
                overflow: hidden;
            }
            
            .notification-progress::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                width: 100%;
                background: var(--primary-blue);
                transform: translateX(-100%);
            }
            
            @keyframes notificationProgress {
                to { transform: translateX(0); }
            }
            
            .modern-notification-success .notification-icon { color: var(--success); }
            .modern-notification-error .notification-icon { color: var(--danger); }
            .modern-notification-warning .notification-icon { color: var(--warning); }
            .modern-notification-info .notification-icon { color: var(--info); }
            
            .modern-notification-success .notification-progress::after { background: var(--success); }
            .modern-notification-error .notification-progress::after { background: var(--danger); }
            .modern-notification-warning .notification-progress::after { background: var(--warning); }
            .modern-notification-info .notification-progress::after { background: var(--info); }
            
            /* Classes utilitaires breakpoint */
            .bp-xs { --current-bp: 'xs'; }
            .bp-sm { --current-bp: 'sm'; }
            .bp-md { --current-bp: 'md'; }
            .bp-lg { --current-bp: 'lg'; }
            .bp-xl { --current-bp: 'xl'; }
            .bp-xxl { --current-bp: 'xxl'; }
            
            /* Responsive utilities */
            @media (max-width: 767px) {
                .hide-mobile { display: none !important; }
                .mobile-only { display: block !important; }
            }
            
            @media (min-width: 768px) {
                .mobile-only { display: none !important; }
                .hide-desktop { display: none !important; }
            }
        `;

        document.head.appendChild(style);
    }
}

// ====================================
// 🚀 INITIALISATION GLOBALE
// ====================================

document.addEventListener('DOMContentLoaded', function () {
    // Initialiser le système de composants responsive
    window.responsiveComponents = new ResponsiveComponents();

    console.log('🧩 Composants responsive initialisés');
});

// Exposer la classe globalement
window.ResponsiveComponents = ResponsiveComponents;
