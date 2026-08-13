const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  employeeName: String,
  employeeEmail: String,
  date: { type: Date, required: true },
  checkInTime: { type: Date, required: true },
  checkOutTime: Date,
  checkInLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
    city: String,
    state: String
  },
  checkOutLocation: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  attendanceImage: String, // Path to uploaded selfie/image
  workingHours: Number,
  status: { 
    type: String, 
    enum: ['present', 'absent', 'half-day', 'leave'], 
    default: 'present' 
  },
  remarks: String,
  createdAt: { type: Date, default: Date.now }
});

// Index for faster queries
attendanceSchema.index({ employeeId: 1, date: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
