// Messages include at least: what was sent, who sent it and when it was sent

const mongoose = require("mongoose")

const messageModel = new mongoose.Schema({
  text: { type: String, trim: true, required: [true, "Message needs to contain text"],}, // what was sent
  senderID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: [true, "The Sender details are required"],}, /// who sent this 
  dateCreated: { type: Date, default: () => new Date(),}, // takes the date the message was created then bring the current date
});

const Message = mongoose.model("Message", messageModel);
module.exports = Message;