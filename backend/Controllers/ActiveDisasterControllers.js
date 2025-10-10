// backend/Controllers/ActiveDisasterControllers.js
const ActiveDisaster = require("../models/ActiveDisasterModel");

// Safe CSV to Array conversion - handles undefined, null, and non-string values
function csvToArray(s) {
  if (!s || s === undefined || s === null) return [];
  try {
    const str = String(s).trim();
    if (!str) return [];
    return str.split(",").map(x => x.trim()).filter(Boolean);
  } catch (error) {
    console.warn('csvToArray conversion failed:', error);
    return [];
  }
}

exports.list = async (req, res, next) => {
  try {
    const q = {};
    
    // Filter by active status if requested
    if ((req.query.active || "").toString() === "1" || req.query.active === "true") {
      q.active = true;
    }
    
    // Filter by showOnDonation status if requested
    if ((req.query.show || "").toString() === "1" || req.query.show === "true") {
      q.showOnDonation = true;
    }

    const items = await ActiveDisaster.find(q).sort({ updatedAt: -1 }).lean();
    res.json(items);
  } catch (e) { 
    console.error('List disasters error:', e);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch disasters' 
    });
  }
};

exports.getById = async (req, res, next) => {
  try {
    const item = await ActiveDisaster.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  } catch (e) { 
    console.error('Get disaster by ID error:', e);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch disaster' 
    });
  }
};

// Handle both JSON payload (from new form) and FormData (from edit modal)
exports.create = async (req, res, next) => {
  try {
    const body = req.body || {};
    const files = req.files || {};

    console.log('Create disaster - body:', body);
    console.log('Create disaster - files:', files);

    // Validate required fields
    if (!body.name || !body.name.toString().trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required and cannot be empty'
      });
    }

    if (!body.city || !body.city.toString().trim()) {
      return res.status(400).json({
        success: false,
        message: 'City is required and cannot be empty'
      });
    }

    // Process needs safely
    let processedNeeds = [];
    if (body.needs) {
      if (Array.isArray(body.needs)) {
        processedNeeds = body.needs.filter(Boolean);
      } else {
        processedNeeds = csvToArray(body.needs);
      }
    }

    // Handle JSON payload from form
    if (body.images && typeof body.images === 'object') {
      const doc = new ActiveDisaster({
        name: body.name.toString().trim(),
        city: body.city.toString().trim(),
        summary: body.summary || "",
        needs: processedNeeds,
        accentColor: body.accent || body.accentColor || "#16a34a",
        severity: body.severity || "Medium",
        active: body.active === true || body.active === "true" || body.active === "1",
        showOnDonation: body.showOnDonation === true || body.showOnDonation === "true" || body.showOnDonation === "1",
        images: body.images || { cover: "", gallery: [] }
      });

      await doc.save();
      return res.status(201).json(doc);
    }

    // Handle FormData from file uploads
    const doc = new ActiveDisaster({
      name: body.name.toString().trim(),
      city: body.city.toString().trim(),
      summary: body.summary || "",
      needs: processedNeeds,
      accentColor: body.accentColor || "#16a34a",
      severity: body.severity || "Medium",
      active: body.active === "true" || body.active === true || body.active === "1",
      showOnDonation: body.showOnDonation === "true" || body.showOnDonation === true || body.showOnDonation === "1",
      images: { cover: "", gallery: [] }
    });

    if (files.cover?.[0]) {
      doc.images.cover = "/uploads/" + files.cover[0].filename;
    }
    if (files.gallery?.length) {
      doc.images.gallery = files.gallery.map(f => "/uploads/" + f.filename);
    }

    await doc.save();
    console.log('Created disaster successfully:', doc._id);
    res.status(201).json({
      success: true,
      data: doc
    });
  } catch (e) { 
    console.error('Create disaster error:', e);
    
    // Handle specific MongoDB validation errors
    if (e.name === 'ValidationError') {
      const errors = Object.keys(e.errors).map(key => e.errors[key].message);
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed: ' + errors.join(', ')
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: e.message || 'Failed to create disaster'
    });
  }
};

