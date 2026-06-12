import { useState, useEffect } from "react";
import { useProfile } from "../../hooks/useProfile";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import {
  User,
  Phone,
  MapPin,
  Map,
  Building,
  Home,
  Hash,
  AlertCircle,
  CheckCircle,
  Mail,
  Lock,
  Info,
} from "lucide-react";

export function ProfilePage() {
  const { user } = useAuth();
  const { profile, isLoading, updateProfile, isUpdating } = useProfile();

  // --- Profile form state ---
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    province_id: "",
    city_id: "",
    subdistrict_id: "",
    postal_code: "",
  });
  const [profileMessage, setProfileMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // --- Email change state ---
  const [newEmail, setNewEmail] = useState("");
  const [emailMessage, setEmailMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  // --- RajaOngkir State ---
  const [provinces, setProvinces] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [subdistricts, setSubdistricts] = useState<any[]>([]);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isLoadingSubdistricts, setIsLoadingSubdistricts] = useState(false);
  const [provinceError, setProvinceError] = useState<string | null>(null);
  const [cityError, setCityError] = useState<string | null>(null);
  const [subdistrictError, setSubdistrictError] = useState<string | null>(null);
  const [selectedProvinceName, setSelectedProvinceName] = useState<string>("");
  const [selectedCityName, setSelectedCityName] = useState<string>("");
  const [selectedSubdistrictName, setSelectedSubdistrictName] = useState<string>("");

  // Cache configuration
  const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
  const CACHE_KEY_PROVINCES = "rajaongkir_profile_provinces";
  const CACHE_KEY_CITIES_PREFIX = "rajaongkir_profile_cities_";
  const CACHE_KEY_SUBDISTRICTS_PREFIX = "rajaongkir_profile_subdistricts_";

  // Fallback provinces jika API down
  const FALLBACK_PROVINCES = [
    { id: "1", name: "Aceh" },
    { id: "2", name: "Sumatera Utara" },
    { id: "3", name: "Sumatera Barat" },
    { id: "4", name: "Riau" },
    { id: "5", name: "Jambi" },
    { id: "6", name: "Sumatera Selatan" },
    { id: "7", name: "Lampung" },
    { id: "8", name: "Kepulauan Bangka Belitung" },
    { id: "9", name: "Kepulauan Riau" },
    { id: "10", name: "DKI Jakarta" },
    { id: "11", name: "Jawa Barat" },
    { id: "12", name: "Jawa Tengah" },
    { id: "13", name: "DI Yogyakarta" },
    { id: "14", name: "Jawa Timur" },
    { id: "15", name: "Banten" },
    { id: "16", name: "Bali" },
    { id: "17", name: "Nusa Tenggara Barat" },
    { id: "18", name: "Nusa Tenggara Timur" },
    { id: "19", name: "Kalimantan Barat" },
    { id: "20", name: "Kalimantan Tengah" },
    { id: "21", name: "Kalimantan Selatan" },
    { id: "22", name: "Kalimantan Timur" },
    { id: "23", name: "Kalimantan Utara" },
    { id: "24", name: "Sulawesi Utara" },
    { id: "25", name: "Sulawesi Tengah" },
    { id: "26", name: "Sulawesi Selatan" },
    { id: "27", name: "Sulawesi Tenggara" },
    { id: "28", name: "Gorontalo" },
    { id: "29", name: "Sulawesi Barat" },
    { id: "30", name: "Maluku" },
    { id: "31", name: "Maluku Utara" },
    { id: "32", name: "Papua" },
    { id: "33", name: "Papua Barat" },
    { id: "34", name: "Papua Tengah" },
    { id: "35", name: "Papua Pegunungan" },
    { id: "36", name: "Papua Selatan" },
  ];

  useEffect(() => {
    const fetchProvinces = async () => {
      setIsLoadingProvinces(true);
      setProvinceError(null);
      try {
        // 1. Check cache first
        const cachedData = localStorage.getItem(CACHE_KEY_PROVINCES);
        if (cachedData) {
          const cache = JSON.parse(cachedData);
          if (Date.now() - cache.timestamp < CACHE_DURATION) {
            console.log("[ProfilePage] Using cached provinces");
            const normalized = cache.data.map((p: any) => ({
              id: p.id || p.province_id,
              name: p.name || p.province,
            }));
            setProvinces(normalized);
            setIsLoadingProvinces(false);
            return;
          }
        }

        // 2. Fetch from API
        console.log("[ProfilePage] Fetching provinces from API...");
        const { data, error } = await supabase.functions.invoke("rajaongkir", {
          body: { action: "provinces" },
        });
        if (error) throw error;

        // Check for error message (e.g. rate limit)
        if (data?.message) {
          console.error("RajaOngkir error:", data.message);
          setProvinceError(data.message);
          setProvinces(FALLBACK_PROVINCES);
          return;
        }

        // Normalize and cache
        if (data?.data && Array.isArray(data.data)) {
          const normalized = data.data.map((p: any) => ({
            id: p.id || p.province_id,
            name: p.name || p.province,
          }));

          // 3. Save to cache
          localStorage.setItem(
            CACHE_KEY_PROVINCES,
            JSON.stringify({
              data: normalized,
              timestamp: Date.now(),
            }),
          );

          setProvinces(normalized);
        } else {
          console.warn("Unexpected response format:", data);
          setProvinceError("Unexpected data format from API");
          setProvinces(FALLBACK_PROVINCES);
        }
      } catch (err) {
        console.error("Failed to fetch provinces:", err);
        setProvinceError(err instanceof Error ? err.message : String(err));
        setProvinces(FALLBACK_PROVINCES);
      } finally {
        setIsLoadingProvinces(false);
      }
    };
    fetchProvinces();
  }, []);

  useEffect(() => {
    if (!formData.province_id) {
      setCities([]);
      setSubdistricts([]);
      setCityError(null);
      setSubdistrictError(null);
      setSelectedCityName("");
      setSelectedSubdistrictName("");
      return;
    }
    const fetchCities = async () => {
      setIsLoadingCities(true);
      setCityError(null);
      try {
        const cacheKey = `${CACHE_KEY_CITIES_PREFIX}${formData.province_id}`;

        // 1. Check cache first
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          const cache = JSON.parse(cachedData);
          if (Date.now() - cache.timestamp < CACHE_DURATION) {
            console.log(
              `[ProfilePage] Using cached cities for province ${formData.province_id}`,
            );
            const normalized = cache.data.map((c: any) => ({
              id: c.id || c.city_id,
              name: c.name || c.city_name,
            }));
            setCities(normalized);
            setIsLoadingCities(false);
            return;
          }
        }

        // 2. Fetch from API
        console.log(
          `[ProfilePage] Fetching cities for province ${formData.province_id}...`,
        );
        const { data, error } = await supabase.functions.invoke("rajaongkir", {
          body: { action: "cities", province_id: formData.province_id },
        });
        if (error) throw error;

        // Check for error message
        if (data?.message) {
          console.error("RajaOngkir cities error:", data.message);
          setCityError(data.message);
          setCities([]);
          return;
        }

        // Normalize and cache
        if (data?.data && Array.isArray(data.data)) {
          const normalized = data.data.map((c: any) => ({
            id: c.id || c.city_id,
            name: c.name || c.city_name,
          }));

          // 3. Save to cache
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              data: normalized,
              timestamp: Date.now(),
            }),
          );

          console.log(
            `[ProfilePage] Successfully loaded ${normalized.length} cities for province ${formData.province_id}`,
          );
          setCities(normalized);
        } else {
          console.warn("Unexpected cities response format:", data);
          setCityError("Unexpected data format from API");
          setCities([]);
        }
      } catch (err) {
        console.error("Failed to fetch cities:", err);
        setCityError(err instanceof Error ? err.message : String(err));
        setCities([]);
      } finally {
        setIsLoadingCities(false);
      }
    };
    fetchCities();
  }, [formData.province_id]);

  useEffect(() => {
    if (!formData.city_id) {
      setSubdistricts([]);
      setSubdistrictError(null);
      setSelectedSubdistrictName("");
      return;
    }
    const fetchSubdistricts = async () => {
      setIsLoadingSubdistricts(true);
      setSubdistrictError(null);
      try {
        const cacheKey = `${CACHE_KEY_SUBDISTRICTS_PREFIX}${formData.city_id}`;

        // 1. Check cache first
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          const cache = JSON.parse(cachedData);
          if (Date.now() - cache.timestamp < CACHE_DURATION) {
            console.log(
              `[ProfilePage] Using cached subdistricts for city ${formData.city_id}`,
            );
            const normalized = cache.data.map((s: any) => ({
              id: s.id || s.subdistrict_id,
              name: s.name || s.subdistrict_name,
            }));
            setSubdistricts(normalized);
            setIsLoadingSubdistricts(false);
            return;
          }
        }

        // 2. Fetch from API
        console.log(
          `[ProfilePage] Fetching subdistricts for city ${formData.city_id}...`,
        );
        const { data, error } = await supabase.functions.invoke("rajaongkir", {
          body: { action: "subdistricts", city_id: formData.city_id },
        });
        if (error) throw error;

        // Check for error message
        if (data?.message) {
          console.error("RajaOngkir subdistricts error:", data.message);
          setSubdistrictError(data.message);
          setSubdistricts([]);
          return;
        }

        // Normalize and cache
        if (data?.data && Array.isArray(data.data)) {
          const normalized = data.data.map((s: any) => ({
            id: s.id || s.subdistrict_id,
            name: s.name || s.subdistrict_name,
          }));

          // 3. Save to cache
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              data: normalized,
              timestamp: Date.now(),
            }),
          );

          console.log(
            `[ProfilePage] Successfully loaded ${normalized.length} subdistricts for city ${formData.city_id}`,
          );
          setSubdistricts(normalized);
        } else {
          console.warn("Unexpected subdistricts response format:", data);
          setSubdistrictError("Unexpected data format from API");
          setSubdistricts([]);
        }
      } catch (err) {
        console.error("Failed to fetch subdistricts:", err);
        setSubdistrictError(err instanceof Error ? err.message : String(err));
        setSubdistricts([]);
      } finally {
        setIsLoadingSubdistricts(false);
      }
    };
    fetchSubdistricts();
  }, [formData.city_id]);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        phone: profile.phone || "",
        address: profile.address || "",
        province_id: profile.province_id || "",
        city_id: profile.city_id || "",
        subdistrict_id: profile.subdistrict_id || "",
        postal_code: profile.postal_code || "",
      });
    }
  }, [profile]);

  // Update selected names when province_id or city_id changes
  useEffect(() => {
    if (formData.province_id && provinces.length > 0) {
      const selected = provinces.find((p) => p.id === formData.province_id);
      setSelectedProvinceName(selected?.name || "");
    }
  }, [formData.province_id, provinces]);

  useEffect(() => {
    if (formData.city_id && cities.length > 0) {
      const selected = cities.find((c) => c.id === formData.city_id);
      setSelectedCityName(selected?.name || "");
    }
  }, [formData.city_id, cities]);

  useEffect(() => {
    if (formData.subdistrict_id && subdistricts.length > 0) {
      const selected = subdistricts.find((s) => s.id === formData.subdistrict_id);
      setSelectedSubdistrictName(selected?.name || "");
    }
  }, [formData.subdistrict_id, subdistricts]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    try {
      await updateProfile(formData);
      setProfileMessage({
        type: "success",
        text: "Profile updated successfully!",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Failed to update profile";
      setProfileMessage({ type: "error", text: msg });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || newEmail === user?.email) {
      setEmailMessage({
        type: "error",
        text: "Please enter a different email address.",
      });
      return;
    }
    setIsChangingEmail(true);
    setEmailMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      setEmailMessage({
        type: "info",
        text: `Confirmation email sent to ${newEmail}. Please check your inbox and click the link to confirm the change. Your email won't change until you verify the new address.`,
      });
      setNewEmail("");
      setShowEmailForm(false);
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Failed to update email";
      setEmailMessage({ type: "error", text: msg });
    } finally {
      setIsChangingEmail(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-8 max-w-[800px] mx-auto flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-[800px] mx-auto">
      <div className="mb-7">
        <h1 className="text-4xl font-black text-pink-600 mb-1.5">My Profile</h1>
        <p className="text-gray-500 text-[0.95rem]">
          Manage your personal information and account settings
        </p>
      </div>

      {/* ── Email Settings Card ── */}
      <div className="bg-white border border-gray-200 rounded-2xl py-7 px-8 shadow-sm mb-6">
        <div className="flex items-center gap-2.5 text-pink-600 mb-5">
          <Mail size={20} />
          <h2 className="text-[1.1rem] font-bold text-gray-900 m-0">
            Email Address
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 px-4 bg-gray-50 border border-gray-200 rounded-lg gap-3 sm:gap-0">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Current email
            </span>
            <span className="text-base font-semibold text-gray-900">
              {user?.email || "—"}
            </span>
          </div>
          {!showEmailForm && (
            <button
              type="button"
              className="py-2 px-4 border-[1.5px] border-pink-600 text-pink-600 rounded-md text-[0.85rem] font-semibold bg-white transition-colors duration-150 hover:bg-pink-600 hover:text-white whitespace-nowrap"
              onClick={() => {
                setShowEmailForm(true);
                setEmailMessage(null);
              }}
            >
              Change Email
            </button>
          )}
        </div>

        {emailMessage && (
          <div
            className={`flex items-start gap-3 py-3.5 px-4 rounded-lg text-[0.9rem] font-medium leading-relaxed mt-4 ${
              emailMessage.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : emailMessage.type === "error"
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-blue-50 text-blue-800 border border-blue-200"
            }`}
          >
            {emailMessage.type === "success" && (
              <CheckCircle size={18} className="shrink-0 mt-0.5" />
            )}
            {emailMessage.type === "error" && (
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
            )}
            {emailMessage.type === "info" && (
              <Info size={18} className="shrink-0 mt-0.5" />
            )}
            <span>{emailMessage.text}</span>
          </div>
        )}

        {showEmailForm && (
          <form
            onSubmit={handleEmailChange}
            className="mt-5 flex flex-col gap-4"
          >
            <div className="hidden items-start gap-2 py-3 px-4 bg-blue-50 border border-blue-200 rounded-lg text-[0.85rem] text-blue-800 leading-relaxed">
              <Info size={16} className="shrink-0 mt-0.5" />
              <span>
                A confirmation link will be sent to your new email. Your email
                won't change until you click the link.
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="new-email"
                className="text-[0.8rem] font-semibold text-gray-700 uppercase tracking-wide"
              >
                New Email Address
              </label>
              <div className="relative flex items-center">
                <Mail
                  className="absolute left-3.5 text-gray-400 pointer-events-none"
                  size={18}
                />
                <input
                  type="email"
                  id="new-email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email address"
                  required
                  className="w-full py-[0.7rem] pr-3.5 pl-11 border border-gray-300 rounded-lg text-[0.95rem] text-gray-900 bg-gray-50 transition-colors duration-150 focus:outline-none focus:border-pink-600 focus:bg-white focus:ring-[3px] focus:ring-pink-600/10"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                className="py-[0.8rem] px-5 border-[1.5px] border-gray-300 text-gray-500 rounded-lg text-[0.95rem] font-semibold bg-white cursor-pointer transition-colors duration-150 hover:border-gray-400 hover:text-gray-700"
                onClick={() => {
                  setShowEmailForm(false);
                  setNewEmail("");
                  setEmailMessage(null);
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isChangingEmail}
                className="bg-pink-600 text-white border-none py-[0.8rem] px-7 rounded-lg font-semibold text-[0.95rem] cursor-pointer transition-all duration-200 shadow-[0_4px_6px_-1px_rgba(79,70,229,0.2)] hover:opacity-90 hover:-translate-y-[1px] disabled:opacity-65 disabled:cursor-not-allowed"
              >
                {isChangingEmail
                  ? "Sending confirmation..."
                  : "Send Confirmation"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Profile Info Card ── */}
      <div className="bg-white border border-gray-200 rounded-2xl py-7 px-8 shadow-sm mb-6">
        {profileMessage && (
          <div
            className={`flex items-start gap-3 py-3.5 px-4 rounded-lg text-[0.9rem] font-medium leading-relaxed mb-6 ${
              profileMessage.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {profileMessage.type === "success" ? (
              <CheckCircle size={18} className="shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
            )}
            <span>{profileMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="flex flex-col gap-0">
          {/* Personal Information */}
          <div className="mb-2">
            <div className="flex items-center gap-2.5 text-pink-600 mb-5">
              <User size={20} />
              <h2 className="text-[1.1rem] font-bold text-gray-900 m-0">
                Personal Information
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="name"
                  className="text-[0.8rem] font-semibold text-gray-700 uppercase tracking-wide"
                >
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <User
                    className="absolute left-3.5 text-gray-400 pointer-events-none"
                    size={18}
                  />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className="w-full py-[0.7rem] pr-3.5 pl-11 border border-gray-300 rounded-lg text-[0.95rem] text-gray-900 bg-gray-50 transition-colors duration-150 focus:outline-none focus:border-pink-600 focus:bg-white focus:ring-[3px] focus:ring-pink-600/10"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="phone"
                  className="text-[0.8rem] font-semibold text-gray-700 uppercase tracking-wide"
                >
                  Phone Number (WhatsApp)
                </label>
                <div className="relative flex items-center">
                  <Phone
                    className="absolute left-3.5 text-gray-400 pointer-events-none"
                    size={18}
                  />
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setFormData((prev) => ({ ...prev, phone: val }));
                    }}
                    placeholder="e.g. 08123456789"
                    className={`w-full py-[0.7rem] pr-3.5 pl-11 border rounded-lg text-[0.95rem] text-gray-900 bg-gray-50 transition-colors duration-150 focus:outline-none focus:bg-white focus:ring-[3px] ${
                      formData.phone && !/^08[0-9]{8,11}$/.test(formData.phone)
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
                        : "border-gray-300 focus:border-pink-600 focus:ring-pink-600/10"
                    }`}
                  />
                </div>
                {formData.phone && !/^08[0-9]{8,11}$/.test(formData.phone) && (
                  <span className="text-red-500 text-[0.8rem] mt-0.5">
                    Format nomor telepon salah (harus diawali 08 dan 10-13
                    digit)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-100 my-6" />

          {/* Shipping Address */}
          <div className="mb-2">
            <div className="flex items-center gap-2.5 text-pink-600 mb-5">
              <MapPin size={20} />
              <h2 className="text-[1.1rem] font-bold text-gray-900 m-0">
                Shipping Address
              </h2>
            </div>

            <div className="flex flex-col gap-1.5 mb-[1.25rem]">
              <label
                htmlFor="address"
                className="text-[0.8rem] font-semibold text-gray-700 uppercase tracking-wide"
              >
                Full Address (Street, House No., RT/RW)
              </label>
              <div className="relative flex items-start">
                <MapPin
                  className="absolute left-3.5 text-gray-400 pointer-events-none"
                  size={18}
                  style={{ top: "1rem" }}
                />
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="e.g. Jl. Kenanga No. 5 RT 02/RW 03"
                  rows={3}
                  className="w-full py-[0.7rem] pr-3.5 pl-11 border border-gray-300 rounded-lg text-[0.95rem] text-gray-900 bg-gray-50 transition-colors duration-150 focus:outline-none focus:border-pink-600 focus:bg-white focus:ring-[3px] focus:ring-pink-600/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="province_id"
                  className="text-[0.8rem] font-semibold text-gray-700 uppercase tracking-wide"
                >
                  Province <span className="text-red-500">*</span>
                </label>
                {provinces.length > 0 ? (
                  // Show dropdown if data available
                  <div className="relative flex items-center">
                    <Map
                      className="absolute left-3.5 text-gray-400 pointer-events-none"
                      size={18}
                    />
                    <select
                      id="province_id"
                      name="province_id"
                      value={formData.province_id}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          province_id: e.target.value,
                          city_id: "",
                        }));
                      }}
                      disabled={isLoadingProvinces}
                      className="w-full py-[0.7rem] pr-3.5 pl-11 border border-gray-300 rounded-lg text-[0.95rem] text-gray-900 bg-gray-50 transition-colors duration-150 focus:outline-none focus:border-pink-600 focus:bg-white focus:ring-[3px] focus:ring-pink-600/10 appearance-none disabled:opacity-60"
                    >
                      <option value="" disabled>
                        {isLoadingProvinces
                          ? "Loading provinces..."
                          : "Select Province"}
                      </option>
                      {provinces.map((prov) => (
                        <option key={prov.id} value={prov.id}>
                          {prov.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  // Show text input if dropdown empty (API failed)
                  <div className="relative flex items-center">
                    <Map
                      className="absolute left-3.5 text-gray-400 pointer-events-none"
                      size={18}
                    />
                    <input
                      type="text"
                      id="province_id_text"
                      name="province_id_text"
                      value={selectedProvinceName}
                      onChange={(e) => {
                        setSelectedProvinceName(e.target.value);
                        setFormData((prev) => ({
                          ...prev,
                          province_id: e.target.value,
                        }));
                      }}
                      placeholder="Enter province name manually"
                      className="w-full py-[0.7rem] pr-3.5 pl-11 border border-gray-300 rounded-lg text-[0.95rem] text-gray-900 bg-gray-50 transition-colors duration-150 focus:outline-none focus:border-pink-600 focus:bg-white focus:ring-[3px] focus:ring-pink-600/10"
                    />
                  </div>
                )}
                {provinceError && (
                  <p className="text-xs text-red-500 mt-1">
                    ⚠️ {provinceError} (Enter province manually below)
                  </p>
                )}
                {formData.province_id && selectedProvinceName && (
                  <p className="text-xs text-gray-500 mt-1">
                    ✓ Selected: {selectedProvinceName}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="city_id"
                  className="text-[0.8rem] font-semibold text-gray-700 uppercase tracking-wide"
                >
                  City / Regency <span className="text-red-500">*</span>
                </label>
                {!formData.province_id ? (
                  // Select province first
                  <div className="relative flex items-center opacity-60">
                    <Building
                      className="absolute left-3.5 text-gray-400 pointer-events-none"
                      size={18}
                    />
                    <input
                      type="text"
                      disabled
                      placeholder="Select province first"
                      className="w-full py-[0.7rem] pr-3.5 pl-11 border border-gray-300 rounded-lg text-[0.95rem] text-gray-400 bg-gray-50"
                    />
                  </div>
                ) : cities.length > 0 ? (
                  // Show dropdown if data available
                  <div className="relative flex items-center">
                    <Building
                      className="absolute left-3.5 text-gray-400 pointer-events-none"
                      size={18}
                    />
                    <select
                      id="city_id"
                      name="city_id"
                      value={formData.city_id}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          city_id: e.target.value,
                        }));
                      }}
                      disabled={isLoadingCities}
                      className="w-full py-[0.7rem] pr-3.5 pl-11 border border-gray-300 rounded-lg text-[0.95rem] text-gray-900 bg-gray-50 transition-colors duration-150 focus:outline-none focus:border-pink-600 focus:bg-white focus:ring-[3px] focus:ring-pink-600/10 appearance-none disabled:opacity-60"
                    >
                      <option value="" disabled>
                        {isLoadingCities
                          ? "Loading cities..."
                          : "Select City / Regency"}
                      </option>
                      {cities.map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  // Show text input if dropdown empty (API failed)
                  <div className="relative flex items-center">
                    <Building
                      className="absolute left-3.5 text-gray-400 pointer-events-none"
                      size={18}
                    />
                    <input
                      type="text"
                      id="city_id_text"
                      name="city_id_text"
                      value={selectedCityName}
                      onChange={(e) => {
                        setSelectedCityName(e.target.value);
                        setFormData((prev) => ({
                          ...prev,
                          city_id: e.target.value,
                        }));
                      }}
                      placeholder="Enter city/regency name manually"
                      className="w-full py-[0.7rem] pr-3.5 pl-11 border border-gray-300 rounded-lg text-[0.95rem] text-gray-900 bg-gray-50 transition-colors duration-150 focus:outline-none focus:border-pink-600 focus:bg-white focus:ring-[3px] focus:ring-pink-600/10"
                    />
                  </div>
                )}
                {cityError && (
                  <p className="text-xs text-red-500 mt-1">
                    ⚠️ {cityError} (Enter city manually below)
                  </p>
                )}
                {formData.city_id && selectedCityName && (
                  <p className="text-xs text-gray-500 mt-1">
                    ✓ Selected: {selectedCityName}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="subdistrict_id"
                  className="text-[0.8rem] font-semibold text-gray-700 uppercase tracking-wide"
                >
                  Subdistrict (Kecamatan) <span className="text-red-500">*</span>
                </label>
                {!formData.city_id ? (
                  // Select city first
                  <div className="relative flex items-center opacity-60">
                    <Home
                      className="absolute left-3.5 text-gray-400 pointer-events-none"
                      size={18}
                    />
                    <input
                      type="text"
                      disabled
                      placeholder="Select city first"
                      className="w-full py-[0.7rem] pr-3.5 pl-11 border border-gray-300 rounded-lg text-[0.95rem] text-gray-400 bg-gray-50"
                    />
                  </div>
                ) : subdistricts.length > 0 ? (
                  // Show dropdown if data available
                  <div className="relative flex items-center">
                    <Home
                      className="absolute left-3.5 text-gray-400 pointer-events-none"
                      size={18}
                    />
                    <select
                      id="subdistrict_id"
                      name="subdistrict_id"
                      value={formData.subdistrict_id}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          subdistrict_id: e.target.value,
                        }));
                      }}
                      disabled={isLoadingSubdistricts}
                      className="w-full py-[0.7rem] pr-3.5 pl-11 border border-gray-300 rounded-lg text-[0.95rem] text-gray-900 bg-gray-50 transition-colors duration-150 focus:outline-none focus:border-pink-600 focus:bg-white focus:ring-[3px] focus:ring-pink-600/10 appearance-none disabled:opacity-60"
                    >
                      <option value="" disabled>
                        {isLoadingSubdistricts
                          ? "Loading subdistricts..."
                          : "Select Subdistrict"}
                      </option>
                      {subdistricts.map((subdistrict) => (
                        <option key={subdistrict.id} value={subdistrict.id}>
                          {subdistrict.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  // Show text input if dropdown empty (API failed or not available)
                  <div className="relative flex items-center">
                    <Home
                      className="absolute left-3.5 text-gray-400 pointer-events-none"
                      size={18}
                    />
                    <input
                      type="text"
                      id="subdistrict_id_text"
                      name="subdistrict_id_text"
                      value={selectedSubdistrictName}
                      onChange={(e) => {
                        setSelectedSubdistrictName(e.target.value);
                        setFormData((prev) => ({
                          ...prev,
                          subdistrict_id: e.target.value,
                        }));
                      }}
                      placeholder="e.g., Cilandak, Kebayoran Baru"
                      className="w-full py-[0.7rem] pr-3.5 pl-11 border border-gray-300 rounded-lg text-[0.95rem] text-gray-900 bg-gray-50 transition-colors duration-150 focus:outline-none focus:border-pink-600 focus:bg-white focus:ring-[3px] focus:ring-pink-600/10"
                    />
                  </div>
                )}
                {isLoadingSubdistricts && (
                  <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                    <span className="inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                    Loading subdistricts...
                  </p>
                )}
                {subdistrictError && !isLoadingSubdistricts && (
                  <p className="text-xs text-amber-600 mt-1">
                    ℹ️ Please type subdistrict name manually
                  </p>
                )}
                {formData.subdistrict_id && selectedSubdistrictName && !isLoadingSubdistricts && (
                  <p className="text-xs text-gray-500 mt-1">
                    ✓ Selected: {selectedSubdistrictName}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="postal_code"
                  className="text-[0.8rem] font-semibold text-gray-700 uppercase tracking-wide"
                >
                  Postal Code
                </label>
                <div className="relative flex items-center">
                  <Hash
                    className="absolute left-3.5 text-gray-400 pointer-events-none"
                    size={18}
                  />
                  <input
                    type="text"
                    id="postal_code"
                    name="postal_code"
                    value={formData.postal_code}
                    onChange={handleChange}
                    placeholder="e.g. 12345"
                    className="w-full py-[0.7rem] pr-3.5 pl-11 border border-gray-300 rounded-lg text-[0.95rem] text-gray-900 bg-gray-50 transition-colors duration-150 focus:outline-none focus:border-pink-600 focus:bg-white focus:ring-[3px] focus:ring-pink-600/10"
                  />
                </div>
              </div>
            </div>

            <div className="hidden items-start gap-2 py-3 px-4 bg-blue-50 border border-blue-200 rounded-lg text-[0.85rem] text-blue-800 leading-relaxed mt-2">
              <Lock size={14} className="shrink-0 mt-0.5" />
              <span>
                Province, city, and subdistrict fields will become smart
                dropdowns once RajaOngkir is integrated.
              </span>
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-2">
            <button
              type="submit"
              disabled={isUpdating}
              className="bg-pink-600 text-white border-none py-[0.8rem] px-7 rounded-lg font-semibold text-[0.95rem] cursor-pointer transition-all duration-200 shadow-[0_4px_6px_-1px_rgba(79,70,229,0.2)] hover:opacity-90 hover:-translate-y-[1px] disabled:opacity-65 disabled:cursor-not-allowed"
            >
              {isUpdating ? "Saving Changes..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfilePage;
