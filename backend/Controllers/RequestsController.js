const Request = require("../models/RequestsModel");

exports.create = async (req, res) => {
  try {
    const r = await Request.create(req.body);
    res.status(201).json({ ok: true, request: r });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
};

exports.list = async (_req, res) => {
  try {
    const list = await Request.find().sort({ createdAt: -1 });
    res.json({ ok: true, requests: list });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
};

exports.get = async (req, res) => {
  try {
    const r = await Request.findById(req.params.id);
    if (!r) return res.status(404).json({ ok: false, message: "Not found" });
    res.json({ ok: true, request: r });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const r = await Request.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!r) return res.status(404).json({ ok: false, message: "Not found" });
    res.json({ ok: true, request: r });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const r = await Request.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ ok: false, message: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
};


