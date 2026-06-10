// ─────────────────────────────────────────────────
//  banglaMap.js
//  src/utils/banglaMap.js
//
//  Bidirectional Bangla ↔ English mapping for
//  common area names, cities, and districts used
//  in MessFinder BD.
//
//  When a user types in Bangla (e.g. "বিনোদপুর"),
//  normalizeSearch() returns all possible English
//  equivalents to match against Firestore data.
// ─────────────────────────────────────────────────

// Bangla → English mapping
const BANGLA_TO_ENGLISH = {
  // ── Divisions ──────────────────────────────────
  "ঢাকা":          ["Dhaka"],
  "রাজশাহী":       ["Rajshahi"],
  "ময়মনসিংহ":     ["Mymensingh"],
  "চট্টগ্রাম":     ["Chittagong"],
  "সিলেট":         ["Sylhet"],
  "খুলনা":         ["Khulna"],
  "বরিশাল":        ["Barisal"],
  "রংপুর":         ["Rangpur"],

  // ── Dhaka areas ────────────────────────────────
  "মিরপুর":        ["Mirpur"],
  "ফার্মগেট":      ["Farmgate"],
  "বসুন্ধরা":      ["Bashundhara"],
  "উত্তরা":        ["Uttara"],
  "মোহাম্মদপুর":   ["Mohammadpur"],
  "ধানমন্ডি":      ["Dhanmondi"],
  "বাড্ডা":        ["Badda"],
  "মহাখালী":       ["Mohakhali"],
  "তেজগাঁও":       ["Tejgaon"],
  "রামপুরা":       ["Rampura"],
  "বনশ্রী":        ["Banasree"],
  "খিলগাঁও":       ["Khilgaon"],
  "সাভার":         ["Savar"],
  "আশুলিয়া":      ["Ashulia"],
  "গাজীপুর":       ["Gazipur"],
  "টঙ্গী":         ["Tongi"],
  "নারায়ণগঞ্জ":   ["Narayanganj"],

  // ── Rajshahi areas ─────────────────────────────
  "বিনোদপুর":      ["Binodpur"],
  "কাজলা":         ["Kazla"],
  "তালাইমারী":     ["Talaimari"],
  "মতিহার":        ["Motihar"],
  "সপুরা":         ["Sopura"],
  "নিউ মার্কেট":   ["New Market"],
  "উপশহর":         ["Upashahar"],
  "রাজপাড়া":      ["Rajpara"],
  "বোয়ালিয়া":     ["Boalia"],
  "শাহেব বাজার":   ["Shaheb Bazar"],
  "পুঠিয়া":        ["Puthia"],
  "নাটোর":         ["Natore"],

  // ── Mymensingh areas ───────────────────────────
  "শেষ মোড়":       ["Sesh Mor"],
  "পাটগুদাম":      ["Patgudam"],
  "কেওয়াটখালী":   ["Kewatkhali"],
  "বাইপাস":        ["Bypass"],
  "নেত্রকোণা":     ["Netrokona"],
  "জামালপুর":      ["Jamalpur"],

  // ── Chittagong areas ───────────────────────────
  "চকবাজার":       ["Chawkbazar"],
  "হালিশহর":       ["Halishahar"],
  "নাসিরাবাদ":     ["Nasirabad"],
  "আগ্রাবাদ":      ["Agrabad"],
  "পাহাড়তলী":     ["Pahartali"],
  "মুরাদপুর":      ["Muradpur"],
  "হাটহাজারী":     ["Hathazari"],

  // ── Sylhet areas ───────────────────────────────
  "জিন্দাবাজার":   ["Zindabazar"],
  "সুবিদবাজার":    ["Subidbazar"],
  "শিবগঞ্জ":       ["Shibganj"],
  "তিলাগড়":       ["Tilagarh"],
  "আখালিয়া":      ["Akhalia"],
  "আম্বরখানা":     ["Ambarkhana"],
  "মৌলভীবাজার":   ["Moulvibazar"],

  // ── Khulna areas ───────────────────────────────
  "সোনাডাঙ্গা":    ["Sonadanga"],
  "বয়রা":          ["Boyra"],
  "খালিশপুর":      ["Khalishpur"],
  "রূপসা":         ["Rupsha"],
  "দৌলতপুর":       ["Daulatpur"],
  "যশোর":          ["Jessore"],

  // ── Barisal areas ──────────────────────────────
  "নথুল্লাবাদ":    ["Natullabad"],
  "রূপাতলী":       ["Rupatali"],
  "পটুয়াখালী":    ["Patuakhali"],

  // ── Rangpur areas ──────────────────────────────
  "মডার্ন মোড়":   ["Modern More"],
  "লালবাগ":        ["Lalbag"],
  "দিনাজপুর":      ["Dinajpur"],
  "কুড়িগ্রাম":    ["Kurigram"],

  // ── Common mess/housing words ──────────────────
  "মেস":           ["mess", "Mess"],
  "হোস্টেল":       ["hostel", "Hostel"],
  "বাড়ি":          ["house", "House", "home"],
  "ঘর":            ["room", "Room"],
  "সিট":           ["seat", "Seat"],
  "ভাড়া":          ["rent", "Rent"],
  "পুরুষ":         ["male", "Male"],
  "মহিলা":         ["female", "Female"],
  "সাশ্রয়ী":      ["affordable", "cheap"],
};

