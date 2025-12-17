const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const requestIp = require('request-ip');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(requestIp.mw());

// Serve static files from frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// PostgreSQL connection
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ai_users', 
    password: 'fyfcnfcbz2',
    port: 5432,
});

// Проверка прав администратора
app.get('/api/admin/check-admin', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');
        
        const { user_id } = req.query;
        
        if (!user_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'User ID is required' 
            });
        }
        
        const result = await pool.query(
            'SELECT is_admin FROM users WHERE id = $1',
            [user_id]
        );
        
        if (result.rows.length === 0) {
            return res.json({ 
                success: false, 
                is_admin: false 
            });
        }
        
        res.json({ 
            success: true, 
            is_admin: result.rows[0].is_admin 
        });
        
    } catch (error) {
        console.error('Check admin error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Запись лога
app.post('/api/logs', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');
        
        const { user_id, action, details } = req.body;
        
        // Получаем IP-адрес и user-agent из запроса
        const ip_address = req.clientIp; 
        const user_agent = req.get('User-Agent');
        
        const result = await pool.query(
            'INSERT INTO logs (user_id, action, details, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [user_id, action, details, ip_address, user_agent]
        );
        
        res.json({ 
            success: true, 
            log: result.rows[0] 
        });
        
    } catch (error) {
        console.error('Log save error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Получение персонажей для админки
app.get('/api/admin/characters', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');
        
        const { admin_id, search, filter } = req.query;
        
        // Проверяем права администратора
        const adminCheck = await pool.query(
            'SELECT is_admin FROM users WHERE id = $1',
            [admin_id]
        );
        
        if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied' 
            });
        }
        
        let query = `
            SELECT c.*, u.username 
            FROM characters c 
            LEFT JOIN users u ON c.user_id = u.id 
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;
        
        if (search) {
            query += ` AND (c.name ILIKE $${paramIndex} OR c.role ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        
        if (filter === 'public') {
            query += ` AND c.is_public = true`;
        } else if (filter === 'private') {
            query += ` AND c.is_public = false`;
        }
        
        query += ' ORDER BY c.created_at DESC';
        
        const result = await pool.query(query, params);
        
        res.json({ 
            success: true, 
            characters: result.rows 
        });
        
    } catch (error) {
        console.error('Admin characters error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Получение чатов для админки
app.get('/api/admin/chats', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');
        
        const { admin_id, search, filter } = req.query;
        
        // Проверяем права администратора
        const adminCheck = await pool.query(
            'SELECT is_admin FROM users WHERE id = $1',
            [admin_id]
        );
        
        if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied' 
            });
        }
        
        let query = `
            SELECT c.*, u.username, 
                   (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id) as message_count
            FROM chats c 
            LEFT JOIN users u ON c.user_id = u.id 
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;
        
        if (search) {
            query += ` AND c.name ILIKE $${paramIndex}`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        
        if (filter === 'today') {
            query += ` AND DATE(c.created_at) = CURRENT_DATE`;
        } else if (filter === 'week') {
            query += ` AND c.created_at >= CURRENT_DATE - INTERVAL '7 days'`;
        }
        
        query += ' ORDER BY c.updated_at DESC';
        
        const result = await pool.query(query, params);
        
        res.json({ 
            success: true, 
            chats: result.rows 
        });
        
    } catch (error) {
        console.error('Admin chats error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Получение статистики для дашборда
app.get('/api/admin/stats', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');
        
        const { admin_id } = req.query;
        
        // Проверяем права администратора
        const adminCheck = await pool.query(
            'SELECT is_admin FROM users WHERE id = $1',
            [admin_id]
        );
        
        if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied' 
            });
        }
        
        // Получаем статистику
        const stats = {};
        
        // Общее количество пользователей
        const usersResult = await pool.query('SELECT COUNT(*) FROM users');
        stats.total_users = parseInt(usersResult.rows[0].count);
        
        // Активные сегодня
        const today = new Date().toISOString().split('T')[0];
        const activeResult = await pool.query(
            'SELECT COUNT(DISTINCT user_id) FROM logs WHERE DATE(created_at) = $1',
            [today]
        );
        stats.active_today = parseInt(activeResult.rows[0].count || 0);
        
        // Общее количество чатов
        const chatsResult = await pool.query('SELECT COUNT(*) FROM chats');
        stats.total_chats = parseInt(chatsResult.rows[0].count);
        
        // Общее количество персонажей
        const charactersResult = await pool.query('SELECT COUNT(*) FROM characters');
        stats.total_characters = parseInt(charactersResult.rows[0].count);
        
        // Общее количество сообщений
        const messagesResult = await pool.query('SELECT COUNT(*) FROM messages');
        stats.total_messages = parseInt(messagesResult.rows[0].count);
        
        // Статус Mistral
        try {
            const mistralStatus = await fetch('http://127.0.0.1:1234/v1/models');
            stats.mistral_online = mistralStatus.ok;
        } catch {
            stats.mistral_online = false;
        }
        
        res.json({ 
            success: true, 
            stats 
        });
        
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Недавние действия
app.get('/api/admin/recent-activity', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');
        
        const { admin_id } = req.query;
        
        // Проверяем права администратора
        const adminCheck = await pool.query(
            'SELECT is_admin FROM users WHERE id = $1',
            [admin_id]
        );
        
        if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied' 
            });
        }
        
        const result = await pool.query(
            `SELECT l.*, u.username 
             FROM logs l 
             LEFT JOIN users u ON l.user_id = u.id 
             ORDER BY l.created_at DESC 
             LIMIT 50`
        );
        
        res.json({ 
            success: true, 
            logs: result.rows 
        });
        
    } catch (error) {
        console.error('Recent activity error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Получение списка пользователей (только для админа)
app.get('/api/admin/users', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');
        
        const { admin_id, search, filter } = req.query;
        
        // Проверяем права администратора
        const adminCheck = await pool.query(
            'SELECT is_admin FROM users WHERE id = $1',
            [admin_id]
        );
        
        if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied' 
            });
        }
        
        let query = 'SELECT id, username, email, is_admin, created_at FROM users';
        let whereConditions = [];
        let params = [];
        
        if (search) {
            whereConditions.push('(username ILIKE $1 OR email ILIKE $1)');
            params.push(`%${search}%`);
        }
        
        if (filter === 'admin') {
            whereConditions.push('is_admin = true');
        } else if (filter === 'regular') {
            whereConditions.push('is_admin = false');
        }
        
        if (whereConditions.length > 0) {
            query += ' WHERE ' + whereConditions.join(' AND ');
        }
        
        query += ' ORDER BY created_at DESC';
        
        const result = await pool.query(query, params);
        
        res.json({ 
            success: true, 
            users: result.rows 
        });
        
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Переключение статуса администратора
app.post('/api/admin/users/:id/toggle-admin', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');
        
        const { id } = req.params;
        const { admin_id, make_admin } = req.body;
        
        // Проверяем права администратора
        const adminCheck = await pool.query(
            'SELECT is_admin FROM users WHERE id = $1',
            [admin_id]
        );
        
        if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied' 
            });
        }
        
        // Не позволяем удалить себе права администратора
        if (parseInt(id) === parseInt(admin_id)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot modify your own admin status' 
            });
        }
        
        const result = await pool.query(
            'UPDATE users SET is_admin = $1 WHERE id = $2 RETURNING id, username, is_admin',
            [make_admin, id]
        );
        
        res.json({ 
            success: true, 
            user: result.rows[0] 
        });
        
    } catch (error) {
        console.error('Toggle admin error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Удаление пользователя
app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');
        
        const { id } = req.params;
        const { admin_id } = req.body;
        
        // Проверяем права администратора
        const adminCheck = await pool.query(
            'SELECT is_admin FROM users WHERE id = $1',
            [admin_id]
        );
        
        if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied' 
            });
        }
        
        // Не позволяем удалить себя
        if (parseInt(id) === parseInt(admin_id)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete yourself' 
            });
        }
        
        const result = await pool.query(
            'DELETE FROM users WHERE id = $1 RETURNING id',
            [id]
        );
        
        res.json({ 
            success: true, 
            message: 'User deleted successfully' 
        });
        
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Получение логов
app.get('/api/admin/logs', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');
        
        const { admin_id, action, user_id, date_from, date_to } = req.query;
        
        // Проверяем права администратора
        const adminCheck = await pool.query(
            'SELECT is_admin FROM users WHERE id = $1',
            [admin_id]
        );
        
        if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied' 
            });
        }
        
        let query = `
            SELECT l.*, u.username 
            FROM logs l 
            LEFT JOIN users u ON l.user_id = u.id 
            WHERE 1=1
        `;
        
        let params = [];
        let paramIndex = 1;
        
        if (action) {
            query += ` AND l.action = $${paramIndex}`;
            params.push(action);
            paramIndex++;
        }
        
        if (user_id) {
            query += ` AND l.user_id = $${paramIndex}`;
            params.push(user_id);
            paramIndex++;
        }
        
        if (date_from) {
            query += ` AND DATE(l.created_at) >= $${paramIndex}`;
            params.push(date_from);
            paramIndex++;
        }
        
        if (date_to) {
            query += ` AND DATE(l.created_at) <= $${paramIndex}`;
            params.push(date_to);
            paramIndex++;
        }
        
        query += ' ORDER BY l.created_at DESC LIMIT 1000';
        
        const result = await pool.query(query, params);
        
        res.json({ 
            success: true, 
            logs: result.rows 
        });
        
    } catch (error) {
        console.error('Admin logs error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Очистка старых логов
app.post('/api/admin/clear-old-logs', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');
        
        const { admin_id } = req.body;
        
        // Проверяем права администратора
        const adminCheck = await pool.query(
            'SELECT is_admin FROM users WHERE id = $1',
            [admin_id]
        );
        
        if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied' 
            });
        }
        
        // Исправленный запрос - сначала считаем, потом удаляем
        const countResult = await pool.query(
            'SELECT COUNT(*) FROM logs WHERE created_at < NOW() - INTERVAL \'30 days\''
        );
        
        const deleteResult = await pool.query(
            'DELETE FROM logs WHERE created_at < NOW() - INTERVAL \'30 days\''
        );
        
        const deletedCount = parseInt(countResult.rows[0].count || 0);
        
        res.json({ 
            success: true, 
            message: `Cleared ${deletedCount} old logs` 
        });
        
    } catch (error) {
        console.error('Clear logs error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Функция для логирования действий пользователей
async function logAction(action, details = '') {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const userId = user ? user.id : null;
        
        await fetch('http://localhost:3000/api/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                user_id: userId, 
                action, 
                details: JSON.stringify(details) 
            })
        });
    } catch (error) {
        console.error('Error logging action:', error);
    }
}

// Регистрация
app.post('/api/register', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');

        const { username, email, password } = req.body;
        
        // Проверяем существование пользователя
        const existingUser = await pool.query(
            'SELECT * FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'User already exists' 
            });
        }
        
        // Хешируем пароль
        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(password, salt);
        
        // Сохраняем пользователя
        const result = await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, email, passwordHash]
        );
        
        res.json({ 
            success: true, 
            user: result.rows[0] 
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error: ' + error.message 
        });
    }
});

// Авторизация
app.post('/api/login', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');

        const { email, password } = req.body;
        
        // Находим пользователя
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        const user = result.rows[0];
        
        // Проверяем пароль
        const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
        
        if (!isPasswordValid) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid password' 
            });
        }
        
        // Успешная авторизация
        res.json({ 
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Получение персонажей пользователя (и публичных)
app.get('/api/characters', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');

        const { user_id } = req.query;
        
        if (!user_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'User ID is required' 
            });
        }
        
        // Получаем персонажей пользователя И публичных персонажей
        const result = await pool.query(
            'SELECT * FROM characters WHERE user_id = $1 OR is_public = true ORDER BY created_at DESC',
            [user_id]
        );
        
        res.json({ 
            success: true,
            characters: result.rows 
        });
        
    } catch (error) {
        console.error('Characters error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Создание персонажа
app.post('/api/characters', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');

        const { user_id, name, role, description, prompt, examples, is_public } = req.body;
        
        if (!user_id || !name || !role || !prompt) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }
        
        const result = await pool.query(
            `INSERT INTO characters (user_id, name, role, description, prompt, examples, is_public) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [user_id, name, role, description || '', prompt, examples || '', is_public || false]
        );
        
        res.json({ 
            success: true,
            character: result.rows[0] 
        });
        
    } catch (error) {
        console.error('Create character error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error: ' + error.message 
        });
    }
});

