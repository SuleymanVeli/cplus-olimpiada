import mongoose from 'mongoose';
import { Schema, model, Document } from 'mongoose';

export interface IQuestionProgress {
  questionId: string; // Contest daxilindəki məsələnin alt ID-si
  code: string;
  testStatuses: ('waiting' | 'checking' | 'passed' | 'failed')[];
  compilerError: string | null;
  userPassedCount: number;
  score: number; // Bu məsələdən aldığı xal (userPassedCount * pointsPerTest)
}

export interface ISubmission extends Document {
  contestId: Schema.Types.ObjectId;
  studentId: Schema.Types.ObjectId;
  totalScore: number; // Bütün məsələlərin cəm xalı
  activeQuestionId: string; // Şagirdin son qaldığı məsələ
  progress: Map<string, IQuestionProgress>; // Key: questionId, Value: gedişat
}

const SubmissionSchema = new Schema<ISubmission>({
  contestId: { type: Schema.Types.ObjectId, ref: 'Contest', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  totalScore: { type: Number, default: 0, required: true },
  activeQuestionId: { type: String },
  // Map istifadə etmək O(1) zaman kəsimində şagirdin kodunu yeniləməyə kömək edir
  progress: {
    type: Map,
    of: new Schema({
      questionId: { type: String, required: true },
      code: { type: String, default: '' },
      testStatuses: [{ type: String, enum: ['waiting', 'checking', 'passed', 'failed'] }],
      compilerError: { type: String, default: null },
      userPassedCount: { type: Number, default: 0 },
      score: { type: Number, default: 0 }
    })
  }
}, { timestamps: true });

// Yarış və Şagird cütlüyünün unikal olmasını təmin edirik (Bir şagird bir yarışa 1 dəfə qatıla bilər)
SubmissionSchema.index({ contestId: 1, studentId: 1 }, { unique: true });

if (!mongoose.models.Contest) {
  mongoose.model('Contest', new mongoose.Schema({})); 
}

export default mongoose.models.Submission || mongoose.model<ISubmission>('Submission', SubmissionSchema);