import mongoose, { Schema } from 'mongoose';

const RequiredWriteSchema = new Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  expected: { type: String, required: true }
}, { _id: false });

const CavabXalSchema = new Schema({
  cavab: { type: String, required: true },
  verilecekXal: { type: Number, required: true },
  mesaj: { type: String, required: true }
}, { _id: false });

const VariantSchema = new Schema({
  name: { type: String, required: true },       // Dəyişənin adı: "$a", "$b", "$c" və s.
  value: { type: String, required: true }     // Həmin variant üçün dəyəri: "10", "cüt", "55"
}, { _id: false });

// 🔹 YENİ: Variantlar paketi (Hər bir indeks tam bir ssenaridir)
const SenariSchema = new Schema({
  values: [VariantSchema] // [ {ad: "$a", deyer: "10"}, {ad: "$b", deyer: "20"}, {ad: "$cavab", deyer: "30"} ]
}, { _id: false });

const CodeRulesSchema = new Schema({
  // Mütləq yazılmalı olan komandalar: ["if", "while", "robot.sola()"]
  required: { type: [String], default: [] },
  
  // Qadağan olunmuş komandalar: ["for", "robot.saga()"]
  forbidden: { type: [String], default: [] },
  
  // Dinamik limitlər üçün Map tipi əladır. 
  // Məlumat bazasında belə oturacaq: { "robot.ireli()": 3, "while": 1 }
  maxUsage: {
    type: Map,
    of: Number,
    default: {}
  }
}, { _id: false });

const LevelSchema = new Schema({
  topicId: {
    type: Schema.Types.ObjectId,
    ref: 'GameTopic',
    required: true
  },
  title: { type: String, required: true, trim: true },
  instructionText: { type: String, required: true },
  points: { type: Number, default: 100 },
  levelPoint: { type: Number, required: true }, // C++ tərəfində MAKSIMUM_BAL
  startX: { type: Number, required: true },
  startY: { type: Number, required: true },
  startDirection: { 
    type: String, 
    enum: ['right', 'left', 'up', 'down'], 
    default: 'right' 
  },
  variants: [SenariSchema],
  mapLayout: { type: [[Number]], required: true },
  xanaYazilari: { type: [[String]], required: true },
  xanaTipleri: { type: [[String]], required: true },
  hasWriteTask: { type: Boolean, default: false },
  requiredWrites: [RequiredWriteSchema],
  xalSistemi: [CavabXalSchema],
  rules: { type: CodeRulesSchema, default: null },
  help: { type: String, default: ''},
  order: { type: Number, required: true }
}, { timestamps: true });

const Level = mongoose.models.GameLevel || mongoose.model('GameLevel', LevelSchema);
export default Level;