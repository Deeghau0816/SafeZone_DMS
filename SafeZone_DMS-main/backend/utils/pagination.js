// Pagination utilities

/**
 * Builds pagination response object
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @param {Array} data - Current page data
 * @param {string} itemName - Name of the items (e.g., 'contacts', 'pins')
 * @returns {Object} Pagination object
 */
const buildPagination = (page, limit, total, data, itemName = 'items') => {
  const currentPage = parseInt(page);
  const limitNum = parseInt(limit);
  const totalPages = Math.ceil(total / limitNum);
  const skip = (currentPage - 1) * limitNum;
  
  return {
    currentPage,
    totalPages,
    [`total${itemName.charAt(0).toUpperCase() + itemName.slice(1)}`]: total,
    hasNext: skip + data.length < total,
    hasPrev: currentPage > 1
  };
};

module.exports = {
  buildPagination
};
