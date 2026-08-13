function success(res, data, { status = 200, pagination } = {}) {
  return res.status(status).json({ success: true, data, ...(pagination && { pagination }) });
}

function error(res, { status = 500, code = 'INTERNAL_ERROR', message = 'Internal server error', details = [] } = {}) {
  return res.status(status).json({ success: false, error: { code, message, details } });
}

module.exports = { success, error };
