# 🗂️ SPL System — Sistem Otomasi Surat Persetujuan Lembur

## Alur Sistem

```
Karyawan input lembur di browser
        ↓
Data terkumpul di RAM server
        ↓
Jam 10:00 WIB → Email otomatis ke Direktur (summary + tombol approve)
        ↓
Direktur klik link → halaman konfirmasi → klik SETUJUI
        ↓
Server generate PDF SPL → kirim ke email HRD otomatis
        ↓
Jam 23:59 WIB → data di-reset otomatis
```

---

## Instalasi di VPS Ubuntu

### 1. Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # pastikan v20+
```

### 2. Upload & install project

```bash
# Upload folder spl-system ke VPS via scp atau FileZilla
scp -r ./spl-system user@IP_SERVER:/home/user/

# Masuk ke folder
cd /home/user/spl-system

# Install dependencies
npm install
```

### 3. Buat file .env

```bash
nano .env
```

Isi dengan:

```
SMTP_HOST=mail.perusahaan.com
SMTP_PORT=587
SMTP_USER=noreply@perusahaan.com
SMTP_PASS=password_smtp_anda
SMTP_FROM=Sistem SPL <noreply@perusahaan.com>
DIRECTOR_EMAIL=direktur@perusahaan.com
HRD_EMAIL=hrd@perusahaan.com
DIRECTOR_NAME=Nama Direktur
COMPANY_NAME=PT. Perusahaan Anda
SERVER_URL=http://IP_SERVER_ANDA:3000
PORT=3000
```

### 4. Install dotenv (agar .env terbaca)

```bash
npm install dotenv
```

Tambahkan di baris pertama `server.js`:
```js
require('dotenv').config();
```

### 5. Jalankan server

```bash
node server.js
```

---

## Jalankan Permanen dengan PM2

```bash
# Install PM2
npm install -g pm2

# Start
pm2 start server.js --name spl-system

# Auto-start saat VPS reboot
pm2 startup
pm2 save
```

### PM2 commands berguna:
```bash
pm2 status          # cek status
pm2 logs spl-system # lihat log
pm2 restart spl-system
pm2 stop spl-system
```

---

## Buka Firewall Port 3000

```bash
sudo ufw allow 3000
sudo ufw status
```

---

## URL yang Tersedia

| URL | Fungsi |
|-----|--------|
| `http://IP:3000/` | Form input karyawan |
| `http://IP:3000/admin` | Monitor semua data (admin) |
| `http://IP:3000/setup` | Konfigurasi SMTP & email |
| `http://IP:3000/approve?token=xxx` | Halaman approval direktur (via link email) |

---

## Upload Tanda Tangan Direktur

1. Buka `http://IP:3000/setup`
2. Scroll ke bagian **Tanda Tangan Direktur**
3. Upload file PNG (background transparan lebih bagus)
4. Klik **Simpan Konfigurasi**

---

## Test Manual

Dari halaman `/admin`, klik **"Kirim Email ke Direktur Sekarang"** untuk test tanpa menunggu jam 10:00.

---

## Catatan Penting

- ⚠️ Data **hanya ada di RAM** — jika server restart, data hilang
- 🕙 Email ke direktur dikirim otomatis jam **10:00 WIB**
- 🕛 Data di-reset otomatis jam **23:59 WIB**
- 🔑 Token approval di-generate ulang setiap server restart
- 📄 PDF SPL dikirim langsung ke email HRD setelah direktur approve
