document.addEventListener('DOMContentLoaded', function() {
    // Chat elements
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const clearBtn = document.getElementById('clear-chat');
    const newChatBtn = document.getElementById('new-chat');
    const characterSelect = document.getElementById('character-select');
    const currentCharacterSpan = document.getElementById('current-character');
    const testApiBtn = document.getElementById('test-api');
    const apiStatus = document.getElementById('api-status');
    
    // Character system prompts
    const characterPrompts = {
        default: "You are a helpful AI assistant. Be polite, concise, and accurate in your responses.",
        creative: "You are a creative writer. Be imaginative, descriptive, and focus on storytelling.",
        custom: "You are a custom AI character. Adapt to the user's needs."
    };
    
    // Current character
    let currentCharacter = 'default';
    let currentSystemPrompt = characterPrompts.default;
    
    // Update character when selected
    characterSelect.addEventListener('change', function(e) {
        currentCharacter = e.target.value;
        currentSystemPrompt = characterPrompts[currentCharacter] || characterPrompts.default;
        currentCharacterSpan.textContent = characterSelect.options[characterSelect.selectedIndex].text;
        
        // Add system message to chat
        addSystemMessage(`Switched to: ${characterSelect.options[characterSelect.selectedIndex].text}`);
    });
    
    // Send message
    sendBtn.addEventListener('click', sendMessage);
    
    // Send on Enter (Ctrl+Enter for new line)
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Clear chat
    clearBtn.addEventListener('click', function() {
        if (confirm('Clear all messages?')) {
            chatMessages.innerHTML = `
                <div class="message system-message">
                    Chat cleared. Current character: <strong>${currentCharacterSpan.textContent}</strong>
                </div>
                <div class="message bot-message">
                    <strong>AI:</strong> Hello! I'm ready to chat. How can I help you?
                </div>
            `;
        }
    });
    
    // New chat
    newChatBtn.addEventListener('click', function() {
        if (confirm('Start new chat with current character?')) {
            chatMessages.innerHTML = `
                <div class="message system-message">
                    New chat started with: <strong>${currentCharacterSpan.textContent}</strong>
                </div>
                <div class="message bot-message">
                    <strong>AI:</strong> Hello! Let's start a new conversation.
                </div>
            `;
        }
    });
    
    // Test API connection
    testApiBtn.addEventListener('click', function() {
        apiStatus.textContent = 'API: Testing connection...';
        apiStatus.style.color = '#ff9800';
        
        // Simulate API test (replace with actual API call later)
        setTimeout(() => {
            apiStatus.textContent = 'API: Connected (simulated)';
            apiStatus.style.color = '#4CAF50';
            
            // Simulated Mistral API response format
            const mockResponse = {
                model: 'mistral-tiny',
                created: new Date().toISOString(),
                usage: { prompt_tokens: 10, completion_tokens: 20 },
                message: 'API connection successful (simulated)'
            };
            
            addSystemMessage(`API Test: ${JSON.stringify(mockResponse, null, 2)}`);
        }, 1000);
    });
    
    // Auto-resize textarea
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    // Main send function
    function sendMessage() {
        const message = messageInput.value.trim();
        
        if (!message) return;
        
        // Add user message
        addMessage(message, 'user-message', 'You');
        
        // Clear and reset input
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        // Simulate AI processing
        showTypingIndicator();
        
        // Simulate Mistral API call (replace with actual API later)
        setTimeout(() => {
            removeTypingIndicator();
            simulateMistralResponse(message);
        }, 1000 + Math.random() * 1000);
    }
    
    // Add message to chat
    function addMessage(text, className, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${className}`;
        messageDiv.innerHTML = sender ? `<strong>${sender}:</strong> ${text}` : text;
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }
    
    // Add system message
    function addSystemMessage(text) {
        addMessage(text, 'system-message', 'System');
    }
    
    // Simulate Mistral API response
    function simulateMistralResponse(userMessage) {
        const responses = [
            `Based on your character settings (${currentCharacter}), I understand you said: "${userMessage}"`,
            `I'm responding as your ${currentCharacter} character. That's an interesting point about "${userMessage.substring(0, 20)}..."`,
            `[Mistral AI response simulation] I've processed your message with the current system prompt.`,
            `As your AI assistant (${currentCharacter}), I'd like to help you with that.`,
            `Character: ${currentCharacter}. Prompt applied. Response generated.`
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        addMessage(randomResponse, 'bot-message', 'AI');
    }
    
    // Typing indicator
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'message bot-message typing';
        typingDiv.innerHTML = '<strong>AI:</strong> <span class="typing-dots">...</span>';
        chatMessages.appendChild(typingDiv);
        scrollToBottom();
    }
    
    function removeTypingIndicator() {
        const typing = document.getElementById('typing-indicator');
        if (typing) typing.remove();
    }
    
    // Scroll to bottom
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Initialize
    currentCharacterSpan.textContent = characterSelect.options[characterSelect.selectedIndex].text;
});