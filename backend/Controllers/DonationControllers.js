const Donation = require("../models/DonationModel");

/* ------------------------------- helpers ------------------------------ */
const toBool = (v) => v === true || v === "true" || v === "1" || v === 1 || v === "on";
const toNumber = (v, fb = null) => (Number.isFinite(Number(v)) ? Number(v) : fb);
const parseDate = (v) => (v ? (isNaN(new Date(v).getTime()) ? undefined : new Date(v)) : undefined);

function normalizeChannel(v) {
  if (!v) return undefined;
  const s = String(v).trim().toLowerCase();
  if (["cash counter", "cashcounter"].includes(s)) return "Cash";
  if (["bank deposit", "bank_deposit", "bank"].includes(s)) return "Bank deposit";
  if (["online gateway", "online_gateway", "gateway", "online"].includes(s)) return "Online gateway";
  if (["mobile wallet", "mobile_wallet", "wallet"].includes(s)) return "Mobile wallet";
  if (["cheque", "check"].includes(s)) return "Cheque";
  return undefined;
}
const normalizeCurrency = (v) => (v ? String(v).trim().toUpperCase() : undefined);

const allowed = {
  donorType: ["Individual", "Organization"],
  currency: ["LKR", "USD", "EUR"],
  channel: ["Bank deposit", "Cash", "Online gateway", "Mobile wallet", "Cheque"],
};

function mapFormToDoc(src = {}, file) {
  const isAnonymous = toBool(src.isAnonymous) || toBool(src.makeAnonymous);
  const allowPublicName = isAnonymous ? false : (toBool(src.allowNamePublic) || toBool(src.allowName));

  const donorType = allowed.donorType.includes(src.donorType) ? src.donorType : undefined;

  const currencyIn = normalizeCurrency(src.currency);
  const currency = allowed.currency.includes(currencyIn) ? currencyIn : undefined;

  const chNorm = normalizeChannel(src.channel);
  const channel = allowed.channel.includes(src.channel) ? src.channel : chNorm;

  const evidence =
    file && file.filename
      ? {
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          path: `/uploads/${file.filename}`,
        }
      : undefined;

  const amount = toNumber(src.amount);
  const fees = toNumber(src.fees);
  const netAmount =
    amount != null && fees != null
      ? Number((amount - fees).toFixed(2))
      : src.netAmount != null
      ? toNumber(src.netAmount)
      : undefined;

  return {
    donorType,
    donorName: src.donorName?.trim(),
    donorPhone: (src.donorPhone || src.phone || "").trim(),
    donorEmail: (src.donorEmail || src.email || "").trim().toLowerCase(),
    donorAddress: (src.donorAddress || src.address || "").trim(),
    whatsapp: (src.whatsapp || "").trim(),

    isAnonymous,
    okToContact: toBool(src.okToContact),
    allowNamePublic: allowPublicName,

    amount,
    currency,
    fees,
    netAmount,
    fxRate: toNumber(src.fxRate),

    channel,
    gateway: src.gateway?.trim(),
    bankName: src.bankName?.trim(),
    branch: src.branch?.trim(),
    depositDate: parseDate(src.depositDate),
    depositorName: src.depositorName?.trim(),
    referenceNo: (src.referenceNo || src.slipNo || "").trim(),
    receiptNo: src.receiptNo?.trim(),
    transactionRef: src.transactionRef?.trim(),

    evidence,

    status:
      (["PLEDGED", "PENDING", "RECEIVED", "FAILED", "REFUNDED"].includes(src.status) && src.status) || undefined,

    campaign: src.campaign,
    note: (src.note || src.notes || "").trim(),

    createdIp: src._ip,
    userAgent: src._ua,
  };
}

function validateCreate(doc) {
  const errors = [];
  if (!doc.donorType) errors.push("Donor type is required (Individual/Organization).");
  if (!doc.donorEmail && !doc.donorPhone) errors.push("Provide at least one contact: email or phone.");
  if (!doc.amount || doc.amount <= 0) errors.push("Amount must be a positive number.");
  if (!doc.currency) errors.push("Currency is required.");
  if (!doc.channel) errors.push("Channel is required.");
  if (doc.channel === "Bank deposit") {
    if (!doc.bankName) errors.push("Bank name is required for bank deposits.");
    if (!doc.referenceNo) errors.push("Reference/Slip number is required for bank deposits.");
  }
  return errors;
}

