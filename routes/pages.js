const express = require('express');
const router = express.Router();
const path = require('path');
const store = require('../services/store');

router.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
router.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../public/admin.html')));
router.get('/setup', (req, res) => res.sendFile(path.join(__dirname, '../public/setup.html')));

// Halaman approve — direktur klik dari email
router.get('/approve', (req, res) => {
  const { token } = req.query;
  if (token !== store.getToken()) {
    return res.send(`
      <!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2 style="color:#c0392b">❌ Token Tidak Valid</h2>
        <p>Link approval tidak valid atau sudah kadaluarsa.</p>
      </body></html>`);
  }
  res.sendFile(path.join(__dirname, '../public/approve.html'));
});

module.exports = router;
