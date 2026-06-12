import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface VenueReview {
  id: number;
  user_id: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
  user?: {
    name: string;
  };
}

export const useVenueReviews = () => {
  const queryClient = useQueryClient();

  // Fetch reviews
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['venue-reviews'],
    queryFn: async () => {
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('venue_reviews')
        .select('*')
        .eq('is_approved', true)
        .eq('rating', 5)
        .order('created_at', { ascending: false })
        .limit(10);

      if (reviewsError) throw reviewsError;
      if (!reviewsData.length) return [];

      // Fetch profiles
      const userIds = Array.from(new Set(reviewsData.map((r) => r.user_id)));
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map((p) => [p.id, p]));

      return reviewsData.map((r) => ({
        ...r,
        user: profilesMap.get(r.user_id) || { name: 'Spark User' },
      })) as VenueReview[];
    },
  });

  // Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: async ({
      rating,
      comment,
      userId,
    }: {
      rating: number;
      comment: string;
      userId: string;
    }) => {
      const { error } = await supabase.from('venue_reviews').insert({
        user_id: userId,
        rating,
        comment,
        is_approved: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-reviews'] });
    },
  });

  // Calculate average rating
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return {
    reviews,
    isLoading: reviewsLoading,
    submitReview: submitReviewMutation.mutateAsync,
    isSubmitting: submitReviewMutation.isPending,
    averageRating,
    totalReviews: reviews.length,
  };
};
