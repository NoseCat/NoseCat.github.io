document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('character-form');
    const previewBtn = document.getElementById('preview-btn');
    const charactersList = document.querySelector('.characters-list');
    const emptyState = document.getElementById('empty-characters');
    
    // Character templates based on role
    const roleTemplates = {
        assistant: "You are a helpful AI assistant. Be polite, concise, and accurate in your responses.",
        teacher: "You are a knowledgeable teacher. Explain concepts clearly, provide examples, and encourage learning.",
        friend: "You are a friendly companion. Be casual, supportive, and engaging in conversation.",
        expert: "You are an expert in your field. Provide detailed, accurate information with citations when possible.",
        creative: "You are a creative writer. Be imaginative, descriptive, and focus on storytelling.",
        custom: ""
    };
    
    // Update prompt based on selected role
    document.getElementById('character-role').addEventListener('change', function(e) {
        const promptTextarea = document.getElementById('character-prompt');
        if (e.target.value !== 'custom') {
            promptTextarea.value = roleTemplates[e.target.value];
        }
    });
    
    // Form submission
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('character-name').value.trim();
            const role = document.getElementById('character-role').value;
            const prompt = document.getElementById('character-prompt').value.trim();
            const example = document.getElementById('character-example').value.trim();
            
            if (!name || !prompt) {
                showMessage('Please fill in all required fields', 'error');
                return;
            }
            
            // Create character card
            createCharacterCard({
                name,
                role,
                prompt,
                example,
                date: new Date().toLocaleDateString()
            });
            
            // Reset form
            form.reset();
            document.getElementById('character-prompt').value = roleTemplates['assistant'];
            
            showMessage(`Character "${name}" created successfully!`, 'success');
            
            // Hide empty state
            emptyState.style.display = 'none';
        });
    }
    
    // Preview functionality
    if (previewBtn) {
        previewBtn.addEventListener('click', function() {
            const name = document.getElementById('character-name').value.trim() || 'Unnamed Character';
            const prompt = document.getElementById('character-prompt').value.trim();
            
            alert(`Character Preview:\n\nName: ${name}\n\nSystem Prompt:\n${prompt}`);
        });
    }
    
    // Handle character card actions
    charactersList.addEventListener('click', function(e) {
        const btn = e.target.closest('button');
        if (!btn) return;
        
        const action = btn.dataset.action;
        const card = btn.closest('.character-card');
        const name = card.querySelector('h3').textContent;
        
        switch(action) {
            case 'use':
                showMessage(`"${name}" selected for chat. Redirecting...`, 'info');
                // In real app: save to session and redirect to chat
                setTimeout(() => {
                    window.location.href = 'chat.html?character=' + encodeURIComponent(name);
                }, 1000);
                break;
                
            case 'edit':
                // Load character data into form
                const charName = prompt('Enter new name for character:', name);
                if (charName) {
                    card.querySelector('h3').textContent = charName;
                    showMessage('Character name updated', 'info');
                }
                break;
        }
    });
    
    // Create character card
    function createCharacterCard(character) {
        const card = document.createElement('div');
        card.className = 'character-card';
        
        card.innerHTML = `
            <div class="character-card-header">
                <h3>${character.name}</h3>
                <span class="character-badge">${character.role}</span>
            </div>
            <p class="character-description">${character.prompt.substring(0, 100)}...</p>
            <div class="character-meta">
                <small>Created: ${character.date}</small>
            </div>
            <div class="character-actions">
                <button class="btn small" data-action="use">Use in Chat</button>
                <button class="btn small secondary" data-action="edit">Edit</button>
            </div>
        `;
        
        charactersList.insertBefore(card, charactersList.firstChild);
    }
    
    // Show message
    function showMessage(message, type) {
        // Remove existing messages
        const existingMsg = document.querySelector('.form-message');
        if (existingMsg) {
            existingMsg.remove();
        }
        
        const msgElement = document.createElement('div');
        msgElement.className = `form-message ${type}`;
        msgElement.textContent = message;
        msgElement.setAttribute('role', 'alert');
        
        const form = document.getElementById('character-form');
        if (form) {
            form.parentNode.insertBefore(msgElement, form.nextSibling);
        }
        
        setTimeout(() => {
            if (msgElement.parentNode) {
                msgElement.remove();
            }
        }, 3000);
    }
});