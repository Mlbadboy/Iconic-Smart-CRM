// Backend: routes/dashboard.js
// Dashboard API endpoints

const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const ServiceRequest = require('../models/ServiceRequest');
const Retailer = require('../models/Retailer');
const { auth } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const logger = require('../services/logger');

// Get dashboard statistics
router.get('/stats', auth, async (req, res) => {
  try {
    logger.info('📊 /stats requested');
    const canViewAll = hasPermission(req.user, 'report.view');
    logger.info(`📊 /stats: canViewAll = ${canViewAll}`);
    
    // For non-admin users, filter by their created orders
    const filter = canViewAll ? {} : { userId: req.user.id };
    logger.info(`📊 /stats: filter = ${JSON.stringify(filter)}`);

    // Get total orders count
    logger.info('📊 /stats: counting orders...');
    const totalOrders = await Order.countDocuments(filter);
    logger.info(`📊 /stats: totalOrders = ${totalOrders}`);

    // Get total revenue
    logger.info('📊 /stats: calculating revenue...');
    const revenueResult = await Order.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;
    logger.info(`📊 /stats: totalRevenue = ${totalRevenue}`);

    // Get unique retailers count
    logger.info('📊 /stats: getting unique retailers...');
    const uniqueRetailers = await Order.distinct('retailerId', filter);
    const retailerCount = uniqueRetailers.length;
    logger.info(`📊 /stats: retailerCount = ${retailerCount}`);

    // Get active service requests count
    logger.info('📊 /stats: counting active services...');
    const activeServices = await ServiceRequest.countDocuments({
      ...filter,
      status: { $in: ['open', 'in-progress'] }
    });
    logger.info(`📊 /stats: activeServices = ${activeServices}`);

    // Get recent orders (last 10)
    logger.info('📊 /stats: getting recent orders...');
    const recentOrders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderNumber retailerName amount status createdAt')
      .lean();
    logger.info(`📊 /stats: recentOrders count = ${recentOrders.length}`);

    // Get sales by day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    logger.info('📊 /stats: aggregating sales by day...');
    const salesByDay = await Order.aggregate([
      { 
        $match: { 
          ...filter, 
          createdAt: { $gte: sevenDaysAgo } 
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    logger.info(`📊 /stats: salesByDay count = ${salesByDay.length}`);

    // Get order status distribution
    logger.info('📊 /stats: aggregating status distribution...');
    const statusDistribution = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    logger.info(`📊 /stats: statusDistribution count = ${statusDistribution.length}`);

    // Calculate percentage changes (compare with previous period)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // Previous week orders
    logger.info('📊 /stats: counting previous week orders...');
    const prevWeekOrders = await Order.countDocuments({
      ...filter,
      createdAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo }
    });
    const ordersChange = prevWeekOrders > 0 
      ? Math.round(((totalOrders - prevWeekOrders) / prevWeekOrders) * 100) 
      : totalOrders > 0 ? 100 : 0;
    logger.info(`📊 /stats: prevWeekOrders = ${prevWeekOrders}`);

    // Previous week revenue
    logger.info('📊 /stats: aggregating previous week revenue...');
    const prevWeekRevenueResult = await Order.aggregate([
      { 
        $match: { 
          ...filter,
          createdAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo } 
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const prevWeekRevenue = prevWeekRevenueResult[0]?.total || 0;
    const revenueChange = prevWeekRevenue > 0 
      ? Math.round(((totalRevenue - prevWeekRevenue) / prevWeekRevenue) * 100) 
      : totalRevenue > 0 ? 100 : 0;
    logger.info(`📊 /stats: prevWeekRevenue = ${prevWeekRevenue}`);

    // Previous week retailers
    logger.info('📊 /stats: getting previous week retailers...');
    const prevWeekRetailers = await Order.distinct('retailerId', {
      ...filter,
      createdAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo }
    });
    const customersChange = prevWeekRetailers.length > 0 
      ? Math.round(((retailerCount - prevWeekRetailers.length) / prevWeekRetailers.length) * 100) 
      : retailerCount > 0 ? 100 : 0;
    logger.info(`📊 /stats: prevWeekRetailers count = ${prevWeekRetailers.length}`);

    // Previous week services
    logger.info('📊 /stats: counting previous week services...');
    const prevWeekServices = await ServiceRequest.countDocuments({
      ...filter,
      status: { $in: ['open', 'in-progress'] },
      createdAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo }
    });
    const servicesChange = prevWeekServices > 0 
      ? Math.round(((activeServices - prevWeekServices) / prevWeekServices) * 100) 
      : activeServices > 0 ? 100 : 0;
    logger.info(`📊 /stats: prevWeekServices = ${prevWeekServices}`);

    logger.info('📊 /stats: sending response');
    res.json({
      stats: {
        totalOrders,
        totalRevenue,
        uniqueRetailers: retailerCount,
        activeServices,
        ordersChange,
        revenueChange,
        customersChange,
        servicesChange,
      },
      recentOrders,
      salesByDay,
      statusDistribution,
    });

  } catch (error) {
    logger.error('Dashboard stats error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch dashboard statistics',
      error: error.message 
    });
  }
});

// Get sales data for charts
router.get('/sales', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const canViewAll = hasPermission(req.user, 'report.view');
    const filter = canViewAll ? {} : { userId: req.user.id };

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    const salesData = await Order.aggregate([
      { 
        $match: { 
          ...filter, 
          createdAt: { $gte: daysAgo } 
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ salesData });

  } catch (error) {
    logger.error('Sales data error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch sales data',
      error: error.message 
    });
  }
});

// Get order status distribution
router.get('/status-distribution', auth, async (req, res) => {
  try {
    const canViewAll = hasPermission(req.user, 'report.view');
    const filter = canViewAll ? {} : { userId: req.user.id };

    const distribution = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({ distribution });

  } catch (error) {
    logger.error('Status distribution error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch status distribution',
      error: error.message 
    });
  }
});

module.exports = router;
