const express = require("express");
const expressWs = require("express-ws");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcrypt");
const { isLoggedIn, isAdmin } = require("./controllers/userController");
const User = require("./models/user"); // Ensure correct path to the User model

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

  socket.on("message", (rawMessage) => {
    const parsedMessage = JSON.parse(rawMessage);

    if (parsedMessage.type === "join") {
      // Client connection and their username when they join will be saved
      username = parsedMessage.username;
      connectedClients.push({ socket, username });

      // Notify all users that someone new has joined the app
      connectedClients.forEach((client) => {
        client.socket.send(
          JSON.stringify({
            type: "notification",
            message: `${username} has joined the chat!`,
          })
        );
      });
    } else if (parsedMessage.type === "message") {
      // Broadcast chat messages
      connectedClients.forEach((client) => {
        if (client.socket !== socket) {
          client.socket.send(
            JSON.stringify({
              type: "message",
              username,
              message: parsedMessage.message,
            })
          );
        }
      });
    }
  });

  socket.on("close", () => {
    if (username) {
      // Remove the client from the online list
      connectedClients = connectedClients.filter(
        (client) => client.username !== username
      );
    }
  });
});

// Routes Gets and Posts
// clean up this mess ME


// GETS
app.get("/", async (request, response) => {
  const onlineUsers = connectedClients.length; // number of user online

  let onlineMessage = " ";
  if (onlineUsers === 0) {
    onlineMessage = "No one is currently online. Be the only one!";
  } else if (onlineUsers < 2) {
    onlineMessage = "Only a couple of users are currently online. Join them!";
  } else {
    onlineMessage = "Plenty of users are online right now! ";
  }
  response.render("unauthenticated", {
    onlineUsers: onlineUsers,
    onlineMessage: onlineMessage,
  });
});

app.get("/login", (req, res) => {
  res.render("login", { errorMessage: null });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res
        .status(400)
        .render("login", { errorMessage: "Invalid credentials" });
    }

    req.session.user = {
      username: user.username,
      role: user.role,
    };
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

app.get("/signup", (req, res) => {
  res.render("signup", { errorMessage: null });
});

app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res
        .status(400)
        .render("signup", { errorMessage: "Username already taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      password: hashedPassword,
      role // role is what user selects
    });
    // Save user to the database
    await newUser.save();
    res.redirect("/login");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error registering user");
  }
});

app.get("/dashboard", isLoggedIn, (req, res) => {
  res.render("authenticated", { user: req.session.user });
});

app.get("/profile", isLoggedIn, (req, res) => {
  res.render("profile", { user: req.session.user });
});

app.get("/chat", isLoggedIn, (req, res) => {
  res.render("chat", { user: req.session.user });
});

app.get("/admin-dashboard", [isLoggedIn, isAdmin], (req, res) => {
  res.render("admin-dashboard", { user: req.session.user });
});


app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// MongoDB Connection
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() =>
    app.listen(PORT, () =>
      console.log(`Server running on http://localhost:${PORT}`)
    )
  )
  .catch((err) => console.error("MongoDB connection error:", err));
