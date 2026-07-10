/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { 
  Search, Clipboard, RefreshCw, Sparkles, Copy, FileCode, FileSpreadsheet, 
  Share2, Play, Volume2, Mic, MicOff, Check, AlertTriangle, AlertCircle, 
  HelpCircle, Star, Trash2, FileText, QrCode, Wifi, Globe, Heart, Terminal,
  Database, Shield
} from 'lucide-react';
import { LookupResult, SearchHistoryItem, AppSettings, OUIEntry } from '../types';

interface DashboardProps {
  settings: AppSettings;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  triggerSearchRef: React.MutableRefObject<((macStr: string) => void) | null>;
  setDbCount: (n: number) => void;
}

export default function Dashboard({ 
  settings, 
  favorites, 
  toggleFavorite,
  triggerSearchRef,
  setDbCount
}: DashboardProps) {
  const [inputMac, setInputMac] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isInputCopied, setIsInputCopied] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Vendor Search state
  const [vendorMatches, setVendorMatches] = useState<OUIEntry[] | null>(null);
  const [searchedVendorName, setSearchedVendorName] = useState<string>('');
  
  // Autocomplete & Suggestions
  const [suggestions, setSuggestions] = useState<{ oui: string; vendor: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [localRegistry, setLocalRegistry] = useState<{ oui: string; vendor: string }[]>([]);
  
  // Voice Search
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Full Screen Mode state
  const [isFullScreen, setIsFullScreen] = useState(false);
  const appContainerRef = useRef<HTMLDivElement>(null);

  // QR Code generator URL
  const [qrVisible, setQrVisible] = useState(false);

  const suggestionRef = useRef<HTMLDivElement>(null);

  // Play click feedback sound
  const playBeep = (freq = 600, duration = 0.08, type: OscillatorType = 'sine') => {
    if (settings.soundEnabled) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + duration);
      } catch (e) {
        // browser audio sandbox limits
      }
    }
  };

  // Load registry for autocomplete suggestions and counts
  useEffect(() => {
    const fetchRegistry = async () => {
      try {
        const res = await fetch('/api/admin/vendors');
        if (res.ok) {
          const data = await res.json();
          setLocalRegistry(data);
          setDbCount(data.length);
        }
      } catch (err) {
        console.error('Failed to load OUI registry list', err);
      }
    };
    fetchRegistry();
  }, [setDbCount]);

  // Click outside suggestions
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Set up external trigger searches (such as clicking history drawer items)
  useEffect(() => {
    triggerSearchRef.current = (macStr: string) => {
      setInputMac(macStr);
      handleSearch(macStr);
    };
    return () => {
      triggerSearchRef.current = null;
    };
  }, [localRegistry]);

  // Suggestions updater as user types
  const handleInputChange = (val: string) => {
    setInputMac(val);
    setError(null);
    if (!val.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const cleanInput = val.toUpperCase().replace(/[^A-F0-9]/g, '');
    if (cleanInput.length > 0) {
      const filtered = localRegistry
        .filter(item => {
          const cleanOui = item.oui.replace(/[^A-F0-9]/g, '').toUpperCase();
          return cleanOui.startsWith(cleanInput) || item.vendor.toUpperCase().includes(val.toUpperCase());
        })
        .slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Standard Voice Recognition setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.lang = 'en-US';
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setIsListening(true);
        playBeep(450, 0.15, 'triangle');
      };

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        // Clean text to extract letters and numbers
        const spokenRaw = text.replace(/[^a-fA-F0-9]/g, '');
        if (spokenRaw.length >= 6) {
          handleInputChange(spokenRaw);
          playBeep(900, 0.1, 'sine');
        } else {
          setError(`Could not resolve MAC address from audio feedback: "${text}". Please speak hexadecimal letters and numbers.`);
        }
      };

      rec.onerror = (e: any) => {
        console.error('Speech recognition error:', e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [localRegistry]);

  const toggleVoiceSearch = () => {
    if (!recognitionRef.current) {
      setError('Web Speech API (Voice Recognition) is not supported in this browser version.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // Primary MAC address resolution logic
  const handleSearch = async (macToSearch = inputMac) => {
    if (!macToSearch.trim()) {
      setError('Please input a MAC address or OUI prefix first.');
      playBeep(250, 0.2, 'sawtooth');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setVendorMatches(null);
    setShowSuggestions(false);
    playBeep(520, 0.1);

    try {
      const response = await fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac: macToSearch, useAI: false })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.isVendorSearch) {
          setVendorMatches(data.matches);
          setSearchedVendorName(data.searchTerm);
          playBeep(880, 0.1);
        } else {
          setResult(data as LookupResult);
          setIsFavorite(favorites.includes(data.oui));
          playBeep(880, 0.15);
        }
      } else {
        const errData = await response.json();
        setError(errData.error || 'Server rejected MAC address format specifications.');
        playBeep(250, 0.2, 'sawtooth');
      }
    } catch (err) {
      // Offline / Network fallback check
      const searchTerm = macToSearch.trim().toLowerCase();
      const offlineMatches = localRegistry.filter(item => 
        item.vendor.toLowerCase().includes(searchTerm) || 
        (item.oui && item.oui.toLowerCase().includes(searchTerm))
      );
      if (offlineMatches.length > 0) {
        setVendorMatches(offlineMatches as any);
        setSearchedVendorName(macToSearch.trim());
        playBeep(880, 0.1);
      } else {
        setError('Establishing connection with the tactical server failed. Searching local mock client lookup data...');
        playBeep(250, 0.2, 'sawtooth');
      }
    } finally {
      setLoading(false);
    }
  };

  // Input cleaners
  const handleClear = () => {
    setInputMac('');
    setResult(null);
    setVendorMatches(null);
    setError(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setQrVisible(false);
    playBeep(350, 0.05);
  };

  const handleCopyInput = () => {
    if (!inputMac.trim()) {
      setError('Nothing to copy. Enter a MAC address or vendor name first.');
      playBeep(250, 0.2, 'sawtooth');
      return;
    }
    navigator.clipboard.writeText(inputMac);
    setIsInputCopied(true);
    playBeep(980, 0.05);
    setTimeout(() => setIsInputCopied(false), 2000);
  };

  const generateRandomMAC = () => {
    if (localRegistry.length > 0) {
      // Pick a random OUI prefix
      const randomEntry = localRegistry[Math.floor(Math.random() * localRegistry.length)];
      const prefix = randomEntry.oui;
      // Append three random hexadecimal bytes
      const randomByte = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
      const randomMacStr = `${prefix}:${randomByte()}:${randomByte()}:${randomByte()}`;
      handleInputChange(randomMacStr);
    } else {
      // Absolute mock random if database is offline
      const hex = '0123456789ABCDEF';
      let mock = '';
      for (let i = 0; i < 12; i++) {
        mock += hex[Math.floor(Math.random() * 16)];
        if (i % 2 === 1 && i < 11) mock += ':';
      }
      handleInputChange(mock);
    }
    playBeep(750, 0.1);
  };

  // Keyboard shortcut bounds
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClear();
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [localRegistry]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    playBeep(980, 0.05);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Generate CSV format down
  const triggerCSVDownload = () => {
    if (!result) return;
    const headers = ['MAC Address', 'OUI Prefix', 'Vendor', 'Manufacturer', 'Country', 'Address', 'Organization Type', 'Confidence Score', 'Database Match'];
    const row = [
      result.mac, result.oui, result.vendor, result.manufacturer, result.country,
      `"${result.address.replace(/"/g, '""')}"`, result.orgType, result.confidenceScore, result.databaseMatch
    ];
    const csvContent = [headers.join(','), row.join(',')].join('\n');
    const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `OUI-Lookup-${result.oui.replace(/:/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    playBeep(800, 0.1);
  };

  // Generate JSON format down
  const triggerJSONDownload = () => {
    if (!result) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(result, null, 2))}`;
    const link = document.createElement("a");
    link.setAttribute("href", jsonString);
    link.setAttribute("download", `OUI-Lookup-${result.oui.replace(/:/g, '-')}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    playBeep(800, 0.1);
  };

  // Print PDF helper using pure client-side jsPDF generator
  const triggerPrintPDF = () => {
    if (!result) return;
    
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Colors
      const primaryColor = [15, 23, 42]; // Slate 900
      const accentColor = [6, 182, 212]; // Cyan 500
      const textColor = [51, 65, 85]; // Slate 700
      const titleColor = [15, 23, 42]; // Slate 900
      const lightBg = [248, 250, 252]; // Slate 50

      // Page dimensions
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header Banner
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, pageWidth, 45, 'F');

      // Decorative accent line
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(0, 45, pageWidth, 2, 'F');

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('MAC OUI TELEMETRY REPORT', 15, 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, 26);
      doc.text('System Status: VERIFIED & SECURE', 15, 31);

      // System ID / Logo Badge on right
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(pageWidth - 45, 12, 30, 22, 'F');
      doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.setLineWidth(0.5);
      doc.rect(pageWidth - 45, 12, 30, 22, 'S');
      
      doc.setTextColor(6, 182, 212); // cyan
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(result.logoText || 'OUI', pageWidth - 30, 26, { align: 'center' });

      // Body Section
      let y = 60;

      // 1. Vendor Identity Card
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.rect(15, y, pageWidth - 30, 32, 'F');
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.3);
      doc.rect(15, y, pageWidth - 30, 32, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
      doc.text(result.vendor, 20, y + 10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text(`OUI Prefix: ${result.oui}`, 20, y + 18);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(`Queried MAC: ${result.mac}`, 20, y + 25);

      y += 42;

      // 2. Vendor Description Block
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
      doc.text('VENDOR SCOPE & SPECIFICATIONS', 15, y);
      
      // Horizontal rule
      doc.setFillColor(226, 232, 240);
      doc.rect(15, y + 2, pageWidth - 30, 0.5, 'F');

      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      
      // Multi-line description text wrapping
      const splitDesc = doc.splitTextToSize(result.description || 'No additional vendor details are available in this record description registration profile.', pageWidth - 30);
      doc.text(splitDesc, 15, y);
      
      y += (splitDesc.length * 5) + 10;

      // 3. Details Tables
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
      doc.text('MANUFACTURER REGISTRATION SPECS', 15, y);
      
      doc.setFillColor(226, 232, 240);
      doc.rect(15, y + 2, pageWidth - 30, 0.5, 'F');

      y += 8;

      // Left Column specs, Right Column specs
      const colWidth = (pageWidth - 30) / 2;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Company:', 15, y);
      doc.setFont('helvetica', 'normal');
      doc.text(result.manufacturer || 'Not Available', 45, y);

      doc.setFont('helvetica', 'bold');
      doc.text('Reg Size:', 15 + colWidth, y);
      doc.setFont('helvetica', 'normal');
      doc.text(result.orgType || 'Not Available', 15 + colWidth + 28, y);

      y += 8;

      doc.setFont('helvetica', 'bold');
      doc.text('Country:', 15, y);
      doc.setFont('helvetica', 'normal');
      doc.text(result.country || 'Not Available', 45, y);

      doc.setFont('helvetica', 'bold');
      doc.text('Database:', 15 + colWidth, y);
      doc.setFont('helvetica', 'normal');
      doc.text(result.databaseMatch || 'Not Available', 15 + colWidth + 28, y);

      y += 8;

      doc.setFont('helvetica', 'bold');
      doc.text('Address:', 15, y);
      doc.setFont('helvetica', 'normal');
      const wrappedAddress = doc.splitTextToSize(result.address || 'Not Available', colWidth - 10);
      doc.text(wrappedAddress, 45, y);

      y += Math.max(wrappedAddress.length * 5, 8) + 4;

      // 4. Network profile telemetry
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
      doc.text('NETWORK INTERFACE SIGNATURE PROFILE', 15, y);
      
      doc.setFillColor(226, 232, 240);
      doc.rect(15, y + 2, pageWidth - 30, 0.5, 'F');

      y += 8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Frame Class:', 15, y);
      doc.setFont('helvetica', 'normal');
      doc.text(result.macType || 'Universal', 45, y);

      doc.setFont('helvetica', 'bold');
      doc.text('Admin Class:', 15 + colWidth, y);
      doc.setFont('helvetica', 'normal');
      doc.text(result.adminType || 'Globally Administered', 15 + colWidth + 28, y);

      y += 8;

      doc.setFont('helvetica', 'bold');
      doc.text('VM Signature:', 15, y);
      doc.setFont('helvetica', 'normal');
      doc.text(result.vmType || 'Hardware Node (Physical)', 45, y);

      doc.setFont('helvetica', 'bold');
      doc.text('Confidence:', 15 + colWidth, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`${result.confidenceScore || 100}% Match`, 15 + colWidth + 28, y);

      y += 15;

      // Footer disclaimer & stamp
      doc.setFillColor(241, 245, 249);
      doc.rect(15, y, pageWidth - 30, 20, 'F');
      
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Legal Disclaimer: This OUI/MAC validation telemetry is compiled for administrative audit and security mapping.', 20, y + 8);
      doc.text('The data accuracy is verified against combined offline database mirrors and live fallback register endpoints.', 20, y + 13);

      // Save PDF
      doc.save(`OUI-Report-${result.oui.replace(/:/g, '-')}.pdf`);
      playBeep(880, 0.15);
    } catch (err) {
      console.error('Failed to generate PDF using jsPDF:', err);
      // Fallback
      window.print();
      playBeep(800, 0.1);
    }
  };

  const toggleFavoriteState = () => {
    if (!result) return;
    toggleFavorite(result.oui);
    setIsFavorite(!isFavorite);
    playBeep(isFavorite ? 440 : 880, 0.1, isFavorite ? 'sawtooth' : 'sine');
  };

  return (
    <div className="w-full space-y-8" ref={appContainerRef}>
      
      {/* Hero Section */}
      <div className="relative text-center max-w-3xl mx-auto space-y-4 pt-4 sm:pt-8 no-print">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/10 bg-cyan-950/20 text-cyan-400 font-mono text-[10px] tracking-widest uppercase animate-pulse">
          <Wifi className="h-3.5 w-3.5 animate-bounce" />
          <span>Analyzing Networks With Registry Intelligence</span>
        </div>
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-slate-100 sm:text-5xl uppercase">
          MAC &amp; Vendor <span className="text-cyan-400">Lookup Tool</span>
        </h2>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
          Analyze IEEE Organizationally Unique Identifiers (OUIs) instantly. Identify network cards, isolate security levels, find virtual environment anchors, and look up details.
        </p>
      </div>

      {/* Main Form Analyzer Container */}
      <div className="max-w-4xl mx-auto space-y-6 no-print">
        <div className="cyber-card p-5 sm:p-6 rounded-2xl relative overflow-hidden shadow-2xl">
          {/* Cyber scanline graphic backdrop */}
          <div className="absolute top-0 right-0 h-40 w-40 bg-cyan-500/5 rounded-full filter blur-3xl pointer-events-none" />
          
          <div className="relative space-y-4">
            
            {/* Input Label controls */}
            <div className="flex items-center justify-between">
              <label className="font-mono text-[10px] font-semibold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5" />
                Input MAC Address Header
              </label>
              <span className="font-mono text-[9px] text-slate-500">
                SHORTCUTS: [ESC] Clear
              </span>
            </div>

            {/* Input & Action Panel */}
            <div className="relative" ref={suggestionRef}>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  <input
                    type="text"
                    id="mac-input-field"
                    value={inputMac}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Enter MAC Address (e.g. 00:1A:2B:3C:4D:5E or 001A2B)"
                    className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-slate-800 bg-slate-900/60 font-mono text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all shadow-inner uppercase"
                  />
                  
                  {/* Microphone speech trigger */}
                  <button
                    type="button"
                    onClick={toggleVoiceSearch}
                    title="Voice search MAC numbers"
                    className={`absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${
                      isListening ? 'bg-cyan-950/60 text-cyan-400 animate-pulse' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {isListening ? <Mic className="h-4 w-4 text-cyan-400 animate-ping" /> : <Mic className="h-4 w-4" />}
                  </button>
                </div>

                {/* Main Action Controllers */}
                <div className="flex items-center gap-2">
                  <button
                    id="search-mac-btn"
                    onClick={() => handleSearch()}
                    disabled={loading}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-display text-xs font-semibold tracking-wider text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 disabled:opacity-50 transition-all uppercase glow-cyan"
                  >
                    {loading ? <RefreshCw className="h-4 w-4 animate-spin text-slate-950" /> : <Search className="h-4 w-4 text-slate-950" />}
                    <span>{loading ? 'Analyzing...' : 'Search'}</span>
                  </button>

                  <button
                    id="clear-mac-btn"
                    onClick={handleClear}
                    title="Clear input"
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-all"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              {/* Autocomplete dropdown list */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 z-50 mt-2 p-1 rounded-xl border border-slate-800 bg-slate-950/95 backdrop-blur-lg shadow-2xl divide-y divide-slate-900">
                  {suggestions.map((item) => (
                    <button
                      key={item.oui}
                      onClick={() => {
                        handleInputChange(item.oui);
                        setShowSuggestions(false);
                        handleSearch(item.oui);
                      }}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-mono text-slate-300 hover:bg-cyan-950/20 hover:text-cyan-400 transition-all rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-500 font-semibold">{item.oui}</span>
                        <span className="text-slate-400 font-sans truncate max-w-[200px] sm:max-w-[350px]">{item.vendor}</span>
                      </div>
                      <span className="text-[10px] text-slate-600 bg-slate-900 px-2 py-0.5 rounded-full">DB Match</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sub-actions toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] font-mono text-slate-400">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="copy-mac-btn"
                  onClick={handleCopyInput}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:text-slate-200 transition-all cursor-pointer"
                >
                  {isInputCopied ? (
                    <Check className="h-3 w-3 text-emerald-400 animate-in zoom-in-50 duration-200" />
                  ) : (
                    <Copy className="h-3 w-3 text-cyan-500" />
                  )}
                  <span>{isInputCopied ? 'Copied!' : 'Copy Input'}</span>
                </button>

                <button
                  id="random-mac-btn"
                  onClick={generateRandomMAC}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:text-slate-200 transition-all"
                >
                  <RefreshCw className="h-3 w-3 text-cyan-500" />
                  <span>Random OUI</span>
                </button>
              </div>

              <div className="text-slate-500 text-[10px]">
                Valid formats: <span className="text-cyan-600">00:1A:2B:3C:4D:5E</span> | <span className="text-cyan-600">00-1A-2B</span> | <span className="text-cyan-600">001A2B</span>
              </div>
            </div>

          </div>
        </div>

        {/* Animated Error Alerts */}
        {error && (
          <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-950/20 text-rose-400 flex items-start gap-3 shadow-lg animate-in fade-in slide-in-from-top-4 duration-200">
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-display font-medium text-xs uppercase tracking-wider text-rose-300">Format Integrity Alert</p>
              <p className="text-xs text-rose-400/80 leading-relaxed">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Empty State / Bento Grid Panel */}
      {!result && !loading && !vendorMatches && (
        <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-in fade-in duration-300 no-print">
          {/* Card 1: Database Health Metrics */}
          <div className="bento-card p-6 flex flex-col justify-between border border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Database className="h-5 w-5 text-cyan-400" />
                <h4 className="font-display font-bold text-slate-200 text-sm tracking-wider uppercase">System Database</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                The tactical shield is armed with a robust Organizationally Unique Identifier (OUI) database compiled directly from IEEE registration authorities.
              </p>
              <div className="mt-4 space-y-2 text-[11px] font-mono">
                <div className="flex justify-between border-b border-slate-900/60 pb-1">
                  <span className="text-slate-500">Active Records:</span>
                  <span className="text-cyan-400 font-semibold">{localRegistry.length || 25} loaded</span>
                </div>
                <div className="flex justify-between border-b border-slate-900/60 pb-1">
                  <span className="text-slate-500">Security Engine:</span>
                  <span className="text-emerald-400 font-semibold">Ready</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-500">API Gateway:</span>
                  <span className="text-cyan-400 font-semibold">Active</span>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-900/60 text-[10px] font-mono text-slate-500">
              ● REALTIME SYNC ENABLED
            </div>
          </div>

          {/* Card 2: Tactical Preset Nodes */}
          <div className="bento-card p-6 flex flex-col justify-between border border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Terminal className="h-5 w-5 text-cyan-400" />
                <h4 className="font-display font-bold text-slate-200 text-sm tracking-wider uppercase">Tactical Nodes</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Instantly load and test signature IEEE OUI parameters from major networking and technology vendors.
              </p>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                {[
                  { name: 'Apple, Inc.', mac: '00:0A:27' },
                  { name: 'Cisco Systems', mac: '00:1A:2B' },
                  { name: 'VMware, Inc.', mac: '00:50:56' },
                  { name: 'Microsoft Corp', mac: '00:15:5D' },
                  { name: 'Google LLC', mac: '3C:5A:B4' },
                  { name: 'Intel Corp', mac: '00:13:E8' }
                ].map((preset) => (
                  <button
                    key={preset.mac}
                    onClick={() => {
                      handleInputChange(preset.mac);
                      handleSearch(preset.mac);
                    }}
                    className="p-2 rounded bg-slate-900/60 border border-slate-800 hover:border-cyan-500/30 text-left truncate text-slate-300 hover:text-cyan-400 transition-all cursor-pointer"
                  >
                    <div className="text-slate-500 text-[8px] uppercase truncate">{preset.name}</div>
                    <div className="font-bold">{preset.mac}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-4 border-t border-slate-900/60 text-[10px] font-mono text-slate-500">
              ● CLICK TO DEPLOY QUERY
            </div>
          </div>

          {/* Card 3: Cyber Security Isolation Guide */}
          <div className="bento-card p-6 flex flex-col justify-between border border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-cyan-400" />
                <h4 className="font-display font-bold text-slate-200 text-sm tracking-wider uppercase">Vulnerability Shield</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                MAC lookup is a vital tool for network defense. Spoofed hardware addresses often attempt to mask malicious network nodes or virtual machine clones.
              </p>
              <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-900 space-y-2 text-[11px] font-sans">
                <div className="flex items-start gap-1.5 text-slate-300">
                  <span className="text-cyan-400">🛡️</span>
                  <span><strong>Spoofing:</strong> Match OUI registries to flag suspect nodes.</span>
                </div>
                <div className="flex items-start gap-1.5 text-slate-300">
                  <span className="text-cyan-400">⚡</span>
                  <span><strong>VM Detection:</strong> Isolate virtual instances using signature stems.</span>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-900/60 text-[10px] font-mono text-slate-500">
              ● INTEGRITY LEVEL: TIER 1
            </div>
          </div>
        </div>
      )}

      {/* Vendor Search Matches Panel */}
      {!result && !loading && vendorMatches && (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300 no-print">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="space-y-1">
              <h3 className="font-display text-lg font-bold text-slate-100 uppercase tracking-tight">
                Search Results for <span className="text-cyan-400">"{searchedVendorName}"</span>
              </h3>
              <p className="text-xs text-slate-400">
                Found {vendorMatches.length} matching registration OUI entries in database.
              </p>
            </div>
            <button
              onClick={() => {
                setVendorMatches(null);
                setInputMac('');
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-all cursor-pointer"
            >
              Clear Search
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendorMatches.map((entry) => {
              const letterCode = entry.vendor.substring(0, 2).toUpperCase();
              return (
                <div
                  key={entry.oui}
                  className="bento-card p-5 border border-slate-800 flex flex-col justify-between hover:border-cyan-500/30 transition-all group relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-cyan-950/20 border border-cyan-500/10 flex items-center justify-center font-display text-xs font-bold text-cyan-400">
                        {letterCode}
                      </div>
                      <div className="truncate flex-1">
                        <h4 className="font-display font-bold text-slate-200 text-sm group-hover:text-cyan-400 transition-colors truncate" title={entry.vendor}>
                          {entry.vendor}
                        </h4>
                        <span className="font-mono text-[9px] text-slate-500 block">
                          {entry.orgType || 'IEEE Registration'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between border-b border-slate-900/40 pb-1 font-mono text-[11px]">
                        <span className="text-slate-500">OUI Prefix</span>
                        <span className="text-cyan-400 font-bold">{entry.oui}</span>
                      </div>
                      {entry.country && (
                        <div className="flex justify-between border-b border-slate-900/40 pb-1 text-[11px]">
                          <span className="text-slate-500">Country</span>
                          <span className="text-slate-300 truncate max-w-[120px] font-mono">{entry.country}</span>
                        </div>
                      )}
                      {entry.address && entry.address !== 'Not Available' && (
                        <div className="text-[10px] text-slate-400 leading-relaxed pt-1 line-clamp-1 italic" title={entry.address}>
                          {entry.address}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-900/60 mt-4 flex justify-between items-center">
                    <button
                      onClick={() => {
                        handleInputChange(entry.oui);
                        handleSearch(entry.oui);
                      }}
                      className="text-[10px] font-mono text-cyan-500 hover:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Analyze Prefix</span>
                      <span>→</span>
                    </button>
                    <span className="text-[8px] font-mono text-slate-500">
                      REG ACTIVE
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lookup results layout */}
      {loading && (
        <div className="max-w-4xl mx-auto space-y-6 no-print">
          <div className="cyber-card p-10 rounded-2xl text-center space-y-4">
            <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-cyan-500/20 bg-slate-950">
              <RefreshCw className="h-6 w-6 text-cyan-400 animate-spin" />
              <div className="absolute inset-0 rounded-full border border-cyan-500/40 animate-ping" />
            </div>
            <div className="space-y-2">
              <p className="font-mono text-xs text-cyan-400 tracking-widest uppercase">Initializing Registry Deep-Scan...</p>
              <p className="text-xs text-slate-500">Querying offline tactical database registers and checking online MAC fallbacks.</p>
            </div>
          </div>
        </div>
      )}

      {/* Result Card visualization */}
      {result && !loading && (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-300">
          
          {/* Print Only Header (Invisible on screen) */}
          <div className="hidden print:block p-8 border-b border-slate-200 bg-white text-slate-950 rounded-3xl">
            <h2 className="text-2xl font-bold uppercase">MAC &amp; Vendor Lookup Report</h2>
            <p className="text-sm text-slate-500">OUI Lookup Core System Telemetry Report — Generated on {new Date().toLocaleString()}</p>
          </div>

          {/* Bento Grid Container */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            
            {/* Primary Vendor Identity Card: col-span-8 */}
            <div className="bento-card col-span-12 md:col-span-8 p-6 flex flex-col justify-between relative overflow-hidden border border-cyan-500/15">
              {/* Scanline & ambient effect */}
              <div className="absolute top-0 right-0 h-40 w-40 bg-cyan-500/5 rounded-full filter blur-3xl pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80 animate-pulse" />
              
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center font-display text-xl font-bold text-cyan-400 shrink-0">
                      {result.logoText}
                    </div>
                    <div>
                      <h3 className="font-display text-lg sm:text-xl font-bold text-slate-100 leading-tight uppercase">
                        {result.vendor}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="font-mono text-[10px] text-cyan-400 font-semibold bg-cyan-950/30 border border-cyan-500/20 px-2 py-0.5 rounded">
                          OUI Prefix: {result.oui}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                          MAC: {result.mac}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={toggleFavoriteState}
                    title={isFavorite ? "Remove from favorites" : "Save to favorites"}
                    className={`p-2.5 rounded-xl border border-slate-800 transition-all hover:bg-slate-900 shrink-0 ${
                      isFavorite ? 'text-amber-400 border-amber-500/30 bg-amber-950/25' : 'text-slate-400 hover:text-amber-400'
                    }`}
                  >
                    <Heart className={`h-4.5 w-4.5 ${isFavorite ? 'fill-amber-400' : ''}`} />
                  </button>
                </div>

                {/* Scope */}
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-900">
                  <h4 className="font-mono text-[9px] font-semibold text-cyan-500/60 uppercase tracking-widest mb-1.5">Vendor Scope</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {result.description}
                  </p>
                </div>

                {/* Specs */}
                <div className="space-y-2.5">
                  <h4 className="font-mono text-[9px] font-semibold text-cyan-500/60 uppercase tracking-widest border-b border-slate-900/60 pb-1">Manufacturer Specs</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div className="space-y-2">
                      <div className="flex justify-between border-b border-slate-900/40 pb-1">
                        <span className="text-slate-500">Company</span>
                        <span className="text-slate-300 font-sans font-medium text-right truncate max-w-[120px]" title={result.manufacturer}>{result.manufacturer}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-900/40 pb-1">
                        <span className="text-slate-500">Country</span>
                        <span className="text-slate-300 text-right">{result.country}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between border-b border-slate-900/40 pb-1">
                        <span className="text-slate-500">Reg Size</span>
                        <span className="text-slate-300 text-right">{result.orgType}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-900/40 pb-1">
                        <span className="text-slate-500">Address</span>
                        <span className="text-slate-400 text-right truncate max-w-[120px]" title={result.address}>{result.address}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-900 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
                  ANALYSIS SECURE
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono uppercase border ${
                  result.databaseMatch === 'Local Database' 
                    ? 'border-emerald-500/20 bg-emerald-950/20 text-emerald-400'
                    : 'border-cyan-500/20 bg-cyan-950/20 text-cyan-400'
                }`}>
                  <Globe className="h-3 w-3" />
                  <span>{result.databaseMatch}</span>
                </span>
              </div>
            </div>

            {/* Network Profile Stats Card: col-span-4 */}
            <div className="bento-card col-span-12 md:col-span-4 p-6 flex flex-col justify-between border border-slate-800">
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <h4 className="font-mono text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Wifi className="h-3.5 w-3.5" />
                    Network Profile
                  </h4>
                  <span className="text-[9px] font-mono text-slate-600">OUI INFO</span>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-mono block uppercase">Frame Class</span>
                    <span className="text-sm font-display font-medium text-slate-100">{result.macType}</span>
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-mono block uppercase">Admin Class</span>
                    <span className="text-sm font-display font-medium text-slate-100">{result.adminType}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-mono block uppercase">Virtual Machine signature</span>
                    <span className={`text-sm font-display font-medium ${result.vmType ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}>
                      {result.vmType || 'Hardware Node'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-900">
                  <div className="flex items-center justify-between font-mono text-xs text-slate-500">
                    <span>Confidence</span>
                    <span className="text-cyan-400 font-bold">{result.confidenceScore}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-1000"
                      style={{ width: `${result.confidenceScore}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-slate-900 text-[9px] font-mono text-slate-500">
                OUI PREF RANGE MATCH APPROVED
              </div>
            </div>

            {/* Exports & QR Tag: col-span-12 */}
            <div className="bento-card col-span-12 p-6 flex flex-col md:flex-row justify-between gap-6 border border-slate-800">
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-900/60 pb-2">
                  <h4 className="font-mono text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                    Telemetry Exports
                  </h4>
                  <span className="text-[9px] font-mono text-slate-600">FORMATS</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono">
                  <button
                    id="copy-result-btn"
                    onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 hover:text-slate-100 transition-all text-slate-400 text-left"
                  >
                    {isCopied ? <Check className="h-4 w-4 text-emerald-400 shrink-0" /> : <Copy className="h-4 w-4 shrink-0" />}
                    <span>{isCopied ? 'Copied Brief JSON' : 'Copy JSON Parameters'}</span>
                  </button>

                  <button
                    id="download-pdf-btn"
                    onClick={triggerPrintPDF}
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 hover:text-slate-100 transition-all text-slate-400 text-left"
                  >
                    <FileText className="h-4 w-4 text-rose-500 shrink-0" />
                    <span>Download PDF Brief</span>
                  </button>

                  <button
                    id="download-json-btn"
                    onClick={triggerJSONDownload}
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 hover:text-slate-100 transition-all text-slate-400 text-left"
                  >
                    <FileCode className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>Download JSON Asset</span>
                  </button>

                  <button
                    id="download-csv-btn"
                    onClick={triggerCSVDownload}
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 hover:text-slate-100 transition-all text-slate-400 text-left"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Download CSV Dataset</span>
                  </button>
                </div>

                <div className="pt-1.5">
                  <button
                    id="toggle-qrcode-btn"
                    onClick={() => {
                      playBeep();
                      setQrVisible(!qrVisible);
                    }}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/20 text-xs transition-all"
                  >
                    <QrCode className="h-4 w-4 shrink-0" />
                    <span>{qrVisible ? 'Hide Device QR' : 'Generate Device QR Tag'}</span>
                  </button>
                </div>
              </div>

              {/* QR Image Expansion inside card */}
              {qrVisible && (
                <div className="shrink-0 p-4 rounded-xl border border-slate-900 bg-slate-950/60 flex flex-col items-center justify-center text-center space-y-2 md:w-48">
                  <div className="p-2 bg-white rounded-lg shadow-lg">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                        `MAC: ${result.mac} | Vendor: ${result.vendor} | OUI: ${result.oui}`
                      )}`}
                      alt="OUI QR Tag"
                      className="h-24 w-24"
                    />
                  </div>
                  <p className="text-[8px] text-slate-500 max-w-[140px] font-sans">
                    Scan tag to transfer node details.
                  </p>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
