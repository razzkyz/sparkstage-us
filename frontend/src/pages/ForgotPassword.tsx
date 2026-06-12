import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { supabase } from '../lib/supabase';
import FallingLoveLogo from '../components/FallingLoveLogo';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError('Email tidak ditemukan atau terjadi kesalahan');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex relative">
      {/* Falling Love Logo Animation */}
      <FallingLoveLogo count={8} className="z-0" />
      
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Logo />
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl md:text-4xl text-text-light mb-4">
              Lupa Password?
            </h1>
            <p className="text-subtext-light">
              Kami akan mengirimkan link reset password ke email Anda
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-sm text-sm mb-6">
              <p className="font-semibold mb-1">✓ Email terkirim!</p>
              <p>Silakan cek email Anda untuk link reset password. Jangan lupa cek folder spam/junk.</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-sm text-sm mb-6">
              {error}
            </div>
          )}

          {/* Form */}
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Input */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-text-light mb-2"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-text-light"
                  placeholder="nama@email.com"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#ff4b86] hover:bg-[#e63d75] text-white py-3 rounded-sm font-medium transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Mengirim...' : 'Kirim Link Reset'}
              </button>
            </form>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-[#ff4b86] hover:bg-[#e63d75] text-white py-3 rounded-sm font-medium transition-colors shadow-lg shadow-primary/20"
            >
              Kembali ke Login
            </button>
          )}

          {/* Back to Login */}
          <div className="text-center mt-8">
            <Link
              to="/login"
              className="text-sm text-primary hover:text-primary-dark transition-colors"
            >
              ← Kembali ke Login
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Info Section */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center space-y-6">
            <h2 className="font-display text-5xl text-text-light mt-4">
              Tidak Perlu Khawatir
            </h2>
            <p className="text-xl text-subtext-light max-w-md mx-auto">
              Password baru akan dikirimkan ke email Anda. Ikuti langkah-langkah di email untuk reset password.
            </p>
            <div className="pt-8">
              <div className="inline-block p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
                <span className="text-6xl">🔐</span>
              </div>
            </div>
          </div>
        </div>
        {/* Decorative Elements */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
};

export default ForgotPassword;
