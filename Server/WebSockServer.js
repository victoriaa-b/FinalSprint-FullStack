import express from 'express';
import http from 'http';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes';
import chatRoutes from './routes/chatRoutes';
import adminRoutes from './routes/adminRoutes';

const app = express();
const server = http.createServer(app);
const io = new server.Server(server);

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/chatAppDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define the schema for a message
const messageSchema = new mongoose.Schema({
  text: { type: String, required: true },
  sender: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model('Message', messageSchema); // Create model

// Export it for later use
export { Message };

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/chatAppDB' }),
  })
);
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Routes
app.use('/', authRoutes);
app.use('/chat', chatRoutes);
app.use('/admin', adminRoutes);

// WebSocket logic
io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));
