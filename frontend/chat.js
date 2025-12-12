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
    
    let currentCharacter = null;
    let userCharacters = [];
    
    // Загружаем пользователя и персонажей
    loadUserAndCharacters();
    
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
        const selectedId = this.value;
        currentCharacter = userCharacters.find(c => c.id == selectedId);
        if (currentCharacter) {
            addMessage(`Switched to character: ${currentCharacter.name}`, 'system-message', 'System');
        }
    });
    
    editCharacterBtn.addEventListener('click', function() {
        if (currentCharacter) {
            editCharacter(currentCharacter.id);
        } else {
            alert('Please select a character first');
        }
    });
    
    // Character form submission
    if (characterForm) {
        characterForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await saveCharacter();
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
    async function loadUserAndCharacters() {
        const user = JSON.parse(localStorage.getItem('user'));
        
        if (!user) {
            alert('Please login first');
            window.location.href = 'login.html';
            return;
        }
        
        // Добавляем имя пользователя в навигацию
        addUsernameToNav(user.username);
        
        // Загружаем персонажей пользователя
        try {
            const response = await fetch(`http://localhost:3000/api/characters?user_id=${user.id}`);
            const data = await response.json();
            
            if (data.success) {
                userCharacters = data.characters;
                populateCharacterSelect(userCharacters);
                
                // Проверяем, есть ли персонаж в URL
                const urlParams = new URLSearchParams(window.location.search);
                const characterParam = urlParams.get('character');
                
                if (characterParam) {
                    const character = userCharacters.find(c => c.id == characterParam);
                    if (character) {
                        characterSelect.value = character.id;
                        currentCharacter = character;
                        addMessage(`Welcome! You are chatting with ${character.name}`, 'system-message', 'System');
                    }
                } else if (userCharacters.length > 0) {
                    // Выбираем первого персонажа по умолчанию
                    characterSelect.value = userCharacters[0].id;
                    currentCharacter = userCharacters[0];
                }
            }
        } catch (error) {
            console.error('Error loading characters:', error);
        }
    }
    
    function populateCharacterSelect(characters) {
        if (!characterSelect) return;
        
        characterSelect.innerHTML = '';
        
        if (characters.length === 0) {
            characterSelect.innerHTML = '<option value="">No characters available</option>';
            return;
        }
        
        characters.forEach(character => {
            const option = document.createElement('option');
            option.value = character.id;
            option.textContent = character.name;
            characterSelect.appendChild(option);
        });
    }
    
    function addUsernameToNav(username) {
        const navLinks = document.querySelector('.nav-links');
        if (navLinks && username) {
            const userSpan = document.createElement('span');
            userSpan.className = 'username-display';
            userSpan.innerHTML = `👤 ${username}`;
            userSpan.style.marginLeft = '20px';
            userSpan.style.color = '#d49a6a';
            userSpan.style.fontWeight = 'bold';
            
            // Вставляем перед ссылкой Login
            const loginLink = navLinks.querySelector('a[href="login.html"]');
            if (loginLink) {
                navLinks.insertBefore(userSpan, loginLink);
            }
        }
    }
    
    async function editCharacter(characterId) {
        try {
            const response = await fetch(`http://localhost:3000/api/characters/${characterId}`);
            const data = await response.json();
            
            if (data.success) {
                // Заполняем форму данными персонажа
                document.getElementById('character-name').value = data.character.name || '';
                document.getElementById('character-role').value = data.character.role || '';
                document.getElementById('character-prompt').value = data.character.prompt || '';
                
                characterModal.style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading character:', error);
            alert('Error loading character data');
        }
    }
    
    async function saveCharacter() {
        if (!currentCharacter) {
            alert('No character selected');
            return;
        }
        
        const name = document.getElementById('character-name').value.trim();
        const role = document.getElementById('character-role').value.trim();
        const prompt = document.getElementById('character-prompt').value.trim();
        
        if (!name || !role || !prompt) {
            alert('Please fill in all fields');
            return;
        }
        
        try {
            const response = await fetch(`http://localhost:3000/api/characters/${currentCharacter.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    role,
                    description: currentCharacter.description,
                    prompt,
                    examples: ''
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Character updated successfully!');
                characterModal.style.display = 'none';
                loadUserAndCharacters(); // Перезагружаем данные
            } else {
                alert('Error: ' + data.message);
            }
        } catch (error) {
            console.error('Error saving character:', error);
            alert('Server error. Please try again.');
        }
    }
    
    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;
        
        addMessage(message, 'user-message', 'You');
        messageInput.value = '';
        
        // Simulate AI response
        setTimeout(() => {
            const response = generateAIResponse(message, currentCharacter);
            addMessage(response, 'bot-message', currentCharacter ? currentCharacter.name : 'AI');
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
            ]
        };
        
        if (character && character.prompt) {
            return `[As ${character.name}]: ${character.prompt.split('\n')[0] || "I'm here to assist you!"}`;
        }
        
        const charResponses = responses['default'];
        return charResponses[Math.floor(Math.random() * charResponses.length)];
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
            const charName = currentCharacter ? currentCharacter.name : 'AI Assistant';
            addMessage(`New chat started with ${charName}!`, 'system-message', 'System');
            addMessage(`Hello! I'm your ${charName}. How can I help you?`, 'bot-message', charName);
        }
    }
});