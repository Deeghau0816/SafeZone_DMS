//  backend/Model/DistributionrecordModel.js
const mongoose = require('mongoose');

// Define the schema for the distribution record
const distributionRecordSchema = new mongoose.Schema({
  familiesAssisted: {
    type: Number,
    required: true
  },
  resourcesDistributed: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Create a model based on the schema
const DistributionRecord = mongoose.model('DistributionRecord', distributionRecordSchema);

module.exports = DistributionRecord;
