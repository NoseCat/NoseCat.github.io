// Common functionality for all pages
document.addEventListener('DOMContentLoaded', function() {
    // Check for saved accessibility mode
    const savedMode = sessionStorage.getItem('accessibleMode');
    if (savedMode === 'true') {
        document.body.classList.add('accessible-mode');
        const btn = document.getElementById('accessibility-toggle');
        if (btn) {
            btn.textContent = 'Normal Mode';
            btn.title = 'Switch to normal mode';
        }
    }
    
    // Accessibility toggle
    const accessibilityBtn = document.getElementById('accessibility-toggle');
    
    if (accessibilityBtn) {
        accessibilityBtn.addEventListener('click', function() {
            const isNowAccessible = !document.body.classList.contains('accessible-mode');
            
            if (isNowAccessible) {
                document.body.classList.add('accessible-mode');
                this.textContent = 'Normal Mode';
                this.title = 'Switch to normal mode';
            } else {
                document.body.classList.remove('accessible-mode');
                this.textContent = 'Accessible Mode';
                this.title = 'Switch to accessible mode';
            }
            
            // Save state
            sessionStorage.setItem('accessibleMode', isNowAccessible);
        });
    }
    
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('active');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!mobileMenuBtn.contains(event.target) && !navLinks.contains(event.target)) {
                navLinks.classList.remove('active');
            }
        });
    }
});