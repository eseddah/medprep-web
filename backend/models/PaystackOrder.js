const mongoose = require('mongoose');

const paystackOrderSchema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  planType: { type: String, enum: ['pro_monthly', 'pro_annual'], required: true },
  baseAmount: { type: Number, required: true, min: 1 },
  amount: { type: Number, required: true, min: 1 },
  currency: { type: String, default: 'GHS', enum: ['GHS'] },
  promoCode: { type: mongoose.Schema.Types.ObjectId, ref: 'PromoCode', default: null },
  percentOff: { type: Number, default: 0 },
  referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rewardDays: { type: Number, default: 0, min: 0 },
  rewardApplied: { type: Boolean, default: false },
  status: { type: String, enum: ['initializing', 'pending', 'paid', 'failed'], default: 'initializing' },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('PaystackOrder', paystackOrderSchema);