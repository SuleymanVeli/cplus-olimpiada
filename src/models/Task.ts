import mongoose, { Schema, Document } from 'mongoose';

// Hər bir test case-in strukturu (Giriş verilənləri və Gözlənilən Çıxış)
interface ITestCase {
  input: string;   // Məsələn: "5 10"
  output: string;  // Məsələn: "15"
  isSample: boolean; // Bu test şagirdə nümunə kimi göstərilsin? (True/False)
}

export interface ITask extends Document {
  title: string;        // Testin adı
  description: string;  // Məsələnin şərti
  inputFormat: string;  // Giriş verilənlərinin formatı
  outputFormat: string; // Çıxış verilənlərinin formatı
  constraints: string;  // Məhdudiyyətlər (Məsələn: 1 <= N <= 10^5)
  points: number;       // Qazanılacaq xal
  order: number;        // Mövzu daxilində neçənci testdir
  moduleId: mongoose.Types.ObjectId; // Hansı ulduza (Mövzuya) bağlıdır
  testCases: ITestCase[]; // 🚀 Wandbox-ın yoxlayacağı testlər massivi
  headerCode?: string; // Kodun üstündə dəyişdirilə bilməyən hissə (Məsələn: #include və ya funksiya imzaları)
  footerCode?: string; // Kodun altında dəyişdirilə bilməyən hissə (Məsələn: main() funksiyası və çağırışlar)
}

const TestCaseSchema = new Schema({
  input: { type: String, required: true },
  output: { type: String, required: true },
  isSample: { type: Boolean, default: false } // Əgər true olsa, frontenddə "Nümunə Test" qutusuna çıxaracağıq
});

const TaskSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  inputFormat: { type: String, required: true },
  outputFormat: { type: String, required: true },
  constraints: { type: String },
  points: { type: Number, default: 10 },
  order: { type: Number, required: true },
  moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true },
  
  // 🚀 Test caseləri alt sxem (Subdocument array) olaraq bura əlavə etdik
  testCases: { type: [TestCaseSchema], required: true },
  headerCode: { type: String, default: '' },
  footerCode: { type: String, default: '' }
}, { timestamps: true });

// Eyni modul daxilində eyni sıraya sahib iki test olmasın
TaskSchema.index({ moduleId: 1, order: 1 }, { unique: true });

export default mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);