/* ------------------------------- CRUD ------------------------------- */
const createDonation = async (req, res) => {
  try {
    req.body._ip = req.ip;
    req.body._ua = req.headers["user-agent"];

    const doc = mapFormToDoc(req.body, req.file);
    const errors = validateCreate(doc);
    if (errors.length) return res.status(400).json({ message: "Validation error", errors });

    const donation = new Donation(doc);
    await donation.save();
    return res.status(201).json({ message: "Donation recorded successfully", donation });
  } catch (err) {
    console.error("Error in createDonation:", err);
    if (err.code === 11000) return res.status(400).json({ message: "Duplicate value", error: err.message });
    if (err.name === "ValidationError")
      return res.status(400).json({ message: "Model validation error", error: err.message });
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

const createDonationsBulk = async (req, res) => {
  try {
    if (!Array.isArray(req.body)) return res.status(400).json({ message: "Expected an array of donations" });

    const docs = req.body.map((b) => mapFormToDoc(b));
    const errors = [];
    docs.forEach((d, i) => {
      const e = validateCreate(d);
      if (e.length) errors.push({ index: i, errors: e });
    });
    if (errors.length) return res.status(400).json({ message: "Validation error", errors });

    const inserted = await Donation.insertMany(docs, { ordered: false });
    return res.status(201).json({ message: "Bulk insert ok", count: inserted.length, items: inserted });
  } catch (err) {
    console.error("Error in createDonationsBulk:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

const listDonations = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      q,
      channel,
      currency,
      donorType,              // <-- NEW
      from,
      to,
      publicOnly,
      okToContactOnly,
      sort = "latest", // latest | oldest | top
    } = req.query;

    const filter = {};

    // Smart org/ind keywords sent via q (fallback, client also sends explicit donorType)
    const qTrim = (q || "").trim().toLowerCase();
    let inferredType = null;
    if (/^org(anization)?s?( list)?$/.test(qTrim)) inferredType = "Organization";
    else if (/^ind(ividual)?s?( list)?$/.test(qTrim)) inferredType = "Individual";

    if (q && !inferredType) {
      filter.$or = [
        { donorName: { $regex: q, $options: "i" } },
        { donorEmail: { $regex: q, $options: "i" } },
        { donorPhone: { $regex: q, $options: "i" } },
        { whatsapp: { $regex: q, $options: "i" } },
        { referenceNo: { $regex: q, $options: "i" } },
        { transactionRef: { $regex: q, $options: "i" } },
      ];
    }

    if (channel) filter.channel = normalizeChannel(channel) || channel;
    if (currency) filter.currency = normalizeCurrency(currency);

    // donorType from query OR inferred from q
    if (donorType || inferredType) {
      const t = String(donorType || inferredType).toLowerCase();
      if (t.startsWith("org")) filter.donorType = "Organization";
      else if (t.startsWith("ind")) filter.donorType = "Individual";
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    if (toBool(publicOnly)) filter.allowNamePublic = true;
    if (toBool(okToContactOnly)) filter.okToContact = true;

    const skip = (Number(page) - 1) * Number(limit);
    const sortSpec =
      sort === "top" ? { amount: -1, createdAt: -1 } : sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

    const [items, total] = await Promise.all([
      Donation.find(filter).sort(sortSpec).skip(Number(skip)).limit(Number(limit)),
      Donation.countDocuments(filter),
    ]);

    res.status(200).json({ page: Number(page), limit: Number(limit), total, items });
  } catch (err) {
    console.error("Error in listDonations:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const getDonationById = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ message: "Donation not found" });
    res.status(200).json({ donation });
  } catch (err) {
    console.error("Error in getDonationById:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const updateDonation = async (req, res) => {
  try {
    const incoming = mapFormToDoc(req.body, req.file);
    const update = {};

    for (const k of Object.keys(incoming)) {
      if (incoming[k] !== undefined && incoming[k] !== null && incoming[k] !== "") update[k] = incoming[k];
    }

    if (req.body.createdAt) {
      const dt = new Date(req.body.createdAt);
      if (!isNaN(dt.getTime())) update.createdAt = dt;
    }
    if (req.body.depositDate) {
      const dd = new Date(req.body.depositDate);
      if (!isNaN(dd.getTime())) update.depositDate = dd;
    }

    if (update.channel === "Bank deposit") {
      if (update.bankName == null) update.bankName = incoming.bankName;
      if (update.referenceNo == null) update.referenceNo = incoming.referenceNo;
    }

    const donation = await Donation.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true, timestamps: true }
    );
    if (!donation) return res.status(404).json({ message: "Donation not found" });
    res.status(200).json({ message: "Donation updated successfully", donation });
  } catch (err) {
    console.error("Error in updateDonation:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const deleteDonation = async (req, res) => {
  try {
    const donation = await Donation.findByIdAndDelete(req.params.id);
    if (!donation) return res.status(404).json({ message: "Donation not found" });
    res.status(200).json({ message: "Donation deleted successfully" });
  } catch (err) {
    console.error("Error in deleteDonation:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/* -------------------- WhatsApp “Thanks” utilities -------------------- */
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_WHATSAPP_FROM; // e.g. 'whatsapp:+14155238886'

const normalizePhone = (raw) => {
  const d = String(raw || "").replace(/[^\d]/g, "");
  if (!d) return null;
  return d.startsWith("0") ? "94" + d.slice(1) : d;
};

async function gatherNumbers(filter) {
  const donors = await Donation.find({
    ...filter,
    okToContact: true,
    $or: [{ whatsapp: { $exists: true, $ne: "" } }, { donorPhone: { $exists: true, $ne: "" } }],
  });

  const set = new Set();
  const arr = [];
  donors.forEach((d) => {
    const n = normalizePhone(d.whatsapp || d.donorPhone);
    if (n && !set.has(n)) {
      set.add(n);
      arr.push({ n, d });
    }
  });
  return arr;
}

const sendThanksToday = async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const numbers = await gatherNumbers({ createdAt: { $gte: start, $lte: end } });
    if (!numbers.length) {
      return res.json({ message: "No donors with WhatsApp/phone today (OK to contact).", candidates: 0, sent: 0 });
    }

    const canSend = !!(TWILIO_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM);
    if (!canSend) {
      return res.status(501).json({
        message: "Twilio not configured. Dry-run preview.",
        candidates: numbers.length,
        sent: 0,
        numbers: numbers.map((x) => `+${x.n}`),
      });
    }

    const twilio = require("twilio")(TWILIO_SID, TWILIO_AUTH_TOKEN);
    let sent = 0;
    await Promise.all(
      numbers.map(({ n, d }) => {
        const body = `Thank you ${d.isAnonymous ? "dear donor" : d.donorName || "dear donor"} for your generous contribution of ${Number(d.amount || 0).toFixed(2)} ${d.currency || ""}. We truly appreciate your support!`;
        return twilio.messages
          .create({ from: TWILIO_FROM, to: `whatsapp:+${n}`, body })
          .then(() => sent++)
          .catch((e) => console.error("Twilio send error:", e.message));
      })
    );

    res.json({ message: "Thanks messages processed.", candidates: numbers.length, sent, numbers: numbers.map(x => `+${x.n}`) });
  } catch (err) {
    console.error("Error in sendThanksToday:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const sendThanksBatch = async (req, res) => {
  try {
    const { ids, date, from, to, status } = req.body || {};

    const filter = {};
    if (Array.isArray(ids) && ids.length) {
      filter._id = { $in: ids };
    } else if (date === "today") {
      const s = new Date();
      s.setHours(0, 0, 0, 0);
      const e = new Date();
      e.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: s, $lte: e };
    } else if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    if (status) filter.status = status;

    const numbers = await gatherNumbers(filter);
    const canSend = !!(TWILIO_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM);

    if (!canSend) {
      return res.status(501).json({
        message: "Twilio not configured. Dry-run preview.",
        candidates: numbers.length,
        sent: 0,
        numbers: numbers.map((x) => `+${x.n}`),
      });
    }

    const twilio = require("twilio")(TWILIO_SID, TWILIO_AUTH_TOKEN);
    let sent = 0;
    await Promise.all(
      numbers.map(({ n, d }) => {
        const body = `Thank you ${d.isAnonymous ? "dear donor" : d.donorName || "dear donor"} for your generous contribution of ${Number(d.amount || 0).toFixed(2)} ${d.currency || ""}. We truly appreciate your support!`;
        return twilio.messages
          .create({ from: TWILIO_FROM, to: `whatsapp:+${n}`, body })
          .then(() => sent++)
          .catch((e) => console.error("Twilio send error:", e.message));
      })
    );

    res.json({ message: "Thanks messages processed.", candidates: numbers.length, sent });
  } catch (err) {
    console.error("Error in sendThanksBatch:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  createDonation,
  createDonationsBulk,
  listDonations,
  getDonationById,
  updateDonation,
  deleteDonation,
  sendThanksToday,
  sendThanksBatch,
};
