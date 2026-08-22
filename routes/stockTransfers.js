const express = require('express');
const StockTransfer = require('../models/StockTransfer');
const StockLedger = require('../models/StockLedger');
const { auth } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const { resolveTenant, requireTenant, scopeQuery } = require('../middleware/tenant');
const { requireFeature } = require('../middleware/featureGate');
const stockTransferService = require('../services/stockTransferService');
const logger = require('../services/logger');

const router = express.Router();
router.use(requireFeature('distribution'));

// 1. List stock transfers
router.get('/', auth, resolveTenant, requireTenant, async (req, res) => {
  try {
    const { status, holderId, materialCode } = req.query;
    const filter = { companyId: req.companyId };
    
    if (status) filter.status = status;
    if (materialCode) filter.materialCode = materialCode.toUpperCase();
    if (holderId) {
      filter.$or = [{ fromHolderId: holderId }, { toHolderId: holderId }];
    }

    const transfers = await StockTransfer.find(filter)
      .populate('initiatedBy', 'name email')
      .populate('acceptedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.json(transfers);
  } catch (err) {
    logger.error('Error listing stock transfers:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Get single transfer
router.get('/:id', auth, resolveTenant, requireTenant, async (req, res) => {
  try {
    const transfer = await StockTransfer.findOne({ _id: req.params.id, companyId: req.companyId })
      .populate('initiatedBy', 'name email')
      .populate('acceptedBy', 'name email')
      .lean();

    if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
    res.json(transfer);
  } catch (err) {
    logger.error('Error getting stock transfer:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Initiate a new stock transfer
router.post('/', auth, resolveTenant, requireTenant, async (req, res) => {
  try {
    if (!hasPermission(req.user, 'inventory.transfer')) {
      return res.status(403).json({ error: 'Permission denied to transfer inventory' });
    }

    const {
      productId,
      materialCode,
      fromHolderType,
      fromHolderId,
      fromHolderName,
      toHolderType,
      toHolderId,
      toHolderName,
      unitSerials,
      notes
    } = req.body;

    if (!materialCode || !fromHolderType || !fromHolderId || !toHolderType || !toHolderId || !unitSerials) {
      return res.status(400).json({ error: 'Missing required transfer parameters' });
    }

    const transfer = await stockTransferService.initiateStockTransfer(req, {
      companyId: req.companyId,
      productId,
      materialCode,
      fromHolderType,
      fromHolderId,
      fromHolderName,
      toHolderType,
      toHolderId,
      toHolderName,
      unitSerials,
      notes
    });

    res.status(201).json({ message: 'Stock transfer initiated', transfer });
  } catch (err) {
    logger.error('Error initiating stock transfer:', err);
    res.status(400).json({ error: err.message });
  }
});

// 4. Accept a stock transfer
router.post('/:id/accept', auth, resolveTenant, requireTenant, async (req, res) => {
  try {
    if (!hasPermission(req.user, 'inventory.transfer')) {
      return res.status(403).json({ error: 'Permission denied to accept inventory transfer' });
    }

    const transfer = await stockTransferService.acceptStockTransfer(req, req.params.id);
    res.json({ message: 'Stock transfer accepted and inventory updated', transfer });
  } catch (err) {
    logger.error('Error accepting stock transfer:', err);
    res.status(400).json({ error: err.message });
  }
});

// 5. Reject a stock transfer
router.post('/:id/reject', auth, resolveTenant, requireTenant, async (req, res) => {
  try {
    if (!hasPermission(req.user, 'inventory.transfer')) {
      return res.status(403).json({ error: 'Permission denied to reject inventory transfer' });
    }

    const { reason } = req.body;
    const transfer = await stockTransferService.rejectStockTransfer(req, req.params.id, reason);
    res.json({ message: 'Stock transfer rejected', transfer });
  } catch (err) {
    logger.error('Error rejecting stock transfer:', err);
    res.status(400).json({ error: err.message });
  }
});

// 6. Get authoritative inventory summary for holder
router.get('/inventory/summary', auth, resolveTenant, requireTenant, async (req, res) => {
  try {
    const { holderType, holderId } = req.query;
    const inventory = await stockTransferService.getHolderInventory(req.companyId, holderType, holderId);
    res.json(inventory);
  } catch (err) {
    logger.error('Error fetching inventory summary:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7. Get stock movement ledger history
router.get('/ledger/history', auth, resolveTenant, requireTenant, async (req, res) => {
  try {
    const { serialNumber, materialCode, limit = 50 } = req.query;
    const filter = { companyId: req.companyId };
    if (serialNumber) filter.serialNumber = serialNumber.trim().toUpperCase();
    if (materialCode) filter.materialCode = materialCode.trim().toUpperCase();

    const history = await StockLedger.find(filter)
      .populate('performedBy', 'name email')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json(history);
  } catch (err) {
    logger.error('Error fetching ledger history:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
