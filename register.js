document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registration-form');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            // Basic validation
            if (!username || !email || !password || !confirmPassword) {
                showMessage('Please fill in all fields', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showMessage('Passwords do not match', 'error');
                return;
            }
            
            if (password.length < 6) {
                showMessage('Password must be at least 6 characters', 'error');
                return;
            }
            
            // Simulate registration
            showMessage('Registration successful! Redirecting to login...', 'success');
            
            // Save to localStorage (simulated database)
            const userData = {
                username,
                email,
                password // In real app, this should be hashed
            };
            
            localStorage.setItem('user_' + email, JSON.stringify(userData));
            localStorage.setItem('currentUser', email);
            
            // Redirect after delay
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        });
    }
    
    function showMessage(message, type) {
        // Remove existing messages
        const existingMsg = document.querySelector('.form-message');
        if (existingMsg) {
            existingMsg.remove();
        }
        
        // Create message element
        const msgElement = document.createElement('div');
        msgElement.className = `form-message ${type}`;
        msgElement.textContent = message;
        msgElement.setAttribute('role', 'alert');
        
        // Insert after form
        const form = document.getElementById('registration-form');
        form.parentNode.insertBefore(msgElement, form.nextSibling);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (msgElement.parentNode) {
                msgElement.remove();
            }
        }, 5000);
    }
});