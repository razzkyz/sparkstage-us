# Cloudflare R2 Migration Plan

Tanggal: 6 May 2026

## Ringkasan

Pada 6 May 2026, ImageKit Free Plan terkena `429 Bandwidth Limit
Exceeded`. Dashboard ImageKit menunjukkan pemakaian sekitar `20.23 GB`
untuk rentang `1 May 2026` sampai `5 May 2026`, dengan sekitar `59.96K`
requests. Rata-rata delivery adalah sekitar `337 KB/request`.

Keputusan sementara:

- ImageKit Lite dipakai sebagai jembatan darurat untuk opening 6 May 2026.
- Pada 6 May 2026 sekitar `00:48 WIB`, setelah ImageKit Lite aktif, gambar
  publik yang sebelumnya terkena `429` sudah pulih. Ini mengonfirmasi bahwa
  failure utama adalah limit ImageKit, bukan broken URL cutover.
- Lite bukan solusi final karena total quota hanya `40 GB/month`; dengan
  pemakaian berjalan `20.23 GB`, sisa efektif bulan May sekitar `19.77 GB`.
- Migrasi jangka panjang diarahkan ke Cloudflare R2, bukan sekadar Cloudflare
  CDN di depan ImageKit.
- Tidak ada delete object Supabase atau ImageKit sampai rollback/migration
  matrix selesai diverifikasi.

## Temuan 6 May 2026

### ImageKit

| Temuan | Nilai |
| --- | ---: |
| Bandwidth 1-5 May 2026 | `20.23 GB` |
| Requests 1-5 May 2026 | `59.96K` |
| Rata-rata payload | `~337 KB/request` |
| Free plan limit | `20 GB/month` |
| Lite plan limit | `40 GB/month` |
| Perkiraan sisa setelah Lite | `~19.77 GB` |

Interpretasi:

- `337 KB/request` bukan angka aneh untuk gambar, tetapi mahal jika satu
  halaman memuat banyak image.
- Charm Bar dan Shop masih memakai URL product image utama untuk card/grid.
  Ini berarti payload bisa tetap besar walaupun provider sudah ImageKit.
- Lite diperkirakan cukup untuk 1 hari jika traffic opening tidak ekstrem,
  tetapi tidak aman diasumsikan cukup 5-7 hari tanpa patch thumbnail agresif.

### Produk

Status read-only `product_images` pada 6 May 2026:

| Check | Hasil |
| --- | ---: |
| Total `product_images` rows | `2117` |
| Provider ImageKit | `2117` |
| Provider Supabase tersisa | `0` |
| Missing `provider_original_url` | `668` |

Implikasi:

- Produk sekarang bergantung pada ImageKit sebagai delivery/source aktif.
- Rollback produk ke Supabase tidak aman sebagai tombol satu klik.
- `668` product image tidak punya fallback URL Supabase di metadata DB.
- Backup URL/data tidak otomatis berarti object lama masih tersedia.

### Public CMS Assets

Area seperti Charm Bar CMS assets, Stage Gallery, News/Event settings, banners,
beauty, dan dressing-room public assets sudah dibackfill/cutover ke ImageKit
pada 5 May 2026. Object Supabase lama belum boleh dihapus karena masih berguna
untuk fallback atau audit.

### Domain/DNS

`sparkstage55.com` masih memakai nameserver Domainesia:

```txt
dns1.domainesia.com
dns2.domainesia.com
dns3.domainesia.com
dns4.domainesia.com
```

Implikasi:

- Custom domain R2 seperti `media.sparkstage55.com` tidak bisa dianggap siap
  dalam 1 jam jika zone Cloudflare belum aktif.
- `r2.dev` bisa dipakai untuk test/darurat, tetapi Cloudflare menyatakan itu
  untuk non-production/development use case dan bisa rate-limited.

## Target Arsitektur

Target final untuk media publik:

```txt
Browser
  -> media.sparkstage55.com
  -> Cloudflare cache
  -> Cloudflare R2 bucket
```

Target sementara jika custom domain belum siap:

```txt
Browser
  -> <bucket>.r2.dev
  -> Cloudflare R2 bucket
```

Catatan:

- Cloudflare CDN di depan `ik.imagekit.io` tidak menyelesaikan masalah jika
  ImageKit origin tetap `429`.
- Worker proxy ke ImageKit juga tidak menyelesaikan cache miss ketika ImageKit
  quota habis.
- R2 dipilih karena Cloudflare R2 punya zero egress dan free tier operasi yang
  lebih cocok untuk public asset delivery.

## Urutan Eksekusi

### Phase 0 - Stabilize Opening

Owner: human + agent

1. Human upgrade ImageKit Lite untuk membuka blokir 429.
2. Agent patch frontend agar product grid memakai thumbnail/quality rendah.
3. Monitor ImageKit bandwidth per jam selama opening.
4. Jangan delete object Supabase atau ImageKit.

Kriteria sukses:

- Product image dan Charm Bar image kembali tampil.
- ImageKit bandwidth tidak naik dengan laju ekstrem setelah thumbnail patch.

Status 6 May 2026 dini hari:

