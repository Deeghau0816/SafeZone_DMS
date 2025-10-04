const mongoose = require("mongoose");

const VolunteerSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, required: true, trim: true },
    whatsapp: { type: String, trim: true },

    volunteerType: { type: String, enum: ["individual", "team"], default: "individual" },
    members: { type: Number, default: 1, min: 1 },

    roles: [{ type: String, trim: true }],
    languages: [{ type: String, trim: true }],

    date: { type: Date, required: true },

    availableTime: { type: String, enum: ["day", "night", "both"], default: "day" },

    operationId: { type: String, trim: true },
    operationName: { type: String, trim: true }, // <— NEW

    livingArea: { type: String, trim: true },
    group: { type: String, trim: true },

    notes: { type: String, trim: true },

    assigned: { type: Boolean, default: false },
    assignedDate: { type: Date, default: null },
    assignedTo: { type: String, trim: true, default: null },
    assignmentNotes: { type: String, trim: true, default: null },
  },
  { timestamps: true }
);

VolunteerSchema.virtual("assignmentStatus").get(function () {
  return this.assigned ? "assigned" : "not_assigned";
});

VolunteerSchema.set("toObject", { virtuals: true });
VolunteerSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Volunteer", VolunteerSchema);
