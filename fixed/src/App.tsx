/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Shield, Terminal, Cpu, Database, HelpCircle, FileText, Settings, History, Star, Trash2, X, Check, Globe
} from 'lucide-react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import StatsPage from './components/StatsPage';
import AboutPage from './components/AboutPage';
import DocsPage from './components/DocsPage';
import AdminPanel from './components/AdminPanel';
import SettingsPage from './components/SettingsPage';
import { AppSettings, SearchHistoryItem } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dbCount, setDbCount] = useState(25); // default loaded entries count
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'cyber-dark',
    animationSpeed: 'normal',
    fontSize: 'md',
    notificationsEnabled: true,
    soundEnabled: true
  });

  // History Drawer state
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historyList, setHistoryList] = useState<SearchHistoryItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Ref trigger for launching searches from external panels (like clicking history items)
  const triggerSearchRef = useRef<((mac: string) => void) | null>(null);

  // Sync favorites list from LocalStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('oui_favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  const saveFavoritesToStorage = (updated: string[]) => {
    setFavorites(updated);
    localStorage.setItem('oui_favorites', JSON.stringify(updated));
  };

  const toggleFavorite = (oui: string) => {
    const updated = favorites.includes(oui)
      ? favorites.filter(item => item !== oui)
      : [...favorites, oui];
    saveFavoritesToStorage(updated);
  };

  // Refresh active history list
  const refreshHistory = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data.searchHistory || []);
      }
    } catch (err) {
      console.warn('Backend offline, search history loaded empty.', err);
    }
  };

  useEffect(() => {
    refreshHistory();
    // Refresh history logs periodically
    const interval = setInterval(refreshHistory, 15000);
    return () => clearInterval(interval);
  }, []);

  // Sync theme changes to html body attributes for custom styling rules
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('cyber-dark', 'stealth-gray', 'neon-light');
    if (settings.theme === 'cyber-dark') {
      root.classList.add('cyber-dark');
      document.body.style.backgroundColor = '#020617'; // deep tailwind slate-950
      document.body.style.color = '#f8fafc';
    } else if (settings.theme === 'stealth-gray') {
      root.classList.add('stealth-gray');
      document.body.style.backgroundColor = '#0f172a'; // dark steel slate-900
      document.body.style.color = '#e2e8f0';
    } else {
      root.classList.add('neon-light');
      document.body.style.backgroundColor = '#f8fafc'; // pure tailwind slate-50
      document.body.style.color = '#0f172a';
    }
  }, [settings.theme]);

  const handleHistoryItemClick = (mac: string) => {
    setActiveTab('dashboard');
    setHistoryDrawerOpen(false);
    // Trigger dashboard search ref on next tick
    setTimeout(() => {
      if (triggerSearchRef.current) {
        triggerSearchRef.current(mac);
      }
    }, 100);
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 font-sans antialiased selection:bg-cyan-500 selection:text-slate-950 ${
      settings.theme === 'neon-light' ? 'text-slate-900 bg-slate-50' : 'text-slate-100 bg-slate-950'
    }`}>
      
      {/* Dynamic scanline cosmetic effect */}
      <div className="scanline-effect no-print" />

      {/* Grid overlay background */}
      <div className="fixed inset-0 cyber-grid-bg opacity-40 pointer-events-none no-print" />

      {/* Header bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settings={settings}
        setSettings={setSettings}
        openHistoryDrawer={() => setHistoryDrawerOpen(true)}
        dbCount={dbCount}
      />

      {/* Main Page Layout Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* Render Active View Tab */}
        {activeTab === 'dashboard' && (
          <Dashboard
            settings={settings}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            triggerSearchRef={triggerSearchRef}
            setDbCount={setDbCount}
          />
        )}
        
        {activeTab === 'stats' && (
          <StatsPage
            setDbCount={setDbCount}
          />
        )}
        
        {activeTab === 'about' && <AboutPage />}
        
        {activeTab === 'docs' && <DocsPage />}
        
        {activeTab === 'admin' && (
          <AdminPanel
            setDbCount={setDbCount}
          />
        )}
        
        {activeTab === 'settings' && (
          <SettingsPage
            settings={settings}
            setSettings={setSettings}
          />
        )}

      </main>

      {/* Search Vault History Drawer (Slide-in from right) */}
      {historyDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden no-print">
          {/* Backdrop blur */}
          <div 
            onClick={() => setHistoryDrawerOpen(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md">
              <div className="h-full flex flex-col bg-slate-950 border-l border-slate-800 shadow-2xl relative">
                
                {/* Drawer Header */}
                <div className="p-6 border-b border-slate-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-cyan-400" />
                    <h3 className="font-display text-sm font-bold text-slate-100 uppercase tracking-wider">
                      Audit Search Vault
                    </h3>
                  </div>
                  <button 
                    onClick={() => setHistoryDrawerOpen(false)}
                    className="p-1 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-100"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* Drawer Scrollable Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                  {historyList.length > 0 ? (
                    historyList.map((item) => {
                      const isFav = favorites.includes(item.mac.substring(0, 8));
                      return (
                        <div 
                          key={item.id}
                          className="p-3.5 rounded-xl border border-slate-900 bg-slate-900/40 hover:bg-slate-900 transition-all flex items-center justify-between gap-4 cursor-pointer"
                        >
                          <div 
                            onClick={() => handleHistoryItemClick(item.mac)}
                            className="flex-1 min-w-0"
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="font-mono text-xs font-bold text-cyan-400">{item.mac}</span>
                              <span className={`text-[8px] font-mono uppercase px-1 py-0.5 rounded ${
                                item.databaseMatch === 'Local Database' 
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/10'
                                  : 'bg-cyan-950 text-cyan-400 border border-cyan-500/10'
                              }`}>
                                {item.databaseMatch === 'Local Database' ? 'Local' : 'Live'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 font-sans truncate font-medium">{item.vendor}</p>
                            <p className="text-[9px] text-slate-500 font-mono mt-0.5">{new Date(item.timestamp).toLocaleTimeString()}</p>
                          </div>

                          <button
                            onClick={() => toggleFavorite(item.mac.substring(0, 8))}
                            className={`p-1.5 rounded bg-slate-950 hover:bg-slate-900 transition-colors ${
                              isFav ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'
                            }`}
                          >
                            <Star className={`h-4 w-4 ${isFav ? 'fill-amber-400' : ''}`} />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-20 font-mono text-xs text-slate-600">
                      Search Vault empty. Analyze a MAC address header inside Analyzer.
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Elegant Cyber Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 mt-12 text-center text-[10px] font-mono text-slate-500 relative z-10 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-cyan-500" />
            <span>Tactical MAC & Vendor Lookup Core Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[9px]">ISO/IEC 8802 Ethernet Std</span>
            <span>IEEE Registry Compliant</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
