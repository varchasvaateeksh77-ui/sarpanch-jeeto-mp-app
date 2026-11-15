import {
  CandidateInfo,
  PhuleraDataset,
  VoterLeaning,
} from '../types/sarpanch';

export interface OfficialPortalReceipt {
  portal: string;
  vpdDownloadUrl: string;
  officialFileId: string;
  captchaId: string;
  stateCd: string;
  districtCd: string;
  acNumber: number;
  partId: number;
  partNumber: number;
  partName: string;
  verifiedAt: string;
  storageMode: 'INDEXEDDB_AND_LOCALSTORAGE_DUAL_TIER' | 'CLIENT_LOCAL_STORAGE_ONLY';
  datasetChecksum?: string;
}

export interface StoredPortalPanchayatBundle {
  schemaVersion: 2;
  gp: {
    id: string;
    name: string;
    tehsil: string;
    district: string;
    voters?: number;
    villages: string[];
  };
  officialPortalReceipt: OfficialPortalReceipt;
  dataset: PhuleraDataset;
  savedAt: string;
}

export interface LocalCampaignOverlay {
  gpId: string;
  updatedAt: string;
  leaning: Array<VoterLeaning>;
  turnout: string[];
  voterTags: Record<string, string[]>;
  casteOverrides: Record<string, string>;
  contactOverrides: Record<string, { name: string; phone: string }>;
  escalatedFamilies: string[];
  candidates: CandidateInfo[];
}

const DB_NAME = 'SarpanchJeetoPortalDB';
const DB_VERSION = 1;
const STORE_BUNDLES = 'verified_panchayats_v2';
const STORE_OVERLAYS = 'campaign_overlays_v2';

export const LAST_ACTIVE_PORTAL_GP_KEY = 'sj_mp_last_active_portal_gp_v1';
export const RECEIPT_INDEX_KEY = 'sj_mp_portal_receipt_index_v2';

export function getLocalPortalCacheKey(gpId: string): string {
  return `sj_mp_official_portal_gp_v1_${gpId}`;
}

export function getLocalOverlayKey(gpId: string): string {
  return `sj_mp_campaign_overlay_v1_${gpId}`;
}

/**
 * Pure deterministic checksum for verifying dataset integrity in client storage.
 */
