const Volunteer = require("../models/VolunteerModel");

const toArray = (v) => Array.isArray(v) ? v : (typeof v === "string" && v.length ? [v] : []);
const coerceAvailableTime = (v) => {
  const x = String(v || "").toLowerCase();
  return ["day", "night", "both"].includes(x) ? x : "day";
};
const coerceType = (v) => (String(v || "").toLowerCase() === "team" ? "team" : "individual");
const coerceAssigned = (v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const x = v.toLowerCase(); return x === "true" || x === "1" || x === "yes" || x === "assigned";
  }
  return false;
};
const convertAssignmentStatus = (s) => s === "assigned";
const addAssignmentStatus = (obj) => ({ ...obj, assignmentStatus: obj.assigned ? "assigned" : "not_assigned" });
const stripUndefined = (o) => { Object.keys(o).forEach((k) => o[k] === undefined && delete o[k]); return o; };

// ------------------------ create ------------------------
exports.createVolunteer = async (req, res) => {
  try {
    const body = req.body || {};
    let assignedValue = false;
    if (body.assignmentStatus !== undefined) assignedValue = convertAssignmentStatus(body.assignmentStatus);
    else if (body.assigned !== undefined) assignedValue = coerceAssigned(body.assigned);

    const doc = await Volunteer.create({
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      whatsapp: body.whatsapp,
      volunteerType: coerceType(body.volunteerType),
      members: Number(body.members || 1) || 1,
      roles: toArray(body.roles),
      languages: toArray(body.languages),
      date: body.date ? new Date(body.date) : null,
      availableTime: coerceAvailableTime(body.availableTime),
      operationId: body.operationId,
      operationName: body.operationName, // denormalized
      livingArea: body.livingArea,
      group: body.group,
      notes: body.notes,
      assigned: assignedValue,
      assignedDate: assignedValue && !body.assignedDate ? new Date()
                   : body.assignedDate ? new Date(body.assignedDate) : null,
      assignedTo: body.assignedTo || body.assignedBy || null,
      assignmentNotes: body.assignmentNotes || null,
    });

    return res.status(201).json(addAssignmentStatus(doc.toObject()));
  } catch (err) {
    return res.status(400).json({ message: err.message || "Invalid payload" });
  }
};

