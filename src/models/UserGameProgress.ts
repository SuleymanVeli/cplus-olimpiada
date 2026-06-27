import mongoose, { Schema } from 'mongoose';

// 🔹 Şagirdin konkret bir mərhələdə (Level) göstərdiyi nəticə
const CompletedLevelSchema = new Schema({
  levelId: {
    type: Schema.Types.ObjectId,
    ref: 'GameLevel',
    required: true
  },
  earnedPoints: { type: Number, required: true, default: 0 }, // Şagirdin bu leveldən aldığı faktiki bal
  bestCode: { type: String, default: "" },                    // Şagirdin yazdığı ən uğurlu C++ kodu
  isCompleted: { type: Boolean, default: true },
  completedAt: { type: Date, default: Date.now }
}, { _id: false });

// 🔹 Şagirdin mövzu (Topic) üzrə ümumi vəziyyəti
const TopicProgressSchema = new Schema({
  topicId: {
    type: Schema.Types.ObjectId,
    ref: 'GameTopic',
    required: true
  },
  isUnlocked: { type: Boolean, default: false },   // Bu mövzu şagird üçün açıqdır?
  isCompleted: { type: Boolean, default: false },  // Mövzu daxilindəki bütün levellər bitib?
  completedLevels: [CompletedLevelSchema]          // Keçdiyi levellərin siyahısı
}, { _id: false });

const UserGameProgressSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User', // Sənin mövcud User modelin
    required: true,
    unique: true // Hər istifadəçinin yalnız 1 progress sənədi ola bilər
  },
  // Şagirdin qazandığı ümumi oyun xalı (Bütün mövzulardan toplanan balların cəmi)
  totalGamePoints: { type: Number, default: 0 },
  
  // Mövzular üzrə irəliləyiş matrisi
  topicsProgress: [TopicProgressSchema],

  // 🎯 UI tərəfində işi rahatlaşdırmaq üçün sonuncu aktiv qaldığı yer
  lastPlayed: {
    topicId: { type: Schema.Types.ObjectId, ref: 'GameTopic', default: null },
    levelId: { type: Schema.Types.ObjectId, ref: 'GameLevel', default: null }
  }
}, { timestamps: true });

const UserGameProgress = mongoose.models.UserGameProgress || mongoose.model('UserGameProgress', UserGameProgressSchema);
export default UserGameProgress;