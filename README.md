# Kino Bot — to'liq qo'llanma

Production-ready Telegram kino boti (Telegraf, Node.js 22+) + Cyberpunk uslubidagi Mini App.

## 1. O'rnatish

```bash
npm install
cp .env.example .env
```

`.env` faylini oching va kamida quyidagilarni to'ldiring:

```
BOT_TOKEN=BotFather'dan olingan token
SUPER_ADMIN_ID=sizning Telegram ID raqamingiz
```

Telegram ID raqamingizni bilmasangiz, botga `@userinfobot` orqali murojaat qiling.

## 2. Ishga tushirish

```bash
npm start
```

yoki development rejimida (fayl o'zgarganda avtomatik qayta yuklanadi):

```bash
npm run dev
```

Muvaffaqiyatli ishga tushsa, terminalda quyidagiga o'xshash qatorlar chiqadi:

```
[INFO] [startup] Kino Bot ishga tushmoqda...
[INFO] [startup] Kino Bot muvaffaqiyatli ishga tushdi va so'rovlarni kutmoqda.
```

Botga `/start` yuboring — asosiy menyu ko'rinishi kerak. Siz `SUPER_ADMIN_ID` sifatida kiritgan ID orqali kirsangiz, "Admin panel" tugmasi ham chiqadi.

## 3. PM2 bilan doimiy ishlatish (VPS uchun tavsiya etiladi)

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Loglarni ko'rish: `pm2 logs kino-bot`

## 4. Mini App'ni yoqish

Mini App ikki qismdan iborat: bot ichidagi REST API (kino ma'lumotlarini beradi) va `miniapp/` papkasidagi frontend (HTML/CSS/JS).

**4.1. API'ni yoqish**

`.env` faylida:
```
API_ENABLED=true
API_PORT=3000
```

Botni qayta ishga tushiring. Endi `http://localhost:3000` manzilida Mini App va API ishlaydi (VPS ichidan tekshirish uchun: `curl http://localhost:3000/api/movies`).

**4.2. Internetga chiqarish**

Telegram Mini App faqat HTTPS havolalar bilan ishlaydi. Variantlardan birini tanlang:

- Nginx + SSL (tavsiya etiladi, doimiy ishlatish uchun): Nginx orqali 3000-portni domeningizga proksi qiling, Certbot bilan bepul SSL sertifikat oling.
- Cloudflare Tunnel yoki ngrok (tez test uchun): `ngrok http 3000` sizga vaqtinchalik https havola beradi.

**4.3. MINI_APP_URL'ni sozlash**

Olingan HTTPS havolani `.env`ga yozing:
```
MINI_APP_URL=https://sizning-domeningiz.uz
```

Botni qayta ishga tushiring — asosiy menyuda "Mini App" tugmasi paydo bo'ladi.

## 5. Papka strukturasi

```
kino-bot/
  index.js              Kirish nuqtasi
  src/
    config/              Environment va konstantalar
    database/            Atomic JSON DB + repositorylar
    services/            Biznes-mantiq (obuna, backup, broadcast...)
    middlewares/          Global tekshiruvlar (obuna, rate-limit...)
    keyboards/            Telegram klaviaturalar
    messages/             Markazlashgan o'zbekcha matnlar
    handlers/             Bot buyruq/callback ishlovchilari
    api/                  Mini App uchun REST API
    bot.js                Barcha qismlarni ulash
  miniapp/                 Mini App frontend (HTML/CSS/JS)
  data/                    JSON baza fayllari (avtomatik yaratiladi)
  logs/                    Log fayllari (avtomatik yaratiladi)
```

## 6. Muhim eslatmalar

- Backup: Admin panel -> Backup orqali istalgan vaqtda qo'lda backup yaratish mumkin. Tizim eng so'nggi 10 ta backupni saqlaydi, eskilari avtomatik o'chadi.
- Xabarlarni tahrirlash: Admin panel -> Xabarlar tahriri orqali botning har qanday matnini (shu jumladan Premium Custom Emoji bilan) o'zgartirish mumkin, kodga tegmasdan.
- Majburiy kanallar: Kanal qo'shishdan oldin botni o'sha kanalga administrator qilib qo'shing, aks holda obuna tekshiruvi ishlamaydi.
