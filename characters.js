// Characters management
document.addEventListener('DOMContentLoaded', function() {
    const charactersGrid = document.querySelector('.characters-grid');
    const createCharacterBtn = document.getElementById('create-character');
    const characterModal = document.getElementById('character-modal');
    const characterForm = document.getElementById('character-form');
    const deleteCharacterBtn = document.getElementById('delete-character');
    const modalTitle = document.getElementById('modal-title');
    
    let editingCharacterId = null;
    
    // Character click handlers
    charactersGrid.addEventListener('click', function(e) {
        const card = e.target.closest('.character-card');
        if (!card) return;
        
        if (e.target.classList.contains('use-character')) {
            const characterId = e.target.dataset.character;
            useCharacter(characterId);
        } else if (e.target.classList.contains('edit-character')) {
            const characterId = e.target.dataset.character;
            editCharacter(characterId);
        } else if (e.target.id === 'add-character-btn' || card.classList.contains('empty')) {
            createNewCharacter();
        }
    });
    
    // Create new character button
    createCharacterBtn?.addEventListener('click', createNewCharacter);
    
    // Form submission
    characterForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        saveCharacter();
    });
    
    // Delete character
    deleteCharacterBtn?.addEventListener('click', function() {
        if (editingCharacterId && confirm('Delete this character?')) {
            // In production, this would delete from database
            alert(`Character deleted! (In production, this would remove from database)`);
            characterModal.style.display = 'none';
            
            // Remove from UI
            const card = document.querySelector(`[data-character-id="${editingCharacterId}"]`);
            if (card) card.remove();
        }
    });
    
    // Functions
    function useCharacter(characterId) {
        // Redirect to chat with character selected
        window.location.href = `chat.html?character=${characterId}`;
    }
    
    function editCharacter(characterId) {
        editingCharacterId = characterId;
        modalTitle.textContent = 'Edit Character';
        
        // Get character data (in production, from database)
        const character = getCharacterData(characterId);
        
        // Fill form
        document.getElementById('character-id').value = characterId;
        document.getElementById('character-name').value = character.name || '';
        document.getElementById('character-role').value = character.role || '';
        document.getElementById('character-desc').value = character.description || '';
        document.getElementById('character-prompt').value = character.prompt || '';
        document.getElementById('character-examples').value = character.examples || '';
        
        characterModal.style.display = 'block';
    }
    
    function createNewCharacter() {
        editingCharacterId = null;
        modalTitle.textContent = 'Create New Character';
        
        // Clear form
        characterForm.reset();
        document.getElementById('character-id').value = '';
        
        characterModal.style.display = 'block';
    }
    
    function saveCharacter() {
        const id = document.getElementById('character-id').value || generateId();
        const name = document.getElementById('character-name').value;
        const role = document.getElementById('character-role').value;
        const desc = document.getElementById('character-desc').value;
        const prompt = document.getElementById('character-prompt').value;
        const examples = document.getElementById('character-examples').value;
        
        // In production, this would save to database
        alert(`Character "${name}" saved to database!`);
        characterModal.style.display = 'none';
        
        // Update or add character card
        updateCharacterCard(id, name, role, desc);
    }
    
    function getCharacterData(id) {
        // Mock data - in production, fetch from database
        const characters = {
            default: {
                name: 'Default Assistant',
                role: 'General Purpose AI',
                description: 'Helpful, friendly, and knowledgeable assistant',
                prompt: 'You are a helpful, friendly AI assistant.'
            },
            scientist: {
                name: 'Scientist',
                role: 'Research Assistant',
                description: 'Analytical, precise, data-driven responses',
                prompt: 'You are a scientific researcher. Be precise, analytical, and data-driven.'
            },
            philosopher: {
                name: 'Philosopher',
                role: 'Deep Thinker',
                description: 'Thoughtful, contemplative, existential discussions',
                prompt: 'You are a philosopher. Be contemplative and thought-provoking.'
            },
            comedian: {
                name: 'Comedian',
                role: 'Entertainer',
                description: 'Witty, humorous, light-hearted conversations',
                prompt: 'You are a comedian. Be witty and humorous.'
            }
        };
        
        return characters[id] || {
            name: '',
            role: '',
            description: '',
            prompt: '',
            examples: ''
        };
    }
    
    function updateCharacterCard(id, name, role, description) {
        let card = document.querySelector(`[data-character-id="${id}"]`);
        
        if (!card) {
            // Create new card
            card = document.createElement('div');
            card.className = 'character-card';
            card.dataset.characterId = id;
            
            card.innerHTML = `
                <h3>${name}</h3>
                <p class="character-role">${role}</p>
                <p class="character-desc">${description}</p>
                <div class="character-actions">
                    <button class="btn small use-character" data-character="${id}">Use</button>
                    <button class="btn small edit-character" data-character="${id}">Edit</button>
                </div>
            `;
            
            // Insert before the empty "add" card
            const emptyCard = document.querySelector('.character-card.empty');
            if (emptyCard) {
                emptyCard.parentNode.insertBefore(card, emptyCard);
            } else {
                charactersGrid.appendChild(card);
            }
        } else {
            // Update existing card
            card.querySelector('h3').textContent = name;
            card.querySelector('.character-role').textContent = role;
            card.querySelector('.character-desc').textContent = description;
        }
    }
    
    function generateId() {
        return 'char_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
});