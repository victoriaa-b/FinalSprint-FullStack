import express from 'express';
import expressWs from 'express-ws';
import path from 'path';
import mongoose from 'mongoose';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import User from './models/User.js'; // Assuming you have a User model defined in models/User.js

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 3000;
//TODO: Replace with the URI pointing to your own MongoDB setup
const MONGO_URI = 'mongodb://localhost:27017/chatAppDB';
const app = express();
expressWs(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(session({
    secret: 'chat-app-secret',
    resave: false,
    saveUninitialized: true
}));

let connectedClients = [];
// add MongoDB connection
mongoose
    .connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

//Note: These are (probably) not all the required routes, but are a decent starting point for the routes you'll probably need

// WebSocket messaging
app.ws('/ws', (socket) => {
    socket.on('message', (rawMessage) => {
        const parsedMessage = JSON.parse(rawMessage);
        console.log('Message received:', parsedMessage);

        // Broadcast message to all connected clients
        connectedClients.forEach((client) => {
            if (client !== socket) {
                client.send(JSON.stringify(parsedMessage));
            }
        });
    });

    socket.on('close', () => {
        connectedClients = connectedClients.filter((client) => client !== socket);
        console.log('Client disconnected');
    });

    connectedClients.push(socket);
    console.log('New client connected');
});
// Routes - Gets and Posts

app.get('/', async (_req, res) => {
    res.render('index/unauthenticated');
});

app.get('/login', (_req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Example user authentication logic (replace with your logic)
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.render('login', { errorMessage: 'Invalid credentials' });
    }

    req.session.userId = user._id;
    res.redirect('/dashboard');
});

app.get('/signup', async (_req, res) => {
  res.render('signup', { errorMessage: null });
});

app.post('/signup', async (req, res) => {
  const { username, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
        return res.render('signup', { errorMessage: 'Username already taken' });
    }

    // Create a new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.redirect('/login');
});

app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.render('index/authenticated');
});

app.get('/profile', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    const user = await User.findById(req.session.userId);
    res.render('profile', { user });
});

app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
/**
 * Handles a client disconnecting from the chat server
 * 
 * This function isn't necessary and should be deleted if unused. But it's left as a hint to how you might want 
 * to handle the disconnection of clients
 * 
 * @param {string} username The username of the client who disconnected
 */
function onClientDisconnected(username) {
    console.log(`Client ${username} disconnected`);
}

/**
 * Handles a new client connecting to the chat server
 * 
 * This function isn't necessary and should be deleted if unused. But it's left as a hint to how you might want 
 * to handle the connection of clients
 * 
 * @param {WebSocket} newSocket The socket the client has opened with the server
 * @param {string} username The username of the user who connected
 */
function onNewClientConnected(newSocket, username) {
    console.log(`New client connected: ${username}`);
}


/**
 * Handles a new chat message being sent from a client
 * 
 * This function isn't necessary and should be deleted if unused. But it's left as a hint to how you might want 
 * to handle new messages
 * 
 * @param {string} message The message being sent
 * @param {string} username The username of the user who sent the message
 * @param {strng} id The ID of the user who sent the message
 */
async function onNewMessage(message, username, id) {
    console.log(`New message from ${username} (ID: ${id}): ${message}`);
}