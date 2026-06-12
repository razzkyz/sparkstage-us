# Optimisasi Egress Supabase

## Ringkasan Status

Tanggal status: `5 May 2026`.

Tujuan utama optimisasi ini adalah menurunkan `Cached Egress` Supabase dengan
memastikan media publik/CMS tidak lagi dilayani dari Supabase Storage, tetapi
dari ImageKit.

Status saat ini:

- strategi ImageKit tidak gagal, tetapi scope awal belum mencakup semua jalur
  CMS
- jalur yang bocor sudah ditemukan dan ditutup untuk runtime DB utama
- backfill target sudah selesai untuk asset CMS lama yang sudah terlanjur
  masuk Supabase
- DB runtime public/CMS sekarang sudah tidak menyimpan URL
  `supabase.co/storage` untuk area utama
- object lama di Supabase Storage belum dihapus/privatize, sengaja ditahan
  sebagai rollback buffer sampai monitoring 24-48 jam

Angka monitoring yang memicu sesi lanjutan:

| Tanggal | Cached egress/day | Catatan |
|---|---:|---|
| `4 May 2026` | sekitar `1.2 GB` | Spike baru mulai terlihat |
| `5 May 2026` | sekitar `1.4 GB` saat screenshot | Cached egress period sekitar `3.14 GB / 5 GB` |

Interpretasi:

- masalah utama tetap `Cached Egress`, bukan egress umum
- penyebab paling masuk akal adalah asset public Storage yang masih di-hit dari
  route publik/CMS
- ImageKit baru efektif penuh setelah tiga hal selesai: upload path baru,
  backfill file lama, dan DB URL cutover

Referensi resmi:

- https://supabase.com/docs/guides/platform/manage-your-usage/egress
- https://supabase.com/docs/guides/storage/serving/bandwidth
- https://supabase.com/docs/guides/storage/cdn/metrics
- https://supabase.com/docs/guides/telemetry/logs

## Hasil Kerja `5 May 2026`

### Code Patch

Perubahan repo yang sudah dibuat:

- `frontend/src/lib/cmsAssetUpload.ts`
  - `charm-bar-assets` sekarang diarahkan ke ImageKit folder
    `/public/charm-bar-assets/{folder}`
  - `events-schedule` tetap diarahkan ke ImageKit
- `frontend/src/components/admin/StageGalleryModal.tsx`
  - upload baru `stage-gallery` sekarang memakai ImageKit folder
    `/public/stage-gallery`
  - preview admin resolve URL legacy ke ImageKit
  - delete melakukan best-effort cleanup ImageKit
- `frontend/src/lib/publicAssetUrl.ts`
  - mapping tambahan:
    - `charm-bar-assets/` -> `/public/charm-bar-assets/`
    - `stage-gallery/` -> `/public/stage-gallery/`
    - `events-schedule/settings/` -> `/public/events-schedule/settings/`
- `frontend/src/hooks/useCharmBarSettings.ts`
  - `hero_image_url`, `category_images`, `quick_links`, `steps`,
    `video_cards`, dan `how_it_works_video_url` resolve ke ImageKit
- `frontend/src/hooks/useNewsSettings.ts`
  - `section_1_image`, `section_2_image`, dan
    `section_3_products[].image` resolve ke ImageKit
- `frontend/src/hooks/useEventSettings.ts`
  - `hero_images`, `magic_images`, dan `experience_images` resolve ke
    ImageKit
- `frontend/src/pages/StageDetailPage.tsx`
  - gallery image URL resolve ke ImageKit sebelum render
- `supabase/functions/imagekit-auth/index.ts`
  - allowlist upload ImageKit ditambah untuk:
    - `/public/charm-bar-assets/{folder}`
    - `/public/stage-gallery`
- `supabase/functions/imagekit-delete/index.ts`
  - allowlist delete ImageKit ditambah untuk:
    - `/public/charm-bar-assets/{folder}/{file}`
    - `/public/stage-gallery/{file}`
- `frontend/src/lib/publicAssetUrl.test.ts`
  - guardrail test untuk mapping `charm-bar-assets`, `stage-gallery`,
    `events-schedule/settings`, dan nested CMS JSON
- `supabase/manual/imagekit_public_asset_url_cutover_20260505_dry_run.sql`
  - SQL dry-run default `ROLLBACK` untuk cutover URL runtime

### Production Changes

Production action yang sudah dilakukan:

| Area | Status |
|---|---|
| Deploy `imagekit-auth` | Selesai, version `42`, updated `2026-05-05 13:43:55 UTC` |
| Deploy `imagekit-delete` | Selesai, version `42`, updated `2026-05-05 13:31:00 UTC` |
| Temporary `imagekit-public-backfill` | Dibuat hanya untuk operasi backfill |
| Backfill ImageKit | Selesai `120/120` object |
| Temporary backfill function | Sudah dihapus dari production |
| Temporary backfill token | Sudah di-unset |
| DB URL cutover | Selesai untuk runtime public/CMS utama |
| Delete/privatize Supabase object lama | Belum dilakukan, sengaja ditunda |

