type MapScannerStartErrorParams = {
  appleDevice: boolean;
  safariOnMac: boolean;
  primaryError?: unknown;
  fallbackError?: unknown;
};

export const getErrorName = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object' || !('name' in error)) return undefined;
  const name = (error as { name?: unknown }).name;
  return typeof name === 'string' ? name : undefined;
};

export const mapScannerStartError = ({
  appleDevice,
  safariOnMac,
  primaryError,
  fallbackError,
}: MapScannerStartErrorParams): { message: string; details: string } => {
  const name = getErrorName(fallbackError) || getErrorName(primaryError);
  const primaryErrorStr = primaryError instanceof Error ? primaryError.message : String(primaryError);
  const fallbackErrorStr = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);

  // Check for Permissions Policy violation (appears in console but not as thrown error)
  if (
    primaryErrorStr.includes('Permissions policy violation') ||
    primaryErrorStr.includes('camera is not allowed') ||
    fallbackErrorStr.includes('Permissions policy violation') ||
    fallbackErrorStr.includes('camera is not allowed')
  ) {
    return {
      message: 'Izin kamera diblokir oleh browser',
      details: 'Browser memblokir akses kamera. Buka Settings browser → Privacy → Camera, dan izinkan untuk situs ini. Lalu klik "Coba Lagi".',
    };
  }

  if (name === 'NotAllowedError') {
    return {
      message: 'Izin kamera ditolak',
      details: appleDevice
        ? 'Di iPhone/iPad: Buka Settings → Safari → Camera → Izinkan. Lalu kembali ke halaman ini dan klik "Coba Lagi".'
        : safariOnMac
          ? 'Di Safari Mac: Klik Safari → Settings → Websites → Camera. Pilih "Allow" untuk situs ini, lalu klik "Coba Lagi".'
          : 'Silakan izinkan akses kamera di pengaturan browser Anda, lalu klik "Coba Lagi".',
    };
  }

  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return {
      message: 'Kamera tidak ditemukan',
      details: 'Tidak ada kamera yang terdeteksi pada perangkat Anda.',
    };
  }

  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return {
      message: 'Kamera sedang digunakan',
      details: appleDevice
        ? 'Tutup aplikasi lain yang menggunakan kamera, lalu klik "Coba Lagi".'
        : 'Pastikan tidak ada aplikasi lain yang menggunakan kamera.',
    };
  }

  if (name === 'OverconstrainedError') {
    return {
      message: 'Kamera tidak kompatibel',
      details: 'Kamera perangkat Anda tidak mendukung konfigurasi yang diminta. Coba gunakan kamera lain.',
    };
  }

  return {
    message: 'Gagal memulai pemindai',
    details: appleDevice
      ? 'Coba tutup Safari, buka ulang, dan scan lagi. Jika masih error, restart perangkat.'
      : 'Terjadi kesalahan saat memulai pemindai. Coba refresh halaman atau gunakan browser lain.',
  };
};
