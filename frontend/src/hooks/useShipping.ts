import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Province {
  province_id: string;
  province: string;
}

export interface City {
  city_id: string;
  province_id: string;
  province: string;
  type: string;
  city_name: string;
  postal_code: string;
}

export interface Subdistrict {
  subdistrict_id: string;
  city_id: string;
  city: string;
  province: string;
  type: string;
  subdistrict_name: string;
}

// Cache configuration
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_VERSION = 'v1'; // Increment to invalidate all caches
const CACHE_KEY_PROVINCES = `rajaongkir_checkout_${CACHE_VERSION}_provinces`;
const CACHE_KEY_CITIES_PREFIX = `rajaongkir_checkout_${CACHE_VERSION}_cities_`;
const CACHE_KEY_SUBDISTRICTS_PREFIX = `rajaongkir_checkout_${CACHE_VERSION}_subdistricts_`;
const defaultOriginCityId = import.meta.env.VITE_STORE_ORIGIN_CITY_ID || '23';

// Fallback provinces if API fails (34 provinces in Indonesia)
const FALLBACK_PROVINCES = [
  { province_id: '1', province: 'Bali' },
  { province_id: '2', province: 'Bangka Belitung' },
  { province_id: '3', province: 'Banten' },
  { province_id: '4', province: 'Bengkulu' },
  { province_id: '5', province: 'DI Yogyakarta' },
  { province_id: '6', province: 'DKI Jakarta' },
  { province_id: '7', province: 'Gorontalo' },
  { province_id: '8', province: 'Jambi' },
  { province_id: '9', province: 'Jawa Barat' },
  { province_id: '10', province: 'Jawa Tengah' },
  { province_id: '11', province: 'Jawa Timur' },
  { province_id: '12', province: 'Kalimantan Barat' },
  { province_id: '13', province: 'Kalimantan Selatan' },
  { province_id: '14', province: 'Kalimantan Tengah' },
  { province_id: '15', province: 'Kalimantan Timur' },
  { province_id: '16', province: 'Kalimantan Utara' },
  { province_id: '17', province: 'Kepulauan Riau' },
  { province_id: '18', province: 'Lampung' },
  { province_id: '19', province: 'Maluku' },
  { province_id: '20', province: 'Maluku Utara' },
  { province_id: '21', province: 'Nanggroe Aceh Darussalam (NAD)' },
  { province_id: '22', province: 'Nusa Tenggara Barat (NTB)' },
  { province_id: '23', province: 'Nusa Tenggara Timur (NTT)' },
  { province_id: '24', province: 'Papua' },
  { province_id: '25', province: 'Papua Barat' },
  { province_id: '26', province: 'Riau' },
  { province_id: '27', province: 'Sulawesi Barat' },
  { province_id: '28', province: 'Sulawesi Selatan' },
  { province_id: '29', province: 'Sulawesi Tengah' },
  { province_id: '30', province: 'Sulawesi Tenggara' },
  { province_id: '31', province: 'Sulawesi Utara' },
  { province_id: '32', province: 'Sumatera Barat' },
  { province_id: '33', province: 'Sumatera Selatan' },
  { province_id: '34', province: 'Sumatera Utara' },
];

export interface ShippingCost {
  service: string;
  description: string;
  cost: Array<{
    value: number;
    etd: string;
    note: string;
  }>;
}

export interface CourierService {
  code: string;
  name: string;
  costs: ShippingCost[];
}

