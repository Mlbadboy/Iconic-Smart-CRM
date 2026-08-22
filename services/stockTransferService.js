const SerialRegistry = require('../models/SerialRegistry');
const StockTransfer = require('../models/StockTransfer');
const StockLedger = require('../models/StockLedger');
const { recordAuditEvent } = require('./auditService');
const logger = require('./logger');

/**
 * Generate sequential transfer number
 */
async function generateTransferNumber(companyId) {
  const count = await StockTransfer.countDocuments({ companyId });
  const seq = String(count + 1).padStart(6, '0');
  return `TRF${seq}`;
}

/**
 * Initiate a stock transfer of individual serialized units
 */
async function initiateStockTransfer(req, {
  companyId,
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
}) {
  if (!Array.isArray(unitSerials) || unitSerials.length === 0) {
    throw new Error('At least one serial number is required for transfer');
  }

  const normalizedSerials = unitSerials.map(s => String(s).trim().toUpperCase());

  // 1. Validate ownership and current status of all requested units
  const units = await SerialRegistry.find({
    companyId,
    materialCode: materialCode.trim().toUpperCase(),
    serialNumber: { $in: normalizedSerials }
  });

  if (units.length !== normalizedSerials.length) {
    const foundSerials = units.map(u => u.serialNumber);
    const missing = normalizedSerials.filter(s => !foundSerials.includes(s));
    throw new Error(`Serial numbers not found in company registry: ${missing.join(', ')}`);
  }

  // Check that every unit is currently held by the sender and is IN_STOCK
  for (const unit of units) {
    if (unit.currentHolderType !== fromHolderType || String(unit.currentHolderId) !== String(fromHolderId)) {
      throw new Error(`Unit '${unit.serialNumber}' is not held by '${fromHolderName || fromHolderId}'. Current holder: ${unit.currentHolderType} (${unit.currentHolderId})`);
    }
    if (unit.status !== 'IN_STOCK') {
      throw new Error(`Unit '${unit.serialNumber}' cannot be transferred because its status is '${unit.status}'`);
    }
  }

  const transferNumber = await generateTransferNumber(companyId);

  // 2. Mark units as IN_TRANSIT
  await SerialRegistry.updateMany(
    {
      companyId,
      serialNumber: { $in: normalizedSerials }
    },
    {
      $set: { status: 'IN_TRANSIT' }
    }
  );

  // 3. Create StockTransfer record
  const transfer = new StockTransfer({
    transferNumber,
    companyId,
    productId,
    materialCode: materialCode.trim().toUpperCase(),
    fromHolderType,
    fromHolderId,
    fromHolderName,
    toHolderType,
    toHolderId,
    toHolderName,
    unitSerials: normalizedSerials,
    quantity: normalizedSerials.length,
    status: 'PENDING',
    initiatedBy: req.user.id,
    notes
  });

  await transfer.save();

  // 4. Create Ledger dispatch entries
  const ledgerEntries = units.map(unit => ({
    companyId,
    unitId: unit._id,
    serialNumber: unit.serialNumber,
    materialCode: unit.materialCode,
    transactionType: 'TRANSFER_DISPATCH',
    fromHolderType,
    fromHolderId,
    toHolderType,
    toHolderId,
    transferNumber,
    performedBy: req.user.id,
    notes: `Dispatched in transfer ${transferNumber}`
  }));

  await StockLedger.insertMany(ledgerEntries);

  await recordAuditEvent(req, {
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'stock.transfer.initiate',
    entity: 'StockTransfer',
    entityId: transfer._id,
    newValue: { transferNumber, quantity: transfer.quantity, toHolderName }
  });

  return transfer;
}

/**
 * Accept a pending stock transfer atomically
 */
