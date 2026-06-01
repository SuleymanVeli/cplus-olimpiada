import mongoose, { Schema, Document } from 'mongoose';

export interface IModule extends Document {
  title: string;        // Məsələn: "Bölmə 1: C++ Giriş və Dəyişənlər"
  videoUrl: string;     // Dərs videosunun linki (YouTube, Vimeo və s.)
  content: string;      // Dərsin geniş mətn izahı (Markdown və ya HTML formatda)
  order: number;        // Xəritədə neçənci sırada duracağı (1, 2, 3...)
  tasks: mongoose.Types.ObjectId[]; // Bu ulduza aid olan testlərin (nömrələrin) siyahısı
  games: mongoose.Types.ObjectId[];
}

const ModuleSchema: Schema = new Schema({
  title: { type: String, required: true },
  videoUrl: { type: String, required: true },
  content: { type: String, required: true },
  order: { type: Number, required: true, unique: true },
  tasks: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
  games: [{ type: Schema.Types.ObjectId, ref: 'Game' }]
}, { timestamps: true });

export default mongoose.models.Module || mongoose.model<IModule>('Module', ModuleSchema);