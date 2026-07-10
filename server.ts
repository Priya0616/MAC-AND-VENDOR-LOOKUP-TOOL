/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { INITIAL_OUI_DATABASE } from './src/data/oui_database';
import { OUIEntry, LookupResult, SearchHistoryItem, SearchStats } from './src/types';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Directories setup
// NOTE: this must live OUTSIDE `src/`. The dev server (locally) watches the
// entire project source tree for changes; writing runtime data files (search
// history, cached OUI entries) into `src/data` makes Vite treat every search
// as a source-code change and fire a full page reload, wiping React state.
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const STORE_PATH = path.join(DATA_DIR, 'oui_store.json');
const USER_DATA_PATH = path.join(DATA_DIR, 'user_data.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Lazy load Database Store
let ouiDatabase: OUIEntry[] = [];
try {
  if (fs.existsSync(STORE_PATH)) {
    ouiDatabase = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
  } else {
    ouiDatabase = [...INITIAL_OUI_DATABASE];
    fs.writeFileSync(STORE_PATH, JSON.stringify(ouiDatabase, null, 2), 'utf-8');
  }
} catch (error) {
  console.error('Error loading OUI Store:', error);
  ouiDatabase = [...INITIAL_OUI_DATABASE];
}

// User data store: history, favorites, stats
let searchHistory: SearchHistoryItem[] = [];
let vendorCounts: Record<string, number> = {};
let countryCounts: Record<string, number> = {};
let macTypeCounts: Record<string, number> = {
  'Unicast': 0,
  'Multicast': 0,
  'Broadcast': 0
};

function saveUserData() {
  try {
    fs.writeFileSync(
      USER_DATA_PATH,
      JSON.stringify({ searchHistory, vendorCounts, countryCounts, macTypeCounts }, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error('Error saving user data:', error);
  }
}

try {
  if (fs.existsSync(USER_DATA_PATH)) {
    const data = JSON.parse(fs.readFileSync(USER_DATA_PATH, 'utf-8'));
    searchHistory = data.searchHistory || [];
    vendorCounts = data.vendorCounts || {};
    countryCounts = data.countryCounts || {};
    macTypeCounts = data.macTypeCounts || { 'Unicast': 0, 'Multicast': 0, 'Broadcast': 0 };
  } else {
    saveUserData();
  }
} catch (error) {
  console.error('Error loading user data:', error);
}

// Helper: Lazy initialization of Gemini API Client
let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      geminiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }
  return geminiClient;
}

// MAC Utility Functions
function validateAndStandardizeMAC(input: string): { isValid: boolean; mac: string; oui: string } | null {
  const clean = input.replace(/[^a-fA-F0-9]/g, '');
  if (clean.length !== 12) {
    // Check if it's just an OUI (first 6 characters)
    if (clean.length === 6) {
      const ouiParts = clean.toUpperCase().match(/.{1,2}/g) || [];
      const formattedOui = ouiParts.join(':');
      return { isValid: true, mac: formattedOui + ':00:00:00', oui: formattedOui };
    }
    return { isValid: false, mac: '', oui: '' };
  }

  const parts = clean.toUpperCase().match(/.{1,2}/g) || [];
  const formattedMac = parts.join(':');
  const formattedOui = parts.slice(0, 3).join(':');

  return { isValid: true, mac: formattedMac, oui: formattedOui };
}

function detectMACTypeAndAttributes(mac: string) {
  // First octet
  const firstOctetHex = mac.split(':')[0];
  if (!firstOctetHex) {
    return {
      macType: 'Unicast' as const,
      adminType: 'UAA (Universally Administered)' as const,
      vmType: null as string | null
    };
  }
  const firstOctetVal = parseInt(firstOctetHex, 16);

  // Broadcast
  if (mac.toUpperCase() === 'FF:FF:FF:FF:FF:FF') {
    return {
      macType: 'Broadcast' as const,
      adminType: 'LAA (Locally Administered)' as const,
      vmType: null
    };
  }

  // Multicast bit is the least significant bit of the first octet (0x01)
  const isMulticast = (firstOctetVal & 0x01) === 1;
  const macType = isMulticast ? ('Multicast' as const) : ('Unicast' as const);

  // Locally Administered bit is the second-least significant bit of the first octet (0x02)
  const isLocal = (firstOctetVal & 0x02) === 2;
  const adminType = isLocal ? ('LAA (Locally Administered)' as const) : ('UAA (Universally Administered)' as const);

  // VM Detection based on OUI
  const oui = mac.toUpperCase().substring(0, 8);
  let vmType: string | null = null;
  if (oui === '00:50:56' || oui === '00:0C:29' || oui === '00:05:69') {
    vmType = 'VMware Virtual System';
  } else if (oui === '08:00:27') {
    vmType = 'Oracle VirtualBox';
  } else if (oui === '00:15:5D') {
    vmType = 'Microsoft Hyper-V';
  } else if (oui === '02:42:AC') {
    vmType = 'Docker Network Bridge';
  }

  return { macType, adminType, vmType };
}

// Fallback logic for live MAC Vendor API with strict timeouts
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 1500) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function performLiveLookup(mac: string): Promise<Partial<OUIEntry> | null> {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // 1. Try MACVendors API
  try {
    const res = await fetchWithTimeout(`https://api.macvendors.com/${encodeURIComponent(mac)}`, {
      headers: { 
        'User-Agent': userAgent,
        'Accept': 'text/plain'
      }
    }, 4000);
    if (res.status === 200) {
      const vendorName = await res.text();
      if (vendorName && vendorName.trim()) {
        return {
          vendor: vendorName.trim(),
          manufacturer: vendorName.trim(),
          description: 'Retrieved via Live Web Lookup API (macvendors.com)'
        };
      }
    }
  } catch (err: any) {
    console.warn('macvendors.com API lookup failed, trying fallback...', err.message || err);
  }

  // 2. Try macvendors.co API (Highly reliable, JSON output)
  try {
    const res = await fetchWithTimeout(`https://macvendors.co/api/${encodeURIComponent(mac)}/json`, {
      headers: { 
        'User-Agent': userAgent,
        'Accept': 'application/json'
      }
    }, 4000);
    if (res.status === 200) {
      const data = await res.json();
      if (data && data.result && data.result.company) {
        return {
          vendor: data.result.company,
          manufacturer: data.result.company,
          country: data.result.country || 'Unknown',
          address: data.result.address || 'Not Available',
          orgType: data.result.type || 'IEEE Standard',
          description: 'Retrieved via Live Web Lookup API (macvendors.co)'
        };
      }
    }
  } catch (err: any) {
    console.warn('macvendors.co API lookup failed, trying fallback...', err.message || err);
  }

  // 3. Try maclookup.app API v2 (free tier check)
  try {
    const res = await fetchWithTimeout(`https://api.maclookup.app/v2/macs/${encodeURIComponent(mac)}`, {
      headers: { 
        'User-Agent': userAgent,
        'Accept': 'application/json'
      }
    }, 4000);
    if (res.status === 200) {
      const data = await res.json();
      if (data && data.success && data.company) {
        return {
          vendor: data.company,
          manufacturer: data.company,
          country: data.country || 'Unknown',
          address: data.address || '',
          orgType: 'Unknown',
          description: 'Retrieved via Live Web Lookup API (maclookup.app)'
        };
      }
    }
  } catch (err: any) {
    console.warn('maclookup.app API lookup failed...', err.message || err);
  }

  return null;
}