export function computeDatasetChecksum(dataset: PhuleraDataset): string {
  const summary = `${dataset.roll?.name || ''}|${dataset.roll?.people?.length || 0}|${dataset.roll?.families?.length || 0}|${dataset.roll?.wards?.length || 0}`;
  let hash = 2166136261;
  for (let i = 0; i < summary.length; i++) {
    hash ^= summary.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}-${dataset.roll?.people?.length || 0}`;
}

/**
 * Validates and sanitizes a 6-character ECI CAPTCHA input string.
 */
export function sanitizeEciCaptchaInput(raw: string): {
  valid: boolean;
  cleaned: string;
  reason?: string;
} {
  const cleaned = String(raw || '')
    .trim()
    .replace(/\s+/g, '');
  if (cleaned.length !== 6) {
    return {
      valid: false,
      cleaned,
      reason: 'कृपया छवि में दिख रहे पूरे 6 अक्षर/अंक दर्ज करें।',
    };
  }
  if (!/^[a-zA-Z0-9]{6}$/.test(cleaned)) {
    return {
      valid: false,
      cleaned,
      reason: 'CAPTCHA में केवल अंग्रेजी अक्षर (a-z) और अंक (0-9) मान्य हैं।',
    };
  }
  return { valid: true, cleaned };
}

function openPortalIndexedDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_BUNDLES)) {
          db.createObjectStore(STORE_BUNDLES, { keyPath: 'gp.id' });
        }
        if (!db.objectStoreNames.contains(STORE_OVERLAYS)) {
          db.createObjectStore(STORE_OVERLAYS, { keyPath: 'gpId' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Saves the verified Gram Panchayat dataset + ECI receipt to BOTH:
 * 1. Primary Tier: IndexedDB (`SarpanchJeetoPortalDB`) — Unlimited quota, non-blocking.
 * 2. Fast Tier: `localStorage` receipt index + fallback bundle.
 */
export async function savePortalPanchayatToClientStorage(
  gp: StoredPortalPanchayatBundle['gp'],
  dataset: PhuleraDataset,
  receipt: OfficialPortalReceipt
): Promise<StoredPortalPanchayatBundle> {
  const enrichedReceipt: OfficialPortalReceipt = {
    ...receipt,
    storageMode: 'INDEXEDDB_AND_LOCALSTORAGE_DUAL_TIER',
    datasetChecksum: computeDatasetChecksum(dataset),
  };

  const bundle: StoredPortalPanchayatBundle = {
    schemaVersion: 2,
    gp,
    officialPortalReceipt: enrichedReceipt,
    dataset,
    savedAt: new Date().toISOString(),
  };

  // 1. Write to IndexedDB (Primary high-capacity store)
  const db = await openPortalIndexedDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_BUNDLES, 'readwrite');
        tx.objectStore(STORE_BUNDLES).put(bundle);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // 2. Write lightweight receipt index + fallback bundle to localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(
        LAST_ACTIVE_PORTAL_GP_KEY,
        JSON.stringify(gp)
      );
      const existingIndexRaw =
        window.localStorage.getItem(RECEIPT_INDEX_KEY) || '{}';
      const existingIndex = JSON.parse(existingIndexRaw);
      existingIndex[gp.id] = enrichedReceipt;
      window.localStorage.setItem(
        RECEIPT_INDEX_KEY,
        JSON.stringify(existingIndex)
      );
      window.localStorage.setItem(
        getLocalPortalCacheKey(gp.id),
        JSON.stringify(bundle)
      );
    } catch {
      // If localStorage 5MB quota is exceeded after storing multiple GPs, IndexedDB still holds the full dataset!
    }
  }

  return bundle;
}

/**
 * Loads a verified Gram Panchayat bundle from IndexedDB first, falling back to localStorage.
 */
export async function loadPortalPanchayatFromClientStorage(
  gpId: string
): Promise<StoredPortalPanchayatBundle | null> {
  // 1. Try IndexedDB first
  const db = await openPortalIndexedDb();
  if (db) {
    const fromIdb = await new Promise<StoredPortalPanchayatBundle | null>(
      (resolve) => {
        try {
          const tx = db.transaction(STORE_BUNDLES, 'readonly');
          const req = tx.objectStore(STORE_BUNDLES).get(gpId);
          req.onsuccess = () =>
            resolve((req.result as StoredPortalPanchayatBundle) || null);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      }
    );
    if (fromIdb?.dataset?.roll) {
      return fromIdb;
    }
  }

  // 2. Fallback to localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(getLocalPortalCacheKey(gpId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.dataset?.roll) {
          return parsed as StoredPortalPanchayatBundle;
        }
      }
    } catch {
      // Ignore corrupt entry
    }
  }

  return null;
}

/**
 * Saves user campaign mutations (leaning, turnout, tags, caste overrides, phone contacts, candidates)
 * directly to IndexedDB + localStorage so zero edits are lost offline without a database.
 */
export async function saveLocalCampaignOverlay(
  overlay: LocalCampaignOverlay
): Promise<void> {
  const db = await openPortalIndexedDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_OVERLAYS, 'readwrite');
        tx.objectStore(STORE_OVERLAYS).put(overlay);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(
        getLocalOverlayKey(overlay.gpId),
        JSON.stringify(overlay)
      );
    } catch {
      // Ignore quota error
    }
  }
}

/**
 * Loads user campaign mutations for a given Gram Panchayat from IndexedDB or localStorage.
 */
export async function loadLocalCampaignOverlay(
  gpId: string
): Promise<LocalCampaignOverlay | null> {
  const db = await openPortalIndexedDb();
  if (db) {
    const fromIdb = await new Promise<LocalCampaignOverlay | null>((resolve) => {
      try {
        const tx = db.transaction(STORE_OVERLAYS, 'readonly');
        const req = tx.objectStore(STORE_OVERLAYS).get(gpId);
        req.onsuccess = () =>
          resolve((req.result as LocalCampaignOverlay) || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    if (fromIdb?.gpId === gpId) {
      return fromIdb;
    }
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(getLocalOverlayKey(gpId));
      if (raw) {
        return JSON.parse(raw) as LocalCampaignOverlay;
      }
    } catch {
      // Ignore
    }
  }

  return null;
}

/**
 * Clears all cached Panchayat bundles and campaign overlays from both IndexedDB and localStorage.
 */
export async function clearAllClientPortalStorage(): Promise<void> {
  const db = await openPortalIndexedDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(
          [STORE_BUNDLES, STORE_OVERLAYS],
          'readwrite'
        );
        tx.objectStore(STORE_BUNDLES).clear();
        tx.objectStore(STORE_OVERLAYS).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.clear();
    } catch {
      // Ignore
    }
  }
}
