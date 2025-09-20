/* ====================================
   📝 SYSTÈME DE FORMULAIRES AVANCÉS
   ====================================*/

class ModernForm {
    constructor(formElement, options = {}) {
        this.form = formElement;
        this.options = {
            realTimeValidation: true,
            autoSave: true,
            progressIndicator: true,
            autocomplete: true,
            dragDrop: true,
            ...options
        };

        this.init();
    }

    init() {
        this.setupFormEnhancements();
        if (this.options.realTimeValidation) this.setupRealTimeValidation();
        if (this.options.autoSave) this.setupAutoSave();
        if (this.options.progressIndicator) this.setupProgressIndicator();
        if (this.options.autocomplete) this.setupAutocomplete();
        if (this.options.dragDrop) this.setupDragDrop();
    }

    setupFormEnhancements() {
        // Améliorer les champs de formulaire
        this.form.querySelectorAll('.form-control, .form-select').forEach(field => {
            this.enhanceField(field);
        });

        // Gérer la soumission du formulaire
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    enhanceField(field) {
        const wrapper = field.closest('.form-group') || field.parentElement;

        // Ajouter des animations de focus
        field.addEventListener('focus', () => {
            wrapper.classList.add('form-group-focused');
            this.addFloatingLabel(field);
        });

        field.addEventListener('blur', () => {
            wrapper.classList.remove('form-group-focused');
            this.removeFloatingLabel(field);
        });

        // Ajouter des icônes contextuelles
        this.addFieldIcon(field);
    }

    addFloatingLabel(field) {
        const label = field.previousElementSibling;
        if (label && label.tagName === 'LABEL') {
            label.classList.add('floating-active');
        }
    }

    removeFloatingLabel(field) {
        const label = field.previousElementSibling;
        if (label && label.tagName === 'LABEL' && !field.value) {
            label.classList.remove('floating-active');
        }
    }

    addFieldIcon(field) {
        const wrapper = field.closest('.form-group');
        if (!wrapper || wrapper.querySelector('.field-icon')) return;

        const iconMap = {
            'email': 'bi-envelope',
            'tel': 'bi-telephone',
            'url': 'bi-link-45deg',
            'password': 'bi-lock',
            'search': 'bi-search',
            'date': 'bi-calendar',
            'number': 'bi-123'
        };

        const fieldType = field.type || field.tagName.toLowerCase();
        const iconClass = iconMap[fieldType];

        if (iconClass) {
            const icon = document.createElement('i');
            icon.className = `bi ${iconClass} field-icon`;
            wrapper.style.position = 'relative';
            wrapper.appendChild(icon);
        }
    }

    setupRealTimeValidation() {
        this.form.querySelectorAll('.form-control, .form-select').forEach(field => {
            field.addEventListener('blur', () => this.validateField(field));
            field.addEventListener('input', () => this.debounceValidation(field));
        });
    }

    validateField(field) {
        const value = field.value.trim();
        const fieldName = field.name;
        const wrapper = field.closest('.form-group');

        // Nettoyer les messages d'erreur précédents
        this.clearFieldErrors(wrapper);

        // Validation basique
        const validationResult = this.performValidation(field, value);

        if (validationResult.isValid) {
            this.showFieldSuccess(wrapper, field);
        } else {
            this.showFieldError(wrapper, field, validationResult.message);
        }

        // Validation AJAX pour les champs spécifiques
        if (['email', 'business_number', 'sku'].includes(fieldName)) {
            this.validateFieldAjax(field, value);
        }

        return validationResult.isValid;
    }

    performValidation(field, value) {
        const rules = this.getValidationRules(field);

        for (const rule of rules) {
            if (!rule.test(value)) {
                return { isValid: false, message: rule.message };
            }
        }

        return { isValid: true };
    }

    getValidationRules(field) {
        const rules = [];
        const type = field.type;
        const required = field.required;

        // Règle de base : requis
        if (required) {
            rules.push({
                test: (value) => value.length > 0,
                message: 'Ce champ est requis'
            });
        }

        // Règles spécifiques par type
        switch (type) {
            case 'email':
                rules.push({
                    test: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
                    message: 'Format d\'email invalide'
                });
                break;

            case 'tel':
                rules.push({
                    test: (value) => !value || /^[\d\s\-\+\(\)]+$/.test(value),
                    message: 'Numéro de téléphone invalide'
                });
                break;

            case 'url':
                rules.push({
                    test: (value) => !value || /^https?:\/\/.+/.test(value),
                    message: 'URL invalide (doit commencer par http:// ou https://)'
                });
                break;

            case 'number':
                const min = field.min ? parseFloat(field.min) : null;
                const max = field.max ? parseFloat(field.max) : null;

                if (min !== null) {
                    rules.push({
                        test: (value) => !value || parseFloat(value) >= min,
                        message: `La valeur doit être supérieure ou égale à ${min}`
                    });
                }

                if (max !== null) {
                    rules.push({
                        test: (value) => !value || parseFloat(value) <= max,
                        message: `La valeur doit être inférieure ou égale à ${max}`
                    });
                }
                break;
        }

        // Règles personnalisées par nom de champ
        const customRules = this.getCustomValidationRules(field.name);
        rules.push(...customRules);

        return rules;
    }

    getCustomValidationRules(fieldName) {
        const customRules = {
            business_number: [{
                test: (value) => !value || /^\d{9}$|^\d{15}$/.test(value.replace(/\s/g, '')),
                message: 'Numéro d\'entreprise invalide (9 ou 15 chiffres)'
            }],
            postal_code: [{
                test: (value) => !value || /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/.test(value),
                message: 'Code postal canadien invalide (format: A1A 1A1)'
            }],
            sku: [{
                test: (value) => !value || /^[A-Z0-9\-]{3,20}$/.test(value),
                message: 'SKU invalide (3-20 caractères, lettres majuscules, chiffres et tirets)'
            }]
        };

        return customRules[fieldName] || [];
    }

    validateFieldAjax(field, value) {
        if (!value) return;

        const formData = new FormData();
        formData.append('field', field.name);
        formData.append('value', value);
        formData.append('csrfmiddlewaretoken', this.getCSRFToken());

        fetch('/ajax/validate-field/', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                const wrapper = field.closest('.form-group');
                if (data.valid) {
                    this.showFieldSuccess(wrapper, field);
                } else {
                    this.showFieldError(wrapper, field, data.message);
                }
            })
            .catch(error => console.error('Erreur de validation AJAX:', error));
    }

