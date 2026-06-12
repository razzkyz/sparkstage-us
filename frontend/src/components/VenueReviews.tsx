import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { useVenueReviews, VenueReview } from '../hooks/useVenueReviews';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const StarIcon = ({ filled }: { filled: boolean }) => (
  <span className={`text-2xl transition-all ${filled ? 'text-yellow-400' : 'text-gray-300'}`}>
    ★
  </span>
);

export const VenueReviews = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { reviews, isLoading, submitReview, isSubmitting, averageRating, totalReviews } = useVenueReviews();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const reviewsPerPage = 4;
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const totalPages = Math.ceil(reviews.length / reviewsPerPage);
  const startIndex = currentIndex * reviewsPerPage;
  const endIndex = startIndex + reviewsPerPage;
  const currentReviews = reviews.slice(startIndex, endIndex);

  const handleNext = useCallback(() => {
    setCurrentIndex((prevIndex) => {
      const pages = Math.ceil(reviews.length / reviewsPerPage);
      return prevIndex < pages - 1 ? prevIndex + 1 : 0;
    });
  }, [reviews.length, reviewsPerPage]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prevIndex) => {
      const pages = Math.ceil(reviews.length / reviewsPerPage);
      return prevIndex > 0 ? prevIndex - 1 : pages - 1;
    });
  }, [reviews.length, reviewsPerPage]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  useEffect(() => {
    if (reviews.length <= reviewsPerPage) return;
    const interval = setInterval(() => {
      handleNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [reviews.length, reviewsPerPage, handleNext]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('error', 'Please log in to submit a review');
      return;
    }

    try {
      await submitReview({ rating, comment, userId: user.id });
      showToast('success', 'Review submitted successfully!');
      setIsFormOpen(false);
      setRating(5);
      setComment('');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to submit review');
    }
  };

  return (
    <section className="bg-linear-to-b from-gray-50 to-white py-16 md:py-24 lg:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-3 md:mb-4 drop-shadow-sm">What Our Visitors Love</h2>
          <p className="text-gray-600 text-base md:text-lg lg:text-xl max-w-2xl mx-auto">Join thousands of happy visitors who gave us a 5-star experience!</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-6 md:mt-8 flex-wrap">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon key={star} filled={star <= 5} />
              ))}
            </div>
            <span className="text-2xl md:text-3xl font-black text-main-600">
              {averageRating.toFixed(1)}
            </span>
            <span className="text-gray-600 text-base md:text-lg font-medium">({totalReviews} reviews)</span>
          </div>
        </div>

        {!isFormOpen && (
          <div className="text-center mb-10 md:mb-12">
            <button
              onClick={() => setIsFormOpen(true)}
              className="inline-flex items-center gap-2 bg-linear-to-r from-main-600 to-main-500 text-white px-8 md:px-10 py-3 md:py-4 rounded-full text-base md:text-lg font-black hover:from-main-700 hover:to-main-600 transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl drop-shadow-md"
            >
              <span className="text-xl">✨</span>
              Share Your Experience
            </button>
          </div>
        )}

        {isFormOpen && (
          <div className="bg-linear-to-br from-white to-main-50 p-8 md:p-12 rounded-3xl border-2 border-main-200 shadow-2xl mb-10 md:mb-12 animate-fade-in-up backdrop-blur-sm">
            <div className="text-center mb-8 md:mb-10">
              <span className="text-5xl md:text-6xl">💬</span>
              <h3 className="text-2xl md:text-3xl font-black text-main-900 mt-3">Share Your Experience</h3>
              <p className="text-gray-600 text-sm md:text-base mt-2">Help us improve and inspire other visitors</p>
            </div>
            {user ? (
              <form onSubmit={handleSubmit}>
                <div className="mb-8">
                  <label className="block text-sm md:text-base font-black text-main-900 mb-4 uppercase tracking-wider">
                    ⭐ Your Rating
                  </label>
                  <div className="flex gap-2 md:gap-4 justify-center sm:justify-start bg-white p-6 rounded-2xl border-2 border-main-100 shadow-sm">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`text-5xl md:text-6xl transition-all hover:scale-125 focus:outline-none transform ${
                          star <= rating ? 'text-yellow-400 drop-shadow-lg' : 'text-gray-300 hover:text-yellow-200'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-8">
                  <label className="block text-sm md:text-base font-black text-main-900 mb-3 uppercase tracking-wider">
                    💭 Your Review
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full rounded-2xl border-2 border-main-200 focus:border-main-500 p-4 md:p-6 h-32 md:h-40 text-base md:text-lg focus:ring-2 focus:ring-main-500 focus:ring-offset-2 focus:ring-offset-white text-gray-800 bg-white placeholder-gray-400 resize-none shadow-md focus:shadow-lg transition-all"
                    placeholder="What did you love most about Spark Stage? 🌟"
                    required
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-linear-to-r from-main-600 to-main-500 text-white px-6 md:px-8 py-3 md:py-4 rounded-2xl text-base md:text-lg font-black hover:from-main-700 hover:to-main-600 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl active:scale-95 transform"
                  >
                    {isSubmitting ? '⏳ Submitting...' : '✅ Submit Review'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-6 md:px-8 py-3 md:py-4 rounded-2xl text-base md:text-lg font-black text-main-700 hover:bg-main-100 transition-colors border-2 border-main-200"
                  >
                    ✕ Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-10 md:py-12 bg-linear-to-br from-main-50 to-main-100 rounded-2xl border-2 border-main-200">
                <span className="text-6xl md:text-7xl text-main-300 mb-4 block">🔒</span>
                <p className="text-main-900 mb-8 font-bold text-lg md:text-xl">Please log in to share your review</p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link
                    to="/login"
                    state={{ returnTo: '/on-stage' }}
                    className="bg-linear-to-r from-main-600 to-main-500 text-white px-8 md:px-10 py-3 md:py-4 rounded-2xl text-base md:text-lg font-black hover:from-main-700 hover:to-main-600 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95"
                  >
                    🔑 Log In
                  </Link>
                  <button
                    onClick={() => setIsFormOpen(false)}
                    className="px-8 md:px-10 py-3 md:py-4 rounded-2xl text-base md:text-lg font-black text-gray-600 hover:bg-white transition-colors border-2 border-gray-300"
                  >
                    ✕ Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12 md:py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-main-200 border-t-main-600 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Loading reviews...</p>
            </div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 md:py-20 bg-linear-to-br from-main-50 to-main-100 rounded-3xl border-2 border-main-200 shadow-md">
            <div className="inline-block p-6 md:p-8 rounded-full bg-white mb-6 md:mb-8 shadow-lg">
              <span className="text-6xl md:text-7xl block">💫</span>
            </div>
            <p className="text-main-900 font-black text-xl md:text-2xl mb-4">Be the first to share your experience!</p>
            <p className="text-gray-600 text-base md:text-lg max-w-lg mx-auto">Your 5-star review will help inspire other visitors to experience the magic of Spark Stage.</p>
          </div>
        ) : (
          <div className="relative">
            {totalPages > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute -left-6 md:-left-8 top-1/2 -translate-y-1/2 z-20 bg-linear-to-br from-white to-gray-100 hover:from-main-600 hover:to-main-500 text-main-600 hover:text-white p-3 md:p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95 hidden md:flex items-center justify-center"
                >
                  <ChevronLeft className="w-6 h-6 md:w-7 md:h-7" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute -right-6 md:-right-8 top-1/2 -translate-y-1/2 z-20 bg-linear-to-br from-white to-gray-100 hover:from-main-600 hover:to-main-500 text-main-600 hover:text-white p-3 md:p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95 hidden md:flex items-center justify-center"
                >
                  <ChevronRight className="w-6 h-6 md:w-7 md:h-7" />
                </button>
              </>
            )}

            <div 
              className="overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 transition-all duration-500 ease-in-out">
                {currentReviews.map((review, index) => (
                  <ReviewCard key={review.id} review={review} index={index} />
                ))}
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-3 mt-8 md:hidden">
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`rounded-full transition-all duration-300 ${
                      currentIndex === idx ? 'bg-main-600 w-8 h-3 shadow-lg' : 'bg-gray-300 w-2.5 h-2.5 hover:bg-main-400'
                    }`}
                    aria-label={`Go to page ${idx + 1}`}
                  />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="hidden md:flex justify-center items-center gap-3 mt-8 text-sm text-gray-600 font-bold">
                <span className="text-lg">{currentIndex + 1}</span>
                <span className="text-gray-400 mx-1">/</span>
                <span className="text-lg">{totalPages}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

const ReviewCard = ({ review, index }: { review: VenueReview; index: number }) => (
  <div 
    className="bg-linear-to-br from-white via-main-50 to-main-100 rounded-2xl border-2 border-main-200 p-5 md:p-6 hover:shadow-2xl hover:border-main-400 transition-all duration-300 relative overflow-hidden animate-fade-in-up h-full group"
    style={{
      animationDelay: `${index * 100}ms`,
      animationFillMode: 'both'
    }}
  >
    <div className="absolute -top-8 -right-8 text-7xl md:text-8xl opacity-10 group-hover:opacity-20 transition-opacity duration-300 transform group-hover:scale-110">💖</div>
    <div className="absolute inset-0 bg-linear-to-t from-main-500/0 via-transparent to-transparent opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
    
    <div className="relative z-10 flex flex-col h-full">
      <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
        <div className="flex-1">
          <div className="flex flex-col gap-2 mb-2 md:mb-3">
            <h4 className="font-black text-gray-900 text-base md:text-lg flex items-center gap-2 line-clamp-1">
              <span className="text-xl md:text-2xl">⭐</span>
              <span className="truncate">{review.user?.name || 'Guest'}</span>
            </h4>
            <span className="text-xs md:text-sm text-gray-500 font-bold bg-white px-3 py-1 rounded-full border border-main-200 shadow-sm w-fit">
              {new Date(review.created_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          <div className="flex text-yellow-400 text-lg md:text-xl drop-shadow-sm">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={`${review.id}-star-${star}`} className="">
                ★
              </span>
            ))}
          </div>
        </div>
      </div>
      {review.comment && (
        <div className="mt-2 md:mt-3 grow">
          <p className="text-gray-800 leading-relaxed text-sm md:text-base line-clamp-4 font-medium">"{review.comment}"</p>
        </div>
      )}
      <div className="mt-4 md:mt-5 flex items-center gap-2 text-main-600 font-black text-sm md:text-base">
        <span className="text-xl md:text-2xl animate-pulse">💕</span>
        <span>Loved it!</span>
      </div>
    </div>
  </div>
);
