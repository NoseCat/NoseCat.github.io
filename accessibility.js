document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('accessibilityToggle');
    const html = document.documentElement;
    
    // Check for saved preference
    const savedMode = getCookie('accessibilityMode');
    if (savedMode === 'enabled') {
        enableAccessibility();
    }
    
    // Toggle accessibility mode
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            if (html.classList.contains('accessibility-mode')) {
                disableAccessibility();
            } else {
                enableAccessibility();
            }
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl+Alt+A to toggle accessibility
        if (e.ctrlKey && e.altKey && e.key === 'a') {
            e.preventDefault();
            toggleBtn?.click();
        }
        
        // Increase font size: Ctrl+Plus
        if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            increaseFontSize();
        }
        
        // Decrease font size: Ctrl+Minus
        if (e.ctrlKey && e.key === '-') {
            e.preventDefault();
            decreaseFontSize();
        }
        
        // Reset font size: Ctrl+0
        if (e.ctrlKey && e.key === '0') {
            e.preventDefault();
            resetFontSize();
        }
    });
    
    // Focus indicators for keyboard navigation
    document.addEventListener('keyup', function(e) {
        if (e.key === 'Tab') {
            document.body.classList.add('keyboard-navigation');
        }
    });
    
    document.addEventListener('click', function(e) {
        if (e.type === 'mousedown' || e.type === 'touchstart') {
            document.body.classList.remove('keyboard-navigation');
        }
    });
    
    function enableAccessibility() {
        html.classList.add('accessibility-mode');
        toggleBtn.textContent = 'A-';
        setCookie('accessibilityMode', 'enabled', 30);
        
        // Announce to screen readers
        announceToScreenReader('Accessibility mode enabled');
    }
    
    function disableAccessibility() {
        html.classList.remove('accessibility-mode');
        toggleBtn.textContent = 'A+';
        setCookie('accessibilityMode', 'disabled', 30);
        announceToScreenReader('Accessibility mode disabled');
    }
    
    function increaseFontSize() {
        const currentSize = parseFloat(getComputedStyle(html).fontSize);
        html.style.fontSize = (currentSize + 1) + 'px';
    }
    
    function decreaseFontSize() {
        const currentSize = parseFloat(getComputedStyle(html).fontSize);
        html.style.fontSize = (currentSize - 1) + 'px';
    }
    
    function resetFontSize() {
        html.style.fontSize = '';
    }
    
    function announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            announcement.remove();
        }, 1000);
    }
    
    function setCookie(name, value, days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
    }
    
    function getCookie(name) {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [key, value] = cookie.trim().split('=');
            if (key === name) return value;
        }
        return null;
    }
    
    // Create SR-only class if not exists
    if (!document.querySelector('style#sr-only')) {
        const style = document.createElement('style');
        style.id = 'sr-only';
        style.textContent = `
            .sr-only {
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border: 0;
            }
        `;
        document.head.appendChild(style);
    }
});