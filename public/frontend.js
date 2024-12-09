const webSocket = new WebSocket("ws://localhost:3000/ws");

webSocket.addEventListener("message", (event) => {
    const eventData = JSON.parse(event.data);

});

//This function isn't necessary and should be deleted if unused. But it's left as a hint to how you might want 
// to handle users connecting

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

}

/**
 * Handles sending a message to the server when the user sends a new message
 * @param {FormDataEvent} event The form submission event containing the message information
 */
function onMessageSent(event) {
    //Note: This code might not work, but it's left as a bit of a hint as to what you might want to do when handling 
    //      new messages. It assumes that user's are sending messages using a <form> with a <button> clicked to
    //      do the submissions. 
    event.preventDefault();
    const formData = new FormData(event.target, event.submitter);
    const inputs = event.target.querySelectorAll("input");
}

//Note: This code might not work, but it's left as a bit of a hint as to what you might want to do trying to setup 
//      adding new messages
document.getElementById("message-form").addEventListener("submit", onMessageSent);