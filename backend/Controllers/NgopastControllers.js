const Ngopast = require("../models/NgopastModel");
const fs = require("fs");
const path = require("path");

exports.createRecord = async (req, res) => {
  try {
    const { note, mockTest, images } = req.body;

    // 1. Mock mode (generate fake image)
    if (mockTest) {
      const fakeImages = [
        {
          imageUrl: "/uploads/mock1.jpg",
          imagePath: "uploads/mock1.jpg",
          originalName: "mock-image1.jpg",
          mimeType: "image/jpeg",
          size: 145320,
        },
        {
          imageUrl: "/uploads/mock2.jpg",
          imagePath: "uploads/mock2.jpg",
          originalName: "mock-image2.jpg",
          mimeType: "image/jpeg",
          size: 152400,
        },
      ];

      const newRec = new Ngopast({
        date: new Date(),
        note,
        images: fakeImages,
      });

      await newRec.save();
      return res.status(201).json(newRec);
    }

    // 2. JSON mode (user sends "images" array in raw JSON)
    if (images && Array.isArray(images) && images.length === 2) {
      const newRec = new Ngopast({
        date: new Date(),
        note,
        images,
      });

      await newRec.save();
      return res.status(201).json(newRec);
    }

    // 3. File upload mode (Multer adds req.files)
    if (req.files && req.files.length >= 1) {
      const uploadImages = req.files.map((f) => ({
        imageUrl: "/uploads/" + f.filename,
        imagePath: f.path,
        originalName: f.originalname,
        mimeType: f.mimetype,
        size: f.size,
      }));

      const newRec = new Ngopast({
        date: new Date(),
        note,
        images: uploadImages,
      });

      await newRec.save();
      return res.status(201).json(newRec);
    }

    // If nothing matched
    return res.status(400).json({
      message: "Please upload at least 1 image (maximum 2).",
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: err.message || "Failed to create record" });
  }
};

exports.getAllRecords = async (req, res) => {
  try {
    const records = await Ngopast.find().sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res
      .status(500)
      .json({ message: err.message || "Failed to fetch records" });
  }
};

exports.updateRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { note, existingImages } = req.body;

    console.log("Update request received for ID:", id);
    console.log("Note:", note);
    console.log("Existing images:", existingImages);
    console.log("New files:", req.files ? req.files.length : 0);

    // Find the existing record
    const existingRecord = await Ngopast.findById(id);
    if (!existingRecord) {
      return res.status(404).json({ message: "Record not found" });
    }

    let finalImages = [];

    // 1. Handle existing images that should be kept
    if (existingImages) {
      const existingImagesArray = Array.isArray(existingImages) 
        ? existingImages 
        : [existingImages];

      existingImagesArray.forEach(imgData => {
        try {
          const parsedImg = typeof imgData === 'string' ? JSON.parse(imgData) : imgData;
          // Find the original image in the record
          const originalImg = existingRecord.images.find(img => 
            img.imageUrl === parsedImg.imageUrl
          );
          if (originalImg) {
            finalImages.push(originalImg);
          }
        } catch (e) {
          console.error("Error parsing existing image data:", e);
        }
      });
    }

    // 2. Add new uploaded images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((f) => ({
        imageUrl: "/uploads/" + f.filename,
        imagePath: f.path,
        originalName: f.originalname,
        mimeType: f.mimetype,
        size: f.size,
      }));
      finalImages = finalImages.concat(newImages);
    }

    // 3. Check total image count
    if (finalImages.length > 2) {
      return res.status(400).json({ 
        message: "Maximum 2 images allowed" 
      });
    }

    if (finalImages.length === 0) {
      return res.status(400).json({ 
        message: "At least 1 image is required" 
      });
    }

    // 4. Delete removed images from filesystem
    const imagesToDelete = existingRecord.images.filter(oldImg => 
      !finalImages.some(newImg => newImg.imageUrl === oldImg.imageUrl)
    );

    imagesToDelete.forEach(img => {
      const filePath = path.join(__dirname, "..", img.imagePath);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`Deleted file: ${filePath}`);
        } catch (error) {
          console.error(`Error deleting file ${filePath}:`, error);
        }
      }
    });

    // 5. Update the record
    const updatedRecord = await Ngopast.findByIdAndUpdate(
      id,
      {
        note: note || existingRecord.note,
        images: finalImages,
      },
      { new: true }
    );

    console.log("Record updated successfully");
    res.json(updatedRecord);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ 
      message: err.message || "Failed to update record" 
    });
  }
};

exports.deleteRecord = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("Delete request received for ID:", id);

    // Find the record first to get image paths
    const record = await Ngopast.findById(id);
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    // Delete associated image files
    if (record.images && record.images.length > 0) {
      record.images.forEach(img => {
        const filePath = path.join(__dirname, "..", img.imagePath);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log(`Deleted file: ${filePath}`);
          } catch (error) {
            console.error(`Error deleting file ${filePath}:`, error);
          }
        }
      });
    }

    // Delete the record from database
    await Ngopast.findByIdAndDelete(id);

    console.log("Record deleted successfully");
    res.json({ message: "Record deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ 
      message: err.message || "Failed to delete record" 
    });
  }
};