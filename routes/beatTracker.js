const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const StoreVisit = require('../models/StoreVisit');
const EmployeeTarget = require('../models/EmployeeTarget');
const Order = require('../models/Order');
const { notifications } = require('../services/notificationService');
const { uploadSingle, getFileUrl } = require('../middleware/upload');
const logger = require('../services/logger');

// Get all field employees
router.get('/employees', auth, async (req, res) => {
    try {
        const fieldEmployees = await User.find({ 
            role: { $in: ['sales', 'field-executive', 'sales-executive'] },
            isActive: true
        }).select('name email phone role department');
        
        res.json(fieldEmployees);
        console.log('👥 Field employees retrieved:', fieldEmployees.length);
    } catch (error) {
        console.error('Error getting field employees:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get employee attendance for a month
router.get('/attendance/:employeeId', auth, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { month, year } = req.query;
        
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        
        const attendance = await Attendance.find({
            employeeId,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: -1 });
        
        res.json(attendance);
        console.log(`📅 Attendance for employee ${employeeId}:`, attendance.length, 'records');
    } catch (error) {
        console.error('Error getting attendance:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get employee store visits
router.get('/visits/:employeeId', auth, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { month, year, startDate, endDate } = req.query;
        
        let query = { employeeId };
        
        if (month && year) {
            const start = new Date(year, month - 1, 1);
            const end = new Date(year, month, 0, 23, 59, 59);
            query.visitDate = { $gte: start, $lte: end };
        } else if (startDate && endDate) {
            query.visitDate = { 
                $gte: new Date(startDate), 
                $lte: new Date(endDate) 
            };
        }
        
        const visits = await StoreVisit.find(query)
            .sort({ visitDate: -1 })
            .populate('retailerId', 'name phone address city state');
        
        res.json(visits);
        console.log(`🏪 Store visits for employee ${employeeId}:`, visits.length, 'visits');
    } catch (error) {
        console.error('Error getting store visits:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get employee performance (target vs achievement)
router.get('/performance/:employeeId', auth, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { month, year } = req.query;
        
        const currentMonth = month || new Date().getMonth() + 1;
        const currentYear = year || new Date().getFullYear();
        
        // Get targets
        const targets = await EmployeeTarget.find({
            employeeId,
            month: currentMonth,
            year: currentYear
        });
        
        // Calculate achievements from orders
        const startDate = new Date(currentYear, currentMonth - 1, 1);
        const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);
        
        const orders = await Order.find({
            userId: employeeId,
            createdAt: { $gte: startDate, $lte: endDate }
        });
        
        const totalRevenue = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
        const totalOrders = orders.length;
        
        // Get store visits count
        const visitsCount = await StoreVisit.countDocuments({
            employeeId,
            visitDate: { $gte: startDate, $lte: endDate }
        });
        
        res.json({
            targets,
            achievements: {
                revenue: totalRevenue,
                orders: totalOrders,
                visits: visitsCount
            },
            month: currentMonth,
            year: currentYear
        });
        
        console.log(`📊 Performance for employee ${employeeId}:`, {
            revenue: totalRevenue,
            orders: totalOrders,
            visits: visitsCount
        });
    } catch (error) {
        console.error('Error getting performance:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get employee summary
router.get('/summary/:employeeId', auth, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { month, year } = req.query;
        
        const currentMonth = month || new Date().getMonth() + 1;
        const currentYear = year || new Date().getFullYear();
        
        const startDate = new Date(currentYear, currentMonth - 1, 1);
        const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);
        
        // Get employee info
        const employee = await User.findById(employeeId).select('name email phone role department');
        
        // Today's attendance
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        
        const todayAttendance = await Attendance.findOne({
            employeeId,
            date: { $gte: today, $lte: todayEnd }
        });
        
        // Month statistics
        const monthAttendance = await Attendance.countDocuments({
            employeeId,
            date: { $gte: startDate, $lte: endDate },
            status: 'present'
        });
        
        const monthVisits = await StoreVisit.countDocuments({
            employeeId,
            visitDate: { $gte: startDate, $lte: endDate }
        });
        
        const monthOrders = await Order.countDocuments({
            userId: employeeId,
            createdAt: { $gte: startDate, $lte: endDate }
        });
        
        const monthRevenue = await Order.aggregate([
            {
                $match: {
                    userId: mongoose.Types.ObjectId(employeeId),
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);
        
        res.json({
            employee,
            todayAttendance,
            monthStats: {
                attendance: monthAttendance,
                visits: monthVisits,
                orders: monthOrders,
                revenue: monthRevenue[0]?.total || 0
            }
        });
        
    } catch (error) {
        console.error('Error getting employee summary:', error);
        res.status(500).json({ message: error.message });
    }
});

// Record attendance (for mobile app integration)
router.post('/attendance', auth, uploadSingle('image'), async (req, res) => {
    try {
        const {
            employeeId,
            employeeName,
            employeeEmail,
            checkInTime,
            location
        } = req.body;
        
        // Handle image upload if provided
        let attendanceImage = null;
        if (req.file) {
            attendanceImage = getFileUrl(req, req.file.path);
            logger.info(`📷 Attendance image uploaded: ${attendanceImage}`);
        }
        
        const attendance = new Attendance({
            employeeId,
            employeeName,
            employeeEmail,
            date: new Date(),
            checkInTime: checkInTime || new Date(),
            checkInLocation: location,
            attendanceImage: attendanceImage,
            status: 'present'
        });
        
        await attendance.save();
        
        // Send real-time notification
        const io = req.app.get('io');
        if (io) {
            notifications.attendanceMarked(io, req.user?.id, attendance);
            logger.info(`📢 Real-time notification sent for attendance: ${employeeName}`);
        }
        
        logger.info(`✅ Attendance recorded for: ${employeeName}`);
        res.json({ message: 'Attendance recorded', attendance });
    } catch (error) {
        logger.error('Error recording attendance:', error);
        res.status(500).json({ message: error.message });
    }
});

// Record store visit (for mobile app integration)
router.post('/visit', auth, async (req, res) => {
    try {
        const visitData = req.body;
        
        const visit = new StoreVisit({
            ...visitData,
            visitDate: visitData.visitDate || new Date(),
            visitTime: visitData.visitTime || new Date()
        });
        
        await visit.save();
        
        // Send real-time notification
        const io = req.app.get('io');
        if (io) {
            notifications.storeVisitRecorded(io, req.user?.id, visit);
            logger.info(`📢 Real-time notification sent for store visit: ${visitData.retailerName}`);
        }
        
        logger.info(`✅ Store visit recorded: ${visitData.retailerName}`);
        res.json({ message: 'Store visit recorded', visit });
    } catch (error) {
        logger.error('Error recording store visit:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
