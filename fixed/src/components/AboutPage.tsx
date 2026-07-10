/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { HelpCircle, Network, Info, ShieldCheck, Database, Layers, Radio } from 'lucide-react';

export default function AboutPage() {
  const [diagramSection, setDiagramSection] = useState<'oui' | 'nic' | 'multicast' | 'local' | null>(null);

  const macOctets = [
    { hex: '00', label: 'OUI', desc: 'Organizationally Unique Identifier (Byte 1)' },
    { hex: '1A', label: 'OUI', desc: 'Organizationally Unique Identifier (Byte 2)' },
    { hex: '2B', label: 'OUI', desc: 'Organizationally Unique Identifier (Byte 3)' },
    { hex: '3C', label: 'NIC', desc: 'Network Interface Specific (Byte 4)' },
    { hex: '4D', label: 'NIC', desc: 'Network Interface Specific (Byte 5)' },
    { hex: '5E', label: 'NIC', desc: 'Network Interface Specific (Byte 6)' }
  ];

  return (
    <div className="w-full space-y-8 max-w-5xl mx-auto">
      
      {/* Page Title */}
      <div className="border-b border-slate-900 pb-4">
        <h3 className="font-display text-xl font-bold text-slate-100 uppercase tracking-tight">
          MAC Architecture Learning Center
        </h3>
        <p className="text-xs text-slate-400">
          Deconstructing physical networking layers, IEEE OUI registries, and Ethernet framework standards.
        </p>
      </div>

      {/* Interactive Diagram Module */}
      <div className="cyber-card p-6 rounded-2xl space-y-6">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-cyan-400" />
          <h4 className="font-display text-sm font-bold text-slate-200 uppercase tracking-wider">
            Interactive MAC Address Blueprint
          </h4>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Hover or click the specific segments of the MAC address template below to inspect its structural registers, binary flags, and addressing properties.
        </p>

        {/* The interactive block diagram */}
        <div className="flex flex-col items-center justify-center p-6 bg-slate-950/40 rounded-xl border border-slate-900 space-y-6">
          <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-3">
            {macOctets.map((octet, idx) => {
              const isOui = idx < 3;
              const isSelected = 
                (diagramSection === 'oui' && isOui) || 
                (diagramSection === 'nic' && !isOui) ||
                (diagramSection === 'multicast' && idx === 0) ||
                (diagramSection === 'local' && idx === 0);
              
              return (
                <div key={idx} className="flex items-center">
                  <button
                    onClick={() => setDiagramSection(isOui ? 'oui' : 'nic')}
                    className={`h-14 w-14 sm:h-16 sm:w-16 rounded-xl font-mono text-base sm:text-xl font-bold flex flex-col items-center justify-center transition-all ${
                      isSelected
                        ? isOui
                          ? 'bg-cyan-950/40 border-2 border-cyan-400 text-cyan-400'
                          : 'bg-blue-950/40 border-2 border-blue-400 text-blue-400'
                        : isOui
                        ? 'border border-cyan-500/10 bg-slate-900 text-cyan-500/80 hover:border-cyan-400 hover:text-cyan-400'
                        : 'border border-blue-500/10 bg-slate-900 text-blue-500/80 hover:border-blue-400 hover:text-blue-400'
                    }`}
                  >
                    <span>{octet.hex}</span>
                    <span className="text-[8px] sm:text-[9px] opacity-60 font-sans tracking-wider uppercase mt-1">{octet.label}</span>
                  </button>
                  {idx < 5 && <span className="text-slate-600 font-mono text-lg font-bold ml-1 sm:ml-3">:</span>}
                </div>
              );
            })}
          </div>

          {/* Quick Sub-segment Flags (Multicast & Local Bits) */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setDiagramSection('multicast')}
              className={`px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase border transition-all ${
                diagramSection === 'multicast'
                  ? 'border-yellow-500 bg-yellow-950/20 text-yellow-400'
                  : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
              }`}
            >
              Multicast Bit Check (Byte 1, Bit 0)
            </button>
            <button
              onClick={() => setDiagramSection('local')}
              className={`px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase border transition-all ${
                diagramSection === 'local'
                  ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400'
                  : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
              }`}
            >
              Local Admin Bit Check (Byte 1, Bit 1)
            </button>
          </div>

          {/* Interactive Info Explanations */}
          <div className="w-full border-t border-slate-900 pt-4 min-h-[100px] flex items-start gap-3">
            <div className="p-2 rounded-lg bg-slate-900 text-cyan-400 mt-1 shrink-0">
              <Info className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              {diagramSection === 'oui' && (
                <>
                  <h5 className="font-display font-bold text-xs uppercase text-cyan-400">Organizationally Unique Identifier (OUI)</h5>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    The first 24 bits (3 octets) represent the OUI. This prefix is globally allocated and licensed by the IEEE Standards Association to specific manufacturing entities (e.g., Apple, Intel, Cisco, Microsoft). In network forensics, matching the OUI immediately reveals the physical chipset manufacturer.
                  </p>
                </>
              )}
              {diagramSection === 'nic' && (
                <>
                  <h5 className="font-display font-bold text-xs uppercase text-blue-400">Network Interface Controller (NIC) Specific Segment</h5>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    The last 24 bits (3 octets) are assigned uniquely by the manufacturer for each single network adapter they assemble. No two functional physical adapters in the world share the same OUI and NIC specific combination, guaranteeing unique local subnets and layer-2 collision avoidance.
                  </p>
                </>
              )}
              {diagramSection === 'multicast' && (
                <>
                  <h5 className="font-display font-bold text-xs uppercase text-yellow-400">Unicast / Multicast Bit Indicator</h5>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Look at the very first octet (byte 1). Its least significant bit determines whether the packet frame is intended for a single destination controller (<span className="text-cyan-400">0 = Unicast</span>) or broadcasted to multiple listener groups in the subnet (<span className="text-yellow-400">1 = Multicast</span>).
                  </p>
                </>
              )}
              {diagramSection === 'local' && (
                <>
                  <h5 className="font-display font-bold text-xs uppercase text-emerald-400">Universally vs. Locally Administered MAC Addresses</h5>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Look at the second least significant bit of the first octet. If the bit is set to <span className="text-cyan-400">0</span>, the MAC address is Universally Administered (UAA), set securely by the manufacturer. If set to <span className="text-emerald-400">1</span>, it is Locally Administered (LAA), meaning administrators or hypervisors (Docker, VMware) custom override the MAC locally.
                  </p>
                </>
              )}
              {!diagramSection && (
                <>
                  <h5 className="font-display font-bold text-xs uppercase text-slate-300">Click elements to inspect OUI telemetry</h5>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    MAC (Media Access Control) addresses reside in Layer 2 of the OSI communication stack. Click any segment above to read about OUI mapping systems and Ethernet packet parsing.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Core Educational Concepts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="cyber-card p-5 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 border-b border-slate-900 pb-2">
            <Network className="h-4 w-4" />
            <h4 className="font-display text-xs font-bold uppercase tracking-wider">What is a MAC Address?</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            A Media Access Control address is a physical, 48-bit (6-byte) serial number burned directly into a network interface card (NIC) at assembly. It allows network controllers to locate, route, and deliver individual frames of digital information inside Ethernet and Wi-Fi channels before translating them to internet protocol addresses.
          </p>
        </div>

        <div className="cyber-card p-5 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 border-b border-slate-900 pb-2">
            <ShieldCheck className="h-4 w-4" />
            <h4 className="font-display text-xs font-bold uppercase tracking-wider">Real-World Security Applications</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Cybersecurity officers and network architects use MAC analysis for inventory audits, active asset tracking, finding unauthorized rogue access nodes, discovering hidden virtual network adapters (Hyper-V/Docker clones), isolating firmware vulnerabilities based on vendor profiles, and implementing MAC address filtering protocols.
          </p>
        </div>

      </div>

    </div>
  );
}
