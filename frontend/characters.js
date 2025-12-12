document.addEventListener('DOMContentLoaded', function() {
    const charactersGrid = document.querySelector('.characters-grid');
    const createCharacterBtn = document.getElementById('create-character');
    const characterModal = document.getElementById('character-modal');
    const characterForm = document.getElementById('character-form');
    const closeModalBtn = document.getElementById('close-modal');
    const modalTitle = document.getElementById('modal-title');
    
    let editingCharacterId = null;
    
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
        const user = JSON.parse(localStorage.getItem('user'));
        
        if (!user) {
            alert('Please login first');
            window.location.href = 'login.html';
            return;
        }
        
        try {
            const response = await fetch(`http://localhost:3000/api/characters?user_id=${user.id}`);
            const data = await response.json();
            
            if (data.success) {
                renderCharacters(data.characters);
                // Добавляем имя пользователя в навигацию
                addUsernameToNav(user.username);
            }
        } catch (error) {
            console.error('Error loading characters:', error);
        }
    }
    
    function renderCharacters(characters) {
        if (!charactersGrid) return;
        
        charactersGrid.innerHTML = '';
        
        if (characters.length === 0) {
            charactersGrid.innerHTML = '<p>No characters yet. Create your first character!</p>';
            return;
        }
        
        characters.forEach(character => {
            const card = document.createElement('div');
            card.className = 'character-card';
            card.dataset.characterId = character.id;
            card.innerHTML = `
                <h3>${character.name}</h3>
                <p class="character-role">${character.role}</p>
                <p class="character-desc">${character.description}</p>
                <div class="character-actions">
                    <button class="btn small use-character" data-character="${character.id}">Use</button>
                    <button class="btn small edit-character" data-character="${character.id}">Edit</button>
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
        editingCharacterId = null;
        modalTitle.textContent = 'Create New Character';
        
        // Очищаем форму
        characterForm.reset();
        document.getElementById('character-id').value = '';
        
        characterModal.style.display = 'block';
    }
    
    async function editCharacter(characterId) {
        const user = JSON.parse(localStorage.getItem('user'));
        
        if (!user) {
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
                
                characterModal.style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading character:', error);
            alert('Error loading character data');
        }
    }
    
    async function saveCharacter() {
        const user = JSON.parse(localStorage.getItem('user'));
        
        if (!user) {
            alert('Please login first');
            return;
        }
        
        const characterId = document.getElementById('character-id').value;
        const name = document.getElementById('character-name').value.trim();
        const role = document.getElementById('character-role').value.trim();
        const description = document.getElementById('character-desc').value.trim();
        const prompt = document.getElementById('character-prompt').value.trim();
        
        if (!name || !role || !prompt) {
            alert('Please fill in all required fields');
            return;
        }
        
        const characterData = {
            user_id: user.id,
            name,
            role,
            description,
            prompt,
            examples: ''
        };
        
        try {
            let response;
            if (characterId) {
                // Обновление существующего персонажа
                response = await fetch(`http://localhost:3000/api/characters/${characterId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(characterData)
                });
            } else {
                // Создание нового персонажа
                response = await fetch('http://localhost:3000/api/characters', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(characterData)
                });
            }
            
            const data = await response.json();
            
            if (data.success) {
                alert('Character saved successfully!');
                characterModal.style.display = 'none';
                loadCharacters(); // Перезагружаем список персонажей
            } else {
                alert('Error: ' + data.message);
            }
        } catch (error) {
            console.error('Error saving character:', error);
            alert('Server error. Please try again.');
        }
    }
    
    async function deleteCharacter(characterId) {
        if (!confirm('Are you sure you want to delete this character?')) {
            return;
        }
        
        try {
            const response = await fetch(`http://localhost:3000/api/characters/${characterId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Character deleted successfully!');
                loadCharacters(); // Перезагружаем список персонажей
            } else {
                alert('Error: ' + data.message);
            }
        } catch (error) {
            console.error('Error deleting character:', error);
            alert('Server error. Please try again.');
        }
    }
    
    function useCharacter(characterId) {
        // Переходим в чат с выбранным персонажем
        window.location.href = `chat.html?character=${characterId}`;
    }
    
    function addUsernameToNav(username) {
        // Проверяем, не добавлено ли уже имя пользователя
        const existingUserDisplay = document.querySelector('.username-display');
        if (existingUserDisplay) {
            return; // Имя пользователя уже отображается
        }
        
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
});