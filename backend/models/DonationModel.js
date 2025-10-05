//  backend/Model/DonationModel.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const EvidenceSchema = new Schema(
  { filename: String, originalName: String, mimeType: String, size: Number, path: String },
  { _id: false }
);

const DonationSchema = new Schema(
  {
    donor: { type: Schema.Types.ObjectId, ref: "DonorProfile" },

    donorType: { type: String, enum: ["Individual", "Organization"], default: "Individual", index: true },
    donorName: { type: String, trim: true },
    donorPhone: { type: String, trim: true },
    donorEmail: { type: String, trim: true, lowercase: true },
    donorAddress: { type: String, trim: true },
    whatsapp: { type: String, trim: true },

    isAnonymous: { type: Boolean, default: false },
    okToContact: { type: Boolean, default: false },
    allowNamePublic: { type: Boolean, default: true },

    amount: {
      type: Schema.Types.Decimal128,
      required: true,
      validate: {
        validator: (v) => parseFloat(v?.toString?.() || "0") > 0,
        message: "Amount must be greater than 0",
      },
    },
    currency: { type: String, default: "LKR", uppercase: true, trim: true },
    fees: { type: Schema.Types.Decimal128, default: 0 },
    netAmount: { type: Schema.Types.Decimal128 },
    fxRate: { type: Number },

    channel: {
      type: String,
      enum: ["Bank deposit", "Cash", "Online gateway", "Mobile wallet", "Cheque"],
      required: true,
      index: true,
    },
    gateway: { type: String, trim: true },
    bankName: { type: String, trim: true },
    branch: { type: String, trim: true },
    depositDate: { type: Date },
    depositorName: { type: String, trim: true },
    referenceNo: { type: String, trim: true, index: true },
    receiptNo: { type: String, trim: true, unique: true, sparse: true },
    transactionRef: { type: String, trim: true },

    evidence: { type: EvidenceSchema },

    status: {
      type: String,
      enum: ["PLEDGED", "PENDING", "RECEIVED", "FAILED", "REFUNDED"],
      default: "RECEIVED",
      index: true,
    },

    campaign: { type: Schema.Types.ObjectId, ref: "Campaign" },
    note: { type: String, trim: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: "donations",
    toJSON: {
      virtuals: true,
      getters: true,
      transform: (doc, ret) => {
        ["amount", "fees", "netAmount"].forEach((k) => {
          if (ret[k] != null) ret[k] = parseFloat(ret[k].toString());
        });
        return ret;
      },
    },
    toObject: { virtuals: true, getters: true },
  }
);

// allow editing createdAt
DonationSchema.path("createdAt").immutable(false);

// Indexes
DonationSchema.index({ donorType: 1, depositDate: -1 });
DonationSchema.index({ channel: 1, createdAt: -1 });
DonationSchema.index({ currency: 1 });

module.exports = mongoose.model("Donation", DonationSchema);
