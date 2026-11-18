# सरपंच जीतो · मध्य प्रदेश (Sarpanch Jeeto MP — `S12`)

**Latest Build & APK Release:** `v2.0` (`Nov 18, 2026`)  
**Direct Android APK Download (2.9 MB, v1+v2+v3 Signed):**  
👉 [**Download SarpanchJeeto-MP-v1.0.apk (Latest Release)**](https://github.com/varchasvaateeksh77-ui/sarpanch-jeeto-mp-app/releases/download/v1.0.0/SarpanchJeeto-MP-v1.0.apk)

---

## Key Capabilities
1. **Dedicated Booth Roll Manager (`#rolls` — मतदाता सूची व बूथ रोल प्रबंधक)**:
   - View all currently downloaded/active polling booth rolls (`भाग संख्या #1..N`) for your Gram Panchayat with exact **Total / Male / Female** voter counts, direct **असली PDF ↗** links, and 1-tap booth removal.
   - Browse & search all 250–320+ official ECI booths in the Assembly Constituency, select **any number of additional booths (`#5, #6, #7, #10...`)**, and download/merge them via Live ECI CAPTCHA or local `.pdf` import.
   - Every change automatically recalculates and updates the entire app (Home Dashboard, Parivar list, Vanshavali, Poll Day, and Parchi slips) and persists in **Dual-Tier `IndexedDB + LocalStorage`**.
2. **Zero 4-Booth Limit (Unlimited `N` Booths per Gram Panchayat)**:
   - Supports Gram Panchayats with **1, 4, 6, 8, 12, or 20+ polling booths** with exact per-booth voter slicing.
3. **On-Device ECI `-WI.pdf` Binary `DCTDecode` JPEG Stream Extractor (`src/utils/eciPdfExtractor.ts`)**:
   - Extracts raw `1239 × 1754` JPEG streams (`Page 1` Cover, `Page 2` Nazri Naksha/Map, `Pages 3..N-1` `3×10 = 30` Voter Cards Grid, `Page N` Summary Table) in `<20ms`.
4. **All 55 Madhya Pradesh Districts (`S12`) · 230 Assembly Constituencies · 72,036 Official ECI Polling Booths**:
   - 100% offline-capable in the standalone Android APK (`https://appassets.androidplatform.net`).