// Endpoint: Lookup MAC Address
app.post('/api/lookup', async (req, res) => {
  const { mac: inputMac, useAI = false } = req.body;
  if (!inputMac) {
    res.status(400).json({ error: 'MAC Address is required' });
    return;
  }

  const standardized = validateAndStandardizeMAC(inputMac);
  if (!standardized || !standardized.isValid) {
    // Check if it is a search by vendor name
    const searchTerm = inputMac.trim().toLowerCase();
    if (searchTerm.length >= 2) {
      const matches = ouiDatabase.filter(item => 
        item.vendor.toLowerCase().includes(searchTerm) || 
        (item.manufacturer && item.manufacturer.toLowerCase().includes(searchTerm)) ||
        (item.description && item.description.toLowerCase().includes(searchTerm)) ||
        item.oui.toLowerCase().replace(/[^a-f0-9]/g, '').includes(searchTerm.replace(/[^a-f0-9]/g, ''))
      );
      if (matches.length > 0) {
        res.json({
          isVendorSearch: true,
          searchTerm: inputMac.trim(),
          matches: matches.slice(0, 40) // Limit to top 40 matches
        });
        return;
      }
    }
    res.status(400).json({ error: 'Invalid MAC Address format or no matching vendors found. Enter a MAC address or vendor name like "Apple" or "Cisco".' });
    return;
  }

  const { mac, oui } = standardized;
  const { macType, adminType, vmType } = detectMACTypeAndAttributes(mac);

  // Check cache (search history) first
  const cachedMatch = searchHistory.find(item => item.mac.toUpperCase() === mac.toUpperCase());

  // Check Local OUI database
  let dbMatch = ouiDatabase.find(item => item.oui.toUpperCase() === oui.toUpperCase());
  let source: 'Local Database' | 'Live API' | 'Cached Result' | 'Unresolved' = 'Local Database';
  let matchedVendor = '';
  let manufacturer = 'Unknown';
  let country = 'Unknown';
  let address = 'Not Available';
  let orgType = 'UAA Standard';
  let description = 'Network hardware device manufacturer interface.';

  if (cachedMatch && !dbMatch) {
    source = 'Cached Result';
    matchedVendor = cachedMatch.vendor;
  } else if (dbMatch) {
    matchedVendor = dbMatch.vendor;
    manufacturer = dbMatch.manufacturer || dbMatch.vendor;
    country = dbMatch.country || 'Unknown';
    address = dbMatch.address || 'Not Available';
    orgType = dbMatch.orgType || 'IEEE Standard';
    description = dbMatch.description || 'Enterprise network infrastructure adapter.';
  } else {
    // Perform Live Lookup
    const liveResult = await performLiveLookup(mac);
    if (liveResult) {
      source = 'Live API';
      matchedVendor = liveResult.vendor || 'Unknown Vendor';
      manufacturer = liveResult.manufacturer || matchedVendor;
      country = liveResult.country || 'Unknown';
      address = liveResult.address || 'Not Available';
      orgType = liveResult.orgType || 'IEEE Standard';
      description = liveResult.description || 'Retrieved from live OUI registry databases.';

      // Save found item in database store for caching
      const newOUI: OUIEntry = {
        oui,
        vendor: matchedVendor,
        manufacturer,
        country,
        address,
        orgType,
        description
      };
      ouiDatabase.push(newOUI);
      try {
        fs.writeFileSync(STORE_PATH, JSON.stringify(ouiDatabase, null, 2), 'utf-8');
      } catch (err) {
        console.error('Failed to write to OUI store:', err);
      }
    } else {
      source = 'Unresolved';
      matchedVendor = 'Unknown / Unregistered Vendor';
      manufacturer = 'Generic Manufacturer';
      description = 'This MAC address OUI is not registered in the local database or online registries.';
    }
  }

  // Calculate high-quality Confidence Score
  let confidenceScore = 50;
  if (source === 'Local Database') confidenceScore = 98;
  else if (source === 'Cached Result') confidenceScore = 90;
  else if (source === 'Live API') confidenceScore = 95;
  else if (vmType) confidenceScore = 85;

  const logoText = matchedVendor.substring(0, 2).toUpperCase();

  // Gemini AI Enrichment: Get expert cyber security insight!
  let aiAnalysis = '';
  const aiClient = getGeminiClient();
  if (useAI && aiClient && matchedVendor !== 'Unknown / Unregistered Vendor') {
    try {
      const prompt = `As a Senior Cybersecurity Engineer and Network Architect, provide a professional analysis briefing for a network device with MAC address "${mac}" manufactured by "${matchedVendor}" (OUI: "${oui}"). 
Include:
1. Device Background: A concise, highly informative description of what this vendor usually manufactures.
2. Network Classification: Whether it is typically a consumer device, smart IoT, server, network switch, virtualization node, etc.
3. Security Advisory & Best Practices: Standard recommendations for securing these types of devices in an enterprise subnet (e.g. segmentation, VLANs, MAC filtering caveats, firmware updates).
4. Additional Intel: Any interesting facts about their OUI usage.

Keep your response completely factual, clear, and structured in beautifully formatted Markdown, without preamble. Do not mention that you are an AI model.`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt
      });
      aiAnalysis = response.text || '';
    } catch (err) {
      console.warn('Gemini AI generation failed:', err);
      aiAnalysis = 'An enterprise-grade cybersecurity analysis briefing is unavailable for this device at this time due to temporary API rate limits or network parameters.';
    }
  } else if (!aiClient) {
    aiAnalysis = 'Gemini AI intelligence integration requires configuring your GEMINI_API_KEY inside the Secrets menu to display real-time network threat models, device vulnerability advisories, and architecture tips.';
  } else {
    aiAnalysis = 'No detailed security briefing is available for unresolved MAC address headers.';
  }

  const timestamp = new Date().toISOString();

  // Create lookup result
  const result: LookupResult = {
    mac,
    oui,
    vendor: matchedVendor,
    manufacturer,
    country,
    address,
    orgType,
    description,
    macType,
    adminType,
    vmType,
    databaseMatch: source,
    confidenceScore,
    logoText,
    timestamp,
    aiAnalysis
  };

  // Update Stats and History
  const historyItem: SearchHistoryItem = {
    id: Math.random().toString(36).substr(2, 9),
    mac,
    vendor: matchedVendor,
    timestamp,
    databaseMatch: source,
    isFavorite: false
  };

  searchHistory.unshift(historyItem);
  if (searchHistory.length > 100) {
    searchHistory.pop();
  }

  vendorCounts[matchedVendor] = (vendorCounts[matchedVendor] || 0) + 1;
  countryCounts[country] = (countryCounts[country] || 0) + 1;
  macTypeCounts[macType] = (macTypeCounts[macType] || 0) + 1;

  saveUserData();

  res.json(result);
});

