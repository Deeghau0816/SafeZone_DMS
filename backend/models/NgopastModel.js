const mongoose = require("mongoose");

const ngopastSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    note: { type: String, default: "" },
    images: [
      {
        imageUrl: { type: String, required: true },
        imagePath: { type: String, required: true },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ngopast", ngopastSchema);
