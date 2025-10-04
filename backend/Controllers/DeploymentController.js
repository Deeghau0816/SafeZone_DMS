const Deployment = require("../models/DeploymentModel");

exports.create = async (req, res) => {
  try {
    const d = await Deployment.create(req.body);
    res.status(201).json({ ok: true, deployment: d });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
};

exports.list = async (_req, res) => {
  try {
    const list = await Deployment.find().sort({ createdAt: -1 });
    res.json({ ok: true, deployments: list });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
};

exports.get = async (req, res) => {
  try {
    const d = await Deployment.findById(req.params.id);
    if (!d) return res.status(404).json({ ok: false, message: "Not found" });
    res.json({ ok: true, deployment: d });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const d = await Deployment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!d) return res.status(404).json({ ok: false, message: "Not found" });
    res.json({ ok: true, deployment: d });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const d = await Deployment.findByIdAndDelete(req.params.id);
    if (!d) return res.status(404).json({ ok: false, message: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
};


