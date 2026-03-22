/**
 * Enhanced Search Functionality
 * Automatically submits search forms when the user types 3 or more characters.
 * Supports input names 'search' and 'q'.
 */
document.addEventListener('DOMContentLoaded', function() {
    const searchForms = document.querySelectorAll('form');
    
    searchForms.forEach(form => {
        if (form.method.toLowerCase() !== 'get') return;
        
        // Find search input (commonly named 'search' or 'q')
        const searchInput = form.querySelector('input[name="search"]') || form.querySelector('input[name="q"]');
        if (!searchInput) return;

        // Create a status indicator
        let statusDiv = form.querySelector('.search-status');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.className = 'search-status small text-muted mt-1';
            statusDiv.style.minHeight = '1.5em';
            statusDiv.style.display = 'none'; // Hidden by default
            searchInput.parentNode.appendChild(statusDiv);
        }

        let timeout = null;
        
        searchInput.addEventListener('input', function() {
            const val = this.value.trim();
            
            // Clear existing timeout
            if (timeout) clearTimeout(timeout);
            
            // Logic:
            // 1. Empty: Submit to clear filters (delay 300ms)
            // 2. Length >= 3: Submit to search (delay 600ms)
            // 3. Length < 3: Show "Type more..." message
            
            if (val.length === 0) {
                statusDiv.textContent = '';
                statusDiv.style.display = 'none';
                timeout = setTimeout(() => {
                    form.submit();
                }, 300);
            } else if (val.length >= 3) {
                statusDiv.textContent = 'Recherche en cours...';
                statusDiv.style.display = 'block';
                timeout = setTimeout(() => {
                    form.submit();
                }, 600);
            } else {
                statusDiv.textContent = 'Saisissez au moins 3 caractères...';
                statusDiv.style.display = 'block';
                // Do not submit until 3 chars or empty
            }
        });
        
        // Ensure the search input is focused if there's an active search
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('search') || urlParams.has('q')) {
            // Optional: Move cursor to end of input
            const len = searchInput.value.length;
            if (len > 0) {
                searchInput.setSelectionRange(len, len);
                // Only focus if it's not a pagination click or something
                // searchInput.focus();
            }
        }
    });
});
