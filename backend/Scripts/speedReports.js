const mongoose = require("mongoose");
require("dotenv").config();
const Report = require("../models/Report");

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/itpDB";

async function main() {
  await mongoose.connect(MONGO_URL, { dbName: process.env.MONGO_DBNAME || "itpDB" });
  const sample = [
    {
      district: "Colombo",
      category: "Flood",
      severity: "High",
      status: "In-Progress",
      reporterName: "Nimal Perera",
      description: "Flooding near Kelani river",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
    },
    {
      district: "Kandy",
      category: "Landslide",
      severity: "Critical",
      status: "Open",
      reporterName: "Saman Kumara",
      description: "Slope failure reported",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    },
    {
      district: "Galle",
      category: "Storm",
      severity: "Moderate",
      status: "Resolved",
      reporterName: "Ishara Silva",
      description: "Strong winds",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    },
  ];
  await Report.deleteMany({});
  await Report.insertMany(sample);
  console.log("Seeded reports:", sample.length);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
