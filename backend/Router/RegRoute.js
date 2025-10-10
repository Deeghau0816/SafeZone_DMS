const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const Token = require("../models/token");
const sendEmail = require("../utils/sendEmail");
const User = require("../models/RegModel"); // model exports the User directly

// ---------- helpers ----------
function isEmail(s = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s));
}
function requiredFields(body, keys) {
  return keys.filter((k) => !body[k] || String(body[k]).trim() === "");
}
function requireUser(req, res, next) {
  if (req.session?.user?.id) return next();
  return res.status(401).json({ ok: false, message: "Not authenticated" });
}

// ---------- session whoami ----------
router.get("/me", (req, res) => {
  if (req.session?.user) return res.json({ ok: true, user: req.session.user });
  return res.status(401).json({ ok: false, user: null });
});

// ---------- LOGIN ----------
router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    const plain = req.body.password || "";

    if (!email || !plain) {
      return res.status(400).json({ ok: false, message: "Email and password are required" });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ ok: false, message: "Invalid email" });
    }

    // IMPORTANT: explicitly select password (schema may hide it)
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({ ok: false, message: "Invalid email or password" });
    }

    if (user.verified === false) {
      return res.status(403).json({ ok: false, message: "Please verify your email first." });
    }

    if (typeof user.password !== "string" || user.password.length === 0) {
      return res.status(500).json({ ok: false, message: "User has no password set. Please reset your password." });
    }

    const ok = await bcrypt.compare(plain, user.password);
    if (!ok) {
      return res.status(400).json({ ok: false, message: "Invalid email or password" });
    }

    req.session.user = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      district: user.district,
    };

    return res.json({ ok: true, user: req.session.user });
  } catch (e) {
    console.error("[LOGIN] error:", e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// ---------- LOGOUT ----------
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ ok: false, message: "Logout failed" });
    res.clearCookie("sid");
    return res.json({ ok: true });
  });
});

// ---------- REGISTER ----------
router.post("/", async (req, res) => {
  try {
    const required = [
      "firstName",
      "lastName",
      "nic",
      "email",
      "contactNumber",
      "district",
      "city",
      "postalCode",
      "password",
    ];
    const missing = requiredFields(req.body, required);
    if (missing.length) {
      return res.status(400).json({ ok: false, message: `Missing: ${missing.join(", ")}` });
    }

    const email = String(req.body.email).toLowerCase().trim();
    if (!isEmail(email)) {
      return res.status(400).json({ ok: false, message: "Invalid email" });
    }
    if (String(req.body.password).length < 6) {
      return res.status(400).json({ ok: false, message: "Password must be at least 6 characters" });
    }

    let user = await User.findOne({ email });
    if (user) {
      if (!user.verified) {
        // resend verification
        let token = await Token.findOne({ userId: user._id });
        if (!token) {
          token = await new Token({
            userId: user._id,
            token: crypto.randomBytes(32).toString("hex"),
          }).save();
        }
        const url = `${process.env.BASE_URL}/users/${user.id}/verify/${token.token}`;

        try {
          await sendEmail(user.email, "Verify Email", url);
          return res.status(200).json({
            ok: true,
            message: "Verification email resent to your account. Please verify.",
          });
        } catch (e) {
          console.error("[REGISTER] resend email failed:", e?.message || e);
          return res.status(200).json({
            ok: true,
            message: "Verification email could not be sent. Use verifyLink in dev.",
            verifyLink: url,
          });
        }
      }
      return res.status(409).json({ ok: false, message: "User with given email already exists!" });
    }

    const saltRounds = Number(process.env.SALT || 10);
    const salt = await bcrypt.genSalt(saltRounds);
    const hashPassword = await bcrypt.hash(String(req.body.password), salt);

    user = await new User({
      firstName: String(req.body.firstName).trim(),
      lastName: String(req.body.lastName).trim(),
      nic: String(req.body.nic).trim(),
      email,
      contactNumber: String(req.body.contactNumber).trim(),
      district: String(req.body.district).trim(),
      city: String(req.body.city).trim(),
      postalCode: String(req.body.postalCode).trim(),
      password: hashPassword,
    }).save();

    const token = await new Token({
      userId: user._id,
      token: crypto.randomBytes(32).toString("hex"),
    }).save();

    const url = `${process.env.BASE_URL}/users/${user.id}/verify/${token.token}`;

    try {
      await sendEmail(user.email, "Verify Email", url);
      return res.status(201).json({
        ok: true,
        message: "An email has been sent to your account. Please verify.",
      });
    } catch (e) {
      console.error("[REGISTER] email send failed:", e?.message || e);
      return res.status(201).json({
        ok: true,
        message: "User registered. Email failed to send; use verifyLink in dev.",
        verifyLink: url,
      });
    }
  } catch (error) {
    console.error("[REGISTER] error:", error);
    return res.status(500).json({ ok: false, message: "Internal Server Error" });
  }
});

// ---------- VERIFY EMAIL ----------
router.get("/:id/verify/:token", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(400).json({ ok: false, message: "Invalid link" });

    const token = await Token.findOne({ userId: user._id, token: req.params.token });
    if (!token) return res.status(400).json({ ok: false, message: "Invalid link" });

    await User.updateOne({ _id: user._id }, { $set: { verified: true } });
    await Token.deleteOne({ _id: token._id });

    return res.status(200).json({ ok: true, message: "Email verified successfully" });
  } catch (error) {
    console.error("[VERIFY] error:", error);
    return res.status(500).json({ ok: false, message: "Internal Server Error" });
  }
});

/* ---------------------------------------------------
   SELF-DELETE (must be BEFORE the param :userId routes)
---------------------------------------------------- */
/**
 * DELETE /users/me
 * Deletes the currently logged-in user's account and logs them out.
 */
router.delete("/me", requireUser, async (req, res) => {
  try {
    const userId = req.session.user.id;
    await User.findByIdAndDelete(userId);

    // end session
    req.session.destroy(() => {
      res.clearCookie("sid"); // cookie name defined in app.js session config
      return res.json({ ok: true, message: "Account deleted" });
    });
  } catch (e) {
    console.error("[DELETE /users/me] error:", e);
    return res.status(500).json({ ok: false, message: "Failed to delete account" });
  }
});

// ---------- CRUD (admin/utility) ----------
// NOTE: keep fixed routes above; param route last to avoid conflicts.
const RegControl = require("../Controllers/RegControl");
router.get("/", RegControl.getAllUsers);
router.get("/:userId", RegControl.getUserById);
router.put("/:userId", RegControl.updateUser);
router.delete("/:userId", RegControl.deleteUser);

module.exports = router;
