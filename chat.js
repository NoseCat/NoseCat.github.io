// Chat functionality with character system
document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const clearBtn = document.getElementById('clear-chat');
    const newChatBtn = document.getElementById('new-chat');
    const characterSelect = document.getElementById('character-select');
    const editCharacterBtn = document.getElementById('edit-character-btn');
    const characterModal = document.getElementById('character-modal');
    const characterForm = document.getElementById('character-form');
    
    let currentCharacter = 'default';
    
    // Event Listeners
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    clearBtn.addEventListener('click', clearChat);
    newChatBtn.addEventListener('click', startNewChat);
    
    characterSelect.addEventListener('change', function() {
        currentCharacter = this.value;
        addMessage(`Switched to character: ${getCharacterName(currentCharacter)}`, 'system-message', 'System');
    });
    
    editCharacterBtn.addEventListener('click', function() {
        characterModal.style.display = 'block';
    });
    
    // Character form submission
    if (characterForm) {
        characterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            characterModal.style.display = 'none';
            alert('Character saved! (In production, this would save to database)');
        });
    }
    
    // Close modal
    document.getElementById('close-modal')?.addEventListener('click', function() {
        characterModal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === characterModal) {
            characterModal.style.display = 'none';
        }
    });
    
    // Functions
    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;
        
        addMessage(message, 'user-message', 'You');
        messageInput.value = '';
        
        // Simulate AI response
        setTimeout(() => {
            const response = generateAIResponse(message, currentCharacter);
            addMessage(response, 'bot-message', getCharacterName(currentCharacter));
        }, 500);
    }
    
    function generateAIResponse(userMessage, character) {
        const responses = {
            default: [
                "I understand. Could you tell me more about that?",
                "That's interesting! What else would you like to know?",
                "Let me think about that for a moment...",
                "Thanks for sharing that with me!",
                "I'm here to help with anything you need."
            ],
            scientist: [
                "From a scientific perspective, that's quite fascinating.",
                "The data suggests several interesting possibilities here.",
                "Let me analyze that hypothesis for a moment.",
                "Based on current research, I'd suggest...",
                "That raises some interesting empirical questions."
            ],
            philosopher: [
                "That's a profound existential question.",
                "From a philosophical standpoint, we must consider...",
                "Let's contemplate the deeper meaning here.",
                "That touches on some fundamental aspects of human existence.",
                "The ancient philosophers might have said..."
            ],
            comedian: [
                "Why did the chicken cross the road? To get to the other side! But seriously...",
                "That's funny! Here's what I think...",
                "Let me put on my comedy hat for a moment...",
                "As a comedian, I have to say that's hilarious!",
                "Knock knock! Who's there? Actually, let me answer your question..."
            ]
        };
        
        const charResponses = responses[character] || responses.default;
        return charResponses[Math.floor(Math.random() * charResponses.length)];
    }
    
    function getCharacterName(characterId) {
        const names = {
            default: 'AI Assistant',
            scientist: 'Scientist',
            philosopher: 'Philosopher',
            comedian: 'Comedian'
        };
        return names[characterId] || 'AI';
    }
    
    function addMessage(text, className, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${className}`;
        messageDiv.innerHTML = `<strong>${sender}:</strong> ${text}`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function clearChat() {
        if (confirm('Clear all chat messages?')) {
            chatMessages.innerHTML = '';
            addMessage(`Chat cleared. Ready to talk!`, 'system-message', 'System');
        }
    }
    
    function startNewChat() {
        if (confirm('Start a new chat?')) {
            chatMessages.innerHTML = '';
            addMessage(`New chat started with ${getCharacterName(currentCharacter)}!`, 'system-message', 'System');
            addMessage(`Hello! I'm your ${getCharacterName(currentCharacter)}. How can I help you?`, 'bot-message', getCharacterName(currentCharacter));
        }
    }
});