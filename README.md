# 🔗 AffiliateKit

Apps untuk convert & jana caption Shopee & TikTok affiliate, cari winning products, dan track klik.

## 🚀 Deploy ke Vercel (Paling Mudah)

### Step 1 — Upload ke GitHub
1. Pergi [github.com](https://github.com) → New Repository
2. Nama: `affiliatekit`
3. Upload semua files dalam folder ni

### Step 2 — Deploy ke Vercel
1. Pergi [vercel.com](https://vercel.com) → Sign up dengan GitHub
2. Klik **"Add New Project"**
3. Import repo `affiliatekit` tadi
4. Klik **Deploy** — siap! ✅

### Step 3 — Masukkan API Key
1. Open apps yang dah deploy
2. Pergi tab **⚙️ Settings**
3. Masukkan Anthropic API key
4. Klik Simpan — boleh guna terus!

## 🔑 Dapatkan API Key

1. Pergi [console.anthropic.com](https://console.anthropic.com)
2. Sign up / Login
3. Pergi **API Keys** → Create Key
4. Copy key → paste dalam apps Settings

## 📁 Struktur Files

```
affiliatekit/
├── public/
│   └── index.html
├── src/
│   ├── App.jsx      ← Main app
│   └── index.js     ← Entry point
├── package.json
└── README.md
```

## ✨ Features

- ⚡ Convert affiliate link (Shopee & TikTok)
- ✍️ Jana 3 versi caption BM dengan AI
- 🏆 Winning Product Finder (AI-powered)
- 📊 Track klik setiap link
- 📋 History semua link yang pernah convert
- 💾 Data tersimpan dalam browser (localStorage)
