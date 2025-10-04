const bcrypt = require("bcryptjs");
const Admin = require("../models/AdminModel");

const VALID = ["System Admin","Disaster Management Officer","Other"];
const isEmail = (s="") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s));

class AdminControl{
  async register(req, res) {
    try {
      const { name, email, contactNumber, adminName, password } = req.body;
      if (!name || !email || !contactNumber || !adminName || !password)
        return res.status(400).json({ ok:false, message:"All fields are required" });
      if (!isEmail(email)) return res.status(400).json({ ok:false, message:"Invalid email" });
      if (!VALID.includes(adminName)) return res.status(400).json({ ok:false, message:"Invalid admin type" });

      const exists = await Admin.findOne({ email: email.toLowerCase().trim() });
      if (exists) return res.status(409).json({ ok:false, message:"Admin already exists" });

      const hash = await bcrypt.hash(String(password), 10);
      const admin = await Admin.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        contactNumber: String(contactNumber).trim(),
        adminName,
        password: hash,
      });

      return res.json({
        ok: true,
        admin: { id: admin._id, name: admin.name, email: admin.email, contactNumber: admin.contactNumber, adminName: admin.adminName }
      });
    } catch (e) {
      console.error("[admin/register]", e);
      return res.status(500).json({ ok:false, message:"Server error" });
    }
  }

  async login(req, res) {
    try {
      const email = String(req.body.email||"").toLowerCase().trim();
      const plain = String(req.body.password||"");
      if (!email || !plain) return res.status(400).json({ ok:false, message:"Email and password are required" });
      if (!isEmail(email)) return res.status(400).json({ ok:false, message:"Invalid email" });

      // select password 
      const admin = await Admin.findOne({ email }).select("+password");
      if (!admin || !admin.password) return res.status(400).json({ ok:false, message:"Invalid email or password" });

      const ok = await bcrypt.compare(plain, admin.password);
      if (!ok) return res.status(400).json({ ok:false, message:"Invalid email or password" });

      req.session.admin = { id: admin._id, email: admin.email, name: admin.name, adminName: admin.adminName, type: "admin" };
      return res.json({ ok:true, admin: req.session.admin });
    } catch (e) {
      console.error("[admin/login]", e);
      return res.status(500).json({ ok:false, message:"Server error" });
    }
  }

  authMe(req, res) {
    if (req.session?.admin) return res.json({ ok:true, admin: req.session.admin });
    return res.status(401).json({ ok:false, admin: null });
  }

  logout(req, res) {
    if (req.session) req.session.admin = null;
    return res.json({ ok:true });
  }
}

module.exports = new AdminControl();
