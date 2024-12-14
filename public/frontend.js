const socket = new WebSocket("ws://localhost:3000/ws");

const messageForm = document.getElementById('chat-form');
const messageInput = document.getElementById('chat-message');
const messagesContainer = document.getElementById('messages');

// On WebSocket connection open
socket.addEventListener('open', () => {
  console.log('WebSocket connection established.');
  // Send the "join" event when the user joins
  socket.send(JSON.stringify({ type: 'join', username: loggedUser.username }));
});

// Handle incoming messages
socket.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log('Received data:', data); // Log incoming message

  if (data.type === 'message') {
    displayMessage(data.username, data.message, data.timestamp);
  } else if (data.type === 'notification') {
    displayNotification(data.message);
  } else if (data.type === 'updateUsers') {
    updateUserList(data.users); // Update the user list in the sidebar
  }
});

// Submit message to WebSocket server
messageForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const message = messageInput.value.trim();
  
  if (message) {
    const timestamp = new Date().toLocaleTimeString();
    socket.send(JSON.stringify({
      type: 'message',
      username: loggedUser.username,
      message,
      timestamp,
    }));

    // Display the sent message immediately
    displayMessage(loggedUser.username, message, timestamp);

    // Save the message to the database
    try {
      await fetch('/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loggedUser.username,
          message: message,
          timestamp: timestamp,
        }),
      });
    } catch (error) {
      console.error("Error sending message to backend:", error);
    }
  }

  messageInput.value = '';  // Clear input after sending
});

// Function to display a message in the chat
function displayMessage(username, message, timestamp) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');

  // Render the message with the username and timestamp
  messageElement.innerHTML = `
    <p class="username">${username} <span class="timestamp">${timestamp}</span></p>
    <p>${message}</p>
  `;

  messagesContainer.appendChild(messageElement);

  // Scroll to the bottom when a new message is added
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Helper function to display notifications (user join alerts)
function displayNotification(message) {
  const notificationElement = document.createElement('div');
  notificationElement.classList.add('message');
  notificationElement.style.backgroundColor = '#e0e0e0'; // Custom notification styling
  notificationElement.innerHTML = `<p>${message}</p>`;
  messagesContainer.appendChild(notificationElement);
  messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to bottom
}

// Function to update the user list in the sidebar
function updateUserList(users) {
  const userListElement = document.getElementById('user-list');
  userListElement.innerHTML = ''; // Clear existing list

  if (users.length > 0) {
    // Add the logged-in user at the top
    const loggedUserItem = document.createElement('li');
    loggedUserItem.innerHTML = `<a href="/profile/${loggedUser.username}">${loggedUser.username}</a>`;
    userListElement.appendChild(loggedUserItem);

    // Add other users
    users.forEach(user => {
      if (user !== loggedUser.username) {
        const listItem = document.createElement('li');
        listItem.innerHTML = `<a href="/profile/${user}">${user}</a>`;
        userListElement.appendChild(listItem);
      }
    });
  } else {
    const noUsersMessage = document.createElement('li');
    noUsersMessage.textContent = 'No users are currently logged in.';
    userListElement.appendChild(noUsersMessage);
  }
}
