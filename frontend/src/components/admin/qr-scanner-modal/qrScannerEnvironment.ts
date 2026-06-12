export const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent;
  const isAppleDevice = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;

  return isAppleDevice || isIPadOS;
};

export const isSafari = (): boolean => {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome/.test(ua) && !/Firefox/.test(ua);
};

export const calculateResponsiveQrBox = (containerSize: number): { width: number; height: number } => {
  // Use a larger size factor, effectively taking up almost the entire container
  const sizeFactor = isIOS() ? 0.85 : 0.95;
  const size = Math.floor(containerSize * sizeFactor);
  return { width: size, height: size };
};
