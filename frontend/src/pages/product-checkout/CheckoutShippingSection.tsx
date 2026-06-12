import { useState, useEffect } from "react";
import { useShipping } from "../../hooks/useShipping";
import { MapPin, Map, Building, Truck, CheckCircle2, XCircle } from "lucide-react";
import { formatCurrency } from "../../utils/formatters";

// Courier configuration with metadata
const COURIERS = [
  { code: 'jne', name: 'JNE', color: 'red' },
  { code: 'pos', name: 'POS', color: 'orange' },
  { code: 'tiki', name: 'TIKI', color: 'blue' },
  { code: 'jnt', name: 'J&T', color: 'red' },
  { code: 'sicepat', name: 'SiCepat', color: 'yellow' },
  { code: 'anteraja', name: 'AnterAja', color: 'orange' },
  { code: 'ninja', name: 'Ninja', color: 'blue' },
  { code: 'ide', name: 'ID Express', color: 'green' },
  { code: 'lion', name: 'Lion', color: 'yellow' },
  { code: 'sap', name: 'SAP', color: 'blue' },
  { code: 'rpx', name: 'RPX', color: 'purple' },
  { code: 'wahana', name: 'Wahana', color: 'green' },
];

type CheckoutShippingSectionProps = {
  customerAddress: string;
  provinceId: string;
  cityId: string;
  subdistrictId: string;
  selectedCourier: string;
  selectedService: string;
  deliveryMethod: "shipping" | "pickup";
  loading: boolean;
  totalWeight: number; // in grams
  onChangeDeliveryMethod: (method: "shipping" | "pickup") => void;
  onChangeAddress: (value: string) => void;
  onChangeProvince: (value: string) => void;
  onChangeCity: (value: string) => void;
  onChangeSubdistrict: (value: string) => void;
  onChangeShipping: (courier: string, service: string, cost: number) => void;
};