// Build reverse map: English → Bangla for display hints
const ENGLISH_TO_BANGLA = {};
Object.entries(BANGLA_TO_ENGLISH).forEach(([bn, enList]) => {
  enList.forEach(en => {
    ENGLISH_TO_BANGLA[en.toLowerCase()] = bn;
  });
});

/**
 * normalizeSearch(query)
 *
 * Given any search query (Bangla or English),
 * returns an array of strings to match against.
 *
 * Example:
 *   normalizeSearch("বিনোদপুর") → ["বিনোদপুর", "Binodpur", "binodpur"]
 *   normalizeSearch("Binodpur") → ["Binodpur", "binodpur", "বিনোদপুর"]
 *   normalizeSearch("mess")     → ["mess", "মেস"]
 */
export function normalizeSearch(query) {
  if (!query?.trim()) return [];

  const q       = query.trim();
  const qLower  = q.toLowerCase();
  const results = new Set([q, qLower]);

  // If Bangla input → add English equivalents
  if (BANGLA_TO_ENGLISH[q]) {
    BANGLA_TO_ENGLISH[q].forEach(en => {
      results.add(en);
      results.add(en.toLowerCase());
    });
  }

  // Partial Bangla match — check if query is contained in any key
  Object.entries(BANGLA_TO_ENGLISH).forEach(([bn, enList]) => {
    if (bn.includes(q) || q.includes(bn)) {
      enList.forEach(en => {
        results.add(en);
        results.add(en.toLowerCase());
      });
    }
  });

  // If English input → add Bangla equivalent
  if (ENGLISH_TO_BANGLA[qLower]) {
    results.add(ENGLISH_TO_BANGLA[qLower]);
  }

  // Partial English match
  Object.entries(ENGLISH_TO_BANGLA).forEach(([en, bn]) => {
    if (en.includes(qLower) || qLower.includes(en)) {
      results.add(bn);
      results.add(en);
    }
  });

  return [...results];
}

/**
 * isBangla(text)
 * Returns true if text contains Bangla Unicode characters.
 */
export function isBangla(text) {
  return /[\u0980-\u09FF]/.test(text);
}

/**
 * getBanglaSuggestion(englishText)
 * Returns Bangla equivalent for display hint.
 */
export function getBanglaSuggestion(englishText) {
  return ENGLISH_TO_BANGLA[englishText?.toLowerCase()] ?? null;
}
