/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Shield, Radio, Terminal, History, Database, Cpu, HelpCircle, FileText, Settings, Volume2, VolumeX, Menu, X, CheckCircle } from 'lucide-react';
import { AppSettings } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
  openHistoryDrawer: () => void;
  dbCount: number;
}

export default function Header({
  activeTab,
  setActiveTab,
  settings,
  setSettings,
  openHistoryDrawer,
  dbCount
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [serverOnline, setServerOnline] = useState(true);
  const [dbSynced, setDbSynced] = useState(true);

  // Check backend server status
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          setServerOnline(true);
        } else {
          setServerOnline(false);
        }
      } catch (err) {
        setServerOnline(false);
      }
    };
    checkServer();
    const interval = setInterval(checkServer, 10000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'dashboard', name: 'Analyzer', icon: Terminal },
    { id: 'stats', name: 'Analytics', icon: Cpu },
    { id: 'about', name: 'Learn Core', icon: HelpCircle },
    { id: 'docs', name: 'Documentation', icon: FileText },
    { id: 'admin', name: 'Admin Console', icon: Database },
    { id: 'settings', name: 'Settings', icon: Settings }
  ];

  const playClick = () => {
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
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // high frequency click
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.05);
      } catch (e) {
        // AudioContext browser restrictions
      }
    }
  };

  const handleTabClick = (tabId: string) => {
    playClick();
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-cyan-500/10 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-slate-900 glow-cyan">
            <Shield className="h-5 w-5 text-cyan-400 animate-pulse" />
            <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <div>
            <h1 className="font-display text-sm font-semibold tracking-wider text-slate-100 uppercase sm:text-base">
              MAC &amp; <span className="text-cyan-400">Vendor</span>
            </h1>
            <p className="font-mono text-[9px] tracking-widest text-cyan-500/60 uppercase">
              Lookup Tool Core
            </p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                onClick={() => handleTabClick(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-display text-xs font-medium tracking-wide transition-all duration-200 uppercase ${
                  isActive
                    ? 'text-cyan-400 bg-cyan-950/20 border border-cyan-500/20 shadow-[0_0_12px_-3px_rgba(6,182,212,0.15)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Hardware Stats Indicators (Desktop only) */}
          <div className="hidden md:flex items-center gap-4 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/40 font-mono text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${serverOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span>SYS: {serverOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
            <div className="h-3 w-[1px] bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <Database className="h-3 w-3 text-cyan-400" />
              <span>OUI DB: {dbCount} RECS</span>
            </div>
          </div>

          {/* Audio Feedback Toggle */}
          <button
            id="toggle-sound-btn"
            onClick={() => {
              setSettings({ ...settings, soundEnabled: !settings.soundEnabled });
              playClick();
            }}
            title={settings.soundEnabled ? "Disable UI Audio Feed" : "Enable UI Audio Feed"}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/20 transition-all duration-150"
          >
            {settings.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Quick History Drawer Trigger */}
          <button
            id="open-history-btn"
            onClick={() => {
              playClick();
              openHistoryDrawer();
            }}
            title="Search Vault History"
            className="p-2 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/20 transition-all duration-150 relative"
          >
            <History className="h-4 w-4" />
          </button>

          {/* Mobile Menu Toggle */}
          <button
            id="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/20 transition-all"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-950 px-4 py-3 space-y-1 shadow-2xl animate-in slide-in-from-top duration-200">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-lg font-display text-xs font-medium tracking-wide uppercase transition-all ${
                  isActive
                    ? 'text-cyan-400 bg-cyan-950/20 border border-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </button>
            );
          })}

          <div className="pt-3 mt-3 border-t border-slate-900 flex items-center justify-between font-mono text-[9px] text-slate-500 px-3">
            <div className="flex items-center gap-1">
              <span className={`h-1 w-1 rounded-full ${serverOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span>SYS: {serverOnline ? 'ONLINE' : 'DISCONNECTED'}</span>
            </div>
            <span>OUI: {dbCount} ACTIVE</span>
          </div>
        </div>
      )}
    </header>
  );
}