async function acceptStockTransfer(req, transferId) {
  const transfer = await StockTransfer.findById(transferId);
  if (!transfer) throw new Error('Transfer record not found');
  if (transfer.status !== 'PENDING') {
    throw new Error(`Transfer cannot be accepted because it is already '${transfer.status}'`);
  }

  // 1. Validate units are in transit
  const units = await SerialRegistry.find({
    companyId: transfer.companyId,
    serialNumber: { $in: transfer.unitSerials }
  });

  for (const unit of units) {
    if (unit.status !== 'IN_TRANSIT') {
      throw new Error(`Unit '${unit.serialNumber}' state invalid (status: ${unit.status}). Transfer aborted.`);
    }
  }

  // 2. Update units to new holder and IN_STOCK
  const now = new Date();
  const updatePromises = units.map(unit => {
    unit.currentHolderType = transfer.toHolderType;
    unit.currentHolderId = transfer.toHolderId;
    unit.holderName = transfer.toHolderName;
    if (transfer.toHolderType === 'DEALER' || transfer.toHolderType === 'RETAILER') {
      unit.dealerCode = transfer.toHolderId;
    }
    unit.status = 'IN_STOCK';
    unit.ownershipHistory.push({
      fromHolderType: transfer.fromHolderType,
      fromHolderId: transfer.fromHolderId,
      toHolderType: transfer.toHolderType,
      toHolderId: transfer.toHolderId,
      dealerCode: unit.dealerCode,
      transferRef: transfer.transferNumber,
      source: 'STOCK_TRANSFER',
      assignedAt: now,
      changedBy: req.user.id,
      reason: `Accepted transfer ${transfer.transferNumber}`
    });
    return unit.save();
  });

  await Promise.all(updatePromises);

  // 3. Mark transfer as ACCEPTED
  transfer.status = 'ACCEPTED';
  transfer.acceptedBy = req.user.id;
  transfer.acceptedAt = now;
  await transfer.save();

  // 4. Create Ledger accept entries
  const ledgerEntries = units.map(unit => ({
    companyId: transfer.companyId,
    unitId: unit._id,
    serialNumber: unit.serialNumber,
    materialCode: unit.materialCode,
    transactionType: 'TRANSFER_ACCEPT',
    fromHolderType: transfer.fromHolderType,
    fromHolderId: transfer.fromHolderId,
    toHolderType: transfer.toHolderType,
    toHolderId: transfer.toHolderId,
    transferNumber: transfer.transferNumber,
    performedBy: req.user.id,
    notes: `Accepted transfer ${transfer.transferNumber}`
  }));

  await StockLedger.insertMany(ledgerEntries);

  await recordAuditEvent(req, {
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'stock.transfer.accept',
    entity: 'StockTransfer',
    entityId: transfer._id,
    newValue: { transferNumber: transfer.transferNumber, status: 'ACCEPTED' }
  });

  return transfer;
}

/**
 * Reject a pending stock transfer
 */
async function rejectStockTransfer(req, transferId, reason) {
  const transfer = await StockTransfer.findById(transferId);
  if (!transfer) throw new Error('Transfer record not found');
  if (transfer.status !== 'PENDING') {
    throw new Error(`Transfer cannot be rejected because it is already '${transfer.status}'`);
  }

  // Revert units back to sender's IN_STOCK
  await SerialRegistry.updateMany(
    {
      companyId: transfer.companyId,
      serialNumber: { $in: transfer.unitSerials }
    },
    {
      $set: { status: 'IN_STOCK' }
    }
  );

  transfer.status = 'REJECTED';
  transfer.rejectedBy = req.user.id;
  transfer.rejectedAt = new Date();
  transfer.rejectionReason = reason || 'Rejected by recipient';
  await transfer.save();

  // Create Ledger reject entries
  const units = await SerialRegistry.find({
    companyId: transfer.companyId,
    serialNumber: { $in: transfer.unitSerials }
  }).lean();

  const ledgerEntries = units.map(unit => ({
    companyId: transfer.companyId,
    unitId: unit._id,
    serialNumber: unit.serialNumber,
    materialCode: unit.materialCode,
    transactionType: 'TRANSFER_REJECT',
    fromHolderType: transfer.fromHolderType,
    fromHolderId: transfer.fromHolderId,
    toHolderType: transfer.toHolderType,
    toHolderId: transfer.toHolderId,
    transferNumber: transfer.transferNumber,
    performedBy: req.user.id,
    notes: `Transfer rejected: ${transfer.rejectionReason}`
  }));

  await StockLedger.insertMany(ledgerEntries);

  await recordAuditEvent(req, {
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'stock.transfer.reject',
    entity: 'StockTransfer',
    entityId: transfer._id,
    newValue: { transferNumber: transfer.transferNumber, status: 'REJECTED', reason: transfer.rejectionReason }
  });

  return transfer;
}

/**
 * Get inventory aggregated by units held
 */
async function getHolderInventory(companyId, holderType, holderId) {
  const query = {
    companyId,
    status: 'IN_STOCK'
  };

  if (holderType) query.currentHolderType = holderType;
  if (holderId) query.currentHolderId = holderId;

  const units = await SerialRegistry.find(query).lean();
  
  // Aggregate by materialCode
  const summary = {};
  for (const unit of units) {
    if (!summary[unit.materialCode]) {
      summary[unit.materialCode] = {
        materialCode: unit.materialCode,
        totalUnits: 0,
        serials: []
      };
    }
    summary[unit.materialCode].totalUnits += 1;
    summary[unit.materialCode].serials.push(unit.serialNumber);
  }

  return {
    holderType,
    holderId,
    totalAvailableUnits: units.length,
    byMaterial: Object.values(summary),
    units
  };
}

module.exports = {
  initiateStockTransfer,
  acceptStockTransfer,
  rejectStockTransfer,
  getHolderInventory
};
