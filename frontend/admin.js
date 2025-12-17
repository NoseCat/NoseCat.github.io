// Admin Panel Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Navigation
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    const sections = document.querySelectorAll('.admin-section');
    
    // Check if user is admin
    checkAdminAccess();
    
    // Navigation handlers
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.getAttribute('href') === '#logout') {
                e.preventDefault();
                logout();
                return;
            }
            
            if (this.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                
                // Update active states
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
                
                // Show target section
                sections.forEach(section => {
                    if (section.id === targetId) {
                        section.style.display = 'block';
                        section.classList.add('active-section');
                    } else {
                        section.style.display = 'none';
                        section.classList.remove('active-section');
                    }
                });
                
                // Load data for the section
                loadSectionData(targetId);
            }
        });
    });
    
    // Initialize dashboard
    loadDashboard();
    
    // Event listeners for buttons
    document.getElementById('refresh-users')?.addEventListener('click', () => loadUsers());
    document.getElementById('refresh-characters')?.addEventListener('click', () => loadCharacters());
    document.getElementById('refresh-chats')?.addEventListener('click', () => loadChats());
    document.getElementById('refresh-logs')?.addEventListener('click', () => loadLogs());
    document.getElementById('clear-old-logs')?.addEventListener('click', () => clearOldLogs());
    
    // Search/filter handlers
    document.getElementById('user-search')?.addEventListener('input', debounce(loadUsers, 500));
    document.getElementById('character-search')?.addEventListener('input', debounce(loadCharacters, 500));
    document.getElementById('chat-search')?.addEventListener('input', debounce(loadChats, 500));
    
    // Logs filter handlers
    document.getElementById('log-action-filter')?.addEventListener('change', loadLogs);
    document.getElementById('log-user-id')?.addEventListener('input', debounce(loadLogs, 500));
    document.getElementById('log-date-from')?.addEventListener('change', loadLogs);
    document.getElementById('log-date-to')?.addEventListener('change', loadLogs);
});

async function checkAdminAccess() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const response = await fetch(`http://localhost:3000/api/admin/check-admin?user_id=${user.id}`);
        const data = await response.json();
        
        if (!data.success || !data.is_admin) {
            alert('Access denied. You are not an administrator.');
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Error checking admin access:', error);
        alert('Error verifying admin access. Please try again.');
        window.location.href = 'index.html';
    }
}

async function loadSectionData(sectionId) {
    switch(sectionId) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'users':
            loadUsers();
            break;
        case 'characters':
            loadCharacters();
            break;
        case 'chats':
            loadChats();
            break;
        case 'logs':
            loadLogs();
            break;
        case 'system':
            loadSystemStatus();
            break;
    }
}

