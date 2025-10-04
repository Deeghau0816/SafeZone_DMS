// Routes/AdminRoute.js
const express = require("express");
const bcrypt = require("bcryptjs");
const Admin = require("../models/AdminModel");

const router = express.Router();

// helpers
const VALID_TYPES = ["System Admin", "Disaster Management Officer", "Other"];
const isEmail = (s = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s));
const requireAdmin = (req, res, next) => {
  if (req.session?.admin?.id) return next();
  return res.status(401).json({ ok: false, message: "Not authenticated (admin)" });
};

router.post("/register", async (req, res) => {
  try {
    const { name, email, contactNumber, adminName, password } = req.body;

    // basic checks
    if (!name || !email || !contactNumber || !adminName || !password) {
      return res.status(400).json({ ok: false, message: "All fields are required" });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ ok: false, message: "Invalid email" });
    }
    if (!VALID_TYPES.includes(adminName)) {
      return res.status(400).json({ ok: false, message: "Invalid admin type" });
    }

    // already exists?
    const existed = await Admin.findOne({ email: String(email).toLowerCase().trim() });
    if (existed) {
      return res.status(409).json({ ok: false, message: "Admin already exists with this email" });
    }

    const hash = await bcrypt.hash(String(password), 10);

    const admin = await Admin.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      contactNumber: String(contactNumber).trim(),
      adminName,
      password: hash,
    });

    return res.json({
      ok: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        contactNumber: admin.contactNumber,
        adminName: admin.adminName,
      },
    });
  } catch (e) {
    console.error("[admin/register]", e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

/**
 * POST /admin/login
 * Body: { email, password }
 */
router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    const plain = String(req.body.password || "");

    if (!email || !plain) {
      return res.status(400).json({ ok: false, message: "Email and password are required" });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ ok: false, message: "Invalid email" });
    }

    // IMPORTANT: select("+password") because schema hides it
    const admin = await Admin.findOne({ email }).select("+password");
    if (!admin) {
      return res.status(400).json({ ok: false, message: "Invalid email or password" });
    }
    if (!admin.password) {
      return res.status(500).json({ ok: false, message: "Admin has no password set" });
    }

    const ok = await bcrypt.compare(plain, admin.password);
    if (!ok) {
      return res.status(400).json({ ok: false, message: "Invalid email or password" });
    }

    // set session
    req.session.admin = {
      id: admin._id,
      email: admin.email,
      name: admin.name,
      adminName: admin.adminName,
      type: "admin",
    };

    return res.json({ ok: true, admin: req.session.admin });
  } catch (e) {
    console.error("[admin/login]", e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

/** GET /admin/auth/me (kept for compatibility) */
router.get("/auth/me", (req, res) => {
  if (req.session?.admin) return res.json({ ok: true, admin: req.session.admin });
  return res.status(401).json({ ok: false, admin: null });
});

/** POST /admin/logout */
router.post("/logout", (req, res) => {
  if (req.session) req.session.admin = null;
  return res.json({ ok: true });
});

/* ---------------------------
   NEW: Profile endpoints
----------------------------*/

/** GET /admin/me  -> full profile from DB (without password) */
router.get("/me", requireAdmin, async (req, res) => {
  try {
    const admin = await Admin.findById(req.session.admin.id).lean();
    if (!admin) return res.status(404).json({ ok: false, message: "Admin not found" });
    // remove hidden fields if any (password is not selected by default)
    return res.json({ ok: true, admin });
  } catch (e) {
    console.error("[admin GET /me]", e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

/**
 * PUT /admin/me
 * Body: { name?, email?, contactNumber?, adminName? }
 */
router.put("/me", requireAdmin, async (req, res) => {
  try {
    const patch = {
      name:          (req.body.name ?? "").trim(),
      email:         (req.body.email ?? "").toLowerCase().trim(),
      contactNumber: (req.body.contactNumber ?? "").trim(),
      adminName:      req.body.adminName,
    };

    // validate when present
    if (patch.email && !isEmail(patch.email)) {
      return res.status(400).json({ ok: false, message: "Invalid email" });
    }
    if (patch.adminName && !VALID_TYPES.includes(patch.adminName)) {
      return res.status(400).json({ ok: false, message: "Invalid admin type" });
    }

    // drop empties so we don't overwrite with ""
    Object.keys(patch).forEach((k) => { if (!patch[k]) delete patch[k]; });

    // apply update
    const updated = await Admin.findByIdAndUpdate(
      req.session.admin.id,
      patch,
      { new: true, runValidators: true }
    ).lean();

    if (!updated) return res.status(404).json({ ok: false, message: "Admin not found" });

    // keep session in sync (name/email/adminName commonly shown in UI)
    req.session.admin = {
      ...req.session.admin,
      name: updated.name,
      email: updated.email,
      adminName: updated.adminName,
    };

    return res.json({ ok: true, admin: updated });
  } catch (e) {
    // handle duplicate email nicely
    if (e?.code === 11000 && e?.keyPattern?.email) {
      return res.status(409).json({ ok: false, message: "Email already in use" });
    }
    console.error("[admin PUT /me]", e);
    return res.status(500).json({ ok: false, message: "Failed to update profile" });
  }
});

/**
 * PUT /admin/me/password
 * Body: { currentPassword, newPassword }
 */
router.put("/me/password", requireAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ ok: false, message: "Both currentPassword and newPassword are required" });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ ok: false, message: "New password must be at least 6 characters" });
    }

    const admin = await Admin.findById(req.session.admin.id).select("+password");
    if (!admin) return res.status(404).json({ ok: false, message: "Admin not found" });

    const ok = await bcrypt.compare(String(currentPassword), admin.password);
    if (!ok) return res.status(400).json({ ok: false, message: "Current password is incorrect" });

    const saltRounds = Number(process.env.SALT || 10);
    const salt = await bcrypt.genSalt(saltRounds);
    admin.password = await bcrypt.hash(String(newPassword), salt);
    await admin.save();

    return res.json({ ok: true, message: "Password updated" });
  } catch (e) {
    console.error("[admin PUT /me/password]", e);
    return res.status(500).json({ ok: false, message: "Failed to update password" });
  }
});

router.delete("/me", async (req, res) => {
  try {
    const adminId = req.session?.admin?.id;
    if (!adminId) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    await Admin.findByIdAndDelete(adminId);

    req.session.destroy(() => {
      res.clearCookie("sid");
      return res.json({ ok: true, message: "Admin account deleted" });
    });
  } catch (e) {
    console.error("[DELETE /admin/me]", e);
    return res.status(500).json({ ok: false, message: "Failed to delete admin" });
  }
});

module.exports = router;
