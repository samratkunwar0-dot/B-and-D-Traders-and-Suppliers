const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// On Render Free Tier, we just use the current directory.
// Note: Data will be lost when the server restarts/sleeps.
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

// Create tables
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'user',
        status TEXT DEFAULT 'At office'
    );

    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        username TEXT,
        content TEXT,
        mediaType TEXT,
        mediaUrl TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        username TEXT,
        title TEXT,
        content TEXT,
        mediaUrl TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES users(id)
    );
`);

// Migration to add role column if it doesn't exist
try {
    db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';`);
} catch (e) { }

// Seed users
const users = [
    { name: 'samrat', role: 'superadmin' },
    { name: 'mandira', role: 'admin' },
    { name: 'ganesh', role: 'admin' },
    { name: 'Tara', role: 'user' },
    { name: 'Sundari', role: 'user' },
    { name: 'Srijana', role: 'user' },
    { name: 'Pramila', role: 'user' },
    { name: 'Roshan', role: 'user' },
    { name: 'Pralad', role: 'user' },
    { name: 'Santosh', role: 'user' },
    { name: 'Sarmila', role: 'user' }
];

const upsertUser = db.prepare(`
    INSERT INTO users (username, password, role) 
    VALUES (?, ?, ?) 
    ON CONFLICT(username) DO UPDATE SET password=excluded.password, role=excluded.role
`);

users.forEach(u => {
    upsertUser.run(u.name, \`\${u.name}123\`, u.role);
});

module.exports = {
    db,
    getUser: (username) => db.prepare('SELECT * FROM users WHERE username = ?').get(username),
    updateStatus: (username, status) => db.prepare('UPDATE users SET status = ? WHERE username = ?').run(status, username),
    getAllUsers: () => db.prepare('SELECT username, status FROM users').all(),
    saveMessage: (userId, username, content, mediaType, mediaUrl) =>
        db.prepare('INSERT INTO messages (userId, username, content, mediaType, mediaUrl) VALUES (?, ?, ?, ?, ?)').run(userId, username, content, mediaType, mediaUrl),
    getMessages: () => db.prepare('SELECT * FROM messages ORDER BY timestamp ASC').all(),
    editMessage: (id, content) => db.prepare('UPDATE messages SET content = ? WHERE id = ?').run(content, id),
    deleteMessage: (id) => db.prepare('DELETE FROM messages WHERE id = ?').run(id),
    saveNotice: (userId, username, title, content, mediaUrl) =>
        db.prepare('INSERT INTO notices (userId, username, title, content, mediaUrl) VALUES (?, ?, ?, ?, ?)').run(userId, username, title, content, mediaUrl),
    getNotices: () => db.prepare('SELECT * FROM notices ORDER BY timestamp DESC').all()
};
