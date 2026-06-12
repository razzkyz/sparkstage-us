import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HeroCarouselProps {
  images: string[];
}

export function HeroCarousel({ images }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const validImages = images.filter((img) => img && typeof img === 'string');

  if (validImages.length === 0) {
    return null;
  }

  const itemsPerView = 5;
  const maxScroll = Math.max(0, validImages.length - itemsPerView);

  const goToPrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => Math.min(maxScroll, prev + 1));
  };

  return (
    <div className="bg-[#f6dbe6] border-b border-gray-300 py-6 sm:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative">
          {/* Navigation Buttons */}
          {validImages.length > itemsPerView && (
            <>
              <button
                type="button"
                onClick={goToPrevious}
                disabled={currentIndex === 0}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 z-20 h-10 w-10 inline-flex items-center justify-center rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={goToNext}
                disabled={currentIndex === maxScroll}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 z-20 h-10 w-10 inline-flex items-center justify-center rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Images Container */}
          <div className="overflow-hidden">
            <motion.div
              className="flex gap-4"
              animate={{ x: `-${currentIndex * (100 / itemsPerView + 100 / (validImages.length * itemsPerView))}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {validImages.map((image, idx) => (
                <motion.div
                  key={`${image}-${idx}`}
                  className="shrink-0 w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <div className="relative rounded-lg overflow-hidden bg-gray-100 aspect-square shadow-md hover:shadow-lg transition-shadow group cursor-pointer">
                    <img
                      src={image}
                      alt={`Look ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        e.currentTarget.src = '/images/placeholder.png';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Indicator Dots */}
        {validImages.length > itemsPerView && (
          <div className="mt-4 flex items-center justify-center gap-2">
            {Array.from({ length: maxScroll + 1 }).map((_, idx) => (
              <motion.button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentIndex ? 'w-8 bg-gray-900' : 'w-2 bg-gray-400 hover:bg-gray-600'
                }`}
                aria-label={`Go to group ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
