const mongoose = require('mongoose');

const storeVisitSchema = new mongoose.Schema({
  employeeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  employeeName: String,
  retailerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Retailer' 
  },
  retailerName: { type: String, required: true },
  retailerPhone: String,
  retailerAddress: String,
  visitDate: { type: Date, required: true },
  visitTime: { type: Date, required: true },
  checkInTime: Date,
  checkOutTime: Date,
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: String,
    city: String,
    state: String
  },
  selfieImage: String, // Path to uploaded selfie
  visitPurpose: String,
  productsDiscussed: [String],
  orderValue: { type: Number, default: 0 },
  orderPlaced: { type: Boolean, default: false },
  feedback: String,
  nextFollowUpDate: Date,
  status: { 
    type: String, 
    enum: ['completed', 'pending', 'cancelled'], 
    default: 'completed' 
  },
  remarks: String,
  createdAt: { type: Date, default: Date.now }
});

// Index for faster queries
storeVisitSchema.index({ employeeId: 1, visitDate: -1 });
storeVisitSchema.index({ retailerId: 1 });

module.exports = mongoose.model('StoreVisit', storeVisitSchema);
