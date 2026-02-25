// Store data di RAM — tidak ada database
// Data otomatis hilang saat server restart atau cron reset jam 23:59

let entries = [];
let config = {
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || '',
  },
  directorEmail: process.env.DIRECTOR_EMAIL || '',
  hrdEmail: process.env.HRD_EMAIL || '',
  directorName: process.env.DIRECTOR_NAME || 'Nama Direktur',
  companyName: process.env.COMPANY_NAME || 'PT. Perusahaan',
  signaturePath: process.env.SIGNATURE_PATH || '',
  approveToken: process.env.APPROVE_TOKEN || require('crypto').randomBytes(32).toString('hex'),
};

// Log token approve saat startup
console.log(`[STORE] Approve token: ${config.approveToken}`);

module.exports = {
  getAll: () => [...entries],
  add: (entry) => {
    const id = Date.now().toString();
    const newEntry = { id, ...entry, status: 'pending', createdAt: new Date().toISOString() };
    entries.push(newEntry);
    return newEntry;
  },
  reset: () => { entries = []; },
  getCount: () => entries.length,
  approveAll: () => {
    entries = entries.map(e => ({ ...e, status: 'approved', approvedAt: new Date().toISOString() }));
  },
  getApproved: () => entries.filter(e => e.status === 'approved'),
  getConfig: () => ({ ...config }),
  updateConfig: (newConfig) => { config = { ...config, ...newConfig }; },
  getToken: () => config.approveToken,
};
