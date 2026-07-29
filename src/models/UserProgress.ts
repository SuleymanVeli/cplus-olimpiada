import mongoose, { Schema, Document } from 'mongoose';

interface ISolvedTask {
  taskId: mongoose.Types.ObjectId;
  submittedCode: string;   // Şagirdin yazdığı ən son uğurlu kod
  pointsEarned: number;    // Qazandığı xal
  solvedAt: Date;
}

export interface IUserProgress extends Document {
  userId: mongoose.Types.ObjectId;
  totalXp: number;
  currentModuleId: mongoose.Types.ObjectId; // 🚀 Xəritədə şagirdin qaldığı modul
  currentTaskOrder: number;                 // 🚀 0 = Dərs oxuyur, 1 = Task 1, 2 = Task 2...
  completedLessons: mongoose.Types.ObjectId[]; // 🚀 Bitirdiyi dərslərin (Module/Lesson) ID-ləri
  completedTasks: mongoose.Types.ObjectId[];
  completedGames: mongoose.Types.ObjectId[];   // 🚀 Xəritə API-ının yoxlaması üçün rahat array
  solvedTasks: ISolvedTask[];        // Detallı kod və tarix tarixçəsi
  completedModules: mongoose.Types.ObjectId[];
  level: number; 
}

const SolvedTaskSchema = new Schema({
  taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
  submittedCode: { type: String, required: true },
  pointsEarned: { type: Number, required: true },
  solvedAt: { type: Date, default: Date.now }
});

const UserProgressSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  totalXp: { type: Number, default: 0 },
  currentModuleId: { type: Schema.Types.ObjectId, ref: 'Module', default: null }, // Default: kursu bitirib / başlamayıb
  currentTaskOrder: { type: Number, default: 0 }, // Default: dərslə başlayır
  completedLessons: [{ type: Schema.Types.ObjectId, ref: 'Module' }], // Bizdə hər modulun 1 mühazirəsi var
  completedTasks: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
  completedModules: [{ type: Schema.Types.ObjectId, ref: 'Module' }],
  level: { type: Number, default: 1 },
  solvedTasks: [SolvedTaskSchema],
  unlockedModulesThisWeek: { type: Number, default: 0 }, // 🚀 Bu həftə açılan modul sayısı
  weekStartDate: { type: Date, default: Date.now },     // 🚀 Cari həftənin başlangıc tarixi
}, { timestamps: true });

export default mongoose.models.UserProgress || mongoose.model<IUserProgress>('UserProgress', UserProgressSchema);