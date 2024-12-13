const socket = new WebSocket("ws://localhost:3000/ws");

const messageForm = document.getElementById('chat-form');
const messageInput = document.getElementById('chat-message');
const messagesContainer = document.getElementById('messages');

// Check if the required elements exist
if (!messageForm || !messageInput || !messagesContainer) {
  console.error("Required HTML elements (chat-form, chat-message, messages) not found.");
}

// Notify when user joins (username will be passed from EJS in the inline script)
socket.addEventListener('open', () => {
  console.log('WebSocket connection established.');
  // Assuming loggedUser is globally available because it's passed from the inline script
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
  }
});

// Send message when form is submitted
messageForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const message = messageInput.value.trim();

  if (message) {
    const timestamp = new Date().toLocaleTimeString();

    // Send the message with username and timestamp
    socket.send(JSON.stringify({
      type: 'message',
      username: loggedUser.username,
      message,
      timestamp,
    }));

    // Display the sent message immediately (optional)
    displayMessage(loggedUser.username, message, timestamp);
  } else {
    console.warn('Empty message cannot be sent.');
  }

  // Clear the input field after sending the message
  messageInput.value = '';
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

// Function to display notifications (e.g., user joins)
function displayNotification(message) {
  const notificationElement = document.createElement('div');
  notificationElement.classList.add('message');
  notificationElement.style.backgroundColor = '#e0e0e0'; // Style for notifications
  notificationElement.innerHTML = `<p>${message}</p>`;
  messagesContainer.appendChild(notificationElement);

  // Scroll to the bottom when a new message is added
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
