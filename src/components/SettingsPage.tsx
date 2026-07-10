/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  Settings, CheckCircle, Volume2, VolumeX, Eye, Sparkles, RefreshCw, AlertCircle
} from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsPageProps {
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
}

export default function SettingsPage({ settings, setSettings }: SettingsPageProps) {
  const [success, setSuccess] = useState(false);

  const handleSave = () => {
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    if (!confirm('Are you sure you want to restore application parameters to standard factory specifications?')) {
      return;
    }
    setSettings({
      theme: 'cyber-dark',
      animationSpeed: 'normal',
      fontSize: 'md',
      notificationsEnabled: true,
      soundEnabled: true
    });
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="w-full space-y-8 max-w-4xl mx-auto font-mono text-xs">
      
      {/* Title */}
      <div className="border-b border-slate-900 pb-4 font-sans">
        <h3 className="text-xl font-bold text-slate-100 uppercase tracking-tight">
          System Parameters & Configuration
        </h3>
        <p className="text-xs text-slate-400">
          Modify theme presets, animation frame thresholds, interface audio feedback parameters, and telemetry scopes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Visual Themes Card */}
        <div className="cyber-card p-5 rounded-2xl space-y-4 md:col-span-2">
          <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest border-b border-slate-900 pb-2">Visual Core Presets</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            <button
              onClick={() => setSettings({ ...settings, theme: 'cyber-dark' })}
              className={`p-4 rounded-xl border text-left space-y-2 transition-all ${
                settings.theme === 'cyber-dark' 
                  ? 'border-cyan-500 bg-cyan-950/20 text-cyan-400' 
                  : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Eye className="h-4 w-4" />
              <p className="font-bold text-[10px] uppercase">Cyber Dark</p>
              <p className="text-[9px] text-slate-500 font-sans leading-relaxed">Sleek cybersecurity operations dark Navy/Cyan palette.</p>
            </button>

            <button
              onClick={() => setSettings({ ...settings, theme: 'stealth-gray' })}
              className={`p-4 rounded-xl border text-left space-y-2 transition-all ${
                settings.theme === 'stealth-gray' 
                  ? 'border-slate-400 bg-slate-800/40 text-slate-200' 
                  : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Settings className="h-4 w-4" />
              <p className="font-bold text-[10px] uppercase">Stealth Gray</p>
              <p className="text-[9px] text-slate-500 font-sans leading-relaxed">Monochrome terminal aesthetics inspired by UNIX consoles.</p>
            </button>

            <button
              onClick={() => setSettings({ ...settings, theme: 'neon-light' })}
              className={`p-4 rounded-xl border text-left space-y-2 transition-all ${
                settings.theme === 'neon-light' 
                  ? 'border-cyan-500 bg-slate-100 text-slate-900' 
                  : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <p className="font-bold text-[10px] uppercase text-slate-300 select-none">Light Presets</p>
              <p className="text-[9px] text-slate-500 font-sans leading-relaxed select-none">High contrast light blueprints optimized for daylight audits.</p>
            </button>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            
            <div className="space-y-1">
              <label className="text-slate-500">Animation Framerate Scope</label>
              <select
                value={settings.animationSpeed}
                onChange={(e) => setSettings({ ...settings, animationSpeed: e.target.value as any })}
                className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 focus:outline-none focus:border-cyan-400"
              >
                <option value="fast">High Refresh (Fast Frames)</option>
                <option value="normal">Symmetric Standard (Normal Frames)</option>
                <option value="slow">Low Resource Cycles (Slow Frames)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-500">Global Typography Scale</label>
              <select
                value={settings.fontSize}
                onChange={(e) => setSettings({ ...settings, fontSize: e.target.value as any })}
                className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 focus:outline-none focus:border-cyan-400"
              >
                <option value="sm">Compact forensic print (Small)</option>
                <option value="md">Balanced terminal standard (Medium)</option>
                <option value="lg">Expanded console display (Large)</option>
              </select>
            </div>

          </div>
        </div>

        {/* Audio Alerts & Factory reset */}
        <div className="space-y-6">
          
          <div className="cyber-card p-5 rounded-2xl space-y-4">
            <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest border-b border-slate-900 pb-2">Audio & Signals</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-[10px] uppercase font-bold">Feedback Chimes</p>
                  <p className="text-[9px] text-slate-500 font-sans leading-relaxed">Emits high-frequency sine beeps on actions.</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
                  className={`p-2 rounded-lg border transition-all ${
                    settings.soundEnabled ? 'border-cyan-500/30 text-cyan-400' : 'border-slate-800 text-slate-500'
                  }`}
                >
                  {settings.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-[10px] uppercase font-bold">In-App Notifications</p>
                  <p className="text-[9px] text-slate-500 font-sans leading-relaxed">Renders screen alerts for success and updates.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notificationsEnabled}
                  onChange={(e) => setSettings({ ...settings, notificationsEnabled: e.target.checked })}
                  className="rounded border-slate-800 bg-slate-900 text-cyan-400 focus:ring-0 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Quick Resets */}
          <div className="cyber-card p-5 rounded-2xl space-y-3">
            <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest border-b border-slate-900 pb-2">Factory Reset</h4>
            <p className="text-[9px] text-slate-500 font-sans leading-relaxed">Restore standard visual parameters immediately.</p>
            <button
              onClick={handleResetDefaults}
              className="w-full px-3 py-2 rounded-xl border border-rose-500/20 bg-rose-950/15 text-rose-400 hover:bg-rose-500 hover:text-slate-950 transition-all text-[10px] uppercase font-bold"
            >
              Restore Defaults
            </button>
          </div>

        </div>

      </div>

      {success && (
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/20 text-emerald-400 flex items-center gap-3">
          <CheckCircle className="h-5 w-5" />
          <span>Application parameters saved successfully.</span>
        </div>
      )}

    </div>
  );
}
