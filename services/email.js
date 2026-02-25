const nodemailer = require('nodemailer');
const store = require('./store');
const pdfService = require('./pdf');

function getTransporter() {
  const cfg = store.getConfig();
  return nodemailer.createTransport({
    host: cfg.smtp.host,
    port: cfg.smtp.port,
    secure: cfg.smtp.port === 465,
    auth: { user: cfg.smtp.user, pass: cfg.smtp.pass },
    tls: { rejectUnauthorized: false },
  });
}

function formatTanggal(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function buildSummaryHTML(entries, approveUrl) {
  const cfg = store.getConfig();
  const today = formatTanggal(new Date().toISOString());

  const rows = entries.map((e, i) => `
    <tr style="background:${i % 2 === 0 ? '#f9f9f9' : '#ffffff'}">
      <td style="padding:10px 14px;border:1px solid #ddd;text-align:center">${i + 1}</td>
      <td style="padding:10px 14px;border:1px solid #ddd"><strong>${e.nama}</strong></td>
      <td style="padding:10px 14px;border:1px solid #ddd;text-align:center">${e.bagian}</td>
      <td style="padding:10px 14px;border:1px solid #ddd;text-align:center">${e.jamMulai} – ${e.jamSelesai}</td>
      <td style="padding:10px 14px;border:1px solid #ddd">${e.keterangan}</td>
    </tr>
  `).join('');

  return `
  <!DOCTYPE html>
  <html>
  <body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px">
    <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
      <div style="background:#1a1a2e;padding:30px 40px">
        <h1 style="color:#ffffff;margin:0;font-size:22px">📋 Permintaan Persetujuan Lembur</h1>
        <p style="color:rgba(255,255,255,0.6);margin:6px 0 0;font-size:14px">${cfg.companyName} — ${today}</p>
      </div>
      <div style="padding:30px 40px">
        <p style="font-size:15px;color:#333">Yth. Bapak/Ibu <strong>${cfg.directorName}</strong>,</p>
        <p style="font-size:14px;color:#555;line-height:1.7">
          Berikut adalah ringkasan pengajuan lembur karyawan untuk hari ini yang memerlukan persetujuan Bapak/Ibu:
        </p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px">
          <thead>
            <tr style="background:#1a1a2e;color:#ffffff">
              <th style="padding:12px 14px;border:1px solid #ddd;text-align:center">#</th>
              <th style="padding:12px 14px;border:1px solid #ddd;text-align:left">Nama</th>
              <th style="padding:12px 14px;border:1px solid #ddd;text-align:center">Bagian</th>
              <th style="padding:12px 14px;border:1px solid #ddd;text-align:center">Jam Lembur</th>
              <th style="padding:12px 14px;border:1px solid #ddd;text-align:left">Keterangan</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="font-size:14px;color:#555">Total: <strong>${entries.length} karyawan</strong></p>
        <div style="text-align:center;margin:30px 0">
          <a href="${approveUrl}" 
             style="background:#1a7a4a;color:#ffffff;padding:16px 40px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;display:inline-block;letter-spacing:0.5px">
            ✅ SETUJUI SEMUA &amp; KIRIM KE HRD
          </a>
        </div>
        <p style="font-size:12px;color:#999;text-align:center">
          Dengan menekan tombol di atas, seluruh data lembur akan disetujui dan SPL akan dikirimkan otomatis ke HRD.
        </p>
      </div>
      <div style="background:#f8f8f8;padding:20px 40px;border-top:1px solid #eee">
        <p style="font-size:12px;color:#aaa;margin:0;text-align:center">
          Email ini dikirim otomatis oleh Sistem SPL ${cfg.companyName}. Data akan direset jam 23:59.
        </p>
      </div>
    </div>
  </body>
  </html>`;
}

async function sendSummaryToDirector(entries) {
  const cfg = store.getConfig();
  if (!cfg.directorEmail) throw new Error('Email direktur belum dikonfigurasi');

  const token = store.getToken();
  const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3000}`;
  const approveUrl = `${serverUrl}/approve?token=${token}`;

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"Sistem SPL" <${cfg.smtp.from || cfg.smtp.user}>`,
    to: cfg.directorEmail,
    subject: `[SPL] ${entries.length} Pengajuan Lembur Menunggu Persetujuan — ${new Date().toLocaleDateString('id-ID')}`,
    html: buildSummaryHTML(entries, approveUrl),
  });
}

async function sendSPLtoHRD(pdfBuffer) {
  const cfg = store.getConfig();
  if (!cfg.hrdEmail) throw new Error('Email HRD belum dikonfigurasi');

  const today = new Date().toLocaleDateString('id-ID');
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"Sistem SPL" <${cfg.smtp.from || cfg.smtp.user}>`,
    to: cfg.hrdEmail,
    subject: `[SPL] Surat Persetujuan Lembur — ${today} (Sudah Disetujui Direktur)`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1a1a2e;padding:24px 32px">
          <h2 style="color:#fff;margin:0">📄 SPL Telah Disetujui</h2>
        </div>
        <div style="padding:24px 32px;background:#fff">
          <p>Yth. Tim HRD,</p>
          <p>SPL untuk tanggal <strong>${today}</strong> telah disetujui oleh Direktur dan terlampir dalam email ini.</p>
          <p>Silakan gunakan dokumen terlampir untuk keperluan input payroll.</p>
          <br>
          <p style="color:#888;font-size:12px">Email ini dikirim otomatis oleh Sistem SPL.</p>
        </div>
      </div>`,
    attachments: [{
      filename: `SPL_${today.replace(/\//g, '-')}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }],
  });
}

module.exports = { sendSummaryToDirector, sendSPLtoHRD };
