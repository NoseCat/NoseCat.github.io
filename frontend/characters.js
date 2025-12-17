document.addEventListener('DOMContentLoaded', function() {
    const charactersGrid = document.querySelector('.characters-grid');
    const createCharacterBtn = document.getElementById('create-character');
    const characterModal = document.getElementById('character-modal');
    const characterForm = document.getElementById('character-form');
    const closeModalBtn = document.getElementById('close-modal');
    const modalTitle = document.getElementById('modal-title');
    const characterSearchInput = document.getElementById('character-search-input');
    const roleFilter = document.getElementById('role-filter');
    const searchCharactersBtn = document.getElementById('search-characters');
    const resetSearchBtn = document.getElementById('reset-search');
    
    let editingCharacterId = null;
    let currentUser = null;
    
    // Загружаем персонажей при загрузке страницы
    loadCharacters();
    
    // Кнопка создания нового персонажа
    if (createCharacterBtn) {
        createCharacterBtn.addEventListener('click', createNewCharacter);
    }
    
    // Закрытие модального окна
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            characterModal.style.display = 'none';
        });
    }
    
    // Поиск персонажей
    if (searchCharactersBtn) {
        searchCharactersBtn.addEventListener('click', function() {
            searchCharacters();
        });
    }
    
    // Сброс поиска
    if (resetSearchBtn) {
        resetSearchBtn.addEventListener('click', function() {
            characterSearchInput.value = '';
            loadCharacters();
        });
    }
    
    // Поиск при нажатии Enter
    if (characterSearchInput) {
        characterSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchCharacters();
            }
        });
    }
    
    // Закрытие модального окна при клике вне его
    window.addEventListener('click', function(event) {
        if (event.target === characterModal) {
            characterModal.style.display = 'none';
        }
    });
    
    // Обработка отправки формы
    if (characterForm) {
        characterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveCharacter();
        });
    }
    
    async function loadCharacters() {
        currentUser = JSON.parse(localStorage.getItem('user'));
        
        if (!currentUser) {
            alert('Please login first');
            window.location.href = 'login.html';
            return;
        }
        
        // Добавляем имя пользователя в навигацию
        addUsernameToNav(currentUser.username);
        
        try {
            const response = await fetch(`http://localhost:3000/api/characters?user_id=${currentUser.id}`);
            const data = await response.json();
            
            if (data.success) {
                renderCharacters(data.characters);
            } else {
                charactersGrid.innerHTML = '<p>Error loading characters. Please try again.</p>';
            }
        } catch (error) {
            console.error('Error loading characters:', error);
            charactersGrid.innerHTML = '<p>Error connecting to server. Please try again later.</p>';
        }
    }
    
    async function searchCharacters() {
        if (!currentUser) {
            alert('Please login first');
            return;
        }
        
        const search = characterSearchInput.value.trim();
        
        if (!search) {
            loadCharacters();
            return;
        }
        
        try {
            const url = `http://localhost:3000/api/characters/search?user_id=${currentUser.id}&search=${encodeURIComponent(search)}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                renderCharacters(data.characters);
            } else {
                charactersGrid.innerHTML = '<p>No characters found.</p>';
            }
        } catch (error) {
            console.error('Error searching characters:', error);
            charactersGrid.innerHTML = '<p>Error searching characters. Please try again.</p>';
        }
    }
    
    function renderCharacters(characters) {
        if (!charactersGrid) return;
        
        charactersGrid.innerHTML = '';
        
        if (characters.length === 0) {
            charactersGrid.innerHTML = `
                <div class="empty-state">
                    <p>No characters found. Create your first character!</p>
                </div>
            `;
            return;
        }
        
        characters.forEach(character => {
            const card = document.createElement('div');
            card.className = 'character-card';
            card.dataset.characterId = character.id;
            card.innerHTML = `
                <h3>${character.name}</h3>
                <p class="character-role">${character.role}</p>
                <p class="character-desc">${character.description || 'No description'}</p>
                <div class="character-actions">
                    <button class="btn small primary use-character" data-character="${character.id}">Chat</button>
                    <button class="btn small secondary edit-character" data-character="${character.id}">Edit</button>
                    <button class="btn small danger delete-character" data-character="${character.id}">Delete</button>
                </div>
            `;
            charactersGrid.appendChild(card);
        });
        
        // Добавляем обработчики для кнопок на карточках
        document.querySelectorAll('.edit-character').forEach(btn => {
            btn.addEventListener('click', function() {
                const characterId = this.dataset.character;
                editCharacter(characterId);
            });
        });
        
        document.querySelectorAll('.delete-character').forEach(btn => {
            btn.addEventListener('click', function() {
                const characterId = this.dataset.character;
                deleteCharacter(characterId);
            });
        });
        
        document.querySelectorAll('.use-character').forEach(btn => {
            btn.addEventListener('click', function() {
                const characterId = this.dataset.character;
                useCharacter(characterId);
            });
        });
    }
    
    function createNewCharacter() {
        if (!currentUser) {
            alert('Please login first');
            return;
        }
        
        editingCharacterId = null;
        modalTitle.textContent = 'Create New Character';
        
        // Очищаем форму
        characterForm.reset();
        document.getElementById('character-id').value = '';
        
        characterModal.style.display = 'block';
    }
    
async function editCharacter(characterId) {
    if (!currentUser) {
        alert('Please login first');
        return;
    }
    
    try {
        const response = await fetch(`http://localhost:3000/api/characters/${characterId}`);
        const data = await response.json();
        
        if (data.success) {
            editingCharacterId = characterId;
            modalTitle.textContent = 'Edit Character';
            
            // Заполняем форму данными персонажа
            document.getElementById('character-id').value = data.character.id;
            document.getElementById('character-name').value = data.character.name || '';
            document.getElementById('character-role').value = data.character.role || '';
            document.getElementById('character-desc').value = data.character.description || '';
            document.getElementById('character-prompt').value = data.character.prompt || '';
            document.getElementById('character-is-public').checked = data.character.is_public || false;
            
            characterModal.style.display = 'block';

            await logAction('character_edit', { character_id: data.character.id });
        }
    } catch (error) {
        console.error('Error loading character:', error);
        alert('Error loading character data');
    }
}

    async function saveCharacter() {
        if (!currentUser) {
        alert('Please login first');
        return;
    }
    
    const characterId = document.getElementById('character-id').value;
    const name = document.getElementById('character-name').value.trim();
    const role = document.getElementById('character-role').value.trim();
    const description = document.getElementById('character-desc').value.trim();
    const prompt = document.getElementById('character-prompt').value.trim();
    const isPublic = document.getElementById('character-is-public').checked;
    
    if (!name || !role || !prompt) {
        alert('Please fill in all required fields');
        return;
    }
    
    const characterData = {
        user_id: currentUser.id,
        name,
        role,
        description,
        prompt,
        examples: '',
        is_public: isPublic
    };
    
        try {
            let response;
            let method;
            let url;
            
            if (characterId) {
                method = 'PUT';
                url = `http://localhost:3000/api/characters/${characterId}`;
            } else {
                method = 'POST';
                url = 'http://localhost:3000/api/characters';
            }
            
            response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(characterData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                await logAction('character_save', { character_id: data.character.id });
                alert('Character saved successfully!');
                characterModal.style.display = 'none';
                loadCharacters();
            } else {
                alert('Error: ' + data.message);
            }
        } catch (error) {
            console.error('Error saving character:', error);
            alert('Server error. Please try again.');
        }
    }
    
    async function deleteCharacter(characterId) {
        if (!confirm('Are you sure you want to delete this character? This action cannot be undone.')) {
            return;
        }
        
        try {
            const response = await fetch(`http://localhost:3000/api/characters/${characterId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                await logAction('character_delete', { character_id: characterId });
                alert('Character deleted successfully!');
                loadCharacters();
            } else {
                alert('Error: ' + data.message);
            }
        } catch (error) {
            console.error('Error deleting character:', error);
            alert('Server error. Please try again.');
        }
    }
    
    function useCharacter(characterId) {
        window.location.href = `chat.html?character=${characterId}`;
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
});