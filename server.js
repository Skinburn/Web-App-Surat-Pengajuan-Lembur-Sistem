const express = require('express');
const cron = require('node-cron');
const path = require('path');
const store = require('./services/store');
const emailService = require('./services/email');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api', require('./routes/entries'));
app.use('/', require('./routes/pages'));

// Cron: Kirim email summary ke direktur jam 10:00 pagi
cron.schedule('0 10 * * *', async () => {
  console.log('[CRON] Mengirim email summary ke direktur...');
  const entries = store.getAll();
  if (entries.length === 0) {
    console.log('[CRON] Tidak ada data, email dibatalkan.');
    return;
  }
  try {
    await emailService.sendSummaryToDirector(entries);
    console.log('[CRON] Email summary berhasil dikirim.');
  } catch (err) {
    console.error('[CRON] Gagal kirim email:', err.message);
  }
}, { timezone: 'Asia/Jakarta' });

// Cron: Reset data jam 23:59
cron.schedule('59 23 * * *', () => {
  console.log('[CRON] Reset data harian...');
  store.reset();
  console.log('[CRON] Data berhasil direset.');
}, { timezone: 'Asia/Jakarta' });

app.listen(PORT, () => {
  console.log(`\n✅ SPL System berjalan di http://localhost:${PORT}`);
  console.log(`   Halaman karyawan : http://localhost:${PORT}/`);
  console.log(`   Admin monitor    : http://localhost:${PORT}/admin`);
  console.log(`   Setup email      : http://localhost:${PORT}/setup\n`);
});
