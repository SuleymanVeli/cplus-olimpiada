import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String },
  avatar: String,
  inviteCode: { type: String, unique: true }, // Sənin generate etdiyin ID
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  isRegistered: { type: Boolean, default: false },
  registeredAt: Date,
  globalNote: { type: String, default: "" }, // Şagirdə özəl qeydin
  assignedTasks: [{
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    assignedAt: { type: Date, default: Date.now }
  }]
});

export default mongoose.models.User || mongoose.model('User', UserSchema);