export function CheckoutShippingSection({
  customerAddress,
  provinceId,
  cityId,
  subdistrictId,
  selectedCourier,
  selectedService,
  loading,
  deliveryMethod,
  totalWeight,
  onChangeDeliveryMethod,
  onChangeAddress,
  onChangeProvince,
  onChangeCity,
  onChangeSubdistrict,
  onChangeShipping,
}: CheckoutShippingSectionProps) {
  const {
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
  } = useShipping(provinceId, cityId, totalWeight);

  const [localCourier, setLocalCourier] = useState<string>(
    selectedCourier || "jne",
  );
  
  // Track which couriers have been checked and their availability
  const [courierAvailability, setCourierAvailability] = useState<Record<string, 'available' | 'unavailable' | 'checking'>>({});

  // Fetch provinces on mount - ONLY if shipping is selected
  useEffect(() => {
    if (deliveryMethod === 'shipping' && provinces.length === 0) {
      fetchProvinces();
    }
  }, [deliveryMethod]);

  // Fetch cities when province changes - ONLY if shipping is selected
  useEffect(() => {
    if (deliveryMethod === 'shipping' && provinceId) {
      fetchCities(provinceId);
    }
  }, [provinceId, deliveryMethod]);

  // Fetch subdistricts when city changes - ONLY if shipping is selected
  useEffect(() => {
    if (deliveryMethod === 'shipping' && cityId) {
      fetchSubdistricts(cityId);
    }
  }, [cityId, deliveryMethod]);

  // Check availability on demand (when courier clicked)
  const handleCourierSelect = async (courierCode: string) => {
    setLocalCourier(courierCode);
    
    // If already checked, just select it
    if (courierAvailability[courierCode]) {
      return;
    }
    
    // Mark as checking
    setCourierAvailability(prev => ({ ...prev, [courierCode]: 'checking' }));
    
    // Fetch to check if available
    try {
      const result = await fetchShippingCost(cityId, "153", courierCode);
      
      if (result && result.length > 0 && result[0]?.costs?.length > 0) {
        setCourierAvailability(prev => ({ ...prev, [courierCode]: 'available' }));
      } else {
        setCourierAvailability(prev => ({ ...prev, [courierCode]: 'unavailable' }));
      }
    } catch (error) {
      setCourierAvailability(prev => ({ ...prev, [courierCode]: 'unavailable' }));
    }
  };

  return (
    <div className="space-y-5 mb-8">
      <div className="flex items-center justify-between border-b border-rose-100 pb-2">
        <h2 className="text-lg font-bold text-gray-900">Delivery Method</h2>
      </div>

      <div className="flex gap-4 mb-4">
        <label
          className={`flex-1 items-center justify-center gap-2 p-4 rounded-xl border cursor-not-allowed transition-all border-gray-200 text-gray-400 bg-gray-50 hidden`}
        >
          <input
            type="radio"
            name="deliveryMethod"
            value="shipping"
            checked={deliveryMethod === "shipping"}
            onChange={() => onChangeDeliveryMethod("shipping")}
            className="hidden"
            disabled
          />
          <Truck size={20} />
          <div className="flex flex-col items-center">
            <span className="font-bold">Shipping</span>
            <span className="text-xs">Coming Soon</span>
          </div>
        </label>
        <label
          className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border cursor-pointer transition-all ${deliveryMethod === "pickup" ? "border-primary bg-primary/5 text-primary ring-1 ring-primary" : "border-gray-200 text-gray-500 hover:border-primary/50"}`}
        >
          <input
            type="radio"
            name="deliveryMethod"
            value="pickup"
            checked={deliveryMethod === "pickup"}
            onChange={() => onChangeDeliveryMethod("pickup")}
            className="hidden"
          />
          <Building size={20} />
          <span className="font-bold">Store Pickup</span>
        </label>
      </div>

      {deliveryMethod === "shipping" && (
        <>
          <div className="space-y-1.5">
            <label
              htmlFor="address"
              className="text-sm font-semibold text-neutral-950"
            >
              Full Address <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-start">
              <MapPin
                className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none"
                size={18}
              />
              <textarea
                id="address"
                value={customerAddress}
                onChange={(e) => onChangeAddress(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-rose-100 focus:ring-primary focus:border-primary text-sm py-3 pr-4 pl-11 outline-none transition-all"
                placeholder="e.g. Jl. Kenanga No. 5 RT 02/RW 03"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label
                htmlFor="province_id"
                className="text-sm font-semibold text-neutral-950"
              >
                Province <span className="text-red-500">*</span>
              </label>
              {isLoadingProvinces ? (
                <div className="text-sm text-gray-500">Loading provinces...</div>
              ) : provinces.length > 0 ? (
                <div className="relative flex items-center">
                  <Map
                    className="absolute left-3.5 text-gray-400 pointer-events-none"
                    size={18}
                  />
                  <select
                    id="province_id"
                    value={provinceId}
                    onChange={(e) => onChangeProvince(e.target.value)}
                    disabled={loading}
                    className="w-full rounded-lg border border-rose-100 focus:ring-primary focus:border-primary text-sm py-3 pr-4 pl-11 outline-none transition-all appearance-none bg-white"
                  >
                    <option value="" disabled>
                      Select Province
                    </option>
                    {provinces.map((prov) => (
                      <option key={prov.province_id} value={prov.province_id}>
                        {prov.province}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative flex items-center">
                    <Map
                      className="absolute left-3.5 text-gray-400 pointer-events-none"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="Type province name (e.g., DKI Jakarta)"
                      value={provinceId}
                      onChange={(e) => onChangeProvince(e.target.value)}
                      disabled={loading}
                      className="w-full rounded-lg border border-rose-100 focus:ring-primary focus:border-primary text-sm py-3 pr-4 pl-11 outline-none transition-all"
                    />
                  </div>
                  <p className="text-xs text-amber-600">
                    ⚠️ API quota exceeded. Please type manually.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="city_id"
                className="text-sm font-semibold text-neutral-950"
              >
                City / Regency <span className="text-red-500">*</span>
              </label>
              {isLoadingCities ? (
                <div className="text-sm text-gray-500">Loading cities...</div>
              ) : cities.length > 0 ? (
                <div className="relative flex items-center">
                  <Building
                    className="absolute left-3.5 text-gray-400 pointer-events-none"
                    size={18}
                  />
                  <select
                    id="city_id"
                    value={cityId}
                    onChange={(e) => onChangeCity(e.target.value)}
                    disabled={loading || !provinceId}
                    className="w-full rounded-lg border border-rose-100 focus:ring-primary focus:border-primary text-sm py-3 pr-4 pl-11 outline-none transition-all appearance-none bg-white"
                  >
                    <option value="" disabled>
                      {!provinceId ? "Select province first" : "Select City / Regency"}
                    </option>
                    {cities.map((city) => (
                      <option key={city.city_id} value={city.city_id}>
                        {city.type} {city.city_name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : provinceId ? (
                <div className="space-y-2">
                  <div className="relative flex items-center">
                    <Building
                      className="absolute left-3.5 text-gray-400 pointer-events-none"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="Type city name (e.g., Jakarta Selatan)"
                      value={cityId}
                      onChange={(e) => onChangeCity(e.target.value)}
                      disabled={loading}
                      className="w-full rounded-lg border border-rose-100 focus:ring-primary focus:border-primary text-sm py-3 pr-4 pl-11 outline-none transition-all"
                    />
                  </div>
                  <p className="text-xs text-amber-600">
                    ⚠️ API quota exceeded. Please type manually.
                  </p>
                </div>
              ) : (
                <div className="text-sm text-gray-400">Select province first</div>
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label
                htmlFor="subdistrict_id"
                className="text-sm font-semibold text-neutral-950"
              >
                Subdistrict <span className="text-red-500">*</span>
              </label>
              {isLoadingSubdistricts ? (
                <div className="text-sm text-gray-500">Loading subdistricts...</div>
              ) : subdistricts.length > 0 ? (
                <div className="relative flex items-center">
                  <MapPin
                    className="absolute left-3.5 text-gray-400 pointer-events-none"
                    size={18}
                  />
                  <select
                    id="subdistrict_id"
                    value={subdistrictId}
                    onChange={(e) => onChangeSubdistrict(e.target.value)}
                    disabled={loading || !cityId}
                    className="w-full rounded-lg border border-rose-100 focus:ring-primary focus:border-primary text-sm py-3 pr-4 pl-11 outline-none transition-all appearance-none bg-white"
                  >
                    <option value="" disabled>
                      {!cityId ? "Select city first" : "Select Subdistrict"}
                    </option>
                    {subdistricts.map((subdistrict) => (
                      <option
                        key={subdistrict.subdistrict_id}
                        value={subdistrict.subdistrict_id}
                      >
                        {subdistrict.subdistrict_name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : cityId ? (
                <div className="space-y-2">
                  <div className="relative flex items-center">
                    <MapPin
                      className="absolute left-3.5 text-gray-400 pointer-events-none"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="Type subdistrict name (e.g., Cilandak)"
                      value={subdistrictId}
                      onChange={(e) => onChangeSubdistrict(e.target.value)}
                      disabled={loading}
                      className="w-full rounded-lg border border-rose-100 focus:ring-primary focus:border-primary text-sm py-3 pr-4 pl-11 outline-none transition-all"
                    />
                  </div>
                  <p className="text-xs text-amber-600">
                    ⚠️ API quota exceeded. Please type manually.
                  </p>
                </div>
              ) : (
                <div className="text-sm text-gray-400">Select city first</div>
              )}
            </div>
          </div>

          {cityId && (
            <div className="space-y-3 pt-4 border-t border-rose-100">
              <h3 className="text-sm font-semibold text-neutral-950 flex items-center gap-2">
                <Truck size={18} className="text-primary" />
                Shipping Method
              </h3>

              {/* Courier Selection - Grid Layout */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-4">
                {COURIERS.map((courier) => {
                  const availability = courierAvailability[courier.code];
                  const isChecking = availability === 'checking';
                  const isAvailable = availability === 'available';
                  const isUnavailable = availability === 'unavailable';
                  const isSelected = localCourier === courier.code;
                  
                  return (
                    <button
                      key={courier.code}
                      type="button"
                      onClick={() => handleCourierSelect(courier.code)}
                      disabled={isChecking}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary"
                          : "border-gray-200 hover:border-primary/50 bg-white cursor-pointer"
                      }`}
                    >
                      <div className={`text-xs font-bold ${
                        isSelected ? "text-primary" : "text-gray-700"
                      }`}>
                        {courier.name}
                      </div>
                      
                      {/* Status indicator */}
                      {isChecking && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin bg-white" />
                      )}
                      {isAvailable && !isChecking && (
                        <CheckCircle2 size={14} className="absolute -top-1 -right-1 text-green-500 bg-white rounded-full" />
                      )}
                      {isUnavailable && !isChecking && (
                        <XCircle size={14} className="absolute -top-1 -right-1 text-red-400 bg-white rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-gray-500 italic">
                💡 Click a courier to check availability and see services
              </p>

              {isLoadingCost ? (
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  Calculating shipping cost...
                </div>
              ) : shippingCosts.length > 0 ? (
                <div className="space-y-3">
                  {shippingCosts.map((serviceGroup, index) => {
                    const costs = serviceGroup?.costs || [];
                    return costs.map((costDetail: any, idx: number) => {
                      const isSelected =
                        selectedCourier ===
                          (serviceGroup.code || serviceGroup.name) &&
                        selectedService === costDetail.service;
                      const costValue =
                        costDetail.cost?.[0]?.value ?? costDetail.value ?? 0;
                      const etd =
                        costDetail.cost?.[0]?.etd ?? costDetail.etd ?? "-";
                      return (
                        <div
                          key={`${serviceGroup.code || index}-${costDetail.service || idx}-${idx}`}
                          onClick={() =>
                            onChangeShipping(
                              serviceGroup.code ||
                                serviceGroup.name ||
                                selectedCourier,
                              costDetail.service,
                              costValue,
                            )
                          }
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-gray-200 hover:border-primary/50"}`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-bold text-gray-900">
                                {(
                                  serviceGroup.code ||
                                  serviceGroup.name ||
                                  selectedCourier
                                ).toUpperCase()}{" "}
                                - {costDetail.service}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {costDetail.description}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Estimasi: {etd} hari
                              </p>
                            </div>
                            <p className="text-sm font-bold text-primary">
                              {formatCurrency(costValue)}
                            </p>
                          </div>
                        </div>
                      );
                    });
                  })}
                </div>
              ) : localCourier && courierAvailability[localCourier] === 'unavailable' ? (
                <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="font-semibold mb-1">⚠️ {localCourier.toUpperCase()} not available</p>
                  <p className="text-xs">This courier doesn't serve your location. Please try another courier.</p>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
