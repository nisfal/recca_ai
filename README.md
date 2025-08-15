# recca_ai
# Telegram + Gemini Bot (Modular)

## Setup
1. Salin `.env.example` → `.env`, isi token & kunci.
2. `npm install`
3. `npm start`

## Deploy Railway
- Push ke GitHub → Railway "Deploy from GitHub"
- Tambahkan Variables: isi semua dari `.env`
- Service jalan otomatis (long polling)

## Perintah
- `/start` menampilkan waktu saat ini
- `/help` daftar perintah
- `/reset` hapus konteks
- `/subscribe_azan` aktifkan notifikasi azan (persisten via `data/subscribers.json`)
- `/unsubscribe_azan` matikan notifikasi
- `/jadwal_azan` tampilkan jadwal hari ini

