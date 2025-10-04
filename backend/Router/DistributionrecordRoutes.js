// backend/Routes/DistributionrecordRoutes.js
const express = require('express');
const router = express.Router();
const {
  createDistributionRecord,
  getAllDistributionRecords,
  getDistributionRecordById,
  updateDistributionRecord,
  deleteDistributionRecord,
  testEndpoint
} = require('../Controllers/DistributionrecordControllers');

// Test endpoint - add this first for debugging
router.post('/test', testEndpoint);

// POST route to create a new distribution record
router.post('/distributionrecords', createDistributionRecord);

// Other routes
router.get('/distributionrecords', getAllDistributionRecords);
router.get('/distributionrecords/:id', getDistributionRecordById);
router.put('/distributionrecords/:id', updateDistributionRecord);
router.delete('/distributionrecords/:id', deleteDistributionRecord);

module.exports = router;