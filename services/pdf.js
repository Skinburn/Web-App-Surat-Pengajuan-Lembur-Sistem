const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const store = require('./store');

function formatTanggal(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function generateSPL(entries) {
  return new Promise((resolve, reject) => {
    const cfg = store.getConfig();
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const today = new Date();
    const todayStr = formatTanggal(today.toISOString());

    // ── Header ──
    doc.fontSize(13).font('Helvetica-Bold')
       .text('FORMULIR PERMINTAAN', { align: 'center' });
    doc.fontSize(13).font('Helvetica-Bold')
       .text('SURAT PERSETUJUAN LEMBUR (SPL)', { align: 'center' });
    doc.moveDown(1.5);

    // ── Salam ──
    doc.fontSize(11).font('Helvetica')
       .text('Dengan hormat,');
    doc.moveDown(0.5);
    doc.text(
      'Dengan ini disampaikan permohonan untuk Surat Persetujuan Lembur (SPL) ' +
      'karyawan bagian staff office, sebagai berikut :',
      { lineGap: 4 }
    );
    doc.moveDown(1);

    // ── Tabel ──
    const tableTop = doc.y;
    const colX = [50, 90, 230, 300, 355, 415, 490];
    const colW = [40, 140, 70, 55, 60, 75, 55];
    const headers = ['No', 'Nama', 'Bagian', 'Jam\nMulai', 'Jam\nSelesai', 'Keterangan', 'Paraf'];
    const rowH = 28;
    const headerH = 36;

    // Header row background
    doc.rect(colX[0], tableTop, colW.reduce((a, b) => a + b, 0) + 5, headerH)
       .fillAndStroke('#1a1a2e', '#000000');

    // Header text
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    headers.forEach((h, i) => {
      doc.text(h, colX[i] + 4, tableTop + 6, { width: colW[i] - 6, align: 'center', lineGap: 1 });
    });

    // Data rows
    doc.fillColor('#000000').font('Helvetica').fontSize(9);
    const grouped = {};
    entries.forEach(e => {
      if (!grouped[e.tanggal]) grouped[e.tanggal] = [];
      grouped[e.tanggal].push(e);
    });

    let rowNum = 1;
    let y = tableTop + headerH;

    Object.entries(grouped).forEach(([tanggal, group]) => {
      group.forEach((e, idx) => {
        const bg = rowNum % 2 === 0 ? '#f5f5f5' : '#ffffff';
        doc.rect(colX[0], y, colW.reduce((a, b) => a + b, 0) + 5, rowH)
           .fillAndStroke(bg, '#cccccc');

        doc.fillColor('#000000');
        const cells = [
          rowNum.toString(),
          idx === 0 ? formatTanggal(tanggal).replace(', ', ',\n') : '',
          e.nama,
          e.bagian,
          e.jamMulai,
          e.jamSelesai,
          e.keterangan,
        ];

        // Reorder to match columns: No, Nama, Bagian, JamMulai, JamSelesai, Ket, Paraf
        const rowCells = [rowNum.toString(), e.nama, e.bagian, e.jamMulai, e.jamSelesai, e.keterangan, ''];
        rowCells.forEach((cell, i) => {
          doc.text(cell, colX[i] + 4, y + 8, { width: colW[i] - 6, align: i === 0 ? 'center' : 'left' });
        });

        y += rowH;
        rowNum++;
      });
    });

    // Border around whole table
    doc.rect(colX[0], tableTop, colW.reduce((a, b) => a + b, 0) + 5, y - tableTop)
       .stroke('#000000');

    doc.moveDown(2);
    doc.y = y + 16;

    // ── Penutup ──
    doc.fontSize(11).font('Helvetica')
       .text('Demikian permohonan ini kami sampaikan, atas perhatian dan kerjasamanya kami ucapkan terima kasih.');
    doc.moveDown(2);

    // ── Tanda Tangan ──
    const signX = 370;
    doc.fontSize(11).text(`Bogor, ${todayStr}`, signX, doc.y, { width: 200, align: 'center' });
    doc.moveDown(0.3);
    doc.text('Mengetahui,', signX, doc.y, { width: 200, align: 'center' });
    doc.moveDown(0.3);
    doc.text(cfg.directorName, signX, doc.y, { width: 200, align: 'center' });
    doc.moveDown(0.3);

    // Tanda tangan gambar jika ada
    const signatureFile = cfg.signaturePath;
    if (signatureFile && fs.existsSync(signatureFile)) {
      const sigY = doc.y;
      doc.image(signatureFile, signX + 50, sigY, { width: 100, height: 60 });
      doc.moveDown(3.5);
    } else {
      doc.moveDown(3);
    }

    doc.font('Helvetica-Bold').fontSize(11)
       .text(cfg.directorName, signX, doc.y, { width: 200, align: 'center' });
    doc.font('Helvetica').fontSize(10)
       .text('( Direktur )', signX, doc.y + 2, { width: 200, align: 'center' });

    doc.end();
  });
}

module.exports = { generateSPL };
