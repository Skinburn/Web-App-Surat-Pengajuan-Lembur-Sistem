const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const store = require('../services/store');
const emailService = require('../services/email');
const pdfService = require('../services/pdf');

// Multer untuk upload tanda tangan
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, 'signature' + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

// GET /api/entries — ambil semua data
router.get('/entries', (req, res) => {
  res.json({ success: true, data: store.getAll(), count: store.getCount() });
});

// POST /api/entries — tambah entry baru
router.post('/entries', (req, res) => {
  const { nama, bagian, tanggal, jamMulai, jamSelesai, keterangan } = req.body;
  if (!nama || !bagian || !tanggal || !jamMulai || !jamSelesai || !keterangan) {
    return res.status(400).json({ success: false, message: 'Semua field harus diisi.' });
  }
  const entry = store.add({ nama, bagian, tanggal, jamMulai, jamSelesai, keterangan });
  res.json({ success: true, data: entry });
});

// GET /api/approve?token=xxx — approve semua & generate PDF & kirim ke HRD
router.get('/approve', async (req, res) => {
  const { token } = req.query;
  if (token !== store.getToken()) {
    return res.status(403).json({ success: false, message: 'Token tidak valid.' });
  }

  const entries = store.getAll();
  if (entries.length === 0) {
    return res.status(400).json({ success: false, message: 'Tidak ada data untuk disetujui.' });
  }

  const pending = entries.filter(e => e.status === 'pending');
  if (pending.length === 0) {
    return res.status(400).json({ success: false, message: 'Semua data sudah disetujui sebelumnya.' });
  }

  try {
    store.approveAll();
    const approved = store.getApproved();
    const pdfBuffer = await pdfService.generateSPL(approved);
    await emailService.sendSPLtoHRD(pdfBuffer);

    res.json({
      success: true,
      message: `✅ ${approved.length} data berhasil disetujui. SPL telah dikirim ke HRD.`,
      count: approved.length,
    });
  } catch (err) {
    console.error('[APPROVE] Error:', err.message);
    res.status(500).json({ success: false, message: 'Gagal generate PDF atau kirim email: ' + err.message });
  }
});

// POST /api/send-now — kirim email ke direktur manual (untuk test)
router.post('/send-now', async (req, res) => {
  const entries = store.getAll();
  if (entries.length === 0) {
    return res.status(400).json({ success: false, message: 'Tidak ada data.' });
  }
  try {
    await emailService.sendSummaryToDirector(entries);
    res.json({ success: true, message: 'Email berhasil dikirim ke direktur.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/config — simpan konfigurasi SMTP & email
router.post('/config', upload.single('signature'), (req, res) => {
  const { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, directorEmail, hrdEmail, directorName, companyName, serverUrl } = req.body;

  const newConfig = {
    smtp: {
      host: smtpHost || '',
      port: parseInt(smtpPort || '587'),
      user: smtpUser || '',
      pass: smtpPass || '',
      from: smtpFrom || '',
    },
    directorEmail: directorEmail || '',
    hrdEmail: hrdEmail || '',
    directorName: directorName || 'Nama Direktur',
    companyName: companyName || '',
  };

  if (req.file) {
    newConfig.signaturePath = req.file.path;
  }

  if (serverUrl) process.env.SERVER_URL = serverUrl;

  store.updateConfig(newConfig);
  res.json({ success: true, message: 'Konfigurasi berhasil disimpan.' });
});

// GET /api/config — ambil config (tanpa password)
router.get('/config', (req, res) => {
  const cfg = store.getConfig();
  res.json({
    success: true,
    data: {
      smtpHost: cfg.smtp.host,
      smtpPort: cfg.smtp.port,
      smtpUser: cfg.smtp.user,
      smtpFrom: cfg.smtp.from,
      directorEmail: cfg.directorEmail,
      hrdEmail: cfg.hrdEmail,
      directorName: cfg.directorName,
      companyName: cfg.companyName,
      hasSignature: !!cfg.signaturePath,
    },
  });
});

// POST /api/test-email — test koneksi SMTP
router.post('/test-email', async (req, res) => {
  const nodemailer = require('nodemailer');
  const cfg = store.getConfig();
  try {
    const t = nodemailer.createTransport({
      host: cfg.smtp.host,
      port: cfg.smtp.port,
      secure: cfg.smtp.port === 465,
      auth: { user: cfg.smtp.user, pass: cfg.smtp.pass },
      tls: { rejectUnauthorized: false },
    });
    await t.verify();
    res.json({ success: true, message: 'Koneksi SMTP berhasil!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal: ' + err.message });
  }
});

// POST /api/reset — reset manual (untuk admin)
router.post('/reset', (req, res) => {
  store.reset();
  res.json({ success: true, message: 'Data berhasil direset.' });
});

module.exports = router;