exports.update = async (req, res, next) => {
  try {
    const body = req.body || {};
    const files = req.files || {};
    
    console.log('Update disaster - body:', body);
    console.log('Update disaster - files:', files);
    
    const doc = await ActiveDisaster.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ 
        success: false,
        message: "Disaster not found" 
      });
    }

    // Update basic fields with validation
    if (body.name != null) {
      const trimmedName = body.name.toString().trim();
      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          message: 'Name cannot be empty'
        });
      }
      doc.name = trimmedName;
    }
    
    if (body.city != null) {
      const trimmedCity = body.city.toString().trim();
      if (!trimmedCity) {
        return res.status(400).json({
          success: false,
          message: 'City cannot be empty'
        });
      }
      doc.city = trimmedCity;
    }
    
    if (body.summary != null) {
      doc.summary = body.summary.toString();
    }
    
    // Safe needs processing for update
    if (body.needs != null) {
      if (Array.isArray(body.needs)) {
        doc.needs = body.needs.filter(Boolean);
      } else {
        doc.needs = csvToArray(body.needs);
      }
      console.log('Updated needs:', doc.needs);
    }
    
    if (body.accentColor != null) {
      doc.accentColor = body.accentColor.toString();
    }
    if (body.severity != null) {
      doc.severity = body.severity.toString();
    }
    if (body.active != null) {
      doc.active = body.active === "true" || body.active === true || body.active === "1";
    }
    
    // CRITICAL: Handle showOnDonation toggle properly
    // When this is false, the disaster data and images are preserved
    // but it won't appear on the donation page
    if (body.showOnDonation != null) {
      doc.showOnDonation = body.showOnDonation === "true" || body.showOnDonation === true || body.showOnDonation === "1";
      console.log('Updated showOnDonation:', doc.showOnDonation);
    }

    // Ensure images object exists
    if (!doc.images) {
      doc.images = { cover: "", gallery: [] };
    }

    // Handle cover image
    if (files.cover?.[0]) {
      doc.images.cover = "/uploads/" + files.cover[0].filename;
      console.log('Updated cover image:', doc.images.cover);
    }

    // Handle gallery images - check for processedGallery from the new edit system
    if (body.processedGallery !== undefined) {
      console.log('Using processed gallery:', body.processedGallery);
      if (Array.isArray(body.processedGallery)) {
        doc.images.gallery = body.processedGallery;
      } else {
        console.warn('processedGallery is not an array:', body.processedGallery);
        doc.images.gallery = [];
      }
    } else if (files.gallery?.length) {
      // Fallback for regular gallery uploads
      console.log('Using regular gallery files:', files.gallery.length);
      doc.images.gallery = files.gallery.map(f => "/uploads/" + f.filename);
    }

    await doc.save();
    console.log('Updated disaster successfully:', doc._id);
    console.log('Final showOnDonation status:', doc.showOnDonation);
    console.log('Final gallery:', doc.images.gallery);
    
    res.json({
      success: true,
      data: doc
    });
  } catch (e) { 
    console.error('Update disaster error:', e);
    
    // Handle specific MongoDB validation errors
    if (e.name === 'ValidationError') {
      const errors = Object.keys(e.errors).map(key => e.errors[key].message);
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed: ' + errors.join(', ')
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: e.message || 'Failed to update disaster'
    });
  }
};

exports.remove = async (req, res, next) => {
  try {
    const result = await ActiveDisaster.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ 
        success: false,
        message: "Disaster not found" 
      });
    }
    console.log('Deleted disaster:', req.params.id);
    res.json({ 
      success: true,
      ok: true 
    });
  } catch (e) { 
    console.error('Delete disaster error:', e);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete disaster'
    });
  }
};