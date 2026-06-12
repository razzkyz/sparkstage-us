import { memo, useRef, type ReactNode, type TouchEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Banner } from '../hooks/useBanners';
import { useAutoSlider } from '../hooks/useAutoSlider';

type HeroBannerCarouselProps = {
  slides: Banner[];
  intervalMs?: number;
  containerClassName?: string;
  imageClassName?: string;
  prevButtonClassName?: string;
  nextButtonClassName?: string;
  indicatorActiveClassName?: string;
  indicatorInactiveClassName?: string;
  renderOverlay?: (slide: Banner) => ReactNode;
  overlayClassName?: string;
  autoHeight?: boolean;
};

const SWIPE_THRESHOLD = 50;

export const HeroBannerCarousel = memo(function HeroBannerCarousel({
  slides,
  intervalMs = 5000,
  containerClassName,
  imageClassName,
  prevButtonClassName,
  nextButtonClassName,
  indicatorActiveClassName,
  indicatorInactiveClassName,
  renderOverlay,
  overlayClassName,
  autoHeight = false,
}: HeroBannerCarouselProps) {
  const { index, setIndex, next, prev, bindHover } = useAutoSlider({
    length: slides.length,
    intervalMs,
  });

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const onTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const onTouchMove = (event: TouchEvent) => {
    touchEndX.current = event.touches[0].clientX;
  };

  const onTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0) next();
      else prev();
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  if (slides.length === 0) return null;

  return (
    <div
      className={containerClassName}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      {...bindHover}
    >
      <div className={autoHeight ? "relative w-full" : "relative w-full h-full"}>
        {slides.map((slide, slideIndex) => (
          <div
            key={slide.id}
            className={autoHeight
              ? `${slideIndex === index ? 'block' : 'hidden'}`
              : `absolute inset-0 transition-all duration-1000 ease-out ${slideIndex === index ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-105 translate-x-4'}`
            }
          >
            {slide.image_url?.match(/\.(mp4|webm|ogg)(\?.*)?$/i) ? (
              <video
                src={slide.image_url}
                className={imageClassName || (autoHeight ? "w-full h-auto object-contain" : "absolute inset-0 w-full h-full object-contain")}
                style={autoHeight ? { width: '100%', objectFit: 'contain' } : { width: '100%', height: '100%', objectFit: imageClassName?.includes('object-cover') ? 'cover' : 'contain' }}
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <img
                src={slide.image_url}
                alt={slide.title}
                className={imageClassName || (autoHeight ? "w-full h-auto object-contain" : "absolute inset-0 w-full h-full object-contain")}
                style={autoHeight ? { width: '100%', objectFit: 'contain' } : { width: '100%', height: '100%', objectFit: imageClassName?.includes('object-cover') ? 'cover' : 'contain' }}
              />
            )}
            {renderOverlay ? <div className={overlayClassName}>{renderOverlay(slide)}</div> : null}
          </div>
        ))}
      </div>

      {slides.length > 1 ? (
        <>
          <button
            type="button"
            onClick={prev}
            className={`${prevButtonClassName} sm:left-4 md:left-6 lg:left-8`}
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
          </button>
          <button
            type="button"
            onClick={next}
            className={`${nextButtonClassName} sm:right-4 md:right-6 lg:right-8`}
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
          </button>
          <div className="absolute bottom-4 sm:bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2 px-4">
            {slides.map((_, indicatorIndex) => (
              <button
                key={indicatorIndex}
                type="button"
                onClick={() => setIndex(indicatorIndex)}
                className={`h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full transition-colors duration-200 ${indicatorIndex === index ? indicatorActiveClassName : indicatorInactiveClassName}`}
                aria-label={`Go to slide ${indicatorIndex + 1}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
});
