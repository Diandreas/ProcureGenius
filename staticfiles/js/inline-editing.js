/* ====================================
   ✏️ SYSTÈME D'ÉDITION INLINE AVANCÉ
   ====================================*/

class InlineEditor {
    constructor(options = {}) {
        this.options = {
            selector: '.inline-edit',
            saveUrl: '/ajax/inline-save/',
            debounceDelay: 500,
            confirmChanges: false,
            autoSave: true,
            showTooltips: true,
            animations: true,
            ...options
        };

        this.activeEditor = null;
        this.originalValue = null;
        this.saveTimeout = null;
        this.isEditing = false;

        this.init();
    }

    init() {
        this.setupInlineElements();
        this.setupKeyboardShortcuts();
        this.setupClickOutside();
        this.setupTooltips();
    }

    setupInlineElements() {
        const elements = document.querySelectorAll(this.options.selector);

        elements.forEach(element => {
            this.makeEditable(element);
        });

        // Observer pour les nouveaux éléments
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        const newElements = node.querySelectorAll(this.options.selector);
                        newElements.forEach(element => {
                            this.makeEditable(element);
                        });
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    makeEditable(element) {
        if (element.dataset.inlineEditorInit) return;
        element.dataset.inlineEditorInit = 'true';

        // Ajouter les attributs nécessaires
        if (!element.dataset.field) {
            element.dataset.field = this.generateFieldName(element);
        }

        if (!element.dataset.model) {
            element.dataset.model = this.detectModel(element);
        }

        if (!element.dataset.pk) {
            element.dataset.pk = this.detectPrimaryKey(element);
        }

        // Ajouter l'indicateur d'édition
        this.addEditIndicator(element);

        // Événements
        element.addEventListener('dblclick', (e) => this.startEdit(e, element));
        element.addEventListener('mouseenter', () => this.showEditHint(element));
        element.addEventListener('mouseleave', () => this.hideEditHint(element));

        // Touch events pour mobile
        let touchTimeout;
        element.addEventListener('touchstart', () => {
            touchTimeout = setTimeout(() => this.startEdit(null, element), 500);
        });

        element.addEventListener('touchend', () => {
            clearTimeout(touchTimeout);
        });

        element.addEventListener('touchmove', () => {
            clearTimeout(touchTimeout);
        });
    }

    generateFieldName(element) {
        // Essayer de détecter le nom du champ à partir des classes ou IDs
        const classList = Array.from(element.classList);
        const fieldClasses = classList.filter(cls =>
            cls.includes('field-') ||
            cls.includes('data-') ||
            cls.includes('metric-')
        );

        if (fieldClasses.length > 0) {
            return fieldClasses[0].replace(/^(field-|data-|metric-)/, '');
        }

        return element.id || 'field';
    }

    detectModel(element) {
        // Essayer de détecter le modèle à partir du contexte
        const container = element.closest('[data-model]');
        if (container) {
            return container.dataset.model;
        }

        // Essayer de détecter à partir de l'URL
        const path = window.location.pathname;
        const pathParts = path.split('/').filter(part => part);

        if (pathParts.length > 0) {
            const modelMap = {
                'suppliers': 'supplier',
                'purchase-orders': 'purchaseorder',
                'invoices': 'invoice',
                'products': 'product',
                'clients': 'client'
            };

            return modelMap[pathParts[0]] || pathParts[0];
        }

        return 'generic';
    }

    detectPrimaryKey(element) {
        // Essayer de détecter la clé primaire
        const container = element.closest('[data-pk]');
        if (container) {
            return container.dataset.pk;
        }

        // Essayer de détecter à partir de l'URL
        const path = window.location.pathname;
        const pathParts = path.split('/').filter(part => part);
        const lastPart = pathParts[pathParts.length - 1];

        if (/^\d+$/.test(lastPart)) {
            return lastPart;
        }

        return null;
    }

    addEditIndicator(element) {
        if (element.querySelector('.edit-indicator')) return;

        const indicator = document.createElement('span');
        indicator.className = 'edit-indicator';
        indicator.innerHTML = '<i class="bi bi-pencil"></i>';
        indicator.title = 'Double-cliquez pour modifier';

        element.style.position = 'relative';
        element.appendChild(indicator);
    }

    showEditHint(element) {
        if (this.isEditing) return;

        element.classList.add('inline-edit-hover');

        if (this.options.showTooltips) {
            this.showTooltip(element, 'Double-cliquez pour modifier');
        }
    }

    hideEditHint(element) {
        element.classList.remove('inline-edit-hover');
        this.hideTooltip();
    }

    showTooltip(element, text) {
        this.hideTooltip(); // Supprimer l'ancien tooltip

        const tooltip = document.createElement('div');
        tooltip.className = 'inline-edit-tooltip';
        tooltip.textContent = text;

        const rect = element.getBoundingClientRect();
        tooltip.style.cssText = `
            position: fixed;
            top: ${rect.bottom + 5}px;
            left: ${rect.left}px;
            background: #333;
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 9999;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
        `;

        document.body.appendChild(tooltip);

        setTimeout(() => {
            tooltip.style.opacity = '1';
        }, 10);

        this.currentTooltip = tooltip;
    }

    hideTooltip() {
        if (this.currentTooltip) {
            this.currentTooltip.remove();
            this.currentTooltip = null;
        }
    }

    startEdit(event, element) {
        if (this.isEditing) return;

        event?.preventDefault();
        this.isEditing = true;
        this.activeEditor = element;
        this.originalValue = this.getValue(element);

        // Vibration pour mobile
        if ('vibrate' in navigator) {
            navigator.vibrate(10);
        }

        // Masquer le tooltip
        this.hideTooltip();

        // Créer l'éditeur
        const editor = this.createEditor(element);
        this.replaceElementWithEditor(element, editor);

        // Focus et sélection
        setTimeout(() => {
            editor.focus();
            this.selectAllText(editor);
        }, 10);
    }

    getValue(element) {
        // Gérer différents types d'éléments
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            return element.value;
        }

        // Pour les éléments avec du contenu formaté, essayer de récupérer la valeur brute
        const rawValue = element.dataset.rawValue;
        if (rawValue !== undefined) {
            return rawValue;
        }

        return element.textContent.trim();
    }