Backfill yang sudah selesai:

| Source Supabase Storage | Target ImageKit | Status |
|---|---|---|
| `charm-bar-assets/cms` | `/public/charm-bar-assets/cms` | `120/120` target batch terverifikasi existing setelah backfill gabungan |
| `stage-gallery` | `/public/stage-gallery` | Masuk target backfill dan terverifikasi existing |
| `events-schedule/settings` | `/public/events-schedule/settings` | Masuk target backfill dan terverifikasi existing |

Catatan:

- Backfill tidak menghapus object Supabase lama.
- Backfill tidak menyentuh `photos` atau `print_orders`.
- Function backfill sementara tidak ditinggalkan aktif di production.

### Verification

Automated/local:

| Check | Status |
|---|---|
| Targeted test `publicAssetUrl` + `dressingRoomImageUrl` | Passed |
| `npm run build` | Passed |
| Full `npm run test` | Ada 4 failure lama di luar scope egress |

Full test failure yang masih ada di luar scope ini:

| Test area | Masalah |
|---|---|
| `inventoryData.test.ts` | RPC search expectation tidak terpanggil |
| `bookingSuccessHelpers.test.ts` | expected skeleton timeout `20000`, actual `10000` |
| `productOrdersHelpers.test.ts` | today/completed helper expectation kosong |

Production DB verification setelah cutover:

| Area | Legacy `supabase.co/storage` rows |
|---|---:|
| `banners` | 0 |
| `beauty_posters` | 0 |
| `dressing_room_look_photos` | 0 |
| `stage_gallery` | 0 |
| `charm_bar_page_settings` | 0 |
| `news_page_settings` | 0 |
| `event_page_settings` | 0 |
| `print_orders` | 37, sengaja out-of-scope |

Sample runtime URL setelah cutover:

| Source | Sample |
|---|---|
| `charm_bar_page_settings.hero_image_url` | `https://ik.imagekit.io/hjnuyz1t3/public/charm-bar-assets/cms/...jpg` |
| `stage_gallery.image_url` | `https://ik.imagekit.io/hjnuyz1t3/public/stage-gallery/...jpg` |

## Root Cause Yang Sudah Terbukti

Audit menemukan bahwa asumsi "semua media sudah pindah ke ImageKit" belum
benar untuk seluruh CMS.

Jalur yang sebelumnya masih bocor:

| Area | Problem sebelum fix | Status sekarang |
|---|---|---|
| `charm-bar-assets` | Admin Charm Bar CMS upload ke Supabase Storage | Upload path baru dipatch ke ImageKit; file lama sudah dibackfill; DB URL sudah cutover |
| `stage-gallery` | Admin Stage Gallery upload langsung ke bucket Supabase `stage-gallery` | Upload path baru dipatch ke ImageKit; file lama sudah dibackfill; DB URL sudah cutover |
| `events-schedule/settings` | Sisa URL lama di Event/News settings | File sudah dibackfill; DB URL sudah cutover |
| `dressing_room_look_photos` | Sisa legacy URL runtime | DB URL sudah cutover |
| `banners`, `beauty_posters` | Sisa legacy URL runtime | DB URL sudah cutover |
| `news_page_settings.section_3_products` | Menyimpan product URL lama dari `product-images` | Sudah rewrite ke URL ImageKit dari `product_images` |

Yang masih sengaja tidak disentuh:

| Area | Alasan |
|---|---|
| `print_orders.image_urls` | Terkait media/order customer; perlu keputusan produk/data retention sebelum migrasi/private bucket/delete |
| `photos` bucket | Masih perlu desain: private bucket, signed URL, atau migrasi ImageKit |
| Supabase Storage object lama | Belum dihapus agar masih ada rollback buffer |

## Deployment Debt

Ini daftar debt yang masih perlu dipahami jelas.

| Prioritas | Debt | Status | Owner |
|---|---|---|---|
| Urgent | Deploy frontend build terbaru | Belum terkonfirmasi deploy hosting | Human/CI deploy |
| Urgent | Smoke test admin Charm Bar upload baru | Belum manual test setelah frontend deploy | Human/admin |
| Urgent | Smoke test admin Stage Gallery upload baru | Belum manual test setelah frontend deploy | Human/admin |
| Urgent | Monitor Supabase cached egress 24-48 jam | Belum cukup waktu setelah cutover | Human/agent follow-up |
| Urgent | Logs Explorer top path 4-5 May dan pasca-cutover | Perlu dashboard/export jika CLI tidak cukup | Human/agent |
| Medium | Keputusan treatment `photos` / `print_orders` | Belum diputuskan | Product + engineering |
| Medium | Delete/privatize Supabase object lama | Ditunda sampai monitoring aman | Human approval |
| Medium | Fix 4 failing tests lama | Belum dikerjakan | Engineering |
| Nice To Have | Add guardrail/lint agar public CMS URL baru tidak boleh `supabase.co/storage` | Belum | Engineering |
| Nice To Have | PostgREST payload audit | Belum selesai penuh | Engineering |