// Endpoint: Get search statistics and history
app.get('/api/stats', (req, res) => {
  const stats: SearchStats = {
    totalSearches: searchHistory.length,
    localMatches: searchHistory.filter(h => h.databaseMatch === 'Local Database').length,
    liveMatches: searchHistory.filter(h => h.databaseMatch === 'Live API').length,
    failedMatches: searchHistory.filter(h => h.databaseMatch === 'Unresolved').length,
    vendorCounts,
    countryCounts,
    macTypeCounts,
    searchHistory
  };
  res.json(stats);
});

// Endpoint: Clear History & Stats
app.post('/api/stats/clear', (req, res) => {
  searchHistory = [];
  vendorCounts = {};
  countryCounts = {};
  macTypeCounts = { 'Unicast': 0, 'Multicast': 0, 'Broadcast': 0 };
  saveUserData();
  res.json({ success: true, message: 'All search history and telemetry has been purged.' });
});

// Endpoint: Toggle favorite
app.post('/api/history/favorite', (req, res) => {
  const { id } = req.body;
  if (!id) {
    res.status(400).json({ error: 'History ID is required' });
    return;
  }
  const item = searchHistory.find(h => h.id === id);
  if (item) {
    item.isFavorite = !item.isFavorite;
    saveUserData();
    res.json({ success: true, isFavorite: item.isFavorite });
  } else {
    res.status(404).json({ error: 'Item not found' });
  }
});

