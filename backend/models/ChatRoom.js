const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
  description: { type: String, trim: true, maxlength: 240, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isDiscoverable: { type: Boolean, default: true },
  joinCode: { type: String, required: true, unique: true },
}, { timestamps: true });

chatRoomSchema.index({ isDiscoverable: 1, name: 1 });
chatRoomSchema.index({ members: 1 });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