    createEditor(element) {
        const fieldType = this.detectFieldType(element);
        let editor;

        switch (fieldType) {
            case 'textarea':
                editor = this.createTextareaEditor(element);
                break;
            case 'select':
                editor = this.createSelectEditor(element);
                break;
            case 'number':
                editor = this.createNumberEditor(element);
                break;
            case 'date':
                editor = this.createDateEditor(element);
                break;
            case 'boolean':
                editor = this.createBooleanEditor(element);
                break;
            default:
                editor = this.createTextEditor(element);
        }

        this.setupEditorEvents(editor, element);
        return editor;
    }

    detectFieldType(element) {
        // Détecter le type basé sur les données ou le contenu
        const field = element.dataset.field;
        const dataType = element.dataset.type;

        if (dataType) return dataType;

        // Types détectés automatiquement
        const typeMap = {
            'description': 'textarea',
            'notes': 'textarea',
            'comments': 'textarea',
            'address': 'textarea',
            'price': 'number',
            'amount': 'number',
            'quantity': 'number',
            'total': 'number',
            'date': 'date',
            'due_date': 'date',
            'created_at': 'date',
            'is_active': 'boolean',
            'is_local': 'boolean',
            'status': 'select',
            'priority': 'select'
        };

        for (const [pattern, type] of Object.entries(typeMap)) {
            if (field && field.includes(pattern)) {
                return type;
            }
        }

        // Détecter par le contenu
        const content = this.getValue(element);

        if (/^\d+(\.\d+)?$/.test(content)) return 'number';
        if (/^\d{4}-\d{2}-\d{2}/.test(content)) return 'date';
        if (content.length > 50) return 'textarea';

        return 'text';
    }