    showFieldSuccess(wrapper, field) {
        field.classList.remove('is-invalid');
        field.classList.add('is-valid');

        // Ajouter une icône de succès
        this.addFieldStatusIcon(wrapper, 'success');
    }

    showFieldError(wrapper, field, message) {
        field.classList.remove('is-valid');
        field.classList.add('is-invalid');

        // Créer ou mettre à jour le message d'erreur
        let errorDiv = wrapper.querySelector('.invalid-feedback');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'invalid-feedback';
            wrapper.appendChild(errorDiv);
        }
        errorDiv.textContent = message;

        // Ajouter une icône d'erreur
        this.addFieldStatusIcon(wrapper, 'error');
    }

    addFieldStatusIcon(wrapper, status) {
        // Supprimer l'ancienne icône
        const oldIcon = wrapper.querySelector('.field-status-icon');
        if (oldIcon) oldIcon.remove();

        const icon = document.createElement('i');
        icon.className = `bi field-status-icon ${status === 'success' ? 'bi-check-circle text-success' : 'bi-x-circle text-danger'}`;
        wrapper.appendChild(icon);
    }

    clearFieldErrors(wrapper) {
        const field = wrapper.querySelector('.form-control, .form-select');
        const errorDiv = wrapper.querySelector('.invalid-feedback');
        const statusIcon = wrapper.querySelector('.field-status-icon');

        if (field) {
            field.classList.remove('is-valid', 'is-invalid');
        }
        if (errorDiv) errorDiv.remove();
        if (statusIcon) statusIcon.remove();
    }

    debounceValidation(field) {
        clearTimeout(this.validationTimeout);
        this.validationTimeout = setTimeout(() => {
            this.validateField(field);
        }, 500);
    }

    setupAutoSave() {
        let autoSaveTimeout;

        this.form.addEventListener('input', () => {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(() => {
                this.autoSaveForm();
            }, 2000);
        });
    }

    autoSaveForm() {
        const formData = new FormData(this.form);
        formData.append('auto_save', 'true');
        formData.append('csrfmiddlewaretoken', this.getCSRFToken());

        fetch(this.form.action || window.location.href, {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.showAutoSaveStatus('Brouillon sauvegardé automatiquement', 'success');
                }
            })
            .catch(error => {
                this.showAutoSaveStatus('Erreur de sauvegarde automatique', 'error');
            });
    }

    showAutoSaveStatus(message, type) {
        let statusDiv = document.querySelector('.auto-save-status');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.className = 'auto-save-status';
            this.form.insertBefore(statusDiv, this.form.firstChild);
        }

        statusDiv.className = `auto-save-status alert alert-${type === 'success' ? 'success' : 'warning'} fade-in`;
        statusDiv.innerHTML = `
            <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
            ${message}
        `;

        setTimeout(() => {
            statusDiv.classList.add('fade-out');
            setTimeout(() => statusDiv.remove(), 300);
        }, 3000);
    }

    setupProgressIndicator() {
        const fieldsets = this.form.querySelectorAll('fieldset');
        if (fieldsets.length <= 1) return;

        // Créer l'indicateur de progression
        const progressContainer = document.createElement('div');
        progressContainer.className = 'form-progress-container';
        progressContainer.innerHTML = `
            <div class="form-progress-bar">
                <div class="form-progress-fill" style="width: 0%"></div>
            </div>
            <div class="form-progress-text">
                <span class="current-step">1</span> / <span class="total-steps">${fieldsets.length}</span>
                - <span class="step-name">${fieldsets[0].querySelector('legend')?.textContent || 'Étape 1'}</span>
            </div>
        `;

        this.form.insertBefore(progressContainer, this.form.firstChild);
        this.updateProgress();
    }

    updateProgress() {
        const fieldsets = this.form.querySelectorAll('fieldset');
        const progressFill = this.form.querySelector('.form-progress-fill');
        const currentStepSpan = this.form.querySelector('.current-step');
        const stepNameSpan = this.form.querySelector('.step-name');

        if (!progressFill) return;

        let completedFields = 0;
        let totalFields = 0;
        let currentStep = 1;

        fieldsets.forEach((fieldset, index) => {
            const fields = fieldset.querySelectorAll('.form-control[required], .form-select[required]');
            const filledFields = Array.from(fields).filter(field => field.value.trim() !== '').length;

            totalFields += fields.length;
            completedFields += filledFields;

            if (filledFields === fields.length && fields.length > 0) {
                currentStep = Math.min(index + 2, fieldsets.length);
            }
        });

        const progressPercentage = totalFields > 0 ? (completedFields / totalFields) * 100 : 0;
        progressFill.style.width = `${progressPercentage}%`;

        if (currentStepSpan) currentStepSpan.textContent = currentStep;
        if (stepNameSpan) {
            const currentFieldset = fieldsets[currentStep - 1];
            stepNameSpan.textContent = currentFieldset?.querySelector('legend')?.textContent || `Étape ${currentStep}`;
        }
    }

    setupAutocomplete() {
        // Autocomplete pour les fournisseurs
        this.setupFieldAutocomplete('supplier', '/ajax/suppliers/');
        this.setupFieldAutocomplete('client', '/ajax/clients/');
        this.setupFieldAutocomplete('product', '/ajax/products/');

        // Autocomplete pour les adresses
        this.setupAddressAutocomplete();
    }

    setupFieldAutocomplete(fieldName, endpoint) {
        const field = this.form.querySelector(`[name="${fieldName}"]`);
        if (!field || field.tagName === 'SELECT') return;

        const wrapper = field.parentElement;
        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';
        wrapper.appendChild(dropdown);

        let debounceTimeout;

        field.addEventListener('input', () => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                this.fetchAutocompleteData(field, dropdown, endpoint);
            }, 300);
        });

        // Masquer le dropdown quand on clique ailleurs
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }

    fetchAutocompleteData(field, dropdown, endpoint) {
        const query = field.value.trim();
        if (query.length < 2) {
            dropdown.style.display = 'none';
            return;
        }

        fetch(`${endpoint}?q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                this.displayAutocompleteResults(dropdown, data, field);
            })
            .catch(error => console.error('Erreur autocomplete:', error));
    }

    displayAutocompleteResults(dropdown, results, field) {
        if (!results || results.length === 0) {
            dropdown.style.display = 'none';
            return;
        }

        dropdown.innerHTML = results.map(item => `
            <div class="autocomplete-item" data-value="${item.id}" data-text="${item.name}">
                <div class="autocomplete-name">${item.name}</div>
                ${item.subtitle ? `<div class="autocomplete-subtitle">${item.subtitle}</div>` : ''}
            </div>
        `).join('');

        dropdown.style.display = 'block';

        // Gérer les clics sur les éléments
        dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                field.value = item.dataset.text;

                // Si c'est un champ avec ID caché, le mettre à jour
                const hiddenField = this.form.querySelector(`[name="${field.name}_id"]`);
                if (hiddenField) {
                    hiddenField.value = item.dataset.value;
                }

                dropdown.style.display = 'none';

                // Déclencher l'événement change pour les dépendances
                field.dispatchEvent(new Event('change', { bubbles: true }));
            });
        });
    }

    setupAddressAutocomplete() {
        const addressField = this.form.querySelector('[name="address"]');
        if (!addressField) return;

        // Utiliser l'API Google Places ou une alternative canadienne
        if (window.google && window.google.maps) {
            const autocomplete = new google.maps.places.Autocomplete(addressField, {
                componentRestrictions: { country: 'ca' },
                types: ['address']
            });

            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                this.fillAddressFields(place);
            });
        }
    }

    fillAddressFields(place) {
        const components = place.address_components;
        const fieldMap = {
            street_number: 'street_number',
            route: 'route',
            locality: 'city',
            administrative_area_level_1: 'province',
            postal_code: 'postal_code'
        };

        for (const component of components) {
            const type = component.types[0];
            const field = this.form.querySelector(`[name="${fieldMap[type]}"]`);

            if (field) {
                if (type === 'administrative_area_level_1') {
                    // Convertir le nom de province en code
                    field.value = this.getProvinceCode(component.long_name);
                } else {
                    field.value = component.long_name;
                }
            }
        }
    }

    getProvinceCode(provinceName) {
        const provinces = {
            'Alberta': 'AB', 'British Columbia': 'BC', 'Manitoba': 'MB',
            'New Brunswick': 'NB', 'Newfoundland and Labrador': 'NL',
            'Nova Scotia': 'NS', 'Ontario': 'ON', 'Prince Edward Island': 'PE',
            'Quebec': 'QC', 'Saskatchewan': 'SK', 'Northwest Territories': 'NT',
            'Nunavut': 'NU', 'Yukon': 'YT'
        };
        return provinces[provinceName] || provinceName;
    }

    setupDragDrop() {
        const fileInputs = this.form.querySelectorAll('input[type="file"]');

        fileInputs.forEach(input => {
            this.enhanceFileInput(input);
        });
    }

    enhanceFileInput(input) {
        const wrapper = input.closest('.form-group');
        if (!wrapper) return;

        // Créer la zone de drop
        const dropZone = document.createElement('div');
        dropZone.className = 'file-drop-zone';
        dropZone.innerHTML = `
            <div class="drop-zone-content">
                <i class="bi bi-cloud-upload drop-zone-icon"></i>
                <p class="drop-zone-text">
                    Glissez vos fichiers ici ou 
                    <span class="drop-zone-link">cliquez pour parcourir</span>
                </p>
                <small class="drop-zone-hint">Formats acceptés: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG</small>
            </div>
        `;

        // Remplacer l'input par la drop zone
        input.style.display = 'none';
        wrapper.appendChild(dropZone);

        // Événements de drag & drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'));
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'));
        });

        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            this.handleFiles(files, input, dropZone);
        });

        // Clic pour ouvrir le sélecteur
        dropZone.addEventListener('click', () => input.click());

        // Changement de fichier traditionnel
        input.addEventListener('change', () => {
            this.handleFiles(input.files, input, dropZone);
        });
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleFiles(files, input, dropZone) {
        const fileList = Array.from(files);
        const validFiles = fileList.filter(file => this.isValidFile(file));

        if (validFiles.length === 0) {
            this.showFileError('Aucun fichier valide sélectionné');
            return;
        }

        // Mettre à jour l'input (pour un seul fichier)
        if (input.multiple || validFiles.length === 1) {
            this.displaySelectedFiles(validFiles, dropZone);
        } else {
            this.showFileError('Vous ne pouvez sélectionner qu\'un seul fichier');
        }
    }

    isValidFile(file) {
        const validTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png',
            'image/gif'
        ];

        const maxSize = 10 * 1024 * 1024; // 10MB

        return validTypes.includes(file.type) && file.size <= maxSize;
    }

    displaySelectedFiles(files, dropZone) {
        const content = dropZone.querySelector('.drop-zone-content');

        content.innerHTML = `
            <div class="selected-files">
                <h6 class="mb-3"><i class="bi bi-files me-2"></i>Fichiers sélectionnés:</h6>
                ${files.map(file => `
                    <div class="selected-file">
                        <i class="bi bi-file-earmark file-icon"></i>
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">(${this.formatFileSize(file.size)})</span>
                        <button type="button" class="btn-remove-file" data-file="${file.name}">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                `).join('')}
                <button type="button" class="btn btn-outline-primary btn-sm mt-2" onclick="this.parentElement.parentElement.parentElement.querySelector('input[type=file]').click()">
                    <i class="bi bi-plus-circle me-1"></i> Ajouter d'autres fichiers
                </button>
            </div>
        `;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showFileError(message) {
        showErrorToast(message);
    }

    handleSubmit(e) {
        // Validation complète du formulaire avant soumission
        let isValid = true;
        const fields = this.form.querySelectorAll('.form-control[required], .form-select[required]');

        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        if (!isValid) {
            e.preventDefault();
            showErrorToast('Veuillez corriger les erreurs avant de soumettre le formulaire');

            // Faire défiler jusqu'au premier champ invalide
            const firstInvalidField = this.form.querySelector('.is-invalid');
            if (firstInvalidField) {
                firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstInvalidField.focus();
            }
            return false;
        }

        // Afficher l'état de chargement
        const submitButton = this.form.querySelector('button[type="submit"], input[type="submit"]');
        if (submitButton) {
            setLoadingState(submitButton, true);
        }

        return true;
    }

    getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
    }
}

// ====================================
// 🎯 FORMULAIRES MULTI-ÉTAPES
// ====================================

class MultiStepForm extends ModernForm {
    constructor(formElement, options = {}) {
        super(formElement, options);
        this.currentStep = 0;
        this.steps = Array.from(this.form.querySelectorAll('.form-step'));
        this.setupMultiStep();
    }

    setupMultiStep() {
        if (this.steps.length <= 1) return;

        // Créer la navigation
        this.createStepNavigation();

        // Masquer toutes les étapes sauf la première
        this.steps.forEach((step, index) => {
            step.style.display = index === 0 ? 'block' : 'none';
            step.classList.add('form-step');
        });

        // Ajouter les boutons de navigation
        this.addNavigationButtons();
    }

    createStepNavigation() {
        const navigation = document.createElement('div');
        navigation.className = 'multi-step-navigation';
        navigation.innerHTML = `
            <div class="step-indicators">
                ${this.steps.map((step, index) => `
                    <div class="step-indicator ${index === 0 ? 'active' : ''}" data-step="${index}">
                        <div class="step-number">${index + 1}</div>
                        <div class="step-title">${step.dataset.title || `Étape ${index + 1}`}</div>
                    </div>
                `).join('')}
            </div>
            <div class="step-progress">
                <div class="step-progress-bar" style="width: ${(1 / this.steps.length) * 100}%"></div>
            </div>
        `;

        this.form.insertBefore(navigation, this.form.firstChild);
    }

    addNavigationButtons() {
        this.steps.forEach((step, index) => {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'step-navigation-buttons';

            let buttons = '';

            if (index > 0) {
                buttons += '<button type="button" class="btn btn-outline-secondary me-2 btn-prev">Précédent</button>';
            }

            if (index < this.steps.length - 1) {
                buttons += '<button type="button" class="btn btn-primary btn-next">Suivant</button>';
            } else {
                buttons += '<button type="submit" class="btn btn-primary">Terminer</button>';
            }

            buttonContainer.innerHTML = buttons;
            step.appendChild(buttonContainer);

            // Événements
            const prevBtn = buttonContainer.querySelector('.btn-prev');
            const nextBtn = buttonContainer.querySelector('.btn-next');

            if (prevBtn) {
                prevBtn.addEventListener('click', () => this.previousStep());
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', () => this.nextStep());
            }
        });
    }

    nextStep() {
        if (!this.validateCurrentStep()) return;

        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.showStep(this.currentStep);
        }
    }

    previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.showStep(this.currentStep);
        }
    }

    showStep(stepIndex) {
        // Masquer toutes les étapes
        this.steps.forEach(step => step.style.display = 'none');

        // Afficher l'étape actuelle
        this.steps[stepIndex].style.display = 'block';

        // Mettre à jour les indicateurs
        this.updateStepIndicators();

        // Mettre à jour la barre de progression
        this.updateStepProgress();

        // Faire défiler vers le haut
        this.form.scrollIntoView({ behavior: 'smooth' });
    }

    updateStepIndicators() {
        const indicators = this.form.querySelectorAll('.step-indicator');
        indicators.forEach((indicator, index) => {
            indicator.classList.remove('active', 'completed');

            if (index < this.currentStep) {
                indicator.classList.add('completed');
            } else if (index === this.currentStep) {
                indicator.classList.add('active');
            }
        });
    }

    updateStepProgress() {
        const progressBar = this.form.querySelector('.step-progress-bar');
        if (progressBar) {
            const progress = ((this.currentStep + 1) / this.steps.length) * 100;
            progressBar.style.width = `${progress}%`;
        }
    }

    validateCurrentStep() {
        const currentStepElement = this.steps[this.currentStep];
        const fields = currentStepElement.querySelectorAll('.form-control[required], .form-select[required]');

        let isValid = true;
        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        return isValid;
    }
}

// ====================================
// 🚀 INITIALISATION AUTOMATIQUE
// ====================================

document.addEventListener('DOMContentLoaded', function () {
    // Initialiser les formulaires simples
    document.querySelectorAll('form:not(.multi-step-form)').forEach(form => {
        if (!form.classList.contains('no-enhancement')) {
            new ModernForm(form);
        }
    });

    // Initialiser les formulaires multi-étapes
    document.querySelectorAll('.multi-step-form').forEach(form => {
        new MultiStepForm(form);
    });

    // Gérer les dépendances entre champs
    setupFieldDependencies();
});

// ====================================
// 🔗 DÉPENDANCES ENTRE CHAMPS
// ====================================

function setupFieldDependencies() {
    // Supplier -> Products
    document.querySelectorAll('[name="supplier"]').forEach(supplierField => {
        supplierField.addEventListener('change', () => {
            updateDependentField('product', 'supplier_id', supplierField.value);
        });
    });

    // Category -> Products
    document.querySelectorAll('[name="category"]').forEach(categoryField => {
        categoryField.addEventListener('change', () => {
            updateDependentField('product', 'category_id', categoryField.value);
        });
    });

    // Product -> Price
    document.querySelectorAll('[name="product"]').forEach(productField => {
        productField.addEventListener('change', () => {
            updateProductPrice(productField);
        });
    });
}

function updateDependentField(targetFieldName, paramName, paramValue) {
    const targetField = document.querySelector(`[name="${targetFieldName}"]`);
    if (!targetField || targetField.tagName !== 'SELECT') return;

    const url = `/ajax/${targetFieldName.replace('_', '-')}/?${paramName}=${paramValue}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            // Nettoyer les options existantes
            Array.from(targetField.options).forEach((option, index) => {
                if (index > 0) option.remove();
            });

            // Ajouter les nouvelles options
            data.forEach(item => {
                const option = new Option(item.name, item.id);
                targetField.add(option);
            });
        })
        .catch(error => console.error('Erreur lors de la mise à jour du champ dépendant:', error));
}

function updateProductPrice(productField) {
    const productId = productField.value;
    if (!productId) return;

    const priceField = document.querySelector('[name="unit_price"]');
    if (!priceField) return;

    fetch(`/ajax/product-price/?product_id=${productId}`)
        .then(response => response.json())
        .then(data => {
            if (data.price) {
                priceField.value = data.price;
                priceField.dispatchEvent(new Event('input', { bubbles: true }));
            }
        })
        .catch(error => console.error('Erreur lors de la récupération du prix:', error));
}

// Fonctions utilitaires exposées globalement
window.ModernForm = ModernForm;
window.MultiStepForm = MultiStepForm;
