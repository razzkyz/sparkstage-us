# Courier Options - RajaOngkir Integration

## Available Couriers

Aplikasi sekarang mendukung 12 ekspedisi yang tersedia di RajaOngkir:

### 1. **JNE** (Jalur Nugraha Ekakurir)
- Code: `jne`
- Layanan: YES, REG, OKE, JTR, dan lainnya
- Coverage: Seluruh Indonesia
- Populer untuk: E-commerce, dokumen, paket kecil-besar

### 2. **POS Indonesia**
- Code: `pos`
- Layanan: Pos Kilat Khusus, Express Next Day, Paket Kilat Khusus
- Coverage: Seluruh Indonesia (hingga pelosok)
- Populer untuk: Dokumen pemerintah, paket standar

### 3. **TIKI** (Titipan Kilat)
- Code: `tiki`
- Layanan: ONS, REG, ECO, SDS
- Coverage: Seluruh Indonesia
- Populer untuk: Dokumen, paket retail

### 4. **J&T Express**
- Code: `jnt`
- Layanan: EZ, REG
- Coverage: Seluruh Indonesia
- Populer untuk: E-commerce, COD

### 5. **SiCepat Express**
- Code: `sicepat`
- Layanan: BEST, REG, SIUNTUNG, GOKIL
- Coverage: Seluruh Indonesia
- Populer untuk: E-commerce, paket cepat

### 6. **AnterAja**
- Code: `anteraja`
- Layanan: Regular, Next Day, Same Day
- Coverage: Jawa, Sumatera, Bali
- Populer untuk: E-commerce modern

### 7. **Ninja Express**
- Code: `ninja`
- Layanan: Standard, Next Day
- Coverage: Jawa, Sumatera, Kalimantan
- Populer untuk: E-commerce, marketplace

### 8. **ID Express**
- Code: `ide`
- Layanan: Paket Kilat Khusus
- Coverage: Seluruh Indonesia
- Populer untuk: Paket besar, kargo

### 9. **Lion Parcel**
- Code: `lion`
- Layanan: REG, ONEPACK, REGPACK
- Coverage: Seluruh Indonesia
- Populer untuk: Paket sedang-besar

### 10. **SAP Express**
- Code: `sap`
- Layanan: REG, OKE
- Coverage: Seluruh Indonesia
- Populer untuk: Paket retail

### 11. **RPX** (RPX Holding)
- Code: `rpx`
- Layanan: Next Day, SDS
- Coverage: Jawa, Bali, Sumatera
- Populer untuk: Paket e-commerce

### 12. **Wahana**
- Code: `wahana`
- Layanan: Express
- Coverage: Seluruh Indonesia
- Populer untuk: Paket standar

## Implementation

### UI Design
- Grid layout: 3 kolom mobile, 4 kolom tablet, 6 kolom desktop
- Visual feedback: Border dan background color changes saat selected
- Icon-based: Nama ekspedisi ditampilkan dalam box
- Responsive: Otomatis adjust layout based on screen size

### User Flow
1. User memilih provinsi, kota, kecamatan
2. Grid ekspedisi muncul (12 options)
3. User klik ekspedisi yang diinginkan
4. System fetch shipping costs untuk ekspedisi tersebut
5. List layanan (REG, YES, dll) muncul dengan harga
6. User pilih layanan yang sesuai
7. Proceed to payment

### Technical Details

#### Request to RajaOngkir API:
```javascript
{
  action: 'cost',
  origin: '153',           // Jakarta Selatan
  destination: cityId,      // User's city
  weight: totalWeight,      // in grams
  courier: 'jne'           // selected courier
}
```

#### Response Format:
```javascript
{
  rajaongkir: {
    results: [
      {
        code: 'jne',
        name: 'JNE',
        costs: [
          {
            service: 'REG',
            description: 'Layanan Reguler',
            cost: [
              {
                value: 15000,
                etd: '2-3',
                note: ''
              }
            ]
          }
          // ... more services
        ]
      }
    ]
  }
}
```

## API Limitations

### RajaOngkir Starter vs Pro vs Enterprise:
- **Starter**: JNE, POS, TIKI only
- **Pro**: All couriers available
- **Enterprise**: All couriers + subdistrict data

**Current Plan**: Enterprise ✅

### Rate Limits:
- **Daily Limit**: Depends on plan
- **Mitigated by**: 7-day caching for province/city/district data
- **Cost API**: Not cached (needs real-time pricing)

## UX Considerations

### Why Grid Layout?
- **More options visible**: Users can see all couriers at once
- **Easier scanning**: Visual comparison without scrolling
- **Mobile-friendly**: 3 columns fits well on mobile screens

### Why 12 Couriers?
- **Coverage**: Different couriers have different coverage areas
- **Price comparison**: Users can find cheapest option
- **Preference**: Some users prefer specific couriers
- **Availability**: Not all couriers serve all areas

### Performance Optimization
1. **Sequential loading**: Only fetch cost when courier selected
2. **Visual feedback**: Immediate UI response on selection
3. **Error handling**: Graceful fallback if courier unavailable
4. **Loading states**: Clear indication when fetching data

## Testing Checklist

### Functional Tests:
- [ ] All 12 courier buttons render correctly
- [ ] Clicking courier triggers API call
- [ ] Loading indicator shows during fetch
- [ ] Services display with correct prices
- [ ] Selected service highlights correctly
- [ ] Shipping cost updates in summary
- [ ] Data persists through checkout flow

### Edge Cases:
- [ ] Courier not available for destination
- [ ] API timeout handling
- [ ] No services returned
- [ ] Network error handling
- [ ] Multiple rapid clicks on different couriers

### Responsive Tests:
- [ ] Mobile (320px-640px): 3 columns
- [ ] Tablet (641px-1024px): 4 columns
- [ ] Desktop (1025px+): 6 columns
- [ ] Text doesn't overflow on small screens
- [ ] Touch targets adequate (min 44x44px)

## Future Enhancements

### Possible Additions:
1. **Courier Logos**: Add actual logo images
2. **Courier Info**: Tooltips with coverage info
3. **Price Range Filter**: Show price range before selection
4. **Favorites**: Save preferred couriers
5. **Comparison Mode**: Side-by-side comparison
6. **Real-time Tracking**: Integration with courier APIs
7. **Insurance Options**: Add insurance to shipment
8. **Pickup Schedule**: Schedule pickup time

### Known Limitations:
1. **Same-day delivery**: Not all couriers support
2. **COD**: Cash on Delivery not implemented yet
3. **Insurance**: Not integrated
4. **Tracking**: No real-time tracking yet
5. **Pickup points**: No pickup point selection

## Support & Troubleshooting

### Common Issues:

**Issue**: "Could not find shipping costs"
**Cause**: Courier tidak melayani area tujuan
**Solution**: Coba ekspedisi lain

**Issue**: Loading tidak selesai
**Cause**: API timeout atau network error
**Solution**: Refresh page, coba lagi

**Issue**: Harga terlalu mahal
**Cause**: Jarak jauh atau berat paket besar
**Solution**: Pilih ekspedisi dengan layanan ekonomis (OKE, ECO, REG)

### Contact Support:
- RajaOngkir API issues: Check Supabase logs
- UI issues: Check browser console
- Performance issues: Check network tab

## References
- RajaOngkir API Docs: https://rajaongkir.komerce.id/documentation
- Courier Coverage Map: [Internal docs or external link]
- Pricing Guidelines: [Link to pricing info]

---

**Last Updated**: 2026-06-08
**Status**: Production Ready ✅
**Total Couriers**: 12
**Coverage**: Nationwide 🇮🇩
