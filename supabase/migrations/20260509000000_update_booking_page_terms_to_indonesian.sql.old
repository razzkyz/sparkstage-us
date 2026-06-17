-- Update existing booking page settings with Indonesian booking terms and conditions
UPDATE public.booking_page_settings
SET
  important_info_title = 'Ketentuan & Keterangan Booking',
  important_info_items = '[
    "Harap tiba 15 menit sebelum sesi Anda dimulai.",
    "Booking hanya berlaku untuk tanggal dan waktu yang dipilih.",
    "Setiap tiket berlaku untuk satu orang.",
    "Ini adalah pengalaman sesi bersama dengan peserta lain.",
    "Durasi pengalaman adalah 2,5 jam termasuk 15 tahap.",
    "Tidak diizinkan membawa makanan atau minuman dari luar.",
    "Semua pembayaran tidak dapat dikembalikan."
  ]'::jsonb,
  updated_at = NOW();
