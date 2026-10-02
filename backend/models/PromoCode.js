const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  reference: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, { _id: false });

const promoCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 32 },
  type: { type: String, enum: ['discount', 'referral'], default: 'discount', required: true },
  percentOff: { type: Number, required: true, min: 1, max: 99 },
  expiresAt: { type: Date, required: true },
  useLimit: { type: Number, required: true, min: 1 },
  usedCount: { type: Number, default: 0, min: 0 },
  reservations: { type: [reservationSchema], default: [] },
  isActive: { type: Boolean, default: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rewardDays: { type: Number, default: 7, min: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('PromoCode', promoCodeSchema);