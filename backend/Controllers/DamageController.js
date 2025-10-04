// Controllers/DamageController.js
const fs = require("fs");
const path = require("path");
const Damage = require("../models/DamageModel");

const NIC_RE   = /^(\d{9}[VvXx]|\d{12})$/;
const PHONE_RE = /^(?:\+94|0)?7\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const badReq   = (res, msg) => res.status(400).json({ ok: false, message: msg });
const notFound = (res)      => res.status(404).json({ ok: false, message: "Damage claim not found" });

const normalizeId = (raw) => (raw ?? "").toString().trim();
const isHex24     = (s) => /^[0-9a-fA-F]{24}$/.test(s);

/** Build absolute URL for an attachment filename */
function attachmentUrl(req, filename) {
  if (!filename) return null;
  return `${req.protocol}://${req.get('host')}/uploads/damage/${encodeURIComponent(filename)}`;
}

/** Map attachments (stored) to an object with url */
function mapAttachments(req, attachments) {
  return (attachments || []).map(a => ({
    filename: a.filename,
    originalName: a.originalName,
    mimeType: a.mimeType,
    size: a.size,
    uploadedAt: a.uploadedAt,
    url: attachmentUrl(req, a.filename),
  }));
}

/* ---------- Create ---------- */
exports.createDamage = async (req, res) => {
  try {
    const {
      name = "",
      nic = "",
      postalCode = "",
      email = "",
      phone = "",
      address = "",
      description = "",
      damageType = "",
      estimatedLoss,
      occurredAt,
      currentLocation = "",
    } = req.body || {};

    if (!name.trim()) return badReq(res, "Name is required");
    if (!NIC_RE.test(String(nic).trim())) return badReq(res, "Invalid NIC");
    if (!postalCode.toString().trim()) return badReq(res, "Postal code is required");
    if (!EMAIL_RE.test(String(email).trim())) return badReq(res, "Invalid email");
    if (!PHONE_RE.test(String(phone).trim())) return badReq(res, "Invalid phone");
    if (!address.trim()) return badReq(res, "Address is required");
    if (!damageType) return badReq(res, "Damage type is required");
    if (!["Flood", "Earthquake", "Landslide", "Storm", "Fire", "Collision", "Other"].includes(damageType))
      return badReq(res, "Invalid damageType");
    const lossNum = Number(estimatedLoss);
    if (Number.isNaN(lossNum) || lossNum < 0) return badReq(res, "Invalid estimatedLoss (must be >= 0)");

    const occ = new Date(occurredAt);
    if (Number.isNaN(occ.getTime())) return badReq(res, "Invalid occurredAt (must be a valid date/time)");

    if (!currentLocation.trim()) return badReq(res, "Current location is required");

    // Attachments processed by multer and available as req.files (array)
    const files = req.files || []; // multer field name used: "attachments"
    const attachments = files.map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      mimeType: f.mimetype,
      size: f.size,
      uploadedAt: new Date(),
    }));

    const doc = new Damage({
      name: name.trim(),
      nic: nic.trim(),
      postalCode: postalCode.toString().trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      address: address.trim(),
      description: description?.trim() || "",
      attachments,
      damageType,
      estimatedLoss: lossNum,
      occurredAt: occ,
      currentLocation: currentLocation.trim(),
    });

    await doc.save();

    // send back attachments with URLs
    const out = doc.toObject();
    out.attachments = mapAttachments(req, out.attachments);

    return res.status(201).json({ ok: true, damage: out });
  } catch (err) {
    console.error("createDamage error:", err);
    return res.status(500).json({ ok: false, message: "Server error", error: err.message });
  }
};

/* ---------- List (q/damageType/from/to/page/limit) ---------- */
exports.listDamages = async (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim();
    const damageType = (req.query.damageType || "").toString().trim() || undefined;
    const page  = Math.max(parseInt(req.query.page ?? "1", 10), 1);
    const limit = Math.max(parseInt(req.query.limit ?? "50", 10), 1);
    const skip  = (page - 1) * limit;

    const filt = {};
    if (damageType) filt.damageType = damageType;
    if (q) {
      const rx = new RegExp(q, "i");
      filt.$or = [
        { name: rx }, { nic: rx }, { postalCode: rx }, { email: rx },
        { phone: rx }, { address: rx }, { description: rx }, { currentLocation: rx },
      ];
    }

    // Optional occurredAt range: from & to (ISO)
    const fromRaw = req.query.from;
    const toRaw   = req.query.to;
    if (fromRaw || toRaw) {
      const range = {};
      if (fromRaw) {
        const f = new Date(fromRaw);
        if (Number.isNaN(f.getTime())) return badReq(res, "Invalid 'from' date");
        range.$gte = f;
      }
      if (toRaw) {
        const t = new Date(toRaw);
        if (Number.isNaN(t.getTime())) return badReq(res, "Invalid 'to' date");
        range.$lte = t;
      }
      filt.occurredAt = range;
    }

    const [items, total] = await Promise.all([
      Damage.find(filt).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Damage.countDocuments(filt),
    ]);

    // add attachment URLs
    const mapped = items.map(d => {
      const obj = d.toObject();
      obj.attachments = mapAttachments(req, obj.attachments);
      return obj;
    });

    return res.json({ ok: true, total, page, limit, items: mapped });
  } catch (err) {
    console.error("listDamages error:", err);
    return res.status(500).json({ ok: false, message: "Server error", error: err.message });
  }
};

