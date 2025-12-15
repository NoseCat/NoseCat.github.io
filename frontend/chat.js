// Chat functionality with Mistral integration
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
    let chatHistory = [];
    let isGenerating = false;
    let mistralAvailable = false;
    
    // Инициализация
    initializeChat();
    
    // Event Listeners
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey && !isGenerating) {
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
            // Очищаем историю при смене персонажа
            chatHistory = [];
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
    async function initializeChat() {
        const user = JSON.parse(localStorage.getItem('user'));
        
        if (!user) {
            alert('Please login first');
            window.location.href = 'login.html';
            return;
        }
        
        // Добавляем имя пользователя в навигацию
        addUsernameToNav(user.username);
        
        // Проверяем доступность Mistral
        await checkMistralStatus();
        
        // Загружаем персонажей пользователя
        await loadUserCharacters(user.id);
        
        // Загружаем историю чата из localStorage
        loadChatHistory();
    }
    
    async function checkMistralStatus() {
        try {
            const response = await fetch('http://localhost:3000/api/mistral/status');
            const data = await response.json();
            
            mistralAvailable = data.success && data.available;
            
            if (mistralAvailable) {
                addStatusMessage('✓ Mistral AI is connected and ready', 'success');
                console.log('Mistral models:', data.models);
            } else {
                addStatusMessage('⚠ Mistral AI is not available. Using fallback mode.', 'warning');
            }
        } catch (error) {
            console.error('Error checking Mistral status:', error);
            addStatusMessage('❌ Cannot connect to Mistral AI server', 'error');
        }
    }
    
    async function loadUserCharacters(userId) {
        try {
            const response = await fetch(`http://localhost:3000/api/characters?user_id=${userId}`);
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
                    addMessage(`Hello! I'm ${currentCharacter.name}. How can I help you?`, 'bot-message', currentCharacter.name);
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
            // Удаляем старое отображение если есть
            const oldDisplay = navLinks.querySelector('.username-display');
            if (oldDisplay) oldDisplay.remove();
            
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
    
    async function sendMessage() {
        if (isGenerating) return;
        
        const message = messageInput.value.trim();
        if (!message) return;
        
        // Очищаем поле ввода
        messageInput.value = '';
        
        // Добавляем сообщение пользователя в чат
        addMessage(message, 'user-message', 'You');
        
        // Сохраняем в историю
        chatHistory.push({ role: 'user', content: message });
        saveChatHistory();
        
        // Показываем индикатор генерации
        const thinkingId = 'thinking-' + Date.now();
        addThinkingIndicator(thinkingId, currentCharacter ? currentCharacter.name : 'AI');
        
        // Настраиваем состояние генерации
        isGenerating = true;
        sendBtn.disabled = true;
        messageInput.disabled = true;
        
        try {
            // Формируем сообщения для отправки
            const messages = [];
            
            // Добавляем системный промпт из персонажа
            if (currentCharacter && currentCharacter.prompt) {
                messages.push({ role: 'system', content: currentCharacter.prompt });
            } else {
                messages.push({ role: 'system', content: 'You are a helpful AI assistant.' });
            }
            
            // Добавляем историю чата (последние 10 сообщений для экономии токенов)
            const recentHistory = chatHistory.slice(-10);
            messages.push(...recentHistory);
            
            // Отправляем запрос к Mistral через наш сервер
            const response = await fetch('http://localhost:3000/api/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messages,
                    character_id: currentCharacter ? currentCharacter.id : null,
                    temperature: 0.7,
                    max_tokens: 500
                })
            });
            
            const data = await response.json();
            
            // Удаляем индикатор генерации
            removeThinkingIndicator(thinkingId);
            
            if (data.success) {
                // Добавляем ответ в чат
                addMessage(data.response, 'bot-message', currentCharacter ? currentCharacter.name : 'AI');
                
                // Сохраняем в историю
                chatHistory.push({ role: 'assistant', content: data.response });
                saveChatHistory();
                
                // Показываем информацию об использовании токенов
                if (data.usage && mistralAvailable) {
                    showTokenUsage(data.usage);
                }
            } else {
                throw new Error(data.message || 'Failed to get response');
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
            
            // Удаляем индикатор генерации
            removeThinkingIndicator(thinkingId);
            
            // Показываем сообщение об ошибке
            const errorMessage = mistralAvailable 
                ? `Error: ${error.message}`
                : "⚠ Mistral AI is not available. Please make sure it's running on http://127.0.0.1:1234";
            
            addMessage(errorMessage, 'bot-message error-message', currentCharacter ? currentCharacter.name : 'AI');
        } finally {
            // Восстанавливаем состояние
            isGenerating = false;
            sendBtn.disabled = false;
            messageInput.disabled = false;
            messageInput.focus();
        }
    }
    
    function addMessage(text, className, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${className}`;
        messageDiv.innerHTML = `<strong>${sender}:</strong> ${text}`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function addThinkingIndicator(id, sender) {
        const thinkingDiv = document.createElement('div');
        thinkingDiv.id = id;
        thinkingDiv.className = 'message bot-message thinking';
        thinkingDiv.innerHTML = `<strong>${sender}:</strong> <span class="typing-indicator"><span>.</span><span>.</span><span>.</span></span>`;
        chatMessages.appendChild(thinkingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function removeThinkingIndicator(id) {
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    }
    
    function addStatusMessage(text, type) {
        const statusDiv = document.createElement('div');
        statusDiv.className = `status-message ${type}`;
        statusDiv.textContent = text;
        statusDiv.style.cssText = `
            padding: 8px 12px;
            margin: 10px 0;
            border-radius: 4px;
            font-size: 0.9em;
            background-color: ${type === 'success' ? '#d4edda' : type === 'warning' ? '#fff3cd' : '#f8d7da'};
            color: ${type === 'success' ? '#155724' : type === 'warning' ? '#856404' : '#721c24'};
            border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'warning' ? '#ffeaa7' : '#f5c6cb'};
        `;
        
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            chatContainer.insertBefore(statusDiv, chatContainer.firstChild);
        }
    }
    
    function showTokenUsage(usage) {
        const tokenInfo = document.createElement('div');
        tokenInfo.className = 'token-usage';
        tokenInfo.textContent = `Tokens: ${usage.prompt_tokens} prompt + ${usage.completion_tokens} completion = ${usage.total_tokens} total`;
        tokenInfo.style.cssText = `
            font-size: 0.8em;
            color: #666;
            text-align: right;
            margin-top: 5px;
            padding: 2px 5px;
            font-style: italic;
        `;
        
        const lastMessage = chatMessages.lastElementChild;
        if (lastMessage) {
            lastMessage.appendChild(tokenInfo);
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
                await loadUserCharacters(JSON.parse(localStorage.getItem('user')).id);
            } else {
                alert('Error: ' + data.message);
            }
        } catch (error) {
            console.error('Error saving character:', error);
            alert('Server error. Please try again.');
        }
    }
    
    function clearChat() {
        if (confirm('Clear all chat messages?')) {
            chatMessages.innerHTML = '';
            chatHistory = [];
            saveChatHistory();
            addMessage(`Chat cleared. Ready to talk!`, 'system-message', 'System');
        }
    }
    
    function startNewChat() {
        if (confirm('Start a new chat?')) {
            chatMessages.innerHTML = '';
            chatHistory = [];
            saveChatHistory();
            const charName = currentCharacter ? currentCharacter.name : 'AI Assistant';
            addMessage(`New chat started with ${charName}!`, 'system-message', 'System');
        }
    }
    
    function saveChatHistory() {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            const historyKey = `chat_history_${user.id}_${currentCharacter ? currentCharacter.id : 'default'}`;
            localStorage.setItem(historyKey, JSON.stringify(chatHistory));
        }
    }
    
    function loadChatHistory() {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && currentCharacter) {
            const historyKey = `chat_history_${user.id}_${currentCharacter.id}`;
            const savedHistory = localStorage.getItem(historyKey);
            
            if (savedHistory) {
                try {
                    chatHistory = JSON.parse(savedHistory);
                    
                    // Восстанавливаем сообщения в чате
                    chatMessages.innerHTML = '';
                    chatHistory.forEach(msg => {
                        if (msg.role === 'user') {
                            addMessage(msg.content, 'user-message', 'You');
                        } else if (msg.role === 'assistant') {
                            addMessage(msg.content, 'bot-message', currentCharacter ? currentCharacter.name : 'AI');
                        }
                    });
                    
                    if (chatHistory.length > 0) {
                        addMessage(`Chat history loaded (${chatHistory.length} messages)`, 'system-message', 'System');
                    }
                } catch (error) {
                    console.error('Error loading chat history:', error);
                }
            }
        }
    }
});