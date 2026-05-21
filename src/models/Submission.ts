import mongoose, { Schema } from 'mongoose';

// Submission Model
const SubmissionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
  // Hər bir sual üçün cavablar
  answers: [{
    questionId: String, // Tapşırıq paketindəki sualın ID-si
    questionTitle: String,
    studentCode: { type: String, default: "" },
    adminNote: { type: String, default: "" } // Hər kod üçün xüsusi qeyd
  }],
  status: { type: String, enum: ['pending', 'submitted', 'reviewed'], default: 'pending' },
  submittedAt: Date
});

export default mongoose.models.Submission || mongoose.model('Submission', SubmissionSchema);