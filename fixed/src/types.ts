/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface OUIEntry {
  oui: string; // The 6-character hex prefix (uppercase, e.g. "001A2B" or "00:1A:2B")
  vendor: string;
  manufacturer?: string;
  country?: string;
  address?: string;
  orgType?: string;
  description?: string;
  logoUrl?: string;
}

export interface LookupResult {
  mac: string;
  oui: string;
  vendor: string;
  manufacturer: string;
  country: string;
  address: string;
  orgType: string;
  description: string;
  macType: 'Unicast' | 'Multicast' | 'Broadcast';
  adminType: 'UAA (Universally Administered)' | 'LAA (Locally Administered)';
  vmType: string | null; // e.g. "Docker", "VMware", "VirtualBox", "Hyper-V", or null
  databaseMatch: 'Local Database' | 'Live API' | 'Cached Result' | 'Unresolved';
  confidenceScore: number; // 0-100 percentage
  logoText: string; // Letter code for vendor icon fallback
  timestamp: string;
  aiAnalysis?: string; // Gemini-generated rich description and context
}

export interface SearchHistoryItem {
  id: string;
  mac: string;
  vendor: string;
  timestamp: string;
  databaseMatch: string;
  isFavorite: boolean;
}

export interface AppSettings {
  theme: 'cyber-dark' | 'neon-light' | 'stealth-gray';
  animationSpeed: 'normal' | 'fast' | 'slow';
  fontSize: 'sm' | 'md' | 'lg';
  notificationsEnabled: boolean;
  soundEnabled: boolean;
}

export interface SearchStats {
  totalSearches: number;
  localMatches: number;
  liveMatches: number;
  failedMatches: number;
  vendorCounts: Record<string, number>;
  countryCounts: Record<string, number>;
  macTypeCounts: Record<string, number>;
  searchHistory: SearchHistoryItem[];
}