// Endpoint: OUI Search List (Admin Panel / Autocomplete)
app.get('/api/admin/vendors', (req, res) => {
  res.json(ouiDatabase);
});

// Endpoint: Add custom OUI entry
app.post('/api/admin/add', (req, res) => {
  const { oui, vendor, manufacturer, country, address, orgType, description } = req.body;

  if (!oui || !vendor) {
    res.status(400).json({ error: 'OUI prefix and Vendor name are required' });
    return;
  }

  const cleanOui = oui.toUpperCase().replace(/[^A-F0-9]/g, '');
  if (cleanOui.length !== 6) {
    res.status(400).json({ error: 'OUI must be 6 hex characters (e.g. 001A2B or 00:1A:2B)' });
    return;
  }

  const formattedOui = cleanOui.match(/.{1,2}/g)!.join(':');

  // Check if already exists
  const exists = ouiDatabase.some(item => item.oui.toUpperCase() === formattedOui);
  if (exists) {
    res.status(400).json({ error: 'This OUI prefix already exists in the database. Use update instead.' });
    return;
  }

  const newEntry: OUIEntry = {
    oui: formattedOui,
    vendor,
    manufacturer: manufacturer || vendor,
    country: country || 'Unknown',
    address: address || 'Not Available',
    orgType: orgType || 'IEEE MA-L',
    description: description || 'Custom configured OUI record.'
  };

  ouiDatabase.push(newEntry);
  fs.writeFileSync(STORE_PATH, JSON.stringify(ouiDatabase, null, 2), 'utf-8');

  res.json({ success: true, message: 'OUI entry added successfully', entry: newEntry });
});

