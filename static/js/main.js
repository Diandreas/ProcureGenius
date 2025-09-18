// ProcureGenius Main JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Auto-hide alerts after 5 seconds
    setTimeout(function() {
        const alerts = document.querySelectorAll('.alert:not(.alert-important)');
        alerts.forEach(function(alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        });
    }, 5000);

    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function(popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // AJAX form submission helper
    window.submitAjaxForm = function(form, successCallback) {
        const formData = new FormData(form);
        const url = form.action;
        
        fetch(url, {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (successCallback) {
                    successCallback(data);
                } else {
                    showAlert('success', data.message || 'Opération réussie');
                }
            } else {
                showAlert('danger', data.error || 'Une erreur est survenue');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('danger', 'Erreur de communication avec le serveur');
        });
    };

    // Show alert helper
    window.showAlert = function(type, message) {
        const alertContainer = document.getElementById('alert-container') || document.querySelector('.container-fluid');
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        alertContainer.insertAdjacentHTML('afterbegin', alertHtml);
        
        // Auto-hide after 5 seconds
        setTimeout(function() {
            const alert = alertContainer.querySelector('.alert');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    };

    // Format currency helper
    window.formatCurrency = function(amount, currency = 'CAD') {
        return new Intl.NumberFormat('fr-CA', {
            style: 'currency',
            currency: currency
        }).format(amount);
    };

    // Format date helper
    window.formatDate = function(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-CA');
    };

    // Confirm delete helper
    window.confirmDelete = function(message = 'Êtes-vous sûr de vouloir supprimer cet élément ?') {
        return confirm(message);
    };

    // Loading state helper
    window.setLoadingState = function(element, loading = true) {
        if (loading) {
            element.disabled = true;
            const originalText = element.textContent;
            element.dataset.originalText = originalText;
            element.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Chargement...';
        } else {
            element.disabled = false;
            element.textContent = element.dataset.originalText || 'Valider';
        }
    };
});

// AI Chat functionality
class AIChat {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.messagesContainer = this.container.querySelector('.ai-chat-messages');
        this.inputForm = this.container.querySelector('.ai-chat-form');
        this.inputField = this.container.querySelector('.ai-chat-input input');
        this.sendButton = this.container.querySelector('.ai-chat-send');
        
        this.conversationId = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.inputForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        this.inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    sendMessage() {
        const message = this.inputField.value.trim();
        if (!message) return;

        // Add user message to chat
        this.addMessage('user', message);
        
        // Clear input
        this.inputField.value = '';
        
        // Set loading state
        setLoadingState(this.sendButton, true);
        
        // Send to AI
        this.processAIMessage(message);
    }

    addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ${role}`;
        messageDiv.textContent = content;
        
        this.messagesContainer.appendChild(messageDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    processAIMessage(message) {
        fetch('/ai/process-message/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            },
            body: JSON.stringify({
                message: message,
                conversation_id: this.conversationId
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                this.conversationId = data.conversation_id;
                this.addMessage('assistant', data.ai_response);
                
                // Handle action results
                if (data.action_result) {
                    this.handleActionResult(data.action_result);
                }
            } else {
                this.addMessage('assistant', 'Désolé, une erreur est survenue.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            this.addMessage('assistant', 'Erreur de communication avec le serveur.');
        })
        .finally(() => {
            setLoadingState(this.sendButton, false);
        });
    }

    handleActionResult(result) {
        if (result.success) {
            showAlert('success', result.message || 'Action exécutée avec succès');
            
            // Refresh page if needed
            if (result.refresh) {
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
        } else if (result.requires_approval) {
            showAlert('warning', 'Cette action nécessite une approbation manuelle.');
        } else {
            showAlert('danger', result.error || 'Erreur lors de l\'exécution de l\'action');
        }
    }
}

// Initialize AI Chat if container exists
document.addEventListener('DOMContentLoaded', function() {
    const aiChatContainer = document.getElementById('ai-chat-container');
    if (aiChatContainer) {
        window.aiChat = new AIChat('ai-chat-container');
    }
});

// Data tables initialization
document.addEventListener('DOMContentLoaded', function() {
    // Simple table sorting
    const sortableTables = document.querySelectorAll('.table-sortable');
    sortableTables.forEach(table => {
        const headers = table.querySelectorAll('th[data-sort]');
        headers.forEach(header => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                sortTable(table, header.dataset.sort);
            });
        });
    });
});

function sortTable(table, column) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const columnIndex = Array.from(table.querySelectorAll('th')).findIndex(th => th.dataset.sort === column);
    
    const isAscending = table.dataset.sortOrder !== 'asc';
    table.dataset.sortOrder = isAscending ? 'asc' : 'desc';
    
    rows.sort((a, b) => {
        const aValue = a.cells[columnIndex].textContent.trim();
        const bValue = b.cells[columnIndex].textContent.trim();
        
        if (isAscending) {
            return aValue.localeCompare(bValue);
        } else {
            return bValue.localeCompare(aValue);
        }
    });
    
    rows.forEach(row => tbody.appendChild(row));
}