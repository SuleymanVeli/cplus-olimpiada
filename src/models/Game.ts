import mongoose, { Schema, Document } from 'mongoose';

interface ICollectible {
  objectType: 'star' | 'apple' | 'key' | 'coin';
  x: number;
  y: number;
  pointsValue: number;
  isRequired: boolean;
}

export interface IGame extends Document {
  title: string;              // Oyunun adı (Məsələn: "Robotun İlk Dövrləri")
  instructionText: string;    // Şagirdə oyun zamanı görünəcək təlimat/göstəriş mətni
  points: number;             // Oyunu tam bitirəndə qazanacağı ümumi xal
  order: number;              // Modul daxilində oyunun sırası (1, 2, 3...)
  moduleId: mongoose.Types.ObjectId; // Hansı modula/dərsə bağlıdır
  
  // Arena Konfiqurasiyası
  mapLayout: number[][];      // 5x5 və ya istənilən ölçüdə matris (0 = yol, 1 = divar)
  startX: number;
  startY: number;
  startDirection: 'up' | 'down' | 'left' | 'right';
  targetX: number;
  targetY: number;
  
  collectibles: ICollectible[]; // Xəritədəki toplanıla bilən obyektlər
}

const CollectibleSchema = new Schema({
  objectType: { type: String, enum: ['star', 'apple', 'key', 'coin'], required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  pointsValue: { type: Number, default: 10 },
  isRequired: { type: Boolean, default: false }
});

const GameSchema: Schema = new Schema({
  title: { type: String, required: true },
  instructionText: { type: String, required: true },
  points: { type: Number, default: 20 },
  order: { type: Number, required: true },
  moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true },
  
  // Arena konfiqurasiyası sxem daxilində birbaşa saxlanılır
  mapLayout: { type: [[Number]], required: true },
  startX: { type: Number, required: true, default: 0 },
  startY: { type: Number, required: true, default: 0 },
  startDirection: { type: String, enum: ['up', 'down', 'left', 'right'], default: 'up', required: true },
  targetX: { type: Number, required: true },
  targetY: { type: Number, required: true },
  collectibles: [CollectibleSchema]
}, { timestamps: true });

// Hər modulun daxilində oyunların sırası unikal olsun
GameSchema.index({ moduleId: 1, order: 1 }, { unique: true });

export default mongoose.models.Game || mongoose.model<IGame>('Game', GameSchema);