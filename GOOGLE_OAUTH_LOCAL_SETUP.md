# Google OAuth Setup untuk Development Lokal

**Project:** SparkStage US  
**Supabase Project:** `advzkhuulbaztolnttfl`  
**Mode:** Development Local (localhost:5173)

## Langkah 1: Buat Google OAuth Credentials

### A. Buka Google Cloud Console
1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Klik **Select a project** > **NEW PROJECT**
3. **Project name:** `SparkStage Dev` (atau nama lain)
4. Klik **Create**

### B. Enable Google+ API (Opsional tapi disarankan)
1. Menu **APIs & Services** > **Library**
2. Cari: **Google+ API**
3. Klik **Enable**

### C. Buat OAuth Consent Screen (Wajib pertama kali)
1. Menu **APIs & Services** > **OAuth consent screen**
2. Pilih **External** > Klik **Create**
3. Isi form:
   - **App name:** `SparkStage US Dev`
   - **User support email:** email Anda
   - **Developer contact:** email Anda
4. Klik **Save and Continue**
5. **Scopes:** Biarkan default (email, profile) > **Save and Continue**
6. **Test users:** Tambahkan email Anda untuk testing > **Save and Continue**
7. Klik **Back to Dashboard**

### D. Buat OAuth Client ID
1. Menu **APIs & Services** > **Credentials**
2. Klik **+ CREATE CREDENTIALS** > **OAuth client ID**
3. **Application type:** Web application
4. **Name:** `SparkStage Local Dev`
5. **Authorized JavaScript origins:**
   ```
   http://localhost:5173
   ```
6. **Authorized redirect URIs:** (PENTING!)
   ```
   https://advzkhuulbaztolnttfl.supabase.co/auth/v1/callback
   ```
   ☝️ **Ini URL callback Supabase Anda**

7. Klik **Create**
8. **SIMPAN CREDENTIALS INI:**
   ```
   Client ID: xxxxxxx.apps.googleusercontent.com
   Client Secret: GOCSPX-xxxxxxxxxxxxxxx
   ```

## Langkah 2: Aktifkan Google di Supabase

### A. Buka Supabase Dashboard
1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project: **advzkhuulbaztolnttfl** (SparkStage US)

### B. Enable Google Provider
1. Menu **Authentication** (icon 🔐 di sidebar kiri)
2. Tab **Providers**
3. Scroll ke bawah, cari **Google**
4. Klik **Google** untuk expand
5. Toggle **Enable Sign in with Google** = **ON** ✅

### C. Masukkan Credentials
1. **Client ID (for OAuth):** Paste Client ID dari Google Cloud Console
   ```
   xxxxxxx.apps.googleusercontent.com
   ```
2. **Client Secret (for OAuth):** Paste Client Secret dari Google Cloud Console
   ```
   GOCSPX-xxxxxxxxxxxxxxx
   ```
3. **Authorized Client IDs:** Biarkan kosong untuk development
4. **Skip nonce checks:** Biarkan unchecked
5. Klik **Save**

## Langkah 3: Test Login

### A. Jalankan App
```bash
npm run dev
```
App akan jalan di: `http://localhost:5173`

### B. Test Google Login
1. Buka browser: `http://localhost:5173/login`
2. Klik tombol **"Continue with Google"**
3. Akan redirect ke Google OAuth consent screen
4. Pilih akun Google Anda
5. Klik **Allow/Izinkan**
6. Akan redirect kembali ke `http://localhost:5173/auth/callback`
7. User akan otomatis login

### C. Verify Login
- Check apakah user sudah login (lihat navbar - profile icon muncul)
- Buka browser DevTools > Application > Local Storage
- Check: `sb-advzkhuulbaztolnttfl-auth-token` ada

## Troubleshooting

### Error: "redirect_uri_mismatch"
**Penyebab:** URL callback tidak cocok  
**Solusi:**
- Pastikan redirect URI di Google Cloud Console **EXACT MATCH:**
  ```
  https://advzkhuulbaztolnttfl.supabase.co/auth/v1/callback
  ```
- **Tidak ada trailing slash** (/)
- **Harus HTTPS** (bukan http)
- **Harus persis sama** (case-sensitive)

### Error: "Unsupported provider" (error yang sekarang)
**Penyebab:** Google provider belum enabled di Supabase  
**Solusi:** Ikuti Langkah 2 di atas

### Error: "Access blocked: This app's request is invalid"
**Penyebab:** OAuth consent screen belum dikonfigurasi  
**Solusi:** Ikuti Langkah 1.C di atas

### Error: "This site can't be reached" setelah login
**Penyebab:** AuthCallback route tidak ada atau error  
**Solusi:** Verify file `frontend/src/pages/AuthCallback.tsx` ada dan route terdaftar di `App.tsx`

## Screenshot URLs yang Benar

### Google Cloud Console - Credentials
```
Authorized JavaScript origins:
✅ http://localhost:5173

Authorized redirect URIs:
✅ https://advzkhuulbaztolnttfl.supabase.co/auth/v1/callback
```

### Supabase Dashboard - Google Provider
```
Enable Sign in with Google: ✅ ON

Client ID: xxxxxxx.apps.googleusercontent.com
Client Secret: GOCSPX-xxxxxxxxxxxxxxx

Redirect URL (read-only):
https://advzkhuulbaztolnttfl.supabase.co/auth/v1/callback
```

## Checklist Setup

- [ ] Google Cloud project dibuat
- [ ] OAuth consent screen dikonfigurasi
- [ ] OAuth Client ID dibuat
- [ ] JavaScript origin: `http://localhost:5173`
- [ ] Redirect URI: `https://advzkhuulbaztolnttfl.supabase.co/auth/v1/callback`
- [ ] Client ID dan Secret disimpan
- [ ] Google provider enabled di Supabase
- [ ] Client ID dan Secret dimasukkan ke Supabase
- [ ] Test login berhasil

## Untuk Production Nanti

Ketika sudah deploy ke production (misalnya Vercel/Netlify):

1. **Update Google Cloud Console:**
   - Tambahkan production domain ke JavaScript origins:
     ```
     https://sparkstage-us.vercel.app
     ```
   - Tambahkan production callback ke redirect URIs:
     ```
     https://advzkhuulbaztolnttfl.supabase.co/auth/v1/callback
     ```
     (Callback Supabase tetap sama, tapi origins yang berubah)

2. **No changes needed in Supabase** - Configuration tetap sama

## Important Notes

1. **Development mode:** Google akan show warning "This app isn't verified"
   - Ini normal untuk development
   - Klik **Advanced** > **Go to SparkStage US (unsafe)** untuk continue

2. **Test users:** Hanya email yang ditambahkan di OAuth consent screen > Test users yang bisa login dalam development mode

3. **Publish app:** Untuk production, Anda perlu submit app untuk verification di Google

4. **Security:** Jangan commit Client Secret ke git! (sudah aman karena disimpan di Supabase Dashboard)

## Status

🔴 **PENDING** - Menunggu setup Google Cloud Console dan Supabase configuration

**Next Steps:**
1. Ikuti Langkah 1 untuk buat Google OAuth credentials
2. Ikuti Langkah 2 untuk enable di Supabase
3. Test login dengan Google

---

**Need help?** Error messages biasanya sangat deskriptif. Copy error message lengkap kalau ada masalah.