export const useShipping = (provinceId?: string, cityId?: string, weight: number = 1000) => {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [subdistricts, setSubdistricts] = useState<Subdistrict[]>([]);
  const [shippingCosts, setShippingCosts] = useState<CourierService[]>([]);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isLoadingSubdistricts, setIsLoadingSubdistricts] = useState(false);
  const [isLoadingCost, setIsLoadingCost] = useState(false);

  // Manual fetch functions to avoid auto-firing and rate limiting
  const fetchProvinces = async () => {
    setIsLoadingProvinces(true);
    try {
      // 1. Check cache first
      const cachedData = localStorage.getItem(CACHE_KEY_PROVINCES);
      if (cachedData) {
        const cache = JSON.parse(cachedData);
        if (Date.now() - cache.timestamp < CACHE_DURATION) {
          console.log('[useShipping] Using cached provinces (checkout)');
          const formatted = cache.data.map((p: any) => ({
            province_id: p.province_id || p.id,
            province: p.province || p.name
          }));
          setProvinces(formatted);
          return formatted;
        }
        console.log('[useShipping] Cache expired, fetching fresh data');
      }

      // 2. Fetch from API if cache miss or expired
      console.log('[useShipping] Fetching provinces from API...');
      const { data, error } = await supabase.functions.invoke('rajaongkir', {
        body: { action: 'provinces' }
      });
      
      if (error) throw error;

      // Check for error message from API (e.g., rate limit)
      if (data?.message) {
        console.error('[useShipping] API error:', data.message);
        // Use fallback provinces
        setProvinces(FALLBACK_PROVINCES);
        return FALLBACK_PROVINCES;
      }
      
      if (data?.data) {
        const formatted = (data.data || []).map((p: any) => ({
          province_id: p.id || p.province_id,
          province: p.name || p.province
        }));

        // 3. Save to cache
        localStorage.setItem(CACHE_KEY_PROVINCES, JSON.stringify({
          data: formatted,
          timestamp: Date.now()
        }));

        console.log(`[useShipping] Cached ${formatted.length} provinces`);
        setProvinces(formatted);
        return formatted;
      }
      
      // No data, use fallback
      setProvinces(FALLBACK_PROVINCES);
      return FALLBACK_PROVINCES;
    } catch (err) {
      console.error('Failed to fetch provinces:', err);
      // Use fallback on error
      setProvinces(FALLBACK_PROVINCES);
      return FALLBACK_PROVINCES;
    } finally {
      setIsLoadingProvinces(false);
    }
  };

  const fetchCities = async (targetProvinceId: string) => {
    if (!targetProvinceId) return [];
    setIsLoadingCities(true);
    try {
      const cacheKey = `${CACHE_KEY_CITIES_PREFIX}${targetProvinceId}`;

      // 1. Check cache first
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const cache = JSON.parse(cachedData);
        if (Date.now() - cache.timestamp < CACHE_DURATION) {
          console.log(`[useShipping] Using cached cities for province ${targetProvinceId}`);
          const formatted = cache.data.map((c: any) => ({
            city_id: c.city_id || c.id,
            province_id: c.province_id || targetProvinceId,
            province: c.province || '',
            type: c.type || '',
            city_name: c.city_name || c.name,
            postal_code: c.postal_code || ''
          }));
          setCities(formatted);
          return formatted;
        }
        console.log(`[useShipping] Cache expired for cities, fetching fresh data`);
      }

      // 2. Fetch from API if cache miss or expired
      console.log(`[useShipping] Fetching cities for province ${targetProvinceId}...`);
      const { data, error } = await supabase.functions.invoke('rajaongkir', {
        body: { action: 'cities', province_id: targetProvinceId }
      });
      
      if (error) throw error;

      // Check for error message from API (e.g., rate limit)
      if (data?.message) {
        console.error('[useShipping] Cities API error:', data.message);
        setCities([]);
        return [];
      }
      
      if (data?.data) {
        const formatted = (data.data || []).map((c: any) => ({
          city_id: c.id || c.city_id,
          province_id: c.province_id || targetProvinceId,
          province: '',
          type: c.type || '',
          city_name: c.name || c.city_name,
          postal_code: c.postal_code || ''
        }));

        // 3. Save to cache
        localStorage.setItem(cacheKey, JSON.stringify({
          data: formatted,
          timestamp: Date.now()
        }));

        console.log(`[useShipping] Cached ${formatted.length} cities for province ${targetProvinceId}`);
        setCities(formatted);
        return formatted;
      }
      
      setCities([]);
      return [];
    } catch (err) {
      console.error('Failed to fetch cities:', err);
      setCities([]);
      return [];
    } finally {
      setIsLoadingCities(false);
    }
  };

  const fetchSubdistricts = async (targetCityId: string) => {
    if (!targetCityId) return [];
    setIsLoadingSubdistricts(true);
    try {
      const cacheKey = `${CACHE_KEY_SUBDISTRICTS_PREFIX}${targetCityId}`;

      // 1. Check cache first
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const cache = JSON.parse(cachedData);
        if (Date.now() - cache.timestamp < CACHE_DURATION) {
          console.log(`[useShipping] Using cached subdistricts for city ${targetCityId}`);
          const formatted = cache.data.map((s: any) => ({
            subdistrict_id: s.subdistrict_id || s.id,
            city_id: s.city_id || targetCityId,
            city: s.city || '',
            province: s.province || '',
            type: s.type || '',
            subdistrict_name: s.subdistrict_name || s.name
          }));
          setSubdistricts(formatted);
          return formatted;
        }
        console.log(`[useShipping] Cache expired for subdistricts, fetching fresh data`);
      }

      // 2. Fetch from API if cache miss or expired
      console.log(`[useShipping] Fetching subdistricts for city ${targetCityId}...`);
      const { data, error } = await supabase.functions.invoke('rajaongkir', {
        body: { action: 'subdistricts', city_id: targetCityId }
      });
      
      if (error) {
        console.error('[useShipping] Subdistricts error:', error);
        throw error;
      }
      
      // Check for error message from API (e.g., rate limit)
      if (data?.message && !data?.data) {
        console.error('[useShipping] Subdistricts API error:', data.message);
        setSubdistricts([]);
        return [];
      }
      
      if (data?.data) {
        const formatted = (data.data || []).map((s: any) => ({
          subdistrict_id: s.id || s.subdistrict_id,
          city_id: s.city_id || targetCityId,
          city: s.city || '',
          province: s.province || '',
          type: s.type || '',
          subdistrict_name: s.name || s.subdistrict_name
        }));

        // 3. Save to cache
        localStorage.setItem(cacheKey, JSON.stringify({
          data: formatted,
          timestamp: Date.now()
        }));

        console.log(`[useShipping] Cached ${formatted.length} subdistricts for city ${targetCityId}`);
        setSubdistricts(formatted);
        return formatted;
      }
      
      setSubdistricts([]);
      return [];
    } catch (err) {
      console.error('Failed to fetch subdistricts:', err);
      setSubdistricts([]);
      return [];
    } finally {
      setIsLoadingSubdistricts(false);
    }
  };

  // Auto-fetch disabled to prevent rate limiting
  // Provinces will be fetched manually when needed via fetchProvinces()

  // Auto-fetch disabled to prevent rate limiting
  // Cities will be fetched manually when needed via fetchCities()
  // Clear cities/subdistricts when province changes
  useEffect(() => {
    if (!provinceId) {
      setCities([]);
      setSubdistricts([]);
    }
  }, [provinceId]);

  // Auto-fetch disabled to prevent rate limiting
  // Subdistricts will be fetched manually when needed via fetchSubdistricts()
  // Clear subdistricts when city changes
  useEffect(() => {
    if (!cityId) {
      setSubdistricts([]);
    }
  }, [cityId]);

  const fetchShippingCost = async (destinationCityId: string, originCityId: string = defaultOriginCityId, courier: string = 'jne') => { // origin default (e.g. Jakarta Selatan)
    if (!destinationCityId) return [];
    setIsLoadingCost(true);
    try {
      const { data, error } = await supabase.functions.invoke('rajaongkir', {
        body: {
          action: 'cost',
          origin: originCityId,
          destination: destinationCityId,
          weight: weight,
          courier: courier
        }
      });
      if (error) throw error;
      
      let results = data?.rajaongkir?.results || data?.data || [];
      if (results.length > 0) {
        if (typeof results[0].cost === 'number') {
          const grouped = results.reduce((acc: any[], curr: any) => {
            let courier = acc.find((c: any) => c.code === curr.code);
            if (!courier) {
              courier = { code: curr.code, name: curr.name, costs: [] };
              acc.push(courier);
            }
            courier.costs.push({
              service: curr.service,
              description: curr.description,
              cost: [{ value: curr.cost, etd: curr.etd || '-', note: '' }]
            });
            return acc;
          }, []);
          setShippingCosts(grouped);
          return grouped;
        } else {
          setShippingCosts(results);
          return results;
        }
      } else {
        setShippingCosts([]);
        return [];
      }
    } catch (err) {
      console.error('Failed to fetch shipping cost:', err);
      setShippingCosts([]);
      return [];
    } finally {
      setIsLoadingCost(false);
    }
  };

  return {
    provinces,
    cities,
    subdistricts,
    shippingCosts,
    isLoadingProvinces,
    isLoadingCities,
    isLoadingSubdistricts,
    isLoadingCost,
    fetchProvinces,
    fetchCities,
    fetchSubdistricts,
    fetchShippingCost,
  };
};