async function loadDashboard() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        
        // Load stats
        const statsResponse = await fetch(`http://localhost:3000/api/admin/stats?admin_id=${user.id}`);
        const statsData = await statsResponse.json();
        
        if (statsData.success) {
            document.getElementById('total-users').textContent = statsData.stats.total_users || 0;
            document.getElementById('active-today').textContent = statsData.stats.active_today || 0;
            document.getElementById('total-chats').textContent = statsData.stats.total_chats || 0;
            document.getElementById('total-characters').textContent = statsData.stats.total_characters || 0;
            document.getElementById('total-messages').textContent = statsData.stats.total_messages || 0;
            document.getElementById('system-status').textContent = statsData.stats.mistral_online ? 'Online' : 'Offline';
        }
        
        // Load recent activity
        const activityResponse = await fetch(`http://localhost:3000/api/admin/recent-activity?admin_id=${user.id}`);
        const activityData = await activityResponse.json();
        
        if (activityData.success) {
            const activityContainer = document.getElementById('recent-activity');
            activityContainer.innerHTML = '';
            
            if (activityData.logs.length === 0) {
                activityContainer.innerHTML = '<p>No recent activity</p>';
                return;
            }
            
            const table = document.createElement('table');
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Details</th>
                        <th>IP Address</th>
                    </tr>
                </thead>
                <tbody>
                    ${activityData.logs.map(log => `
                        <tr>
                            <td>${new Date(log.created_at).toLocaleString()}</td>
                            <td>${log.username || 'N/A'}</td>
                            <td>${log.action}</td>
                            <td>${log.details || ''}</td>
                            <td>${log.ip_address || ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            `;
            activityContainer.appendChild(table);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        document.getElementById('recent-activity').innerHTML = '<p>Error loading activity</p>';
    }
}

async function loadUsers() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const search = document.getElementById('user-search')?.value || '';
        const filter = document.getElementById('user-filter')?.value || 'all';
        
        const response = await fetch(
            `http://localhost:3000/api/admin/users?admin_id=${user.id}&search=${encodeURIComponent(search)}&filter=${filter}`
        );
        const data = await response.json();
        
        const container = document.getElementById('users-table-container');
        
        if (!data.success) {
            container.innerHTML = `<p>Error: ${data.message}</p>`;
            return;
        }
        
        if (data.users.length === 0) {
            container.innerHTML = '<p>No users found</p>';
            return;
        }
        
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Admin</th>
                        <th>Created</th>
                        <th>Last Active</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.users.map(user => `
                        <tr>
                            <td>${user.id}</td>
                            <td>${user.username}</td>
                            <td>${user.email}</td>
                            <td>${user.is_admin ? '✓' : '✗'}</td>
                            <td>${new Date(user.created_at).toLocaleDateString()}</td>
                            <td>${user.last_active ? new Date(user.last_active).toLocaleString() : 'Never'}</td>
                            <td>
                                <button class="btn btn-warning" onclick="toggleAdmin(${user.id}, ${!user.is_admin})">
                                    ${user.is_admin ? 'Remove Admin' : 'Make Admin'}
                                </button>
                                <button class="btn btn-danger" onclick="deleteUser(${user.id})" ${user.is_admin ? 'disabled' : ''}>
                                    Delete
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('users-table-container').innerHTML = '<p>Error loading users</p>';
    }
}

async function loadCharacters() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const search = document.getElementById('character-search')?.value || '';
        const filter = document.getElementById('character-filter')?.value || 'all';
        
        const response = await fetch(
            `http://localhost:3000/api/admin/characters?admin_id=${user.id}&search=${encodeURIComponent(search)}&filter=${filter}`
        );
        const data = await response.json();
        
        const container = document.getElementById('characters-table-container');
        
        if (!data.success) {
            container.innerHTML = `<p>Error: ${data.message}</p>`;
            return;
        }
        
        if (data.characters.length === 0) {
            container.innerHTML = '<p>No characters found</p>';
            return;
        }
        
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Owner</th>
                        <th>Public</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.characters.map(character => `
                        <tr>
                            <td>${character.id}</td>
                            <td>${character.name}</td>
                            <td>${character.role}</td>
                            <td>${character.username || 'System'}</td>
                            <td>${character.is_public ? '✓' : '✗'}</td>
                            <td>${new Date(character.created_at).toLocaleDateString()}</td>
                            <td>
                                <button class="btn btn-warning" onclick="toggleCharacterPublic(${character.id}, ${!character.is_public})">
                                    ${character.is_public ? 'Make Private' : 'Make Public'}
                                </button>
                                <button class="btn btn-danger" onclick="deleteCharacter(${character.id})">
                                    Delete
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error loading characters:', error);
        document.getElementById('characters-table-container').innerHTML = '<p>Error loading characters</p>';
    }
}

async function loadChats() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const search = document.getElementById('chat-search')?.value || '';
        const filter = document.getElementById('chat-filter')?.value || 'all';
        
        const response = await fetch(
            `http://localhost:3000/api/admin/chats?admin_id=${user.id}&search=${encodeURIComponent(search)}&filter=${filter}`
        );
        const data = await response.json();
        
        const container = document.getElementById('chats-table-container');
        
        if (!data.success) {
            container.innerHTML = `<p>Error: ${data.message}</p>`;
            return;
        }
        
        if (data.chats.length === 0) {
            container.innerHTML = '<p>No chats found</p>';
            return;
        }
        
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>User</th>
                        <th>Messages</th>
                        <th>Created</th>
                        <th>Updated</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.chats.map(chat => `
                        <tr>
                            <td>${chat.id}</td>
                            <td>${chat.name}</td>
                            <td>${chat.username}</td>
                            <td>${chat.message_count || 0}</td>
                            <td>${new Date(chat.created_at).toLocaleDateString()}</td>
                            <td>${new Date(chat.updated_at).toLocaleDateString()}</td>
                            <td>
                                <button class="btn" onclick="viewChat(${chat.id})">View</button>
                                <button class="btn btn-danger" onclick="deleteChat(${chat.id})">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error loading chats:', error);
        document.getElementById('chats-table-container').innerHTML = '<p>Error loading chats</p>';
    }
}

async function loadLogs() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const action = document.getElementById('log-action-filter')?.value || '';
        const userId = document.getElementById('log-user-id')?.value || '';
        const dateFrom = document.getElementById('log-date-from')?.value || '';
        const dateTo = document.getElementById('log-date-to')?.value || '';
        
        let url = `http://localhost:3000/api/admin/logs?admin_id=${user.id}`;
        if (action) url += `&action=${action}`;
        if (userId) url += `&user_id=${userId}`;
        if (dateFrom) url += `&date_from=${dateFrom}`;
        if (dateTo) url += `&date_to=${dateTo}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        const container = document.getElementById('logs-table-container');
        
        if (!data.success) {
            container.innerHTML = `<p>Error: ${data.message}</p>`;
            return;
        }
        
        if (data.logs.length === 0) {
            container.innerHTML = '<p>No logs found</p>';
            return;
        }
        
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Time</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Details</th>
                        <th>IP Address</th>
                        <th>User Agent</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.logs.map(log => `
                        <tr>
                            <td>${log.id}</td>
                            <td>${new Date(log.created_at).toLocaleString()}</td>
                            <td>${log.username || log.user_id || 'N/A'}</td>
                            <td>${log.action}</td>
                            <td title="${log.details || ''}">${(log.details || '').substring(0, 50)}${(log.details || '').length > 50 ? '...' : ''}</td>
                            <td>${log.ip_address || ''}</td>
                            <td title="${log.user_agent || ''}">${(log.user_agent || '').substring(0, 30)}${(log.user_agent || '').length > 30 ? '...' : ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error loading logs:', error);
        document.getElementById('logs-table-container').innerHTML = '<p>Error loading logs</p>';
    }
}

async function loadSystemStatus() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        
        const response = await fetch(`http://localhost:3000/api/admin/system-status?admin_id=${user.id}`);
        const data = await response.json();
        
        const container = document.getElementById('system-status-container');
        
        if (!data.success) {
            container.innerHTML = `<p>Error: ${data.message}</p>`;
            return;
        }
        
        container.innerHTML = `
            <h3>Services</h3>
            <ul id="services-list">
                <li>Backend Server: <span style="color: green;">✓ Online</span></li>
                <li>Database: <span style="color: ${data.database_status ? 'green' : 'red'};">${data.database_status ? '✓ Connected' : '✗ Disconnected'}</span></li>
                <li>Mistral AI: <span style="color: ${data.mistral_online ? 'green' : 'red'};">${data.mistral_online ? '✓ Connected' : '✗ Disconnected'}</span></li>
            </ul>
            
            <h3>Database Stats</h3>
            <p>Users: ${data.stats?.users || 0}</p>
            <p>Characters: ${data.stats?.characters || 0}</p>
            <p>Chats: ${data.stats?.chats || 0}</p>
            <p>Messages: ${data.stats?.messages || 0}</p>
            <p>Logs: ${data.stats?.logs || 0}</p>
            
            <h3>Server Health</h3>
            <p>Uptime: ${data.uptime || 'Unknown'}</p>
            <p>Memory Usage: ${data.memory_usage || 'Unknown'}</p>
            <p>Active Connections: ${data.active_connections || 0}</p>
        `;
    } catch (error) {
        console.error('Error loading system status:', error);
        document.getElementById('system-status-container').innerHTML = '<p>Error loading system status</p>';
    }
}

