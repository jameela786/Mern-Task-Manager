const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors'); 
const app = express();
app.use(cors({
    origin: 'http://localhost:3000', 
    methods: ['GET', 'POST','DELETE','PUT'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());


const SECRET_KEY = "jameela_secret_key";
let db = null;
const db_path = path.join(__dirname, 'tasktracker.db');

const dbInitAndConnect = async () => {
    try {
        db = await open({ filename: db_path, driver: sqlite3.Database });
              await db.exec(`
              CREATE TABLE IF NOT EXISTS users (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT NOT NULL,
                  email TEXT UNIQUE NOT NULL,
                  password TEXT NOT NULL,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              );
          `);
  
          await db.exec(`
              CREATE TABLE IF NOT EXISTS tasks (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  title TEXT NOT NULL,
                  description TEXT,
                  status TEXT CHECK(status IN ('Pending', 'In Progress', 'Completed')) DEFAULT 'Pending',
                  due_date TIMESTAMP,
                  user_id INTEGER,
                  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
              );
          `);
        app.listen(3001, () => console.log('Server running on port 3001'));
    } catch (e) {
        console.log(`DB Error: ${e.message}`);
        process.exit(-1);
    }
};

dbInitAndConnect();

// Signup API
app.post('/signup', async (request, response) => {
    const { name, email, password } = request.body;
    if (password.length < 5) {
        return response.status(400).json({ error: 'Password is too short' });
    }

    try {
        const userExistQuery = `SELECT * FROM users WHERE name = ?`;
        const dbUserResult = await db.get(userExistQuery, [name]);

        if (dbUserResult) {
            return response.status(400).json({ error: 'User already exists' });
        }

        const hashed_password = await bcrypt.hash(password, 13);
        const insertQuery = `INSERT INTO users (name, email, password, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`;
        await db.run(insertQuery, [name, email, hashed_password]);
        response.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        response.status(500).json({ error: 'Internal Server Error' });
    }
});



// Signin API
app.post('/signin', async (request, response) => {
    const { name, password } = request.body;
    const user = await db.get(`SELECT * FROM users WHERE name = ?`, [name]);
    if (!user) {
        return response.status(400).json({ error: 'Invalid User' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return response.status(400).json({ error: 'Invalid Password' });
    }
    const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '1h' });
    response.send({ token });
});


const authenticateToken = (request, response, next) => {
    try {
        const authHeader = request.headers['authorization'];
        
        if (!authHeader) {
            return response.status(401).json({ error: 'No authorization header' });
        }

        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return response.status(401).json({ error: 'No token provided' });
        }

        jwt.verify(token, SECRET_KEY, (err, decoded) => {
            if (err) {
                return response.status(403).json({ error: 'Invalid or expired token' });
            }
            request.user = decoded;
            next();
        });
    } catch (error) {
        console.error('Auth error:', error);
        response.status(500).json({ error: 'Authentication error' });
    }
};


// Protecting existing routes with authentication
app.get('/tasks', authenticateToken, async (request, response) => {
    let perPage = parseInt(request.query.perPage) || 4
    let page = parseInt(request.query.page) || 1
    let statusFilter = request.query.statusFilter;
    const offset = (page - 1) * perPage;

    let filterQuery = "";
    let countQuery = "";
    let countQueryParams = [request.user.userId];
    let filterQueryParams = [request.user.userId, perPage, offset];
    

    if (statusFilter === 'All') {
        countQuery = `SELECT COUNT(*) as total FROM tasks WHERE user_id = ?`;
        filterQuery = `SELECT * FROM tasks WHERE user_id = ? LIMIT ? OFFSET ?`;
    } else {
        countQuery = `SELECT COUNT(*) as total FROM tasks WHERE user_id = ? AND status = ?`;
        countQueryParams = [request.user.userId, statusFilter]

        filterQuery = `SELECT * FROM tasks WHERE user_id = ? AND status = ? LIMIT ? OFFSET ?`;
        filterQueryParams = [request.user.userId, statusFilter, perPage, offset]
    }

    
    try {
        const countResult = await db.get(countQuery, countQueryParams);
        const total = countResult.total;
        const taskList = await db.all(filterQuery, filterQueryParams);
        
        response.json({
            tasks: taskList,
            total: total,
            totalPages: Math.ceil(total / perPage)
        });
    } catch (error) {
        response.status(500).json({ error: 'Internal Server Error' });
    }
});

//POST /tasks – Create a new task
app.post('/tasks', authenticateToken, async (request, response) => {
    const { title, description, status, due_date } = request.body;
    const { userId } = request.user; 
    if (!title || !status) {
        return response.status(400).json({ error: 'Title and status are required' });
    }

    try {
        const insertQuery = `INSERT INTO tasks (title, description, status, due_date, user_id) 
                             VALUES (?, ?, ?, ?, ?)`;
        result = await db.run(insertQuery, [title, description, status, due_date, userId]);
        const taskItem = await db.get(`SELECT * FROM tasks WHERE id = ?`, [result.lastID]);
        response.status(201).json(taskItem);
    } catch (error) {
        response.status(500).json({ error: 'Internal Server Error' });
    }
});

//PUT /tasks/:id – Update task details or status
app.put('/tasks/:id', authenticateToken, async (request, response) => {
    const taskId = request.params.id;
    const { title, description, status, due_date } = request.body;
    const { userId } = request.user;
    if (!title || !status) {
        return response.status(400).json({ error: 'Title and status are required' });
    }

    try {
        const task = await db.get(`SELECT * FROM tasks WHERE id = ? AND user_id = ?`, [taskId, userId]);
        if (!task) {
            return response.status(404).json({ error: 'Task not found or unauthorized' });
        }

        const updateQuery = `UPDATE tasks SET title = ?, description = ?, status = ?, due_date = ? 
                             WHERE id = ? AND user_id = ?`;
        await db.run(updateQuery, [title || task.title, description || task.description, status || task.status, due_date || task.due_date, taskId, userId]);

        response.status(200).json({ message: 'Task updated successfully' });
    } catch (error) {
        response.status(500).json({ error: 'Internal Server Error' });
    }
});

//DELETE /tasks/:id – Delete a task
app.delete('/tasks/:id', authenticateToken, async (request, response) => {
    const taskId = request.params.id;
    const { userId } = request.user;

    try {
        const task = await db.get(`SELECT * FROM tasks WHERE id = ? AND user_id = ?`, [taskId, userId]);
        
        if (!task) {
            return response.status(404).json({ error: 'Task not found or unauthorized' });
        }

        const deleteQuery = `DELETE FROM tasks WHERE id = ? AND user_id = ?`;
        await db.run(deleteQuery, [taskId, userId]);

        response.status(200).json({ message: 'Task deleted successfully' });
    } catch (error) {
        response.status(500).json({ error: 'Internal Server Error' });
    }
});


