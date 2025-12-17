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

    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        checkIfAdmin(user.id);
    }
});

async function checkIfAdmin(userId) {
    try {
        const response = await fetch(`http://localhost:3000/api/admin/check-admin?user_id=${userId}`);
        const data = await response.json();
        
        if (data.success && data.is_admin) {
            addAdminLinkToNav();
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
    }
}

function addAdminLinkToNav() {
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        // Проверяем, нет ли уже ссылки
        if (!navLinks.querySelector('a[href="admin.html"]')) {
            const adminLink = document.createElement('a');
            adminLink.href = 'admin.html';
            adminLink.textContent = 'Admin';
            adminLink.style.color = '#ff6b6b'; // Красный цвет для выделения
            adminLink.style.fontWeight = 'bold';
            
            // Вставляем перед логином
            const loginLink = navLinks.querySelector('a[href="login.html"]');
            if (loginLink) {
                navLinks.insertBefore(adminLink, loginLink);
            } else {
                navLinks.appendChild(adminLink);
            }
        }
    }
}

// Функция для логирования действий
async function logAction(action, details = {}) {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const userId = user ? user.id : null;
        
        const response = await fetch('http://localhost:3000/api/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                user_id: userId, 
                action, 
                details: JSON.stringify(details) 
            })
        });
        
        return await response.json();
    } catch (error) {
        console.error('Error logging action:', error);
        return { success: false };
    }
}

// Добавить в объект window для глобальной доступности
window.logAction = logAction;