/* ---------- Read one ---------- */
exports.getDamage = async (req, res) => {
  try {
    const id = normalizeId(req.params.id);
    if (!isHex24(id)) return badReq(res, "Invalid id");

    const doc = await Damage.findById(id);
    if (!doc) return notFound(res);

    const out = doc.toObject();
    out.attachments = mapAttachments(req, out.attachments);

    return res.json({ ok: true, damage: out });
  } catch (err) {
    console.error("getDamage error:", err);
    return res.status(500).json({ ok: false, message: "Server error", error: err.message });
  }
};

/* ---------- Update (can add attachments) ---------- */
exports.updateDamage = async (req, res) => {
  try {
    const id = normalizeId(req.params.id);
    if (!isHex24(id)) return badReq(res, "Invalid id");

    const payload = { ...req.body };
    // remove disallowed overrides
    delete payload._id;
    delete payload.id;
    delete payload.createdAt;
    delete payload.updatedAt;

    // Validate provided fields (only if present)
    if (payload.nic && !NIC_RE.test(String(payload.nic).trim()))
      return badReq(res, "Invalid NIC");
    if (payload.phone && !PHONE_RE.test(String(payload.phone).trim()))
      return badReq(res, "Invalid phone");
    if (payload.email && !EMAIL_RE.test(String(payload.email).trim()))
      return badReq(res, "Invalid email");
    if (payload.damageType && !["Flood", "Earthquake", "Landslide", "Storm", "Fire", "Collision", "Other"].includes(payload.damageType))
      return badReq(res, "Invalid damageType");
    if (payload.estimatedLoss !== undefined) {
      const n = Number(payload.estimatedLoss);
      if (Number.isNaN(n) || n < 0) return badReq(res, "Invalid estimatedLoss (must be >= 0)");
      payload.estimatedLoss = n;
    }
    if (payload.occurredAt !== undefined) {
      const d = new Date(payload.occurredAt);
      if (Number.isNaN(d.getTime())) return badReq(res, "Invalid occurredAt (must be a valid date/time)");
      payload.occurredAt = d;
    }

    // Normalize strings
    ["name","postalCode","address","description","currentLocation"].forEach(k => {
      if (typeof payload[k] === "string") payload[k] = payload[k].trim();
    });
    if (typeof payload.email === "string") payload.email = payload.email.toLowerCase();

    // handle attachments (new files) - req.files
    const files = req.files || [];
    const newAtt = files.map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      mimeType: f.mimetype,
      size: f.size,
      uploadedAt: new Date(),
    }));

    // If new attachments, push them into $push
    let updateDoc = { $set: payload };
    if (newAtt.length) {
      updateDoc.$push = { attachments: { $each: newAtt } };
    }

    const updated = await Damage.findByIdAndUpdate(id, updateDoc, { new: true, runValidators: true });
    if (!updated) return notFound(res);

    const out = updated.toObject();
    out.attachments = mapAttachments(req, out.attachments);
    return res.json({ ok: true, damage: out });
  } catch (err) {
    console.error("updateDamage error:", err);
    return res.status(500).json({ ok: false, message: "Server error", error: err.message });
  }
};

/* ---------- Delete (and remove files) ---------- */
exports.deleteDamage = async (req, res) => {
  try {
    const id = normalizeId(req.params.id);
    if (!isHex24(id)) return badReq(res, "Invalid id");

    const doc = await Damage.findByIdAndDelete(id);
    if (!doc) return notFound(res);

    // delete files from disk
    const uploadDir = path.join(process.cwd(), "uploads", "damage");
    (doc.attachments || []).forEach(a => {
      try {
        const fp = path.join(uploadDir, a.filename);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      } catch (e) {
        console.warn("Failed to remove file:", a.filename, e && e.message);
      }
    });

    return res.json({ ok: true, deletedId: id });
  } catch (err) {
    console.error("deleteDamage error:", err);
    return res.status(500).json({ ok: false, message: "Server error", error: err.message });
  }
};