// Поиск персонажей с фильтрами
app.get('/api/characters/search', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');

        const { user_id, search } = req.query;
        
        if (!user_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'User ID is required' 
            });
        }
        
        let query = 'SELECT * FROM characters WHERE (user_id = $1 OR is_public = true)';
        let params = [user_id];
        let paramIndex = 2;
        
        if (search) {
            query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        
        query += ' ORDER BY created_at DESC';
        
        const result = await pool.query(query, params);
        
        res.json({ 
            success: true,
            characters: result.rows 
        });
        
    } catch (error) {
        console.error('Characters search error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});


// Получение одного персонажа по ID
app.get('/api/characters/:id', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');

        const { id } = req.params;
        
        const result = await pool.query(
            'SELECT * FROM characters WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Character not found' 
            });
        }
        
        res.json({ 
            success: true,
            character: result.rows[0] 
        });
        
    } catch (error) {
        console.error('Character fetch error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Обновление персонажа

// Обновление персонажа
app.put('/api/characters/:id', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');

        const { id } = req.params;
        const { name, role, description, prompt, examples, is_public } = req.body;
        
        const result = await pool.query(
            `UPDATE characters 
             SET name = $1, role = $2, description = $3, prompt = $4, examples = $5, is_public = $6
             WHERE id = $7 RETURNING *`,
            [name, role, description, prompt, examples, is_public || false, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Character not found' 
            });
        }
        
        res.json({ 
            success: true,
            character: result.rows[0] 
        });
        
    } catch (error) {
        console.error('Update character error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Удаление персонажа
app.delete('/api/characters/:id', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');

        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM characters WHERE id = $1 RETURNING id',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Character not found' 
            });
        }
        
        res.json({ 
            success: true,
            message: 'Character deleted successfully' 
        });
        
    } catch (error) {
        console.error('Delete character error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Новый endpoint для взаимодействия с Mistral API
app.post('/api/chat/completions', async (req, res) => {
    try {
        const { messages, character_id, temperature = 0.7, max_tokens = 500 } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({
                success: false,
                message: 'Messages array is required'
            });
        }
        
        // Формируем запрос к локальному Mistral
        const mistralResponse = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: "mistralai/ministral-3-3b",
                messages: messages,
                temperature: temperature,
                max_tokens: max_tokens,
                stream: false
            })
        });
        
        if (!mistralResponse.ok) {
            throw new Error(`Mistral API error: ${mistralResponse.status}`);
        }
        
        const data = await mistralResponse.json();
        
        res.json({
            success: true,
            response: data.choices[0].message.content,
            usage: data.usage
        });
        
    } catch (error) {
        console.error('Mistral API error:', error);
        
        // Fallback response если Mistral недоступен
        res.json({
            success: true,
            response: "I'm currently having trouble connecting to my AI model. Please make sure Mistral is running on http://127.0.0.1:1234",
            error: error.message,
            fallback: true
        });
    }
});

