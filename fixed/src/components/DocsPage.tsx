/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  FileText, Code, CheckCircle, HelpCircle, ChevronDown, ChevronUp, Copy, BookOpen, Key
} from 'lucide-react';

export default function DocsPage() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const codeSnippets = {
    curl: `curl -X POST http://localhost:3000/api/lookup \\
  -H "Content-Type: application/json" \\
  -d '{"mac": "00:1C:B3:09:85:2E"}'`,
    fetch: `const response = await fetch('/api/lookup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    mac: '00:1C:B3:09:85:2E'
  })
});
const data = await response.json();
console.log(data.vendor); // "Apple Inc."`,
    node: `import fetch from 'node-fetch';

async function queryMAC(macAddress) {
  const res = await fetch('http://localhost:3000/api/lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mac: macAddress })
  });
  return await res.json();
}`
  };

  const faqs = [
    {
      q: 'Does this application support modern IPv6 addresses?',
      a: 'No. This application parses physical Layer 2 MAC addresses (Ethernet Hardware Identifiers). IPv6 addresses are logical Layer 3 parameters used for internet-level routing.'
    },
    {
      q: 'Can physical hardware MAC addresses be dynamically spoofed?',
      a: 'Yes. Most operating systems and virtual machines support MAC cloning/spoofing by activating Locally Administered MAC indicators, temporarily overwriting standard burnt-in factory codes.'
    },
    {
      q: 'How does the hybrid lookup system operate?',
      a: 'The system first scans our offline local registry containing thousands of registered IEEE entries. If the prefix is unresolved, it securely proxies requests to dependable online OUI database API endpoints (e.g., macvendors.com) before caching findings locally.'
    }
  ];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(key);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="w-full space-y-8 max-w-5xl mx-auto">
      
      {/* Page Title */}
      <div className="border-b border-slate-900 pb-4">
        <h3 className="font-display text-xl font-bold text-slate-100 uppercase tracking-tight">
          System Integration & Documentation
        </h3>
        <p className="text-xs text-slate-400">
          Guide details for utilizing MAC and Vendor Lookup REST endpoints, code integrations, and FAQs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* API Reference Guide */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="cyber-card p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-cyan-400">
              <Code className="h-5 w-5" />
              <h4 className="font-display text-sm font-bold uppercase tracking-wider">REST API Integration</h4>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Incorporate our secure MAC analytical service directly into corporate security consoles or command line scripts.
            </p>

            {/* HTTP Definition Box */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="bg-cyan-950 text-cyan-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded">POST</span>
                <span className="font-mono text-xs text-slate-300">/api/lookup</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Payload: JSON</span>
            </div>

            {/* Code tabs */}
            <div className="space-y-4">
              
              {/* cURL Snippet */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[10px] text-slate-500">
                  <span>cURL Command Line Shell</span>
                  <button 
                    onClick={() => handleCopy(codeSnippets.curl, 'curl')}
                    className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
                  >
                    {copiedSection === 'curl' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="p-4 bg-slate-950 text-cyan-500 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-900">
                  {codeSnippets.curl}
                </pre>
              </div>

              {/* Javascript Fetch */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[10px] text-slate-500">
                  <span>Standard Javascript (Fetch API)</span>
                  <button 
                    onClick={() => handleCopy(codeSnippets.fetch, 'fetch')}
                    className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
                  >
                    {copiedSection === 'fetch' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="p-4 bg-slate-950 text-slate-300 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-900">
                  {codeSnippets.fetch}
                </pre>
              </div>

            </div>

          </div>

        </div>

        {/* Sidebar Help / FAQ accordion */}
        <div className="space-y-6">
          
          <div className="cyber-card p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 border-b border-slate-900 pb-2">
              <BookOpen className="h-4 w-4" />
              <h4 className="font-display text-xs font-bold uppercase tracking-wider">Frequently Asked Questions</h4>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = activeFaq === idx;
                return (
                  <div key={idx} className="border-b border-slate-900 pb-3 last:border-0 last:pb-0">
                    <button
                      onClick={() => setActiveFaq(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between text-left text-xs font-medium text-slate-300 hover:text-cyan-400 transition-all font-sans"
                    >
                      <span className="pr-4">{faq.q}</span>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                    </button>
                    {isOpen && (
                      <p className="mt-2 text-xs text-slate-500 leading-relaxed font-sans pl-1">
                        {faq.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Security Best Practice */}
          <div className="cyber-card p-5 rounded-2xl bg-gradient-to-br from-cyan-950/20 to-slate-950 border border-cyan-500/10 space-y-2">
            <h5 className="font-mono text-[10px] text-cyan-400 uppercase tracking-widest font-semibold">Security Advisory</h5>
            <p className="text-xs text-slate-400 leading-relaxed">
              MAC authentication filters must never represent a standalone security threshold in subnets, as hexadecimal headers are completely transparent inside standard Layer 2 channels and trivially bypassed via software overrides.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
