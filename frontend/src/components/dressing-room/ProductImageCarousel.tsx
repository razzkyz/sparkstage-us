import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductImageCarouselProps {
  images?: string[];
  primaryImage?: string;
  productName: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

export function ProductImageCarousel({
  images = [],
  primaryImage,
  productName,
  onError,
}: ProductImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  // Use images array if available, otherwise fallback to primaryImage
  const displayImages = images.length > 0 ? images : primaryImage ? [primaryImage] : [];
  const hasMultipleImages = displayImages.length > 1;

  // Auto-advance carousel on hover
  useEffect(() => {
    if (!isHovering || !hasMultipleImages) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayImages.length);
    }, 2000);

    return () => clearInterval(timer);
  }, [isHovering, hasMultipleImages, displayImages.length]);

  const goToImage = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, displayImages.length - 1)));
  };

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    goToImage(currentIndex - 1);
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    goToImage(currentIndex + 1);
  };

  if (displayImages.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <span className="material-symbols-outlined text-gray-400 text-5xl">image</span>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full bg-gray-50 overflow-hidden"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Images */}
      {displayImages.map((image, idx) => (
        <img
          key={`${image}-${idx}`}
          src={image}
          alt={`${productName} - Image ${idx + 1}`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            idx === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
          loading={idx === 0 ? 'lazy' : 'lazy'}
          decoding="async"
          onError={onError}
        />
      ))}

      {/* Navigation Arrows - Show only on hover with multiple images */}
      {hasMultipleImages && isHovering && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all opacity-0 group-hover:opacity-100"
            aria-label="Previous image"
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all opacity-0 group-hover:opacity-100"
            aria-label="Next image"
            disabled={currentIndex === displayImages.length - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Dot Indicators - Always visible if multiple images */}
      {hasMultipleImages && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {displayImages.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                goToImage(idx);
              }}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                idx === currentIndex
                  ? 'bg-white/90 w-4'
                  : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to image ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
