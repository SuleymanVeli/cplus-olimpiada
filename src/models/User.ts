// src/models/User.ts
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  fullName: { type: String, default: "" },
  email: { type: String, required: true, unique: true },
  avatar: { type: String, default: "1" },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  isRegistered: { type: Boolean, default: false }, // Profil ad/avatar seçibmi?
  isBlocked: { type: Boolean, default: false },    // Blok vəziyyəti
  isPro: { type: Boolean, default: false },        // Pro üzvlüklərin idarəsi üçün
  registeredAt: { type: Date },
  globalNote: { type: String, default: "" },
  level: { type: Number, default: 1 }, // Şagirdin səviyyəsi (XP-yə görə)
  assignedTasks: [{
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    assignedAt: { type: Date, default: Date.now }
  }],
  weeklyModuleLimit: { type: Number, default: 2 }, // Bir həftədə aça biləcəyi maks modul sayı
  weeklyLessonDays: { type: Number, default: 7 }, // bir ders heftesinde nece gün var
  musicVolume: { type: Number, default: 0.12 },
  musicIsActive: { type: Boolean, default: true } 
});

UserSchema.virtual('submissions', {
  ref: 'Submission',          // Əlaqəli modelin adı
  localField: '_id',          // User modelindəki hansı sahə ilə bağlayırıq
  foreignField: 'studentId'   // Submission modelində bu istifadəçi hansı adla qeyd olunub
});

export default mongoose.models.User || mongoose.model('User', UserSchema);