import mongoose, { Schema } from 'mongoose';

const TopicSchema = new Schema({
  name: { type: String, required: true, trim: true, unique: true },
  description: { type: String, trim: true },
  icon: { type: String, default: "forest-icon" },
  order: { type: Number, required: true }
}, { timestamps: true });

// Əgər model əvvəl yaradılıbsa onu istifadə et, yoxsa yenisini yarat
const Topic = mongoose.models.GameTopic || mongoose.model('GameTopic', TopicSchema);
export default Topic;