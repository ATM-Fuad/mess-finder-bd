// ─────────────────────────────────────────────────
//  Skeleton.js  —  src/components/Skeleton.js
//  Reusable skeleton loaders for every page.
//  Zero ESLint errors — no unused vars.
// ─────────────────────────────────────────────────

import React from "react";

// ── Base shimmer block ────────────────────────────
function Block({ className }) {
  return <div className={`skeleton ${className}`} />;
}

// ── Mess card skeleton ────────────────────────────
export function MessCardSkeleton() {
  return (
    <div className="bg-white rounded-3xl border border-[#E8E8E4] shadow-card overflow-hidden">
      {/* Photo area */}
      <Block className="h-60 w-full rounded-none" />
      {/* Body */}
      <div className="p-4 space-y-3">
        <Block className="h-5 w-3/4 rounded-xl" />
        <Block className="h-3.5 w-1/2 rounded-xl" />
        {/* Facility pills */}
        <div className="flex gap-2 pt-1">
          <Block className="h-6 w-14 rounded-full" />
          <Block className="h-6 w-14 rounded-full" />
          <Block className="h-6 w-14 rounded-full" />
        </div>
        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-[#E8E8E4]">
          <Block className="h-6 w-20 rounded-xl" />
          <Block className="h-4 w-16 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ── Grid of mess card skeletons ───────────────────
export function MessGridSkeleton({ count }) {
  const total = count || 6;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: total }).map((_, i) => (
        <MessCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ── Mess detail page skeleton ─────────────────────
export function DetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      {/* Back link */}
      <Block className="h-4 w-28 rounded-xl" />
      {/* Hero photo */}
      <Block className="h-72 w-full rounded-3xl" />
      {/* Main info card */}
      <div className="bg-white rounded-3xl p-6 space-y-4 border border-[#E8E8E4] shadow-card">
        <Block className="h-7 w-2/3 rounded-xl" />
        <Block className="h-4 w-1/2 rounded-xl" />
        <div className="flex gap-2">
          <Block className="h-8 w-28 rounded-full" />
          <Block className="h-8 w-24 rounded-full" />
        </div>
        <div className="border-t border-[#E8E8E4] pt-4">
          <Block className="h-9 w-36 rounded-xl" />
        </div>
      </div>
      {/* Facilities card */}
      <div className="bg-white rounded-3xl p-6 space-y-4 border border-[#E8E8E4] shadow-card">
        <Block className="h-5 w-28 rounded-xl" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Block key={i} className="h-12 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Dashboard skeleton ────────────────────────────
export function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-3xl p-5 border border-[#E8E8E4] shadow-card">
            <Block className="h-8 w-8 rounded-2xl mb-3" />
            <Block className="h-8 w-16 rounded-xl mb-2" />
            <Block className="h-3 w-24 rounded-xl" />
          </div>
        ))}
      </div>
      {/* Listing rows */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-3xl p-5 border border-[#E8E8E4] shadow-card">
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1 mr-4">
              <Block className="h-5 w-1/3 rounded-xl" />
              <Block className="h-3.5 w-1/2 rounded-xl" />
              <Block className="h-3 w-2/3 rounded-xl" />
            </div>
            <div className="flex gap-2 items-center shrink-0">
              <Block className="h-8 w-16 rounded-xl" />
              <Block className="h-8 w-16 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Roommate card skeleton ────────────────────────
export function RoommateCardSkeleton() {
  return (
    <div className="bg-white rounded-3xl border border-[#E8E8E4] shadow-card overflow-hidden">
      <Block className="h-48 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Block className="h-7 w-7 rounded-full" />
          <Block className="h-4 w-32 rounded-xl" />
        </div>
        <Block className="h-3.5 w-24 rounded-xl" />
        <div className="flex gap-2">
          <Block className="h-6 w-20 rounded-full" />
          <Block className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ── Notifications skeleton ────────────────────────
export function NotificationsSkeleton() {
  return (
    <div className="space-y-3 animate-fade-in">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-3xl p-5 border border-[#E8E8E4] shadow-card">
          <div className="flex items-start gap-3">
            <Block className="h-10 w-10 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Block className="h-4 w-1/2 rounded-xl" />
              <Block className="h-3 w-3/4 rounded-xl" />
              <Block className="h-3 w-1/3 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Recently viewed skeleton ──────────────────────
export function RecentlyViewedSkeleton() {
  return (
    <div className="mb-8">
      <Block className="h-4 w-36 rounded-xl mb-3" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-40 bg-white rounded-2xl border border-[#E8E8E4] overflow-hidden">
            <Block className="h-24 w-full rounded-none" />
            <div className="p-2.5 space-y-1.5">
              <Block className="h-3.5 w-full rounded-lg" />
              <Block className="h-3 w-2/3 rounded-lg" />
              <Block className="h-4 w-1/2 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