// Получение списка чатов пользователя
app.get('/api/chats', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');

        const { user_id, search } = req.query;
        
        if (!user_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'User ID is required' 
            });
        }
        
        let query = 'SELECT * FROM chats WHERE user_id = $1';
        let params = [user_id];
        
        if (search) {
            query += ' AND name ILIKE $2';
            params.push(`%${search}%`);
        }
        
        query += ' ORDER BY updated_at DESC';
        
        const result = await pool.query(query, params);
        
        res.json({ 
            success: true,
            chats: result.rows 
        });
        
    } catch (error) {
        console.error('Chats fetch error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Создание нового чата
app.post('/api/chats', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');

        const { user_id, name } = req.body;
        
        // Если имя не указано, генерируем автоматическое
        let chatName = name;
        if (!chatName) {
            // Находим последний чат пользователя для нумерации
            const lastChat = await pool.query(
                'SELECT name FROM chats WHERE user_id = $1 AND name LIKE $2 ORDER BY created_at DESC LIMIT 1',
                [user_id, 'Чат %']
            );
            
            if (lastChat.rows.length > 0) {
                const lastNumber = parseInt(lastChat.rows[0].name.replace('Чат ', ''));
                chatName = `Чат ${lastNumber + 1}`;
            } else {
                chatName = 'Чат 1';
            }
        }
        
        const result = await pool.query(
            'INSERT INTO chats (user_id, name) VALUES ($1, $2) RETURNING *',
            [user_id, chatName]
        );
        
        res.json({ 
            success: true,
            chat: result.rows[0] 
        });
        
    } catch (error) {
        console.error('Create chat error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Обновление названия чата
app.put('/api/chats/:id', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');

        const { id } = req.params;
        const { name } = req.body;
        
        const result = await pool.query(
            `UPDATE chats SET name = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 RETURNING *`,
            [name, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Chat not found' 
            });
        }
        
        res.json({ 
            success: true,
            chat: result.rows[0] 
        });
        
    } catch (error) {
        console.error('Update chat error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Удаление чата
app.delete('/api/chats/:id', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');

        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM chats WHERE id = $1 RETURNING id',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Chat not found' 
            });
        }
        
        res.json({ 
            success: true,
            message: 'Chat deleted successfully' 
        });
        
    } catch (error) {
        console.error('Delete chat error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Сохранение сообщения в чат
app.post('/api/chats/:chat_id/messages', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');

        const { chat_id } = req.params;
        const { role, content } = req.body;
        
        // Обновляем время обновления чата
        await pool.query(
            'UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [chat_id]
        );
        
        const result = await pool.query(
            'INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3) RETURNING *',
            [chat_id, role, content]
        );
        
        res.json({ 
            success: true,
            message: result.rows[0] 
        });
        
    } catch (error) {
        console.error('Save message error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Получение сообщений чата
app.get('/api/chats/:chat_id/messages', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');

        const { chat_id } = req.params;
        
        const result = await pool.query(
            'SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC',
            [chat_id]
        );
        
        res.json({ 
            success: true,
            messages: result.rows 
        });
        
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Получение информации о статусе Mistral
app.get('/api/mistral/status', async (req, res) => {
    try {
        const statusResponse = await fetch('http://127.0.0.1:1234/v1/models', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (statusResponse.ok) {
            const data = await statusResponse.json();
            res.json({
                success: true,
                available: true,
                models: data.data,
                message: 'Mistral is running and ready'
            });
        } else {
            res.json({
                success: false,
                available: false,
                message: 'Mistral is not responding'
            });
        }
        
    } catch (error) {
        res.json({
            success: false,
            available: false,
            message: 'Cannot connect to Mistral: ' + error.message
        });
    }
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Frontend served from: ${path.join(__dirname, '../frontend')}`);
    console.log(`Mistral API endpoint: http://127.0.0.1:1234/v1/chat/completions`);
});