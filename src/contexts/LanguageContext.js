// ─────────────────────────────────────────────────
//  LanguageContext.js
//  src/contexts/LanguageContext.js
//  Feature 8: EN / বাংলা toggle
// ─────────────────────────────────────────────────

import React, { createContext, useContext, useState } from "react";

const translations = {
  // Navbar
  browseM:        { en: "Browse Messes",       bn: "মেস খুঁজুন" },
  bookmarked:     { en: "Bookmarked",           bn: "বুকমার্ক" },
  findRoommate:   { en: "Find Roommate",        bn: "রুমমেট খুঁজুন" },
  postMess:       { en: "Post a Mess",          bn: "মেস পোস্ট করুন" },
  dashboard:      { en: "Dashboard",            bn: "ড্যাশবোর্ড" },
  logout:         { en: "Logout",               bn: "লগ আউট" },
  login:          { en: "Login with Google",    bn: "গুগল দিয়ে লগইন" },
  menu:           { en: "Menu",                 bn: "মেনু" },

  // Home
  heroTitle:      { en: "Find the perfect mess 🏠", bn: "পারফেক্ট মেস খুঁজুন 🏠" },
  heroSub:        { en: "Browse messes across every city, town, and area in Bangladesh", bn: "বাংলাদেশের প্রতিটি শহর ও এলাকায় মেস খুঁজুন" },
  searchPlaceholder:{ en: "Search by mess name, city, or area…", bn: "মেসের নাম, শহর বা এলাকা দিয়ে খুঁজুন…" },
  division:       { en: "Division",             bn: "বিভাগ" },
  allDivisions:   { en: "All Divisions",        bn: "সব বিভাগ" },
  districtCity:   { en: "District / City",      bn: "জেলা / শহর" },
  allDistricts:   { en: "All Districts",        bn: "সব জেলা" },
  area:           { en: "Area",                 bn: "এলাকা" },
  allAreas:       { en: "All Areas",            bn: "সব এলাকা" },
  rentRange:      { en: "Rent range",           bn: "ভাড়ার পরিসীমা" },
  anyPrice:       { en: "Any Price",            bn: "যেকোনো মূল্য" },
  gender:         { en: "Gender",               bn: "লিঙ্গ" },
  all:            { en: "All",                  bn: "সব" },
  male:           { en: "Male",                 bn: "পুরুষ" },
  female:         { en: "Female",              bn: "মহিলা" },
  mixed:          { en: "Mixed",               bn: "মিশ্র" },
  messesFound:    { en: "messes found",        bn: "টি মেস পাওয়া গেছে" },
  clearFilters:   { en: "Clear all filters ✕", bn: "ফিল্টার মুছুন ✕" },
  noMesses:       { en: "No messes found",     bn: "কোনো মেস পাওয়া যায়নি" },
  tryAdjusting:   { en: "Try adjusting your filters or searching a different area.", bn: "ফিল্টার পরিবর্তন করুন বা অন্য এলাকায় খুঁজুন।" },
  loading:        { en: "Loading messes…",     bn: "মেস লোড হচ্ছে…" },

  // MessCard
  seatsAvailable: { en: "seat(s) available",   bn: "টি সিট পাওয়া যাচ্ছে" },
  full:           { en: "Full",                bn: "পূর্ণ" },
  callBtn:        { en: "Call",                bn: "কল করুন" },
  viewDetails:    { en: "View details →",      bn: "বিস্তারিত দেখুন →" },
  perMonth:       { en: "/month",              bn: "/মাস" },

  // SavedMesses
  bookmarkedMesses:{ en: "Bookmarked Messes",  bn: "বুকমার্ক করা মেস" },
  bookmarkSub:    { en: "Messes you bookmarked — tap 🔖 on a listing to remove", bn: "আপনার বুকমার্ক করা মেস — সরাতে 🔖 চাপুন" },
  loginToBookmark:{ en: "Login to see bookmarks", bn: "বুকমার্ক দেখতে লগইন করুন" },
  bookmarkHint:   { en: "Bookmark messes by tapping 🔖 on any listing", bn: "যেকোনো মেসে 🔖 চাপ দিয়ে বুকমার্ক করুন" },
  noBookmarks:    { en: "No bookmarks yet",    bn: "এখনো কোনো বুকমার্ক নেই" },
  noBookmarkHint: { en: "Browse messes and tap 🔖 to save them here for later", bn: "মেস দেখুন এবং পরে দেখতে 🔖 চাপুন" },
  browseMesses:   { en: "Browse Messes",       bn: "মেস দেখুন" },

  // MessDetail
  backToListings: { en: "← Back to listings", bn: "← তালিকায় ফিরুন" },
  facilities:     { en: "Facilities",          bn: "সুবিধাসমূহ" },
  aboutMess:      { en: "About this mess",     bn: "এই মেস সম্পর্কে" },
  address:        { en: "Address",             bn: "ঠিকানা" },
  interested:     { en: "Interested in this mess?", bn: "এই মেসে আগ্রহী?" },
  contactOwner:   { en: "Contact the owner directly on WhatsApp", bn: "সরাসরি WhatsApp-এ মালিকের সাথে যোগাযোগ করুন" },
  whatsapp:       { en: "💬 WhatsApp the owner", bn: "💬 মালিককে WhatsApp করুন" },
  callOwner:      { en: "📞 Call owner",        bn: "📞 মালিককে কল করুন" },
  reviews:        { en: "Reviews",             bn: "রিভিউ" },
  noReviews:      { en: "No reviews yet. Be the first to review!", bn: "এখনো কোনো রিভিউ নেই। প্রথম রিভিউ দিন!" },
  writeReview:    { en: "Write a review",      bn: "রিভিউ লিখুন" },
  reviewPlaceholder:{ en: "Share your experience with this mess…", bn: "এই মেসে আপনার অভিজ্ঞতা শেয়ার করুন…" },
  submitReview:   { en: "Submit review",       bn: "রিভিউ জমা দিন" },
  submitting:     { en: "Submitting…",         bn: "জমা হচ্ছে…" },
  loginToReview:  { en: "Login to write a review.", bn: "রিভিউ লিখতে লগইন করুন।" },
  helpful:        { en: "Helpful",             bn: "সহায়ক" },
  // Rating categories
  cleanliness:    { en: "Cleanliness",         bn: "পরিষ্কার-পরিচ্ছন্নতা" },
  waterSupply:    { en: "Water Supply",        bn: "পানি সরবরাহ" },
  ownerBehaviour: { en: "Owner Behaviour",     bn: "মালিকের আচরণ" },
  security:       { en: "Security",            bn: "নিরাপত্তা" },
  valueForMoney:  { en: "Value for Money",     bn: "মূল্য অনুযায়ী সুবিধা" },
  // Dashboard
  ownerDashboard: { en: "Owner Dashboard",     bn: "মালিকের ড্যাশবোর্ড" },
  totalListings:  { en: "Total Listings",      bn: "মোট তালিকা" },
  totalSeats:     { en: "Total Available Seats", bn: "মোট উপলব্ধ সিট" },
  totalViews:     { en: "Total Views",         bn: "মোট ভিউ" },
  totalWhatsApp:  { en: "WhatsApp Clicks",     bn: "WhatsApp ক্লিক" },
  totalSaves:     { en: "Total Bookmarks",     bn: "মোট বুকমার্ক" },
  postNewMess:    { en: "+ Post New Mess",     bn: "+ নতুন মেস পোস্ট করুন" },
  // Bottom nav
  home:           { en: "Home",               bn: "হোম" },
  search:         { en: "Search",             bn: "খুঁজুন" },
  post:           { en: "Post",               bn: "পোস্ট" },
  saved:          { en: "Saved",              bn: "সংরক্ষিত" },
  profile:        { en: "Profile",            bn: "প্রোফাইল" },
};

const LanguageContext = createContext();

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("en"); // "en" | "bn"

  function t(key) {
    return translations[key]?.[lang] ?? translations[key]?.en ?? key;
  }

  function toggleLang() {
    setLang(l => l === "en" ? "bn" : "en");
  }

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
