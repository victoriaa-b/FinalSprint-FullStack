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

    // Check if user exists
    if (!user) {
      console.log("User not found");
      return res.status(400).render("login", { errorMessage: "Invalid credentials" });
    }

    // Check if the hash starts with $2a$ (old bcrypt version)
    const isOldBcryptVersion = user.password.startsWith('$2a$');
    
    let match = false;

    // If the password was hashed with an older bcrypt version, we need to rehash the entered password
    if (isOldBcryptVersion) {
      // Rehash the entered password with bcrypt's latest version ($2b$)
      const rehashedPassword = await bcrypt.hash(password, 10);

      // Compare the rehashed password with the stored hash
      match = await bcrypt.compare(password, rehashedPassword);
      console.log('Rehashed Password Match:', match); // Log if rehashed password matches
    } else {
      // Proceed with the usual password comparison (password already hashed with $2b$ or latest version)
      match = await bcrypt.compare(password, user.password);
      console.log('Password Match:', match); // Log the result of the comparison
    }

    if (!match) {
      console.log("Password mismatch");
      return res.status(400).render("login", { errorMessage: "Invalid credentials" });
    }

    // Set session and redirect on successful login
    req.session.user = {
      username: user.username,
      role: user.role,
    };

    console.log("Session after login:", req.session);
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).send("Internal server error");
  }
});




app.get("/signup", (req, res) => {
  res.render("signup", { errorMessage: null });
});

// SOMEONE TAKE THIS PLS
// NOTE: it allows for sign up but wont let you login
app.post("/signup", async (req, res) => {
  const { username, password, email, role } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res
        .status(400)
        .render("signup", { errorMessage: "Username already taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Hashed Password:", hashedPassword);
    const newUser = new User({
      username,
      password: hashedPassword,
      email,
      role: role || "user", // role is what user selects if not default
    });
    console.log("Hashed Password:", hashedPassword);
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

app.get("/profile", isLoggedIn, async (req, res) => {
  try {
    const { username } = req.params; // get user from html
    const loggedUser = req.session.user; // need the user thats currently logged in

    const userRequest = await User.findOne({ username });

    if (!userRequest) {
      return res.status(404).send("The User could be not found");
    }

    res.render("profile", {
      loggedUser, 
      userRequest: username, 
      joinDate: userRequest.joinDate // when user account was created 
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching profile");
  }
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
