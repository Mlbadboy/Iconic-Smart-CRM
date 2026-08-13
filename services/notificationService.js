const logger = require('./logger');

// Send real-time notification via Socket.IO
function sendNotification(io, userId, notification) {
  try {
    if (!io) {
      logger.warn('Socket.IO not initialized, notification not sent');
      return false;
    }

    const notificationData = {
      id: Date.now().toString(),
      type: notification.type || 'info',
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      timestamp: new Date().toISOString(),
      read: false
    };

    // Send to specific user room
    if (userId) {
      io.to(`user-${userId}`).emit('notification', notificationData);
      logger.debug(`📢 Notification sent to user ${userId}: ${notification.title}`);
    } else {
      // Broadcast to all connected clients
      io.emit('notification', notificationData);
      logger.debug(`📢 Broadcast notification: ${notification.title}`);
    }

    return true;
  } catch (error) {
    logger.error('Error sending notification:', error);
    return false;
  }
}

// Notification types
const NotificationTypes = {
  ORDER_CREATED: 'order_created',
  ORDER_UPDATED: 'order_updated',
  SERVICE_REQUEST_CREATED: 'service_request_created',
  SERVICE_REQUEST_UPDATED: 'service_request_updated',
  INVOICE_GENERATED: 'invoice_generated',
  DELIVERY_UPDATED: 'delivery_updated',
  ATTENDANCE_MARKED: 'attendance_marked',
  STORE_VISIT_RECORDED: 'store_visit_recorded',
  SYSTEM_ALERT: 'system_alert'
};

// Helper functions for common notifications
const notifications = {
  orderCreated: (io, userId, orderData) => {
    return sendNotification(io, userId, {
      type: NotificationTypes.ORDER_CREATED,
      title: 'New Order Created',
      message: `Order ${orderData.orderNumber} has been created successfully`,
      data: { orderId: orderData._id, orderNumber: orderData.orderNumber }
    });
  },

  orderUpdated: (io, userId, orderData) => {
    return sendNotification(io, userId, {
      type: NotificationTypes.ORDER_UPDATED,
      title: 'Order Updated',
      message: `Order ${orderData.orderNumber} status changed to ${orderData.status}`,
      data: { orderId: orderData._id, orderNumber: orderData.orderNumber, status: orderData.status }
    });
  },

  serviceRequestCreated: (io, userId, requestData) => {
    return sendNotification(io, userId, {
      type: NotificationTypes.SERVICE_REQUEST_CREATED,
      title: 'New Service Request',
      message: `Service request ${requestData.serviceId} has been created`,
      data: { requestId: requestData._id, serviceId: requestData.serviceId }
    });
  },

  serviceRequestUpdated: (io, userId, requestData) => {
    return sendNotification(io, userId, {
      type: NotificationTypes.SERVICE_REQUEST_UPDATED,
      title: 'Service Request Updated',
      message: `Service request ${requestData.serviceId} status changed to ${requestData.status}`,
      data: { requestId: requestData._id, serviceId: requestData.serviceId, status: requestData.status }
    });
  },

  invoiceGenerated: (io, userId, invoiceData) => {
    return sendNotification(io, userId, {
      type: NotificationTypes.INVOICE_GENERATED,
      title: 'Invoice Generated',
      message: `Invoice ${invoiceData.invoiceNumber} has been generated`,
      data: { 
        invoiceNumber: invoiceData.invoiceNumber,
        orderNumber: invoiceData.orderNumber,
        amount: invoiceData.amount
      }
    });
  },

  deliveryUpdated: (io, userId, deliveryData) => {
    return sendNotification(io, userId, {
      type: NotificationTypes.DELIVERY_UPDATED,
      title: 'Delivery Updated',
      message: `Delivery ${deliveryData.trackingNumber} status: ${deliveryData.status}`,
      data: { 
        deliveryId: deliveryData._id,
        trackingNumber: deliveryData.trackingNumber,
        status: deliveryData.status
      }
    });
  },

  attendanceMarked: (io, userId, attendanceData) => {
    return sendNotification(io, null, {
      type: NotificationTypes.ATTENDANCE_MARKED,
      title: 'Attendance Marked',
      message: `${attendanceData.employeeName || 'Employee'} marked attendance at ${attendanceData.checkInLocation?.address || 'location'}`,
      data: {
        attendanceId: attendanceData._id,
        employeeId: attendanceData.employeeId,
        employeeName: attendanceData.employeeName,
        checkInTime: attendanceData.checkInTime,
        location: attendanceData.checkInLocation,
        date: attendanceData.date
      }
    });
  },

  storeVisitRecorded: (io, userId, visitData) => {
    return sendNotification(io, null, {
      type: NotificationTypes.STORE_VISIT_RECORDED,
      title: 'Store Visit Recorded',
      message: `${visitData.employeeName || 'Employee'} visited ${visitData.retailerName || 'a store'}`,
      data: {
        visitId: visitData._id,
        employeeId: visitData.employeeId,
        employeeName: visitData.employeeName,
        retailerName: visitData.retailerName,
        retailerId: visitData.retailerId,
        visitTime: visitData.visitTime,
        location: visitData.location,
        orderPlaced: visitData.orderPlaced,
        orderValue: visitData.orderValue,
        selfieImage: visitData.selfieImage
      }
    });
  },

  systemAlert: (io, message, data = {}) => {
    return sendNotification(io, null, {
      type: NotificationTypes.SYSTEM_ALERT,
      title: 'System Alert',
      message: message,
      data: data
    });
  }
};

module.exports = {
  sendNotification,
  NotificationTypes,
  notifications
};

