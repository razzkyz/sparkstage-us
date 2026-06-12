import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Logo from '../components/Logo';
import FallingLoveLogo from '../components/FallingLoveLogo';
import { supabase } from '../lib/supabase';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const navigate = useNavigate();

  // Check if token exists in URL and validate session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // If no session, check URL parameters
      if (!session) {
        const token = searchParams.get('token');
        const type = searchParams.get('type');
        
        if (!token || type !== 'recovery') {
          setTokenValid(false);
          setError('Link reset password tidak valid atau sudah kadaluarsa. Silakan minta link baru.');
        }
      }
      setIsCheckingSession(false);
    };

    checkSession();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (newPassword.length < 6) {
      setError('Password minimal harus 6 karakter');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Password tidak cocok');
      return;
    }

    setLoading(true);

    try {
      // Verify session exists before updating
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Sesi tidak valid. Silakan klik link di email kembali.');
        setLoading(false);
        return;
      }

      // Update password using the session from the recovery token
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        if (updateError.message.includes('session_not_found')) {
          setError('Session tidak valid. Silakan klik link di email kembali.');
        } else if (updateError.message.includes('same as the old')) {
          setError('Password baru tidak boleh sama dengan password lama');
        } else if (updateError.message.includes('password')) {
          setError('Password terlalu lemah. Gunakan kombinasi huruf, angka, dan simbol.');
        } else {
          setError(updateError.message || 'Gagal mengubah password');
        }
        setLoading(false);
        return;
      }

      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      setLoading(false);
    }
  };

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-white flex relative">
        <FallingLoveLogo count={8} className="z-0" />
        <div className="w-full flex items-center justify-center px-6 py-12 relative z-10">
          <div className="w-full max-w-md text-center">
            <div className="flex justify-center mb-8">
              <Logo />
            </div>
            <h1 className="font-display text-3xl md:text-4xl text-text-light mb-4">
              Link Tidak Valid
            </h1>
            <p className="text-subtext-light mb-8">
              Link reset password sudah kadaluarsa atau tidak valid. Silakan minta link baru.
            </p>
            <button
              onClick={() => navigate('/forgot-password')}
              className="w-full bg-[#ff4b86] hover:bg-[#e63d75] text-white py-3 rounded-sm font-medium transition-colors shadow-lg shadow-primary/20"
            >
              Minta Link Baru
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-white flex relative">
        <FallingLoveLogo count={8} className="z-0" />
        <div className="w-full flex items-center justify-center px-6 py-12 relative z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff4b86] mx-auto mb-4"></div>
            <p className="text-gray-600">Memverifikasi link reset password...</p>
          </div>
        </div>
      </div>
    );
  }

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
              Ubah Password
            </h1>
            <p className="text-subtext-light">
              Masukkan password baru Anda
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-sm text-sm mb-6">
              <p className="font-semibold mb-1">✓ Password berhasil diubah!</p>
              <p>Anda akan diarahkan ke halaman login dalam beberapa detik...</p>
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
              {/* New Password Input */}
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-text-light mb-2"
                >
                  Password Baru
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 bg-white border border-gray-200 rounded-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-text-light"
                    placeholder="Minimal 6 karakter"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-text-light mb-2"
                >
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 bg-white border border-gray-200 rounded-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-text-light"
                    placeholder="Ulangi password baru"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="bg-blue-50 border border-blue-200 rounded-sm p-3 text-sm text-blue-700">
                <p className="font-semibold mb-2">Persyaratan Password:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Minimal 6 karakter</li>
                  <li>Gunakan kombinasi huruf, angka, dan simbol</li>
                </ul>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#ff4b86] hover:bg-[#e63d75] text-white py-3 rounded-sm font-medium transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Mengubah Password...' : 'Ubah Password'}
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {/* Right Side - Info Section */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center space-y-6">
            <h2 className="font-display text-5xl text-text-light mt-4">
              Keamanan Akun
            </h2>
            <p className="text-xl text-subtext-light max-w-md mx-auto">
              Buat password yang kuat dan mudah diingat untuk menjaga keamanan akun Anda di Spark Stage.
            </p>
            <div className="pt-8">
              <div className="inline-block p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
                <span className="text-6xl">🛡️</span>
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

export default ResetPassword;