- ImageKit Lite aktif dan gambar kembali tampil.
- Shop product grid memakai ImageKit transform `w-480,q-60`.
- Charm Bar product grid memakai ImageKit transform `w-480,q-60`.
- Charm Bar category thumbnail memakai ImageKit transform `w-320,q-60`.
- Charm Bar hero memakai ImageKit transform `w-1600,q-70`.
- Inventory/order thumbnail helper diturunkan ke `w-420,q-62`.

### Phase 1 - R2 Setup

Owner: human

1. Buat Cloudflare account/aktifkan R2.
2. Buat bucket, contoh: `sparkstage-public-assets`.
3. Buat R2 API token/access key scoped ke bucket.
4. Putuskan domain:
   - ideal: pindahkan DNS/zone `sparkstage55.com` ke Cloudflare,
   - sementara: gunakan `r2.dev` untuk test.
5. Jika memakai custom domain, siapkan `media.sparkstage55.com`.

Input yang perlu diberikan ke agent:

```txt
CLOUDFLARE_ACCOUNT_ID=
R2_BUCKET_NAME=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_BASE_URL=
```

### Phase 2 - Inventory And Source Selection

Owner: agent

1. Export daftar `product_images` dengan `image_url`, `provider_file_path`,
   `provider_original_url`.
2. Export daftar public CMS asset yang sudah ada di DB.
3. Tentukan source object per area:
   - product images: ImageKit API/export sebagai source utama,
   - CMS public assets: Supabase Storage atau ImageKit sebagai source,
   - print orders/photos: tetap out of scope sampai ada keputusan retention.
4. Buat manifest migrasi:
   - source URL/path,
   - target R2 key,
   - expected content type,
   - size jika tersedia,
   - status upload.

### Phase 3 - Backfill To R2

Owner: agent

1. Upload object ke R2 berdasarkan manifest.
2. Jalankan mode resumable/idempotent.
3. Verifikasi sample:
   - HTTP 200,
   - content type benar,
   - ukuran masuk akal,
   - gambar tampil di browser.
4. Buat laporan:
   - total listed,
   - uploaded,
   - skipped existing,
   - failed,
   - retry candidates.

Tidak boleh:

- Mengubah DB delivery URL sebelum backfill mayoritas selesai.
- Menghapus object dari ImageKit atau Supabase.

### Phase 4 - Frontend Abstraction

Owner: agent

1. Tambahkan helper public media URL berbasis provider:
   - ImageKit current,
   - R2 target,
   - Supabase fallback untuk selected legacy assets.
2. Product grid wajib memakai thumbnail context:
   - card/grid: width `320-480`, quality `55-65`,
   - category thumbnail: width `240-320`,
   - detail/gallery: width lebih besar sesuai viewport.
3. Hindari original image untuk grid/list.
4. Tambahkan test helper URL.

### Phase 5 - DB Cutover

Owner: agent, butuh approval human sebelum execute

1. Buat SQL dry-run:
   - count ImageKit URLs,
   - count target R2 candidates,
   - sample before/after.
2. Execute transaction only after approval.
3. Verifikasi:
   - product runtime URL mengarah ke R2,
   - public CMS runtime URL mengarah ke R2,
   - tidak ada route publik utama yang render `ik.imagekit.io` untuk migrated
     assets.

### Phase 6 - Monitoring And Cleanup

Owner: human + agent

1. Monitor ImageKit turun setelah DB/frontend cutover.
2. Monitor Supabase cached egress tetap rendah.
3. Monitor Cloudflare R2 reads/ops.
4. Setelah 7-14 hari stabil, baru buat kandidat cleanup object lama.
5. Delete/privatize object lama hanya dengan approval eksplisit.

## Rollback Matrix

| Area | Rollback cepat | Risiko |
| --- | --- | --- |
| Product images | Tidak aman | `668` rows tidak punya `provider_original_url` |
| Charm Bar CMS assets | Mungkin | Perlu hotfix agar code tidak remap balik ke ImageKit |
| Stage Gallery | Mungkin | Perlu cek object lama |
| News/Event settings | Mungkin | Perlu cek nested URL |
| Banners/Beauty/Dressing Room | Mungkin | Perlu cek object lama dan route render |
| Print orders/photos | Tidak disentuh | Terkait customer/order media |

## Prioritas Patch Sebelum Migrasi Besar

| Prioritas | Task | Alasan |
| --- | --- | --- |
| Urgent | Product grid pakai thumbnail ImageKit/R2 | Menurunkan payload terbesar |
| Urgent | Charm Bar category image lazy + thumbnail | Banyak image tampil di awal |
| Urgent | Monitor ImageKit hourly selama opening | Lite hanya jembatan |
| Medium | R2 bucket + manifest migration | Fondasi migrasi final |
| Medium | DB dry-run cutover ke R2 | Menghindari rewrite buta |
| Nice | Custom domain `media.sparkstage55.com` | URL stabil dan bisa cache policy |
| Nice | Runbook asset provider policy | Mencegah provider campur lagi |

## Referensi Resmi

- ImageKit pricing: https://imagekit.io/plans/
- ImageKit pricing mechanics: https://imagekit.io/docs/how-pricing-works
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Cloudflare R2 public buckets: https://developers.cloudflare.com/r2/data-access/public-buckets/