Catatan penting:

- Edge functions ImageKit yang relevan sudah dideploy.
- Frontend code patch belum otomatis berarti live di hosting; perlu deploy app
  dari branch/worktree ini.
- DB sudah dipindah ke URL ImageKit, jadi route publik lama pun harusnya
  membaca ImageKit dari data sekarang. Namun future upload admin baru tetap
  butuh frontend deploy agar tidak kembali upload ke Supabase.

## Task Table

### Urgent

| Task | Status | Output yang diharapkan |
|---|---|---|
| Deploy frontend app terbaru | Pending | Admin upload baru memakai ImageKit path |
| Smoke test Charm Bar CMS upload image | Pending | URL hasil upload `ik.imagekit.io/.../public/charm-bar-assets/cms/...` |
| Smoke test Charm Bar CMS upload video jika fitur masih dipakai | Pending | URL hasil upload `ik.imagekit.io/.../public/charm-bar-assets/cms/...` |
| Smoke test Stage Gallery upload | Pending | URL hasil upload `ik.imagekit.io/.../public/stage-gallery/...` |
| Smoke test route publik `/charm-bar`, `/news`, `/events`, Stage Detail | Pending | Tidak ada request baru ke `supabase.co/storage` untuk CMS media utama |
| Catat cached egress harian `6-7 May 2026` | Pending | Bukti tren turun atau masih ada sumber lain |
| Export Logs Explorer pasca-cutover | Pending | Top Storage path setelah fix |

### Medium

| Task | Status | Output yang diharapkan |
|---|---|---|
| Audit `photos` bucket dan `print_orders.image_urls` | Pending | Keputusan private/signed URL/ImageKit/retention |
| Buat daftar object Supabase lama kandidat cleanup | Pending | CSV/list object dengan ImageKit counterpart |
| Delete/privatize object Supabase lama bertahap | Pending approval | Supabase cached egress turun lebih kuat; rollback sudah disepakati |
| Fix failing tests lama | Pending | `npm run test` full green |
| Audit PostgREST public payload | Pending | Field minimal dan request lebih jarang |

### Nice To Have

| Task | Status | Output yang diharapkan |
|---|---|---|
| Tambah test/lint anti `supabase.co/storage` untuk CMS runtime | Pending | Regression lebih cepat ketahuan |
| Dokumentasi asset policy final | Pending | Semua media publik baru default ImageKit |
| Dashboard harian sampai `21 May 2026` | Pending | Tabel trend untuk grace-period decision |
| Evaluasi video statis Charm Bar | Pending | Bandwidth web total lebih rendah |

## Monitoring Harian Sampai `21 May 2026`

| Tanggal | Cached egress/day | Used in period | Top path/bucket | Perubahan terakhir | Keputusan |
|---|---:|---:|---|---|---|
| `6 May 2026` |  |  |  | Code + DB cutover dipantau |  |
| `7 May 2026` |  |  |  |  |  |
| `8 May 2026` |  |  |  |  |  |
| `9 May 2026` |  |  |  |  |  |
| `10 May 2026` |  |  |  |  |  |
| `11 May 2026` |  |  |  |  |  |
| `12 May 2026` |  |  |  |  |  |
| `13 May 2026` |  |  |  |  |  |
| `14 May 2026` |  |  |  |  |  |
| `15 May 2026` |  |  |  |  |  |
| `16 May 2026` |  |  |  |  |  |
| `17 May 2026` |  |  |  |  |  |
| `18 May 2026` |  |  |  |  |  |
| `19 May 2026` |  |  |  |  |  |
| `20 May 2026` |  |  |  |  |  |
| `21 May 2026` |  |  |  | Grace-period checkpoint |  |

## Decision Notes

- Jangan delete object Supabase lama sebelum minimal 24-48 jam monitoring aman.
- Jangan ubah `print_orders` tanpa keputusan produk/data retention.
- Jika cached egress tetap mendekati `1 GB/day` setelah cutover, root cause
  berikutnya harus dibuktikan dari Logs Explorer, bukan asumsi.
- ImageKit Free Plan secara konsep masih realistis untuk user kecil-menengah
  jika asset visual tidak terlalu berat dan video/autoplay dikontrol. Tetap
  pantau bandwidth ImageKit karena beban dipindah dari Supabase ke ImageKit.

