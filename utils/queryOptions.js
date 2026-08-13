const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

function parseListOptions(query = {}, allowedSortFields = ['createdAt', 'updatedAt']) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(query.pageSize || query.limit, 10) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const skip = (page - 1) * pageSize;
  const sortParam = query.sort || '-createdAt';
  const sortField = sortParam.startsWith('-') ? sortParam.slice(1) : sortParam;
  const sort = allowedSortFields.includes(sortField) ? { [sortField]: sortParam.startsWith('-') ? -1 : 1 } : { createdAt: -1 };
  return { page, pageSize, skip, limit: pageSize, sort };
}

function pagination(page, pageSize, total) {
  return { page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 0 };
}

module.exports = { parseListOptions, pagination };
