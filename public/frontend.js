// Double check logic 
const webSocket = new WebSocket("ws://localhost:3000/ws");

webSocket.addEventListener("message", (event) => {
    const eventData = JSON.parse(event.data);

});

function onUserConnected(username) {
    const userList = document.getElementById("userList"); // take list of users
    const newUser = document.createElement("li"); // could change to ui later
    newUser.textContent = username;
    newUser.setAttribute("id", `user${username}`); // gives each user their own id
    userList.appendChild(newUser); // add new user to the list

}


//  Handles updating the chat list when a user disconnects from the chat
function onUserDisconnected(username) {
    const userNode = document.getElementById(`user${username}`); // gets the user html node
    if (userNode){
        userNode.remove(); // removes the username/node from the user list 
    }

}


// Handles updating the chat when a new message is receieved
function onNewMessageReceived(username, timestamp, message) {
    const chatBox = document.getElementById("ChatBox");
    const newMessage = document.createElement("div"); // makes new div for new message
    // formatting for the message displays
    newMessage.innerHTML = `<strong>${username}</strong> [${new Date(timestamp).toLocaleTimeString()}]: ${message}`;
    userList.appendChild(newMessage);
    chatBox.scrollTop = chatBox.scrollHeight; // user can scroll to the new message 

}

// Handles sending a message to the server when the user sends a new message
function onMessageSent(event) {
  event.preventDefault();
  const message = document.getElementById("message-input").value;
  webSocket.send(JSON.stringify({ type: "new-message", message })); // message get to JSON
  document.getElementById("message-input").value = ""; 
}

document.getElementById("message-form").addEventListener("submit", onMessageSent);