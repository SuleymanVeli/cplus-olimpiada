import mongoose, { Schema, Document } from 'mongoose';

export interface ICodeQueue extends Document {
  submissionDocId: Schema.Types.ObjectId;
  contestId: Schema.Types.ObjectId;
  studentId: Schema.Types.ObjectId;
  questionId: string;
  code: string;
  status: 'queued' | 'processing';
  lockedAt: Date | null;
}

const CodeQueueSchema = new Schema<ICodeQueue>({
  submissionDocId: { type: Schema.Types.ObjectId, ref: 'Submission', required: true },
  contestId: { type: Schema.Types.ObjectId, ref: 'Contest', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  questionId: { type: String, required: true },
  code: { type: String, required: true },
  status: { type: String, enum: ['queued', 'processing'], default: 'queued' },
  lockedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.models.CodeQueue || mongoose.model<ICodeQueue>('CodeQueue', CodeQueueSchema);