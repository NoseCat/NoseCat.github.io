const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

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

// Регистрация
app.post('/api/register', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');

        const { username, email, password } = req.body;
        
        // Проверяем существование пользователя
        const existingUser = await pool.query(
            'SELECT * FROM schema_ai.users WHERE email = $1 OR username = $2;',
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
            'INSERT INTO schema_ai.users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
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
            message: 'Server error' 
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

// Получение персонажей пользователя
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
        
        const result = await pool.query(
            'SELECT * FROM characters WHERE user_id = $1 ORDER BY created_at DESC',
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

        const { user_id, name, role, description, prompt, examples } = req.body;
        
        const result = await pool.query(
            `INSERT INTO characters (user_id, name, role, description, prompt, examples) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [user_id, name, role, description, prompt, examples]
        );
        
        res.json({ 
            success: true,
            character: result.rows[0] 
        });
        
    } catch (error) {
        console.error('Create character error:', error);
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
app.put('/api/characters/:id', async (req, res) => {
    try {
        await pool.query('set search_path = "schema_ai"');

        const { id } = req.params;
        const { name, role, description, prompt, examples } = req.body;
        
        const result = await pool.query(
            `UPDATE characters 
             SET name = $1, role = $2, description = $3, prompt = $4, examples = $5
             WHERE id = $6 RETURNING *`,
            [name, role, description, prompt, examples, id]
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