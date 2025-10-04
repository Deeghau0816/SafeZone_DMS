// controllers/VictimControllers.js
const fs = require('fs');
const path = require('path');
const Victim = require('../models/VictimModel');

/** Build an absolute URL for a file saved in /uploads */
function fileUrl(req, filename) {
  return `${req.protocol}://${req.get('host')}/uploads/${encodeURIComponent(filename)}`;
}

/** Normalize any inbound status to our risk enum (High/Medium/Low) */
function normalizeRiskStatus(input) {
  if (!input) return undefined;
  const v = String(input).trim().toLowerCase();

  // already risk values
  if (v === 'high') return 'High';
  if (v === 'medium') return 'Medium';
  if (v === 'low') return 'Low';

  // legacy workflow -> map to risk
  if (v === 'pending' || v === 'in-review') return 'Medium';
  if (v === 'approved') return 'Low';
  if (v === 'rejected') return 'High';

  return undefined; // unknown → let schema default or keep existing
}

/** Regex helpers */
const NIC_REGEX = /^(?:\d{12}|\d{9}[VX])$/i;        // old: 9 digits + V/X, new: 12 digits
const NAME_REGEX = /^[A-Za-z\s]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_E164 = /^\+\d{6,15}$/;                  // simple E.164-ish: + plus 6–15 digits

/** Common validation used by POST and PUT (final state check) */
function validateVictimObject(obj) {
  const errors = {};

  // Name: required, letters & spaces only
  if (!obj.name || !String(obj.name).trim()) {
    errors.name = 'Reporter name is required';
  } else if (!NAME_REGEX.test(String(obj.name))) {
    errors.name = 'Name must contain letters and spaces only';
  }

  // Phone: required, E.164-like (+ + digits)
  if (!obj.phone || !String(obj.phone).trim()) {
    errors.phone = 'Phone is required';
  } else if (!PHONE_E164.test(String(obj.phone).replace(/\s+/g, ''))) {
    errors.phone = 'Phone must be like +94XXXXXXXXX';
  }

  // NIC: required, old/new formats
  if (!obj.nic || !String(obj.nic).trim()) {
    errors.nic = 'NIC is required';
  } else if (!NIC_REGEX.test(String(obj.nic))) {
    errors.nic = 'NIC must be 123456789V or 200012345678';
  }

  // Status (risk)
  const norm = normalizeRiskStatus(obj.status);
  if (!norm) errors.status = 'Status must be High, Medium, or Low';

  // Disaster type
  if (!obj.disasterType || !String(obj.disasterType).trim()) {
    errors.disasterType = 'Disaster type is required';
  }

  // Address
  if (!obj.address || !String(obj.address).trim()) {
    errors.address = 'Home address is required';
  }

  // Location (current location mandatory)
  const lat = Number(obj?.location?.coordinates?.[1] ?? obj?.lat);
  const lng = Number(obj?.location?.coordinates?.[0] ?? obj?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    errors.coords = 'Current location (lat & lng) is required';
  } else {
    if (lat < -90 || lat > 90) errors.lat = 'Latitude must be between -90 and 90';
    if (lng < -180 || lng > 180) errors.lng = 'Longitude must be between -180 and 180';
  }

  // Email (optional)
  if (obj.email && !EMAIL_REGEX.test(String(obj.email))) {
    errors.email = 'Invalid email address';
  }

  return errors;
}

/**
 * GET /victims
 * Optional query:
 *  - near=lng,lat (comma separated)
 *  - radius=meters (used with near)
 *  - page=1
 *  - limit=50
 *  - status=High|Medium|Low|Pending|Approved|Rejected|In-Review (we normalize)
 *  - disasterType=<string>
 */
