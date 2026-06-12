import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS } from '../../constants/adminMenu';
import { useAdminMenuSections } from '../../hooks/useAdminMenuSections';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { Trash2, Edit, Plus, Star, Eye, EyeOff } from 'lucide-react';

interface VenueReview {
  id: number;
  user_id: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    name: string;
  };
}

const VenueReviewsAdmin = () => {
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const menuSections = useAdminMenuSections();
  const [reviews, setReviews] = useState<VenueReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<VenueReview | null>(null);
  const [formData, setFormData] = useState({
    user_id: '',
    rating: 5,
    comment: '',
    is_approved: true,
  });

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const { data: reviewsData, error } = await supabase
        .from('venue_reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles
      const userIds = Array.from(new Set(reviewsData.map((r) => r.user_id)));
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map((p) => [p.id, p]));

      const reviewsWithProfiles = reviewsData.map((r) => ({
        ...r,
        user: profilesMap.get(r.user_id) || { name: 'Unknown User' },
      })) as VenueReview[];

      setReviews(reviewsWithProfiles);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      const { error } = await supabase.from('venue_reviews').delete().eq('id', id);
      if (error) throw error;
      showToast('success', 'Review deleted successfully');
      fetchReviews();
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to delete review');
    }
  };

  const handleToggleApproved = async (review: VenueReview) => {
    try {
      const { error } = await supabase
        .from('venue_reviews')
        .update({ is_approved: !review.is_approved })
        .eq('id', review.id);

      if (error) throw error;
      showToast('success', `Review ${review.is_approved ? 'hidden' : 'shown'} successfully`);
      fetchReviews();
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to update review');
    }
  };

  const handleEdit = (review: VenueReview) => {
    setEditingReview(review);
    setFormData({
      user_id: review.user_id,
      rating: review.rating,
      comment: review.comment || '',
      is_approved: review.is_approved,
    });
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingReview(null);
    setFormData({
      user_id: '',
      rating: 5,
      comment: '',
      is_approved: true,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingReview) {
        const { error } = await supabase
          .from('venue_reviews')
          .update({
            rating: formData.rating,
            comment: formData.comment,
            is_approved: formData.is_approved,
          })
          .eq('id', editingReview.id);

        if (error) throw error;
        showToast('success', 'Review updated successfully');
      } else {
        if (!formData.user_id) {
          showToast('error', 'Please select a user');
          return;
        }

        const { error } = await supabase.from('venue_reviews').insert({
          user_id: formData.user_id,
          rating: formData.rating,
          comment: formData.comment,
          is_approved: formData.is_approved,
        });

        if (error) throw error;
        showToast('success', 'Review added successfully');
      }

      setIsModalOpen(false);
      fetchReviews();
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to save review');
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={menuSections}
      defaultActiveMenuId="venue-reviews"
      title="Venue Reviews"
      onLogout={signOut}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Venue Reviews</h1>
            <p className="text-gray-600 mt-1">Manage venue reviews from visitors</p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 bg-main-500 text-white px-4 py-2 rounded-lg hover:bg-main-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Review
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Total Reviews</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{reviews.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Approved</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {reviews.filter((r) => r.is_approved).length}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Hidden</div>
            <div className="text-2xl font-bold text-red-600 mt-1">
              {reviews.filter((r) => !r.is_approved).length}
            </div>
          </div>
        </div>

        {/* Reviews Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : reviews.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No reviews yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">User</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Rating</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Comment</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reviews.map((review) => (
                    <tr key={review.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{review.user?.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex text-yellow-400">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= review.rating ? 'fill-current' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                        {review.comment || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            review.is_approved
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {review.is_approved ? (
                            <>
                              <Eye className="w-3 h-3" />
                              Visible
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3" />
                              Hidden
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(review.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleApproved(review)}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            title={review.is_approved ? 'Hide review' : 'Show review'}
                          >
                            {review.is_approved ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleEdit(review)}
                            className="p-2 text-gray-600 hover:text-main-600 hover:bg-main-50 rounded-lg transition-colors"
                            title="Edit review"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(review.id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete review"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingReview ? 'Edit Review' : 'Add Review'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData({ ...formData, rating: star })}
                        className={`text-3xl transition-colors ${
                          star <= formData.rating ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
                  <textarea
                    value={formData.comment}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-3 focus:ring-2 focus:ring-main-500 focus:border-transparent"
                    rows={3}
                    placeholder="Enter review comment..."
                  />
                </div>
                {!editingReview && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                    <input
                      type="text"
                      value={formData.user_id}
                      onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 p-3 focus:ring-2 focus:ring-main-500 focus:border-transparent"
                      placeholder="Enter user ID..."
                      required
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_approved"
                    checked={formData.is_approved}
                    onChange={(e) => setFormData({ ...formData, is_approved: e.target.checked })}
                    className="w-4 h-4 text-main-600 border-gray-300 rounded focus:ring-main-500"
                  />
                  <label htmlFor="is_approved" className="text-sm text-gray-700">
                    Show review publicly
                  </label>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-main-500 text-white px-4 py-2 rounded-lg hover:bg-main-600 transition-colors"
                >
                  {editingReview ? 'Update' : 'Add'} Review
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default VenueReviewsAdmin;
