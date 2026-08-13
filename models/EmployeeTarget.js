const mongoose = require('mongoose');

const employeeTargetSchema = new mongoose.Schema({
  employeeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  employeeName: String,
  month: { type: Number, required: true }, // 1-12
  year: { type: Number, required: true },
  targetType: { 
    type: String, 
    enum: ['sales', 'visits', 'orders', 'revenue'], 
    default: 'sales' 
  },
  targetValue: { type: Number, required: true },
  achievedValue: { type: Number, default: 0 },
  unit: String, // 'rupees', 'units', 'visits'
  status: { 
    type: String, 
    enum: ['not-started', 'in-progress', 'achieved', 'failed'], 
    default: 'not-started' 
  },
  remarks: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Calculate achievement percentage
employeeTargetSchema.virtual('achievementPercentage').get(function() {
  return this.targetValue > 0 ? ((this.achievedValue / this.targetValue) * 100).toFixed(2) : 0;
});

// Index for faster queries
employeeTargetSchema.index({ employeeId: 1, month: 1, year: 1 });

module.exports = mongoose.model('EmployeeTarget', employeeTargetSchema);
