const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Render persistent disk path for uploads
const isRender = process.env.RENDER || false;
const uploadDir = isRender ? '/opt/render/project/src/data/uploads' : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// API Routes
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.getUser(username);
    if (user && user.password === password) {
        res.json({ id: user.id, username: user.username, status: user.status, role: user.role });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.get('/api/users', (req, res) => res.json(db.getAllUsers()));
app.get('/api/messages', (req, res) => res.json(db.getMessages()));
app.get('/api/notices', (req, res) => res.json(db.getNotices()));

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const mediaUrl = `/uploads/${req.file.filename}`;
    res.json({ url: mediaUrl });
});

// Socket Events
io.on('connection', (socket) => {
    socket.on('sendMessage', (data) => {
        const { userId, username, content, mediaType, mediaUrl } = data;
        const result = db.saveMessage(userId, username, content, mediaType, mediaUrl);
        io.emit('receiveMessage', { id: result.lastInsertRowid, userId, username, content, mediaType, mediaUrl, timestamp: new Date().toISOString() });
    });

    socket.on('editMessage', (data) => {
        const { id, content } = data;
        db.editMessage(id, content);
        io.emit('messageEdited', { id, content });
    });

    socket.on('deleteMessage', (id) => {
        db.deleteMessage(id);
        io.emit('messageDeleted', id);
    });

    socket.on('updateStatus', (data) => {
        const { username, status } = data;
        db.updateStatus(username, status);
        io.emit('statusUpdated', { username, status });
    });

    socket.on('sendNotice', (data) => {
        const { userId, username, title, content, mediaUrl } = data;
        db.saveNotice(userId, username, title, content, mediaUrl);
        io.emit('noticeReceived', { username, title, content, mediaUrl, timestamp: new Date().toISOString() });
    });
});

// SPA Fallback
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
        res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
    } else {
        next();
    }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
