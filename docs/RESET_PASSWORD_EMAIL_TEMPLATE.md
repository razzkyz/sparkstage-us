# 📧 Panduan Update Template Email Reset Password di Supabase

## ✨ Template yang Sudah Dibuat (UPDATE TERBARU)

File: `SUPABASE_RESET_PASSWORD_TEMPLATE.html`

### Fitur Template Baru:
- ✅ **Logo Spark Stage** di header (bukan icon/emoji)
- ✅ **Tombol putih** dengan border pink (lebih natural)
- ✅ **Copy lebih natural & casual** (bukan AI-formal)
- ✅ **Friendly tone** - pakai "kamu" bukan "Anda"
- ✅ **Lebih clean & modern** design
- ✅ **Mobile responsive** sempurna
- ✅ **Pesan personal** - "Jangan sampai lupa lagi!"
- ✅ **Security notes** yang helpful
- ✅ Ikutan branding color (#ff4b86)

---

## 🎨 Highlight Perubahan Design

### Button Style
**Sebelumnya:** Pink gradient background
```
┌─────────────────────┐
│ Reset Password Sek  │  (Pink gradient, white text)
└─────────────────────┘
```

**Sekarang:** White background dengan pink border
```
┌─────────────────────┐
│ ✨ Reset Password   │  (White bg, pink border & text)
│    Sekarang         │  
└─────────────────────┘
```

### Tone & Language

| Element | Sebelumnya | Sekarang |
|---------|-----------|----------|
| **Greeting** | "Halo, Star! 🌟" | "Halo Star! 👋" |
| **Main message** | "Kami menerima permintaan untuk mengubah password..." | "Kami dapat permintaan untuk reset password..." |
| **CTA text** | "Reset Password Sekarang" | "✨ Reset Password Sekarang" |
| **Tone** | Formal/corporate | Casual/friendly |
| **Pronouns** | "Anda", "Anda" | "kamu" (consistent) |

---

## Cara Update di Supabase Dashboard

### Method 1: Via Supabase Dashboard (RECOMMENDED)

1. **Buka Supabase Dashboard**
   - Masuk ke https://supabase.com/dashboard
   - Pilih project Spark Stage Anda

2. **Navigasi ke Email Templates**
   - Menu sidebar → **Authentication** → **Email Templates**
   - Atau: **Project Settings** → **Email Templates**

3. **Pilih "Password Reset" Template**
   - Cari dan klik pada email template untuk password reset
   - Template name: "Reset Password" atau "Confirm signup"

4. **Copy-Paste Template HTML**
   - Buka file `SUPABASE_RESET_PASSWORD_TEMPLATE.html`
   - Copy seluruh isi HTML
   - Paste di field "Email Body" di Supabase
   - Update Subject ke: `Ubah Password Akun Spark Stage Anda`

5. **Save & Test**
   - Klik "Save" atau "Update"
   - Test dengan meminta reset password di aplikasi

---

## Method 2: Via Supabase CLI

Jika ingin automation, bisa update via CLI atau API.

**Pastikan sudah install Supabase CLI:**
```bash
npm install -g supabase
```

**Authenticate:**
```bash
supabase login
```

**Update template (jika CLI support tersedia):**
```bash
supabase functions publish reset-password-email
```

---

## Important Supabase Variables

Template ini menggunakan placeholder Supabase yang akan di-replace otomatis:

| Placeholder | Deskripsi |
|---|---|
| `{{ .ConfirmationURL }}` | Link reset password (valid 30 menit) |
| `{{ .Email }}` | Email address user |

**Contoh hasil:**
- `{{ .ConfirmationURL }}` → `https://yourapp.supabase.co/auth/v1/verify?token=...`
- `{{ .Email }}` → `user@email.com`

---

## Untuk Testing

### Test di Local Development
1. Buat akun test
2. Klik "Forgot Password"
3. Masukkan email test
4. Email akan dikirim (jika Supabase SMTP sudah configure)
5. Periksa email test atau Supabase logs

### Akses Email Testing Console
- Dashboard Supabase → **Auth** → **Users** → Scroll ke user → Email logs
- Atau: Check **Logs** section untuk email delivery status

---

## Troubleshooting

### Email tidak terkirim?
- Pastikan Supabase SMTP sudah configure di Project Settings
- Atau gunakan Supabase default email service

### Template tidak berubah?
- Clear browser cache
- Logout & login kembali ke Supabase
- Tunggu beberapa menit untuk propagasi

### Link reset password tidak bekerja?
- Pastikan `ResetPassword.tsx` route sudah registered
- Cek di `/reset-password` bisa diakses
- Verify Supabase session handling di ResetPassword component

---

## Subject Line Recommendation

Update subject line ke salah satu dari ini:

**Option 1 (Friendly):**
```
Reset Password - Spark Stage
```

**Option 2 (With urgency):**
```
Ubah Password Akun Spark Stage Kamu
```

**Option 3 (Casual):**
```
Bantuin reset password kamu, Star! 🌟
```

Recommend: **Option 1** - simple & clear ✅

---

## Template Variables Available

Supabase juga support variables lain jika diperlukan:

```
{{ .SiteURL }}           - URL aplikasi Anda
{{ .Email }}             - Email user
{{ .ConfirmationURL }}   - Link reset password
{{ .RedirectTo }}        - Redirect URL setelah reset
```

---

## Next Steps

1. ✅ Buka file `SUPABASE_RESET_PASSWORD_TEMPLATE.html` (sudah updated!)
2. ✅ Copy seluruh isi HTML template
3. ✅ Login ke **Supabase Dashboard** project Spark Stage
4. ✅ Ke: **Authentication** → **Email Templates**
5. ✅ Cari template "Reset Password" atau "Password Recovery"
6. ✅ Paste HTML baru ke body editor
7. ✅ Update Subject ke: **"Reset Password - Spark Stage"**
8. ✅ Klik **Save**
9. ✅ Test dengan request reset password dari aplikasi

---

## 📸 Preview Email

Template email akan terlihat seperti ini:

```
┌─────────────────────────────────────┐
│  [Logo Spark Stage]                 │
│  Reset Password                     │
│  Buat password baru untuk akun      │
└─────────────────────────────────────┘
│                                     │
│  Halo Star! 👋                      │
│                                     │
│  Kami dapat permintaan untuk reset  │
│  password akun kamu. Klik tombol    │
│  di bawah untuk membuat password    │
│  baru. Cuma butuh beberapa detik!   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ✨ Reset Password Sekarang  │   │
│  └─────────────────────────────┘   │
│  (White button dengan pink border)  │
│                                     │
│  💡 Pro Tip:                        │
│  Jangan sampai lupa lagi...         │
│                                     │
└─────────────────────────────────────┘
```

---

## Support

Jika ada pertanyaan atau template perlu di-update lebih lanjut, hubungi tim engineering kami.

📧 **Reset Password Flow - Sekarang Lengkap & Beautiful:**
1. User di halaman login → "Lupa Password?"
2. Buka halaman Forgot Password → Input email
3. ✅ **Email diterima dengan template baru**
4. User klik tombol putih "Reset Password Sekarang"
5. Buka halaman Reset Password → Input password baru
6. ✅ Password updated → Auto redirect ke login
7. Login dengan password baru ✓

---

## 💡 Tips

- **Testing**: Gunakan email test account untuk lihat template render dengan benar
- **Mobile Preview**: Template fully responsive, cek di berbagai device sizes
- **Logo URL**: Gunakan absolute URL (bukan relative) untuk logo agar muncul di semua email clients
- **Button Styling**: White button + pink border adalah yang paling user-friendly & modern

---

**Last Updated:** May 26, 2026 ✨