// Endpoint: Update existing OUI entry
app.post('/api/admin/update', (req, res) => {
  const { oui, vendor, manufacturer, country, address, orgType, description } = req.body;

  if (!oui || !vendor) {
    res.status(400).json({ error: 'OUI prefix and Vendor name are required' });
    return;
  }

  const cleanOui = oui.toUpperCase().replace(/[^A-F0-9]/g, '');
  const formattedOui = cleanOui.match(/.{1,2}/g)!.join(':');

  const idx = ouiDatabase.findIndex(item => item.oui.toUpperCase() === formattedOui);
  if (idx === -1) {
    res.status(404).json({ error: 'OUI prefix not found in database.' });
    return;
  }

  ouiDatabase[idx] = {
    oui: formattedOui,
    vendor,
    manufacturer: manufacturer || vendor,
    country: country || ouiDatabase[idx].country,
    address: address || ouiDatabase[idx].address,
    orgType: orgType || ouiDatabase[idx].orgType,
    description: description || ouiDatabase[idx].description
  };

  fs.writeFileSync(STORE_PATH, JSON.stringify(ouiDatabase, null, 2), 'utf-8');
  res.json({ success: true, message: 'OUI record updated successfully', entry: ouiDatabase[idx] });
});

// Endpoint: Delete OUI entry
app.delete('/api/admin/delete/:oui', (req, res) => {
  const { oui } = req.params;
  if (!oui) {
    res.status(400).json({ error: 'OUI prefix is required' });
    return;
  }

  const cleanOui = oui.toUpperCase().replace(/[^A-F0-9]/g, '');
  const formattedOui = cleanOui.match(/.{1,2}/g)!.join(':');

  const idx = ouiDatabase.findIndex(item => item.oui.toUpperCase() === formattedOui);
  if (idx === -1) {
    res.status(404).json({ error: 'OUI prefix not found in database' });
    return;
  }

  const removed = ouiDatabase.splice(idx, 1);
  fs.writeFileSync(STORE_PATH, JSON.stringify(ouiDatabase, null, 2), 'utf-8');

  res.json({ success: true, message: `OUI ${formattedOui} deleted successfully`, removed });
});