// ------------------------- bulk -------------------------
exports.createBulk = async (req, res) => {
  try {
    if (!Array.isArray(req.body)) return res.status(400).json({ message: "Body must be an array" });

    const payload = req.body.map((b) => {
      let assignedValue = false;
      if (b.assignmentStatus !== undefined) assignedValue = convertAssignmentStatus(b.assignmentStatus);
      else if (b.assigned !== undefined) assignedValue = coerceAssigned(b.assigned);

      return {
        fullName: b.fullName, email: b.email, phone: b.phone, whatsapp: b.whatsapp,
        volunteerType: coerceType(b.volunteerType), members: Number(b.members || 1) || 1,
        roles: toArray(b.roles), languages: toArray(b.languages),
        date: b.date ? new Date(b.date) : null,
        availableTime: coerceAvailableTime(b.availableTime),
        operationId: b.operationId,
        operationName: b.operationName,
        livingArea: b.livingArea, group: b.group,
        notes: b.notes,
        assigned: assignedValue,
        assignedDate: assignedValue && !b.assignedDate ? new Date()
                     : b.assignedDate ? new Date(b.assignedDate) : null,
        assignedTo: b.assignedTo || b.assignedBy || null,
        assignmentNotes: b.assignmentNotes || null,
      };
    });

    const inserted = await Volunteer.insertMany(payload, { ordered: false });
    return res.status(201).json({ inserted: inserted.length, items: inserted.map((d) => addAssignmentStatus(d.toObject())) });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

// ------------------------- list -------------------------
exports.getVolunteers = async (req, res) => {
  try {
    const {
      q, role, language, availableTime, dateFrom, dateTo,
      assigned, operationId,
      limit = 100, page = 1,
    } = req.query;

    const filter = {};

    if (q) {
      const rx = new RegExp(q, "i");
      filter.$or = [
        { fullName: rx }, { phone: rx }, { email: rx },
        { livingArea: rx }, { group: rx }, { notes: rx },
        { assignedTo: rx }, { operationName: rx },
      ];
    }
    if (operationId) filter.operationId = String(operationId);
    if (role) filter.roles = { $in: toArray(role) };
    if (language) filter.languages = { $in: toArray(language) };
    if (availableTime) filter.availableTime = coerceAvailableTime(availableTime);
    if (assigned !== undefined) filter.assigned = coerceAssigned(assigned);

    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }

    const lim = Math.max(1, Math.min(500, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;

    const [items, total] = await Promise.all([
      Volunteer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim),
      Volunteer.countDocuments(filter),
    ]);

    const itemsWithStatus = items.map((d) => addAssignmentStatus(d.toObject()));
    return res.json({ total, page: Number(page), limit: lim, items: itemsWithStatus });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ------------------------ get by id ---------------------
exports.getVolunteerById = async (req, res) => {
  try {
    const item = await Volunteer.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Volunteer not found" });
    return res.json(addAssignmentStatus(item.toObject()));
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

// -------------------------- update ----------------------
exports.updateVolunteer = async (req, res) => {
  try {
    const b = req.body || {};

    let assignedValue = undefined;
    if (b.assignmentStatus !== undefined) assignedValue = convertAssignmentStatus(b.assignmentStatus);
    else if (b.assigned !== undefined) assignedValue = coerceAssigned(b.assigned);

    const update = {
      fullName: b.fullName,
      email: b.email,
      phone: b.phone,
      whatsapp: b.whatsapp,
      volunteerType: coerceType(b.volunteerType),
      members: Number(b.members || 1) || 1,
      roles: toArray(b.roles),
      languages: toArray(b.languages),
      availableTime: b.availableTime ? coerceAvailableTime(b.availableTime) : undefined,
      date: b.date ? new Date(b.date) : undefined,
      operationId: b.operationId,
      operationName: b.operationName,
      livingArea: b.livingArea,
      group: b.group,
      notes: b.notes,
      assigned: assignedValue,
      assignedDate: b.assignedDate ? new Date(b.assignedDate) : undefined,
      assignedTo: b.assignedTo || b.assignedBy || undefined,
      assignmentNotes: b.assignmentNotes !== undefined ? b.assignmentNotes : undefined,
    };

    if (assignedValue === true && !b.assignedDate) update.assignedDate = new Date();
    if (assignedValue === false) { update.assignedDate = null; update.assignedTo = null; update.assignmentNotes = null; }

    stripUndefined(update);

    const item = await Volunteer.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: "Volunteer not found" });

    return res.json(addAssignmentStatus(item.toObject()));
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

// ------------------------- delete -----------------------
exports.deleteVolunteer = async (req, res) => {
  try {
    const item = await Volunteer.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Volunteer not found" });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

// ---------------------- toggle assign -------------------
exports.toggleAssignment = async (req, res) => {
  try {
    const volunteer = await Volunteer.findById(req.params.id);
    if (!volunteer) return res.status(404).json({ message: "Volunteer not found" });

    const { assignedTo } = req.body || {};
    const willAssign = !volunteer.assigned;

    const update = { assigned: willAssign };

    if (willAssign) {
      update.assignedDate = new Date();
      update.assignedTo = (typeof assignedTo === "string" && assignedTo.trim()) || volunteer.assignedTo || null;
    } else {
      update.assignedDate = null; update.assignedTo = null; update.assignmentNotes = null;
    }

    const updated = await Volunteer.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    return res.json(addAssignmentStatus(updated.toObject()));
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

// ------------------------- stats ------------------------
exports.getAssignmentStats = async (req, res) => {
  try {
    const [assigned, unassigned, total] = await Promise.all([
      Volunteer.countDocuments({ assigned: true }),
      Volunteer.countDocuments({ assigned: false }),
      Volunteer.countDocuments(),
    ]);
    return res.json({ total, assigned, unassigned, assignedPercentage: total > 0 ? Math.round((assigned / total) * 100) : 0 });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