    createTextEditor(element) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'inline-edit-field';
        input.value = this.getValue(element);

        // Validation basée sur le champ
        this.addValidation(input, element);

        return input;
    }

    createTextareaEditor(element) {
        const textarea = document.createElement('textarea');
        textarea.className = 'inline-edit-field';
        textarea.value = this.getValue(element);
        textarea.rows = Math.min(Math.max(textarea.value.split('\n').length, 2), 8);

        return textarea;
    }

    createNumberEditor(element) {
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'inline-edit-field';
        input.value = this.getValue(element).replace(/[^\d.-]/g, '');

        // Attributs spécifiques aux nombres
        if (element.dataset.min) input.min = element.dataset.min;
        if (element.dataset.max) input.max = element.dataset.max;
        if (element.dataset.step) input.step = element.dataset.step;

        return input;
    }

    createDateEditor(element) {
        const input = document.createElement('input');
        input.type = 'date';
        input.className = 'inline-edit-field';

        // Convertir la date si nécessaire
        const dateValue = this.parseDate(this.getValue(element));
        if (dateValue) {
            input.value = dateValue;
        }

        return input;
    }

    createSelectEditor(element) {
        const select = document.createElement('select');
        select.className = 'inline-edit-field';

        // Récupérer les options
        this.populateSelectOptions(select, element);

        return select;
    }

    createBooleanEditor(element) {
        const select = document.createElement('select');
        select.className = 'inline-edit-field';

        const currentValue = this.getValue(element).toLowerCase();
        const isTrue = ['true', 'oui', 'yes', '1', 'actif', 'active'].includes(currentValue);

        select.innerHTML = `
            <option value="true" ${isTrue ? 'selected' : ''}>Oui</option>
            <option value="false" ${!isTrue ? 'selected' : ''}>Non</option>
        `;

        return select;
    }

    populateSelectOptions(select, element) {
        const field = element.dataset.field;
        const model = element.dataset.model;

        // Options prédéfinies
        const presetOptions = {
            'status': [
                { value: 'draft', label: 'Brouillon' },
                { value: 'pending', label: 'En attente' },
                { value: 'approved', label: 'Approuvé' },
                { value: 'sent', label: 'Envoyé' },
                { value: 'received', label: 'Reçu' },
                { value: 'paid', label: 'Payé' },
                { value: 'cancelled', label: 'Annulé' }
            ],
            'priority': [
                { value: 'low', label: 'Faible' },
                { value: 'medium', label: 'Moyenne' },
                { value: 'high', label: 'Élevée' },
                { value: 'urgent', label: 'Urgente' }
            ]
        };

        if (presetOptions[field]) {
            const currentValue = this.getValue(element);
            presetOptions[field].forEach(option => {
                const optionElement = new Option(option.label, option.value);
                if (option.value === currentValue) {
                    optionElement.selected = true;
                }
                select.add(optionElement);
            });
        } else {
            // Charger les options via AJAX
            this.loadSelectOptions(select, element);
        }
    }

    loadSelectOptions(select, element) {
        const field = element.dataset.field;
        const model = element.dataset.model;

        // Option de chargement temporaire
        select.innerHTML = '<option>Chargement...</option>';

        fetch(`/ajax/field-options/?model=${model}&field=${field}`)
            .then(response => response.json())
            .then(options => {
                select.innerHTML = '';
                const currentValue = this.getValue(element);

                options.forEach(option => {
                    const optionElement = new Option(option.label, option.value);
                    if (option.value === currentValue) {
                        optionElement.selected = true;
                    }
                    select.add(optionElement);
                });
            })
            .catch(error => {
                console.error('Erreur lors du chargement des options:', error);
                select.innerHTML = '<option>Erreur de chargement</option>';
            });
    }

    addValidation(input, element) {
        const field = element.dataset.field;

        // Règles de validation par champ
        const validationRules = {
            'email': {
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Format email invalide'
            },
            'phone': {
                pattern: /^[\d\s\-\+\(\)]+$/,
                message: 'Format téléphone invalide'
            },
            'postal_code': {
                pattern: /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/,
                message: 'Code postal canadien invalide'
            },
            'website': {
                pattern: /^https?:\/\/.+/,
                message: 'URL invalide'
            }
        };

        const rule = validationRules[field];
        if (rule) {
            input.addEventListener('blur', () => {
                if (input.value && !rule.pattern.test(input.value)) {
                    this.showValidationError(input, rule.message);
                } else {
                    this.clearValidationError(input);
                }
            });
        }
    }

    showValidationError(input, message) {
        input.classList.add('is-invalid');

        let errorDiv = input.parentElement.querySelector('.validation-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'validation-error';
            input.parentElement.appendChild(errorDiv);
        }
        errorDiv.textContent = message;
    }

    clearValidationError(input) {
        input.classList.remove('is-invalid');
        const errorDiv = input.parentElement.querySelector('.validation-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    parseDate(dateString) {
        // Essayer de parser différents formats de date
        const formats = [
            /^(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
            /^(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
            /^(\d{2})-(\d{2})-(\d{4})/ // DD-MM-YYYY
        ];

        for (const format of formats) {
            const match = dateString.match(format);
            if (match) {
                if (format === formats[0]) {
                    return `${match[1]}-${match[2]}-${match[3]}`;
                } else if (format === formats[1]) {
                    return `${match[3]}-${match[1]}-${match[2]}`;
                } else {
                    return `${match[3]}-${match[2]}-${match[1]}`;
                }
            }
        }

        return null;
    }

    setupEditorEvents(editor, originalElement) {
        // Sauvegarde automatique
        if (this.options.autoSave) {
            editor.addEventListener('input', () => {
                this.debounceAutoSave(editor, originalElement);
            });
        }

        // Événements clavier
        editor.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'Enter':
                    if (!e.shiftKey || editor.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        this.saveEdit(editor, originalElement);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.cancelEdit(editor, originalElement);
                    break;
                case 'Tab':
                    // Permettre la navigation avec Tab
                    this.saveEdit(editor, originalElement);
                    break;
            }
        });

        // Perte de focus
        editor.addEventListener('blur', (e) => {
            // Délai pour permettre les clics sur les boutons
            setTimeout(() => {
                if (!e.relatedTarget || !e.relatedTarget.closest('.inline-edit-actions')) {
                    this.saveEdit(editor, originalElement);
                }
            }, 100);
        });

        // Redimensionnement automatique pour textarea
        if (editor.tagName === 'TEXTAREA') {
            this.setupTextareaAutoResize(editor);
        }
    }

    setupTextareaAutoResize(textarea) {
        const resize = () => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        };

        textarea.addEventListener('input', resize);
        resize(); // Taille initiale
    }

    debounceAutoSave(editor, originalElement) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            if (this.options.autoSave) {
                this.performSave(editor, originalElement, true);
            }
        }, this.options.debounceDelay);
    }

    replaceElementWithEditor(element, editor) {
        // Créer un conteneur pour l'éditeur
        const container = document.createElement('div');
        container.className = 'inline-edit-container';

        // Copier les styles importants
        const computedStyle = window.getComputedStyle(element);
        editor.style.width = computedStyle.width;
        editor.style.fontSize = computedStyle.fontSize;
        editor.style.fontFamily = computedStyle.fontFamily;
        editor.style.textAlign = computedStyle.textAlign;

        container.appendChild(editor);

        // Ajouter les boutons d'action si pas d'auto-save
        if (!this.options.autoSave) {
            const actions = this.createActionButtons(editor, element);
            container.appendChild(actions);
        }

        // Remplacer l'élément
        element.style.display = 'none';
        element.parentNode.insertBefore(container, element.nextSibling);

        // Animation d'apparition
        if (this.options.animations) {
            container.style.opacity = '0';
            container.style.transform = 'scale(0.95)';

            setTimeout(() => {
                container.style.transition = 'all 0.2s ease-out';
                container.style.opacity = '1';
                container.style.transform = 'scale(1)';
            }, 10);
        }
    }

    createActionButtons(editor, originalElement) {
        const actions = document.createElement('div');
        actions.className = 'inline-edit-actions';

        actions.innerHTML = `
            <button type="button" class="btn btn-sm btn-success save-btn">
                <i class="bi bi-check"></i>
            </button>
            <button type="button" class="btn btn-sm btn-secondary cancel-btn">
                <i class="bi bi-x"></i>
            </button>
        `;

        // Événements
        actions.querySelector('.save-btn').addEventListener('click', () => {
            this.saveEdit(editor, originalElement);
        });

        actions.querySelector('.cancel-btn').addEventListener('click', () => {
            this.cancelEdit(editor, originalElement);
        });

        return actions;
    }

    saveEdit(editor, originalElement) {
        const newValue = editor.value || editor.textContent;

        // Validation
        if (editor.classList.contains('is-invalid')) {
            showErrorToast('Veuillez corriger les erreurs avant de sauvegarder');
            return;
        }

        if (this.options.confirmChanges && newValue !== this.originalValue) {
            if (!confirm('Voulez-vous sauvegarder ces modifications ?')) {
                this.cancelEdit(editor, originalElement);
                return;
            }
        }

        this.performSave(editor, originalElement);
    }

    performSave(editor, originalElement, isAutoSave = false) {
        const newValue = editor.value || editor.textContent;

        // Pas de changement
        if (newValue === this.originalValue) {
            this.restoreOriginalElement(editor, originalElement);
            return;
        }

        // Préparer les données
        const data = {
            model: originalElement.dataset.model,
            pk: originalElement.dataset.pk,
            field: originalElement.dataset.field,
            value: newValue,
            auto_save: isAutoSave
        };

        // Afficher l'état de chargement
        this.showSaveState(editor, 'saving');

        // Envoyer la requête
        fetch(this.options.saveUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCSRFToken()
            },
            body: JSON.stringify(data)
        })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    this.handleSaveSuccess(editor, originalElement, result, isAutoSave);
                } else {
                    this.handleSaveError(editor, originalElement, result.error, isAutoSave);
                }
            })
            .catch(error => {
                this.handleSaveError(editor, originalElement, error.message, isAutoSave);
            });
    }

    showSaveState(editor, state) {
        // Ajouter des indicateurs visuels
        const container = editor.closest('.inline-edit-container');
        if (container) {
            container.classList.remove('saving', 'saved', 'error');
            container.classList.add(state);
        }
    }

    handleSaveSuccess(editor, originalElement, result, isAutoSave) {
        // Mettre à jour l'élément original
        this.updateOriginalElement(originalElement, result.value || editor.value, result.display_value);

        // Restaurer l'affichage
        this.restoreOriginalElement(editor, originalElement);

        // Notification
        if (!isAutoSave) {
            showSuccessToast(result.message || 'Modification sauvegardée avec succès');
        } else {
            this.showAutoSaveIndicator(originalElement);
        }

        // Vibration de succès
        if ('vibrate' in navigator) {
            navigator.vibrate(25);
        }
    }

    handleSaveError(editor, originalElement, error, isAutoSave) {
        this.showSaveState(editor, 'error');

        if (!isAutoSave) {
            showErrorToast(error || 'Erreur lors de la sauvegarde');

            // Vibration d'erreur
            if ('vibrate' in navigator) {
                navigator.vibrate([50, 50, 50]);
            }
        } else {
            this.showAutoSaveError(originalElement, error);
        }
    }

    updateOriginalElement(element, value, displayValue = null) {
        // Utiliser la valeur d'affichage si fournie, sinon la valeur brute
        const textToDisplay = displayValue || value;

        // Stocker la valeur brute
        element.dataset.rawValue = value;

        // Mettre à jour l'affichage
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            element.value = textToDisplay;
        } else {
            element.textContent = textToDisplay;
        }

        // Animation de mise à jour
        if (this.options.animations) {
            element.style.transition = 'background-color 0.3s ease';
            element.style.backgroundColor = '#d4edda';

            setTimeout(() => {
                element.style.backgroundColor = '';
            }, 1000);
        }
    }

    showAutoSaveIndicator(element) {
        const indicator = document.createElement('span');
        indicator.className = 'auto-save-indicator';
        indicator.innerHTML = '<i class="bi bi-check-circle text-success"></i>';
        indicator.title = 'Sauvegardé automatiquement';

        element.appendChild(indicator);

        setTimeout(() => {
            indicator.style.opacity = '0';
            setTimeout(() => indicator.remove(), 300);
        }, 2000);
    }

    showAutoSaveError(element, error) {
        const indicator = document.createElement('span');
        indicator.className = 'auto-save-error';
        indicator.innerHTML = '<i class="bi bi-exclamation-triangle text-warning"></i>';
        indicator.title = `Erreur de sauvegarde: ${error}`;

        element.appendChild(indicator);

        setTimeout(() => {
            indicator.remove();
        }, 5000);
    }

    cancelEdit(editor, originalElement) {
        this.restoreOriginalElement(editor, originalElement);

        // Vibration d'annulation
        if ('vibrate' in navigator) {
            navigator.vibrate(10);
        }
    }

    restoreOriginalElement(editor, originalElement) {
        const container = editor.closest('.inline-edit-container');

        // Animation de sortie
        if (this.options.animations && container) {
            container.style.transition = 'all 0.2s ease-out';
            container.style.opacity = '0';
            container.style.transform = 'scale(0.95)';

            setTimeout(() => {
                this.finishRestore(container, originalElement);
            }, 200);
        } else {
            this.finishRestore(container, originalElement);
        }
    }

    finishRestore(container, originalElement) {
        // Supprimer le conteneur d'édition
        if (container) {
            container.remove();
        }

        // Réafficher l'élément original
        originalElement.style.display = '';

        // Réinitialiser les états
        this.isEditing = false;
        this.activeEditor = null;
        this.originalValue = null;

        // Supprimer les tooltips
        this.hideTooltip();
    }

    selectAllText(editor) {
        if (editor.tagName === 'INPUT' || editor.tagName === 'TEXTAREA') {
            editor.select();
        } else if (editor.contentEditable) {
            const range = document.createRange();
            range.selectNodeContents(editor);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + E pour éditer l'élément sous la souris
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                const hoveredElement = document.querySelector('.inline-edit:hover');
                if (hoveredElement) {
                    this.startEdit(null, hoveredElement);
                }
            }

            // Echap pour annuler l'édition en cours
            if (e.key === 'Escape' && this.isEditing) {
                e.preventDefault();
                if (this.activeEditor) {
                    this.cancelEdit(this.activeEditor, this.activeEditor.parentElement.previousElementSibling);
                }
            }
        });
    }

    setupClickOutside() {
        document.addEventListener('click', (e) => {
            if (this.isEditing && this.activeEditor) {
                const container = this.activeEditor.closest('.inline-edit-container');
                if (container && !container.contains(e.target)) {
                    // Clic à l'extérieur, sauvegarder
                    const originalElement = container.previousElementSibling;
                    this.saveEdit(this.activeEditor, originalElement);
                }
            }
        });
    }

    setupTooltips() {
        if (!this.options.showTooltips) return;

        // Créer un style pour les tooltips
        const style = document.createElement('style');
        style.textContent = `
            .inline-edit-tooltip {
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                white-space: nowrap;
                z-index: 9999;
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);
    }

    getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
    }

    // API publique
    enableElement(element) {
        this.makeEditable(element);
    }

    disableElement(element) {
        element.style.pointerEvents = 'none';
        element.classList.add('inline-edit-disabled');
    }

    updateValue(element, value, displayValue = null) {
        this.updateOriginalElement(element, value, displayValue);
    }

    isElementEditing(element) {
        return this.activeEditor && this.activeEditor.dataset.originalElement === element;
    }
}

// ====================================
// 🚀 INITIALISATION ET UTILISATION
// ====================================

// Instance globale
let globalInlineEditor;

document.addEventListener('DOMContentLoaded', function () {
    // Initialiser l'éditeur inline global
    globalInlineEditor = new InlineEditor({
        selector: '.inline-edit',
        saveUrl: '/ajax/inline-save/',
        autoSave: true,
        animations: true,
        showTooltips: true
    });

    // Ajouter les styles CSS nécessaires
    addInlineEditingStyles();
});

function addInlineEditingStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .inline-edit {
            position: relative;
            cursor: pointer;
            transition: all var(--transition-fast);
            border-radius: var(--radius-sm);
            padding: 2px 4px;
            margin: -2px -4px;
        }
        
        .inline-edit:hover {
            background: rgba(0, 102, 204, 0.05);
            transform: scale(1.02);
        }
        
        .inline-edit-hover {
            background: rgba(0, 102, 204, 0.1) !important;
            box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
        }
        
        .edit-indicator {
            position: absolute;
            top: -5px;
            right: -5px;
            background: var(--primary-blue);
            color: white;
            border-radius: 50%;
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
            opacity: 0;
            transition: opacity var(--transition-fast);
            pointer-events: none;
        }
        
        .inline-edit:hover .edit-indicator {
            opacity: 1;
        }
        
        .inline-edit-field {
            border: 2px solid var(--primary-blue);
            border-radius: var(--radius);
            padding: 8px 12px;
            font-size: inherit;
            font-family: inherit;
            background: white;
            box-shadow: var(--shadow-lg);
            outline: none;
            transition: all var(--transition-fast);
        }
        
        .inline-edit-field:focus {
            border-color: var(--primary-cyan);
            box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.2);
            transform: scale(1.02);
        }
        
        .inline-edit-container {
            display: inline-block;
            position: relative;
        }
        
        .inline-edit-container.saving .inline-edit-field {
            background: #fff3cd;
            border-color: #ffc107;
        }
        
        .inline-edit-container.saved .inline-edit-field {
            background: #d1ecf1;
            border-color: #bee5eb;
        }
        
        .inline-edit-container.error .inline-edit-field {
            background: #f8d7da;
            border-color: #f5c6cb;
        }
        
        .inline-edit-actions {
            position: absolute;
            top: 100%;
            right: 0;
            display: flex;
            gap: 4px;
            margin-top: 4px;
            z-index: 10;
        }
        
        .inline-edit-actions .btn {
            padding: 4px 8px;
            font-size: 12px;
            line-height: 1;
        }
        
        .validation-error {
            position: absolute;
            top: 100%;
            left: 0;
            background: var(--danger);
            color: white;
            padding: 4px 8px;
            border-radius: var(--radius-sm);
            font-size: 12px;
            white-space: nowrap;
            z-index: 10;
            margin-top: 2px;
        }
        
        .auto-save-indicator,
        .auto-save-error {
            position: absolute;
            top: -8px;
            right: -8px;
            font-size: 12px;
            opacity: 1;
            transition: opacity 0.3s ease;
        }
        
        .inline-edit-disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        /* Mobile optimizations */
        @media (max-width: 768px) {
            .inline-edit-field {
                font-size: 16px; /* Éviter le zoom sur iOS */
                min-height: 44px; /* Taille de touche recommandée */
            }
            
            .inline-edit-actions {
                position: static;
                margin-top: 8px;
                justify-content: center;
            }
            
            .inline-edit-actions .btn {
                padding: 8px 16px;
                font-size: 14px;
            }
        }
    `;

    document.head.appendChild(style);
}

// Exposer l'API globalement
window.InlineEditor = InlineEditor;
window.inlineEditor = globalInlineEditor;
