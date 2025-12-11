document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const clearBtn = document.getElementById('clear-chat');
    const saveBtn = document.getElementById('save-chat');
    
    // Load saved messages from localStorage
    loadMessages();
    
    // Send message on button click
    sendBtn.addEventListener('click', sendMessage);
    
    // Send message on Enter key
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Clear chat
    clearBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to clear the chat?')) {
            chatMessages.innerHTML = '<div class="message bot-message"><strong>AI:</strong> Chat cleared. How can I help you?</div>';
            localStorage.removeItem('chatHistory');
        }
    });
    
    // Save chat
    saveBtn.addEventListener('click', function() {
        const chatText = Array.from(chatMessages.children)
            .map(msg => msg.textContent)
            .join('\n');
        
        const blob = new Blob([chatText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'chat-history.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Chat saved successfully!');
    });
    
    function sendMessage() {
        const message = messageInput.value.trim();
        
        if (!message) return;
        
        // Add user message
        addMessage(message, 'user-message', 'You');
        
        // Clear input
        messageInput.value = '';
        
        // Simulate AI response (in real app, this would be an API call)
        setTimeout(() => {
            const responses = [
                "I'm an AI assistant. How can I help you today?",
                "That's interesting! Tell me more.",
                "I understand. Is there anything specific you'd like to know?",
                "Thanks for sharing! I'm here to help with any questions.",
                "Let me think about that... In the meantime, feel free to ask anything else!"
            ];
            
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            addMessage(randomResponse, 'bot-message', 'AI');
        }, 500);
        
        // Save to localStorage
        saveMessages();
    }
    
    function addMessage(text, className, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${className}`;
        messageDiv.innerHTML = `<strong>${sender}:</strong> ${text}`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function saveMessages() {
        const messages = Array.from(chatMessages.children).map(msg => msg.innerHTML);
        localStorage.setItem('chatHistory', JSON.stringify(messages));
    }
    
    function loadMessages() {
        const saved = localStorage.getItem('chatHistory');
        if (saved) {
            const messages = JSON.parse(saved);
            chatMessages.innerHTML = '';
            messages.forEach(msgHTML => {
                const div = document.createElement('div');
                div.innerHTML = msgHTML;
                div.className = msgHTML.includes('You:</strong>') ? 'message user-message' : 'message bot-message';
                chatMessages.appendChild(div);
            });
        }
    }
    
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
});