import { useState } from "react";
import { MapPin, Package, Truck } from "lucide-react";
import { formatCurrency } from "../../utils/formatters";

// US shipping options with flat rates (can be replaced with EasyPost API later)
const US_SHIPPING_OPTIONS = [
  {
    courier: "usps",
    service: "USPS Priority Mail",
    description: "2-3 business days",
    cost: 8.99,
    icon: "🇺🇸",
  },
  {
    courier: "usps",
    service: "USPS Ground Advantage",
    description: "2-5 business days",
    cost: 5.99,
    icon: "📦",
  },
  {
    courier: "ups",
    service: "UPS Ground",
    description: "1-5 business days",
    cost: 9.99,
    icon: "🟤",
  },
  {
    courier: "ups",
    service: "UPS 2nd Day Air",
    description: "2 business days",
    cost: 18.99,
    icon: "✈️",
  },
  {
    courier: "fedex",
    service: "FedEx Home Delivery",
    description: "1-5 business days",
    cost: 10.99,
    icon: "🟣",
  },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS",
  "KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY",
  "NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV",
  "WI","WY","DC",
];

type CheckoutShippingSectionProps = {
  customerAddress: string;
  provinceId: string;   // re-used as state code (e.g., "CA")
  cityId: string;       // re-used as city
  subdistrictId: string; // re-used as zip code
  selectedCourier: string;
  selectedService: string;
  deliveryMethod: "shipping" | "pickup";
  loading: boolean;
  totalWeight: number;
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
  selectedService,
  loading,
  deliveryMethod,
  onChangeDeliveryMethod,
  onChangeAddress,
  onChangeProvince,
  onChangeCity,
  onChangeSubdistrict,
  onChangeShipping,
}: CheckoutShippingSectionProps) {
  const [selectedOption, setSelectedOption] = useState<string>(selectedService || "");

  const handleSelectShipping = (option: typeof US_SHIPPING_OPTIONS[0]) => {
    setSelectedOption(option.service);
    onChangeShipping(option.courier, option.service, option.cost);
  };

  return (
    <div className="mt-6">
      <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" />
        Delivery Method
      </h3>

      {/* Pickup vs Ship toggle */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => onChangeDeliveryMethod("pickup")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
            deliveryMethod === "pickup"
              ? "border-primary bg-primary/5 text-primary"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          <Package className="w-4 h-4" />
          In-Store Pickup
        </button>
        <button
          type="button"
          onClick={() => onChangeDeliveryMethod("shipping")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
            deliveryMethod === "shipping"
              ? "border-primary bg-primary/5 text-primary"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          <Truck className="w-4 h-4" />
          Ship to Me
        </button>
      </div>

      {/* Pickup info */}
      {deliveryMethod === "pickup" && (
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">📍 Pick up at our US office</p>
          <p className="text-xs text-blue-600">
            You'll receive a pickup code in your order confirmation email. Show it at the counter to collect your items.
          </p>
        </div>
      )}

      {/* Shipping address form */}
      {deliveryMethod === "shipping" && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Street Address
            </label>
            <input
              type="text"
              value={customerAddress}
              onChange={(e) => onChangeAddress(e.target.value)}
              placeholder="123 Main St, Apt 4B"
              disabled={loading}
              className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:border-primary outline-none disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                City
              </label>
              <input
                type="text"
                value={cityId}
                onChange={(e) => onChangeCity(e.target.value)}
                placeholder="Los Angeles"
                disabled={loading}
                className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:border-primary outline-none disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                State
              </label>
              <select
                value={provinceId}
                onChange={(e) => onChangeProvince(e.target.value)}
                disabled={loading}
                className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:border-primary outline-none disabled:opacity-50 bg-white"
              >
                <option value="">Select State</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              ZIP Code
            </label>
            <input
              type="text"
              value={subdistrictId}
              onChange={(e) => onChangeSubdistrict(e.target.value)}
              placeholder="90001"
              maxLength={10}
              disabled={loading}
              className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:border-primary outline-none disabled:opacity-50"
            />
          </div>

          {/* Shipping option selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
              Choose Shipping Method
            </label>
            <div className="space-y-2">
              {US_SHIPPING_OPTIONS.map((opt) => (
                <button
                  key={opt.service}
                  type="button"
                  onClick={() => handleSelectShipping(opt)}
                  disabled={loading}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm transition-all disabled:opacity-50 ${
                    selectedOption === opt.service
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{opt.icon}</span>
                    <div className="text-left">
                      <p className="font-semibold text-gray-800">{opt.service}</p>
                      <p className="text-xs text-gray-500">{opt.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatCurrency(opt.cost)}</p>
                    {selectedOption === opt.service && (
                      <span className="text-[10px] text-primary font-bold">✓ Selected</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
