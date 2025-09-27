const mongoose = require("mongoose");
const Shelter = require("../models/Shelter");

// Sample shelter data for Sri Lanka
const sampleShelters = [
  {
    name: "Colombo Emergency Shelter",
    description: "Main emergency shelter in Colombo with medical facilities and food supplies",
    latitude: 6.9271,
    longitude: 79.8612,
    capacity: 500,
    facilities: ["Medical", "Food", "Water", "Sanitation", "Communication"],
    contact: {
      phone: "011-2345678",
      email: "colombo@shelter.gov.lk"
    }
  },
  {
    name: "Kandy Disaster Relief Center",
    description: "Central highland shelter with emergency supplies and communication center",
    latitude: 7.2906,
    longitude: 80.6337,
    capacity: 300,
    facilities: ["Medical", "Food", "Water", "Communication", "Transport"],
    contact: {
      phone: "081-2345678",
      email: "kandy@shelter.gov.lk"
    }
  },
  {
    name: "Galle Coastal Shelter",
    description: "Coastal emergency shelter with tsunami warning system and rescue equipment",
    latitude: 6.0329,
    longitude: 80.2170,
    capacity: 400,
    facilities: ["Medical", "Food", "Water", "Rescue Equipment", "Communication"],
    contact: {
      phone: "091-2345678",
      email: "galle@shelter.gov.lk"
    }
  },
  {
    name: "Jaffna Northern Shelter",
    description: "Northern region emergency shelter with medical facilities",
    latitude: 9.6615,
    longitude: 80.0255,
    capacity: 250,
    facilities: ["Medical", "Food", "Water", "Communication"],
    contact: {
      phone: "021-2345678",
      email: "jaffna@shelter.gov.lk"
    }
  },
  {
    name: "Anuradhapura Central Shelter",
    description: "Central region emergency shelter with historical significance",
    latitude: 8.3114,
    longitude: 80.4037,
    capacity: 350,
    facilities: ["Medical", "Food", "Water", "Sanitation", "Communication"],
    contact: {
      phone: "025-2345678",
      email: "anuradhapura@shelter.gov.lk"
    }
  }
];

async function addSampleShelters() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      "mongodb+srv://Navod:BydFyOS6Ezof90nL@cluster0.oa0mfoh.mongodb.net/map?retryWrites=true&w=majority"
    );
    
    console.log("Connected to MongoDB");
    
    // Clear existing shelters (optional)
    await Shelter.deleteMany({});
    console.log("Cleared existing shelters");
    
    // Add sample shelters
    for (const shelterData of sampleShelters) {
      const shelter = new Shelter({
        ...shelterData,
        location: {
          type: "Point",
          coordinates: [shelterData.longitude, shelterData.latitude]
        }
      });
      
      await shelter.save();
      console.log(`Added shelter: ${shelter.name}`);
    }
    
    console.log("Sample shelters added successfully!");
    
  } catch (error) {
    console.error("Error adding sample shelters:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the script
addSampleShelters();
