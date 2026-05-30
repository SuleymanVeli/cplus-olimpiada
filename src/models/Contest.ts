import mongoose, { Schema, model, Document } from 'mongoose';

export interface ISampleCase {
  input: string;
  output: string;
  explanation?: string;
}

export interface ITestCase {
  input: string;
  expectedOutput: string;
  isSecret: boolean;
}

export interface IQuestion {
  codeName: string; // 'A', 'B', 'C'
  title: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[]; // ['Time Limit: 1.0s', 'Memory: 256MB']
  pointsPerTest: number;
  totalTestCases: number;
  sampleCases: ISampleCase[];
  testCases: ITestCase[]; // Real yoxlanış testləri (Şagirddən gizlidir)
}

export interface IContest extends Document {
  title: string;
  durationMinutes: number;
  startTime: Date;
  endTime: Date;
  questions: IQuestion[];
}

const ContestSchema = new Schema<IContest>({
  title: { type: String, required: true },
  durationMinutes: { type: Number, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  questions: [{
    codeName: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    inputFormat: { type: String, required: true },
    outputFormat: { type: String, required: true },
    constraints: [{ type: String }],
    pointsPerTest: { type: Number, required: true, default: 20 },
    totalTestCases: { type: Number, required: true },
    sampleCases: [{
      input: String,
      output: String,
      explanation: String
    }],
    testCases: [{
      input: String,
      expectedOutput: String,
      isSecret: { type: Boolean, default: true }
    }]
  }]
}, { timestamps: true });

export default mongoose?.models?.Contest || mongoose?.model('Contest', ContestSchema);