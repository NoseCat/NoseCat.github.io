// Chat functionality with Mistral integration
document.addEventListener('DOMContentLoaded', function () {
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const clearBtn = document.getElementById('clear-chat');
    const newChatBtn = document.getElementById('new-chat');
    const renameChatBtn = document.getElementById('rename-chat');
    const characterSelect = document.getElementById('character-select');
    const editCharacterBtn = document.getElementById('edit-character-btn');
    const characterModal = document.getElementById('character-modal');
    const characterForm = document.getElementById('character-form');
    const chatsList = document.getElementById('chats-list');
    const newChatBtnSidebar = document.getElementById('new-chat-btn');
    const chatSearchInput = document.getElementById('chat-search-input');
    const renameModal = document.getElementById('rename-modal');
    const newChatNameInput = document.getElementById('new-chat-name');
    const saveRenameBtn = document.getElementById('save-rename-btn');
    const cancelRenameBtn = document.getElementById('cancel-rename-btn');

    let currentCharacter = null;
    let currentChat = null;
    let userCharacters = [];
    let userChats = [];
    let chatHistory = [];
    let isGenerating = false;
    let mistralAvailable = false;

    // Инициализация
    initializeChat();

    // Event Listeners
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && !e.shiftKey && !isGenerating) {
            e.preventDefault();
            sendMessage();
        }
    });

    clearBtn.addEventListener('click', clearChat);
    newChatBtn.addEventListener('click', startNewChat);
    renameChatBtn.addEventListener('click', renameCurrentChat);
    newChatBtnSidebar.addEventListener('click', createNewChat);

    // Поиск по чатам
    chatSearchInput.addEventListener('input', function () {
        filterChats(this.value);
    });

    characterSelect.addEventListener('change', function () {
        const selectedId = this.value;
        currentCharacter = userCharacters.find(c => c.id == selectedId);
        if (currentCharacter) {
            addMessage(`Switched to character: ${currentCharacter.name}`, 'system-message', 'System');
        }
    });

    editCharacterBtn.addEventListener('click', function () {
        if (currentCharacter) {
            editCharacter(currentCharacter.id);
        } else {
            alert('Please select a character first');
        }
    });

    // Character form submission
    if (characterForm) {
        characterForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            await saveCharacter();
        });
    }

    // Close modals
    document.getElementById('close-modal')?.addEventListener('click', function () {
        characterModal.style.display = 'none';
    });

    cancelRenameBtn?.addEventListener('click', function () {
        renameModal.style.display = 'none';
    });

    saveRenameBtn?.addEventListener('click', async function () {
        const newName = newChatNameInput.value.trim();
        if (newName && currentChat) {
            await renameChat(currentChat.id, newName);
            renameModal.style.display = 'none';
        }
    });

    // Close modals when clicking outside
    window.addEventListener('click', function (event) {
        if (event.target === characterModal) {
            characterModal.style.display = 'none';
        }
        if (event.target === renameModal) {
            renameModal.style.display = 'none';
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

        // Загружаем чаты пользователя
        await loadUserChats(user.id);

        // Проверяем, есть ли чат в URL
        const urlParams = new URLSearchParams(window.location.search);
        const chatParam = urlParams.get('chat');

        if (chatParam) {
            await loadChat(chatParam);
        } else if (userChats.length > 0) {
            // Загружаем последний чат по умолчанию
            await loadChat(userChats[0].id);
        } else {
            // Создаем новый чат
            await createNewChat();
        }
    }

    async function loadUserChats(userId) {
        try {
            const response = await fetch(`http://localhost:3000/api/chats?user_id=${userId}`);
            const data = await response.json();

            if (data.success) {
                userChats = data.chats;
                renderChatsList(userChats);
            }
        } catch (error) {
            console.error('Error loading chats:', error);
        }
    }

    function renderChatsList(chats) {
        if (!chatsList) return;

        chatsList.innerHTML = '';

        if (chats.length === 0) {
            chatsList.innerHTML = '<div class="no-chats">No chats yet</div>';
            return;
        }

        chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${currentChat && currentChat.id === chat.id ? 'active' : ''}`;
            chatItem.dataset.chatId = chat.id;
            chatItem.innerHTML = `
                <div class="chat-item-name">${chat.name}</div>
                <div class="chat-item-date">${new Date(chat.updated_at).toLocaleDateString()}</div>
            `;

            chatItem.addEventListener('click', () => loadChat(chat.id));

            chatsList.appendChild(chatItem);
        });
    }

    async function loadChat(chatId) {
        try {
            // Загружаем информацию о чате
            const chat = userChats.find(c => c.id == chatId);
            if (!chat) return;

            currentChat = chat;

            // Обновляем активный элемент в списке
            document.querySelectorAll('.chat-item').forEach(item => {
                item.classList.remove('active');
                if (item.dataset.chatId == chatId) {
                    item.classList.add('active');
                }
            });

            // Загружаем сообщения чата
            const response = await fetch(`http://localhost:3000/api/chats/${chatId}/messages`);
            const data = await response.json();

            if (data.success) {
                // Очищаем текущий чат
                chatMessages.innerHTML = '';
                chatHistory = [];

                // Отображаем сообщения
                data.messages.forEach(msg => {
                    const sender = msg.role === 'user' ? 'You' : (currentCharacter ? currentCharacter.name : 'AI');
                    const className = msg.role === 'user' ? 'user-message' : 'bot-message';
                    addMessage(msg.content, className, sender);
                    chatHistory.push({ role: msg.role, content: msg.content });
                });

                if (data.messages.length === 0) {
                    addMessage(`Started new chat: ${chat.name}`, 'system-message', 'System');
                }
            }
        } catch (error) {
            console.error('Error loading chat:', error);
        }
    }

    async function createNewChat() {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return;

        try {
            const response = await fetch('http://localhost:3000/api/chats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    user_id: user.id,
                    name: 'New Chat'
                })
            });

            const data = await response.json();

            if (data.success) {
                await logAction('chat_create', { chat_id: data.chat.id });
                userChats.unshift(data.chat);
                renderChatsList(userChats);
                await loadChat(data.chat.id);
            }
        } catch (error) {
            console.error('Error creating chat:', error);
            alert('Error creating chat. Please try again.');
        }
    }

    async function renameCurrentChat() {
        if (!currentChat) {
            alert('No chat selected');
            return;
        }

        newChatNameInput.value = currentChat.name;
        renameModal.style.display = 'block';
    }

    async function renameChat(chatId, newName) {
        try {
            const response = await fetch(`http://localhost:3000/api/chats/${chatId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName })
            });

            const data = await response.json();

            if (data.success) {
                // Обновляем в локальном списке
                const chatIndex = userChats.findIndex(c => c.id == chatId);
                if (chatIndex !== -1) {
                    userChats[chatIndex] = data.chat;
                    renderChatsList(userChats);
                    currentChat = data.chat;
                }
            }
        } catch (error) {
            console.error('Error renaming chat:', error);
        }
    }

    function filterChats(searchTerm) {
        const filteredChats = userChats.filter(chat =>
            chat.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        renderChatsList(filteredChats);
    }

    async function checkMistralStatus() {
        try {
            const response = await fetch('http://localhost:3000/api/mistral/status');
            const data = await response.json();

            mistralAvailable = data.success && data.available;

            if (mistralAvailable) {
                addStatusMessage('✓ Mistral AI is connected and ready', 'success');
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
                    } else {
                        // Если персонаж не найден, выбираем первого
                        selectFirstCharacter();
                    }
                } else {
                    // Выбираем первого персонажа по умолчанию
                    selectFirstCharacter();
                }
            }
        } catch (error) {
            console.error('Error loading characters:', error);
        }
    }

    function selectFirstCharacter() {
        if (userCharacters.length > 0) {
            characterSelect.value = userCharacters[0].id;
            currentCharacter = userCharacters[0];
            addMessage(`Hello! I'm ${currentCharacter.name}. How can I help you?`, 'bot-message', currentCharacter.name);
        } else {
            // Если нет персонажей, создаем системное сообщение
            addMessage('No characters available. Please create a character first.', 'system-message', 'System');
        }
    }

    function populateCharacterSelect(characters) {
        if (!characterSelect) return;

        characterSelect.innerHTML = '';

        if (characters.length === 0) {
            characterSelect.innerHTML = '<option value="">No characters available</option>';
            return;
        }

        // Добавляем опцию для каждого персонажа
        characters.forEach(character => {
            const option = document.createElement('option');
            option.value = character.id;
            option.textContent = character.name;
            if (character.is_public) {
                option.textContent += ' (Public)';
            }
            characterSelect.appendChild(option);
        });

        // Автоматически выбираем первого персонажа
        if (!characterSelect.value && characters.length > 0) {
            characterSelect.value = characters[0].id;
            currentCharacter = characters[0];
        }
    }
    function addUsernameToNav(username) {
        const navLinks = document.querySelector('.nav-links');
        if (navLinks && username) {
            const oldDisplay = navLinks.querySelector('.username-display');
            if (oldDisplay) oldDisplay.remove();

            const userSpan = document.createElement('span');
            userSpan.className = 'username-display';
            userSpan.innerHTML = `👤 ${username}`;
            userSpan.style.marginLeft = '20px';
            userSpan.style.color = '#d49a6a';
            userSpan.style.fontWeight = 'bold';

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

        // Если нет текущего чата, создаем новый
        if (!currentChat) {
            await createNewChat();
        }

        // Добавляем сообщение пользователя в чат
        addMessage(message, 'user-message', 'You');

        // Сохраняем сообщение в базу данных
        await saveMessageToChat('user', message);

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

            // Добавляем историю чата из базы данных
            messages.push(...chatHistory.slice(-10));

            // Отправляем запрос к Mistral
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
                await logAction('chat_message', { chat_id: currentChat.id, character_id: currentCharacter?.id });

                // Добавляем ответ в чат
                addMessage(data.response, 'bot-message', currentCharacter ? currentCharacter.name : 'AI');

                // Сохраняем ответ в базу данных
                await saveMessageToChat('assistant', data.response);

                // Показываем информацию об использовании токенов
                if (data.usage && mistralAvailable) {
                    showTokenUsage(data.usage);
                }
            } else {
                throw new Error(data.message || 'Failed to get response');
            }

        } catch (error) {
            console.error('Error sending message:', error);

            removeThinkingIndicator(thinkingId);

            const errorMessage = mistralAvailable
                ? `Error: ${error.message}`
                : "⚠ Mistral AI is not available. Please make sure it's running on http://127.0.0.1:1234";

            addMessage(errorMessage, 'bot-message error-message', currentCharacter ? currentCharacter.name : 'AI');
            await saveMessageToChat('assistant', errorMessage);
        } finally {
            isGenerating = false;
            sendBtn.disabled = false;
            messageInput.disabled = false;
            messageInput.focus();
        }
    }

    async function saveMessageToChat(role, content) {
        if (!currentChat) return;

        try {
            await fetch(`http://localhost:3000/api/chats/${currentChat.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role, content })
            });
            // Обновляем локальную историю
            chatHistory.push({ role, content });
        } catch (error) {
            console.error('Error saving message:', error);
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
                const user = JSON.parse(localStorage.getItem('user'));
                await loadUserCharacters(user.id);
            } else {
                alert('Error: ' + data.message);
            }
        } catch (error) {
            console.error('Error saving character:', error);
            alert('Server error. Please try again.');
        }
    }

    function clearChat() {
        if (!currentChat) return;

        if (confirm('Clear all chat messages?')) {
            chatMessages.innerHTML = '';
            chatHistory = [];
            addMessage(`Chat cleared. Ready to talk!`, 'system-message', 'System');
            //await logAction('chat_clear', { chat_id: currentChat.id });
        }
    }

    async function startNewChat() {
          await createNewChat();
    }
});