// Action functions
async function toggleAdmin(userId, makeAdmin) {
    if (!confirm(`Are you sure you want to ${makeAdmin ? 'make this user an admin' : 'remove admin privileges from this user'}?`)) {
        return;
    }
    
    try {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        const response = await fetch(`http://localhost:3000/api/admin/users/${userId}/toggle-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                admin_id: currentUser.id,
                make_admin: makeAdmin 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('User updated successfully');
            loadUsers();
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error toggling admin:', error);
        alert('Server error. Please try again.');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? All their data will be removed.')) {
        return;
    }
    
    try {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        const response = await fetch(`http://localhost:3000/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: currentUser.id })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('User deleted successfully');
            loadUsers();
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Server error. Please try again.');
    }
}

async function toggleCharacterPublic(characterId, makePublic) {
    if (!confirm(`Are you sure you want to ${makePublic ? 'make this character public' : 'make this character private'}?`)) {
        return;
    }
    
    try {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        const response = await fetch(`http://localhost:3000/api/admin/characters/${characterId}/toggle-public`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                admin_id: currentUser.id,
                is_public: makePublic 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Character updated successfully');
            loadCharacters();
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error toggling character public status:', error);
        alert('Server error. Please try again.');
    }
}

async function deleteCharacter(characterId) {
    if (!confirm('Are you sure you want to delete this character?')) {
        return;
    }
    
    try {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        const response = await fetch(`http://localhost:3000/api/admin/characters/${characterId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: currentUser.id })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Character deleted successfully');
            loadCharacters();
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error deleting character:', error);
        alert('Server error. Please try again.');
    }
}

async function deleteChat(chatId) {
    if (!confirm('Are you sure you want to delete this chat?')) {
        return;
    }
    
    try {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        const response = await fetch(`http://localhost:3000/api/admin/chats/${chatId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: currentUser.id })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Chat deleted successfully');
            loadChats();
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error deleting chat:', error);
        alert('Server error. Please try again.');
    }
}

async function clearOldLogs() {
    if (!confirm('Are you sure you want to clear logs older than 30 days?')) {
        return;
    }
    
    try {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        const response = await fetch(`http://localhost:3000/api/admin/clear-old-logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: currentUser.id })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Old logs cleared successfully');
            loadLogs();
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error clearing logs:', error);
        alert('Server error. Please try again.');
    }
}

function viewChat(chatId) {
    window.open(`chat.html?admin_view=true&chat=${chatId}`, '_blank');
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}