// Endpoint: Import CSV
app.post('/api/admin/import', (req, res) => {
  const { csvContent } = req.body;
  if (!csvContent) {
    res.status(400).json({ error: 'CSV content is required' });
    return;
  }

  try {
    const lines = csvContent.split('\n');
    let importedCount = 0;
    let skippedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parser
      const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      if (parts.length < 2) continue;

      const ouiRaw = parts[0].replace(/"/g, '').trim();
      const vendor = parts[1].replace(/"/g, '').trim();
      const manufacturer = parts[2] ? parts[2].replace(/"/g, '').trim() : vendor;
      const country = parts[3] ? parts[3].replace(/"/g, '').trim() : 'Unknown';
      const address = parts[4] ? parts[4].replace(/"/g, '').trim() : 'Not Available';
      const orgType = parts[5] ? parts[5].replace(/"/g, '').trim() : 'IEEE MA-L';
      const description = parts[6] ? parts[6].replace(/"/g, '').trim() : 'Imported OUI record.';

      const standardized = validateAndStandardizeMAC(ouiRaw);
      if (!standardized || !standardized.isValid) {
        skippedCount++;
        continue;
      }

      const formattedOui = standardized.oui;
      const existsIdx = ouiDatabase.findIndex(item => item.oui.toUpperCase() === formattedOui);

      const entry: OUIEntry = {
        oui: formattedOui,
        vendor,
        manufacturer,
        country,
        address,
        orgType,
        description
      };

      if (existsIdx !== -1) {
        ouiDatabase[existsIdx] = entry;
      } else {
        ouiDatabase.push(entry);
      }
      importedCount++;
    }

    fs.writeFileSync(STORE_PATH, JSON.stringify(ouiDatabase, null, 2), 'utf-8');
    res.json({ success: true, message: `OUI Database synced: Imported/Updated ${importedCount} records, Skipped ${skippedCount} invalid rows.` });
  } catch (err) {
    console.error('CSV import failed:', err);
    res.status(500).json({ error: 'Failed to parse and import CSV payload.' });
  }
});

// Endpoint: Database Backup
app.post('/api/admin/backup', (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `oui_store_backup_${timestamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(ouiDatabase, null, 2), 'utf-8');
    res.json({ success: true, backupName: `oui_store_backup_${timestamp}.json`, message: 'Database state has been serialized to backup storage.' });
  } catch (err) {
    console.error('Backup failed:', err);
    res.status(500).json({ error: 'Failed to generate JSON database backup.' });
  }
});

// Endpoint: Database Restore
app.post('/api/admin/restore', (req, res) => {
  const { backupName } = req.body;
  if (!backupName) {
    res.status(400).json({ error: 'Backup filename is required' });
    return;
  }

  const backupPath = path.join(BACKUP_DIR, backupName);
  if (!fs.existsSync(backupPath)) {
    res.status(404).json({ error: 'Backup file not found in system vault.' });
    return;
  }

  try {
    const restored = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    ouiDatabase = restored;
    fs.writeFileSync(STORE_PATH, JSON.stringify(ouiDatabase, null, 2), 'utf-8');
    res.json({ success: true, message: `Database fully restored to status of backup: ${backupName}` });
  } catch (err) {
    console.error('Restore failed:', err);
    res.status(500).json({ error: 'Failed to restore database from backup.' });
  }
});

// Endpoint: List Backup Files
app.get('/api/admin/backups', (req, res) => {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const backups = files.map(file => {
      const stats = fs.statSync(path.join(BACKUP_DIR, file));
      return {
        name: file,
        size: `${(stats.size / 1024).toFixed(2)} KB`,
        createdAt: stats.mtime.toISOString()
      };
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json(backups);
  } catch (err) {
    console.error('Failed to read backups:', err);
    res.status(500).json({ error: 'Failed to list backup vault files.' });
  }
});

// Vite server integration or static server for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MAC Address Security Server online on port ${PORT}`);
  });
}

startServer();
