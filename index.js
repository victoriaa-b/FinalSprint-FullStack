const express = require("express");
const expressWs = require("express-ws");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcrypt");
const { isLoggedIn, isAdmin, getAllUsers } = require("./controllers/userController");
const User = require("./models/user"); // User model
const Message = require('./models/message'); // Message model

const PORT = 3003;
const MONGO_URI = "mongodb://localhost:27017/chatAppDB";

const app = express();
expressWs(app);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(
  session({
    secret: "chat-app-secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      // Set the path to only be relevant to a specific route or part of your app
      path: '/',
      // The 'secure' option ensures cookies are only sent over HTTPS (useful for production)
      secure: false, // true if using HTTPS
      sameSite: 'strict', // Prevents cookies from being sent in cross-site requests
    }
  })
);

// Inject session user into response locals
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

let connectedClients = [];

// WebSocket Messaging
app.ws("/ws", (socket) => {
  let username;

  // When a message is received through WebSocket
  socket.on("message", async (rawMessage) => {
    const parsedMessage = JSON.parse(rawMessage);

    if (parsedMessage.type === "join") {
      // Handle user joining
      username = parsedMessage.username;
      connectedClients.push({ socket, username });

      // Notify all clients about the new user
      connectedClients.forEach((client) => {
        client.socket.send(
          JSON.stringify({
            type: "notification",
            message: `${username} has joined the chat!`,
          })
        );
      });

      // Send the previous messages from the DB to the new user
      const messages = await Message.find().sort({ timestamp: 1 });
      messages.forEach((msg) => {
        socket.send(
          JSON.stringify({
            type: "message",
            username: msg.username,
            message: msg.message,
            timestamp: msg.timestamp.toLocaleTimeString(),
          })
        );
      });
    } else if (parsedMessage.type === "message") {
      // Save the message to the database
      const newMessage = new Message({
        username,
        message: parsedMessage.message,
        timestamp: parsedMessage.timestamp,
      });

      try {
        await newMessage.save(); // Save message to DB
        console.log('Message saved to database');
      } catch (error) {
        console.error('Error saving message:', error);
      }

      // Broadcast the message to all connected clients
      connectedClients.forEach((client) => {
        if (client.socket !== socket) {
          client.socket.send(
            JSON.stringify({
              type: "message",
              username,
              message: parsedMessage.message,
              timestamp: parsedMessage.timestamp,
            })
          );
        }
      });
    }
  });

  // When the socket connection is closed (user leaves)
  socket.on("close", () => {
    if (username) {
      connectedClients = connectedClients.filter(
        (client) => client.username !== username
      );

      // Notify all users that someone has left
      connectedClients.forEach((client) => {
        client.socket.send(
          JSON.stringify({
            type: "notification",
            message: `${username} has left the chat.`,
          })
        );
      });
    }
  });
});



// Routes

// GETS

// Home page
app.get("/", async (req, res) => {
  const onlineUsers = connectedClients.length;
  let onlineMessage = " ";
  if (onlineUsers === 0) {
    onlineMessage = "No one is currently online. Be the only one!";
  } else if (onlineUsers < 2) {
    onlineMessage = "Only a couple of users are currently online. Join them!";
  } else {
    onlineMessage = "Plenty of users are online right now!";
  }

  res.render("unauthenticated", {
    onlineUsers: onlineUsers,
    onlineMessage: onlineMessage,
  });
});

// Login route
app.get("/login", (req, res) => {
  res.render("login", { errorMessage: null });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).render("login", { errorMessage: "Invalid credentials" });
    }

    const isOldBcryptVersion = user.password.startsWith('$2a$');
    let match = false;

    if (isOldBcryptVersion) {
      const rehashedPassword = await bcrypt.hash(password, 10);
      match = await bcrypt.compare(password, rehashedPassword);
    } else {
      match = await bcrypt.compare(password, user.password);
    }

    if (!match) {
      return res.status(400).render("login", { errorMessage: "Invalid credentials" });
    }

    req.session.user = { username: user.username, role: user.role };
    res.redirect("/chat");
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).send("Internal server error");
  }
});

// Signup route
app.get("/signup", (req, res) => {
  res.render("signup", { errorMessage: null });
});

app.post("/signup", async (req, res) => {
  const { username, password, email, role } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).render("signup", { errorMessage: "Username already taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      password: hashedPassword,
      email,
      role: role || "user", // Default to "user" if no role is provided
    });

    await newUser.save();
    res.redirect("/login");
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).send("Error registering user");
  }
});

// Dashboard and Profile routes

app.get("/profile/:username", isLoggedIn, async (req, res) => {
  try {
    const { username } = req.params;
    const loggedUser = req.session.user;

    const userRequest = await User.findOne({ username });
    if (!userRequest) {
      return res.status(404).send("The User could not be found");
    }

    const formattedJoinDate = userRequest.joinDate.toLocaleDateString();

    res.render("profile", {
      loggedUser,
      userRequest,
      joinDate: formattedJoinDate,
    });
  } catch (error) {
    console.error("Profile Error:", error);
    res.status(500).send("Error fetching profile");
  }
});

// Chat route
app.get("/chat", async (req, res) => {
  const loggedUser = req.session.user; // Get the logged-in user

  if (loggedUser) {
    try {
      // Fetch messages from the database
      const messages = await Message.find().sort({ timestamp: 1 }); // Sort by timestamp to show in order

      // Get logged-in users from connectedClients array
      const loggedUsers = connectedClients.map(client => client.username);

      res.render('chat', { loggedUser, messages, loggedUsers }); // Pass loggedUsers to the template
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).send("Error loading chat messages");
    }
  } else {
    res.redirect("/login"); // Redirect to login if user is not logged in
  }
});

// Route to save a message in the database
// Route to save a message in the database
app.post("/send-message", async (req, res) => {
  const { username, message, timestamp } = req.body;

  try {
    const newMessage = new Message({
      username,
      message,
      timestamp: new Date(timestamp),
    });

    await newMessage.save();
    res.status(200).json({ success: true, message: "Message saved!" });
  } catch (error) {
    console.error("Error saving message:", error);
    res.status(500).json({ success: false, error: "Failed to save message" });
  }
});


// Admin dashboard
app.get("/admin/dashboard", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const users = await getAllUsers();
    res.render("dashboard", {
      user: req.session.user,
      users: users, 
    });
  } catch (error) {
    console.error("Error in admin dashboard:", error);
    res.status(500).send("Internal Server Error");
  }
});


// Admin route to ban a user
app.post("/admin/ban-user", isLoggedIn, isAdmin, async (req, res) => {
  const userId = req.body.userId;
  try {
    await User.findByIdAndUpdate(userId, { status: "banned" });
    res.redirect("/admin/dashboard");
  } catch (error) {
    console.error("Error banning user:", error);
    res.status(500).send("Failed to ban user");
  }
});

// Admin route to remove a user
app.post("/admin/remove-user", isLoggedIn, isAdmin, async (req, res) => {
  const userId = req.body.userId;

  try {
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }
    console.log(`User with ID: ${userId} has been removed from the database`);
    res.redirect("/admin/dashboard");
  } catch (error) {
    console.error("There was a Error removing user:", error);
    res.status(500).send("Failed to remove user");
  }
});


// Logout route
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// MongoDB Connection
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

