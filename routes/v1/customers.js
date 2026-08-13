const express = require('express');
const { auth } = require('../../middleware/auth');
const { hasPermission, requirePermission } = require('../../middleware/rbac');
const { getCustomer360 } = require('../../services/customer360Service');
const { success, error } = require('../../utils/apiResponse');

const router = express.Router();

router.get('/:id/360', auth, requirePermission('customer.view'), async (req, res) => {
  try {
    const data = await getCustomer360(req.params.id, {
      includeFinance: hasPermission(req.user, 'finance.view'),
      limit: Math.min(parseInt(req.query.limit, 10) || 10, 50)
    });
    if (!data) return error(res, { status: 404, code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' });
    return success(res, data);
  } catch (err) {
    return error(res, { status: err.status || 500, code: err.code || 'CUSTOMER_360_ERROR', message: err.message });
  }
});

module.exports = router;