async function getAllVictims(req, res) {
  try {
    const { near, radius = 0, page = 1, limit = 50, status, disasterType } = req.query;

    const q = {};

    // status filter (accepts both risk & legacy workflow; we normalize)
    const norm = normalizeRiskStatus(status);
    if (norm) q.status = norm;
    else if (status && ['High','Medium','Low'].includes(status)) q.status = status;

    if (disasterType) q.disasterType = disasterType;

    // Geo filter
    if (near && Number(radius) > 0) {
      const [lng, lat] = near.split(',').map(Number);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        q.location = {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: Number(radius)
          }
        };
      }
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(200, Math.max(1, Number(limit) || 50));

    const [victims, total] = await Promise.all([
      Victim.find(q)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Victim.countDocuments(q)
    ]);

    return res.status(200).json({
      victims,
      pagination: { page: pageNum, limit: limitNum, total }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching victims' });
  }
}

/**
 * POST /victims
 * multipart/form-data
 * - files in req.files (limited by routes to 2)
 * - body fields: name, nic, email?, phone, address, description?,
 *                status (risk), disasterType, occurredAt?, lat, lng
 */
async function addVictims(req, res) {
  try {
    // Extract & normalize inputs
    let {
      name,
      nic,
      email,
      phone,
      address,
      description,
      status,
      disasterType,
      occurredAt,
      lat,
      lng
    } = req.body;

    name = name?.trim();
    nic = (nic || '').toUpperCase();
    email = email?.trim();
    phone = phone?.trim().replace(/\s+/g, '');
    address = address?.trim();
    description = description?.trim();
    disasterType = disasterType?.trim();

    const riskStatus = normalizeRiskStatus(status);

    // Location normalized
    const nlat = Number(lat);
    const nlng = Number(lng);

    // Prepare object for validation
    const toValidate = {
      name, nic, email, phone, address, description,
      status: riskStatus || status, disasterType,
      location: Number.isFinite(nlat) && Number.isFinite(nlng)
        ? { type: 'Point', coordinates: [nlng, nlat] }
        : undefined,
      occurredAt
    };

    // Server-side validation (requireds + formats)
    const errors = validateVictimObject(toValidate);
    if (Object.keys(errors).length) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    // Files → media[]
    const media = (req.files || []).map(f => ({
      filename: f.filename,
      url: fileUrl(req, f.filename),
      mimetype: f.mimetype,
      size: f.size
    }));

    // Keep legacy image string only if no new files uploaded
    const image =
      media.length === 0 && typeof req.body.image === 'string' && /^https?:\/\//i.test(req.body.image)
        ? req.body.image
        : undefined;

    const doc = await Victim.create({
      name,
      nic,
      email,
      phone,
      address,
      description,
      status: normalizeRiskStatus(status), // High/Medium/Low
      disasterType,
      occurredAt: occurredAt ? new Date(occurredAt) : undefined,
      location: { type: 'Point', coordinates: [nlng, nlat] },
      image,
      media
    });

    return res.status(201).json({ victim: doc });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error adding victim', error: err.message });
  }
}

/** GET /victims/:id */
async function getVictimById(req, res) {
  try {
    const victim = await Victim.findById(req.params.id);
    if (!victim) return res.status(404).json({ message: 'Victim not found' });
    return res.status(200).json({ victim });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching victim' });
  }
}

/**
 * PUT /victims/:id
 * multipart/form-data allowed for adding more media
 * Body may include: name, nic, email?, phone, address, description?,
 *                   status (risk or legacy), disasterType, occurredAt?, lat, lng,
 *                   remove (JSON array of filenames to remove)
 */
async function updateVictim(req, res) {
  try {
    const victim = await Victim.findById(req.params.id);
    if (!victim) return res.status(404).json({ message: 'Victim not found' });

    // Scalars (only apply if provided)
    if (req.body.name !== undefined) victim.name = String(req.body.name).trim();
    if (req.body.nic !== undefined) victim.nic = String(req.body.nic).toUpperCase();
    if (req.body.email !== undefined) victim.email = String(req.body.email).trim();
    if (req.body.phone !== undefined) victim.phone = String(req.body.phone).trim().replace(/\s+/g, '');
    if (req.body.address !== undefined) victim.address = String(req.body.address).trim();
    if (req.body.description !== undefined) victim.description = String(req.body.description).trim();
    if (req.body.disasterType !== undefined) victim.disasterType = String(req.body.disasterType).trim();

    // Status (normalize)
    if (req.body.status !== undefined) {
      const riskStatus = normalizeRiskStatus(req.body.status);
      if (riskStatus) victim.status = riskStatus;
    }

    // Occurred at (optional)
    if (req.body.occurredAt !== undefined) {
      victim.occurredAt = req.body.occurredAt ? new Date(req.body.occurredAt) : undefined;
    }

    // Location (lat/lng optional but required in final validation)
    if (req.body.lat !== undefined && req.body.lng !== undefined) {
      const nlat = Number(req.body.lat);
      const nlng = Number(req.body.lng);
      victim.location = { type: 'Point', coordinates: [nlng, nlat] };
    }

    // Remove selected existing attachments
    if (req.body.remove) {
      try {
        const list = JSON.parse(req.body.remove); // array of filenames
        if (Array.isArray(list) && list.length) {
          const toRemove = new Set(list.filter(Boolean));
          // delete files from disk
          (victim.media || []).forEach(m => {
            if (m && toRemove.has(m.filename)) {
              const p = path.join(process.cwd(), 'uploads', m.filename);
              try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (_) {}
            }
          });
          // filter out removed from document
          victim.media = (victim.media || []).filter(m => !(m && toRemove.has(m.filename)));
          // keep legacy image consistent
          if (victim.image && victim.media.every(m => m.url !== victim.image)) {
            victim.image = victim.media[0]?.url || undefined;
          }
        }
      } catch (_) {
        // ignore malformed remove
      }
    }

    // Append any new uploads
    const newMedia = (req.files || []).map(f => ({
      filename: f.filename,
      url: fileUrl(req, f.filename),
      mimetype: f.mimetype,
      size: f.size
    }));
    if (newMedia.length) {
      victim.media = [...(victim.media || []), ...newMedia];
      if (!victim.image) victim.image = newMedia[0].url; // legacy convenience
    }

    // Final server-side validation of the whole document
    const finalObj = {
      name: victim.name,
      phone: victim.phone,
      nic: victim.nic,
      status: victim.status,
      disasterType: victim.disasterType,
      address: victim.address,
      email: victim.email,
      location: victim.location
    };
    const errors = validateVictimObject(finalObj);
    if (Object.keys(errors).length) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    await victim.save();
    return res.status(200).json({ victim });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error updating victim' });
  }
}

/**
 * PATCH /victims/:id/location
 * Body: { lat, lng }
 */
async function updateLocation(req, res) {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'lat and lng are required' });
    }
    const nlat = Number(lat);
    const nlng = Number(lng);
    if (!Number.isFinite(nlat) || !Number.isFinite(nlng)) {
      return res.status(400).json({ message: 'lat and lng must be numbers' });
    }
    if (nlat < -90 || nlat > 90 || nlng < -180 || nlng > 180) {
      return res.status(400).json({ message: 'lat/lng out of range' });
    }

    const victim = await Victim.findByIdAndUpdate(
      req.params.id,
      { location: { type: 'Point', coordinates: [nlng, nlat] } },
      { new: true }
    );

    if (!victim) return res.status(404).json({ message: 'Victim not found' });
    return res.status(200).json({ victim });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error updating location' });
  }
}

/**
 * DELETE /victims/:id
 * Also removes any locally stored files from /uploads (best effort)
 */
async function deleteVictim(req, res) {
  try {
    const victim = await Victim.findByIdAndDelete(req.params.id);
    if (!victim) return res.status(404).json({ message: 'Victim not found' });

    // best-effort cleanup of local files
    (victim.media || []).forEach(m => {
      if (!m || !m.filename) return;
      const p = path.join(process.cwd(), 'uploads', m.filename);
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch (_) {
        // ignore
      }
    });

    return res.status(200).json({ message: 'Victim deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error deleting victim' });
  }
}

module.exports = {
  getAllVictims,
  addVictims,
  getVictimById,
  updateVictim,
  updateLocation,
  deleteVictim
};
