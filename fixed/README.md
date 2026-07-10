# MAC Address & Vendor Lookup Tactical Shield Tool

A premium, full-stack cybersecurity application designed for network forensics, asset inventory checks, packet analyzing diagnostics, and virtual node auditing. Built with standard **React (Vite) + Express**, featuring a large local database, automatic fallback live lookup, and dynamic **Gemini AI-powered security briefing intelligence**.

## Core High-Quality Features

1. **Hybrid OUI Resolution System**:
   - Searches local registry of registered IEEE organizational prefixes.
   - Graceful fallback: automatically queries public APIs (`macvendors.com` and `maclookup.app`) with asynchronous logic.
   - Dynamic caching saves results in the active registry store dynamically.

2. **Gemini AI Security Briefing**:
   - Analyzes matched vendor profiles using `gemini-3.5-flash` model.
   - Renders factual backgrounds, typical network profiles (IoT, Server, Client), threat models, sub-segmentation advisories, and firmware update recommendations.

3. **Telemetry & Real-Time Analytics**:
   - Premium dashboard analytics panels compiling search rates, matching sources (Local vs. Web), and country statistics.
   - Hand-drawn highly-responsive SVG charts (Pie donut metrics and bar charts).

4. **Forensic Audit Logs & History Drawer**:
   - Side drawer vault slides out to display query records.
   - Toggle star favorites and filter queries with full autocomplete suggestions.

5. **Administrative Console panel**:
   - Complete CRUD capabilities to manage OUI records locally.
   - Bulk synching with CSV import grids.
   - Backup storage: serialize database copies on-the-fly and restore backups.

6. **Interactive Learning & Training Diagrams**:
   - Fully interactive hex block deconstructor: click and highlight individual bytes to isolate OUI, NIC-specific octets, Multicast bits, and Local administration parameters.

## Architectural Deployment

The application is bundled into a self-contained ES module architecture on Node:
- **Build Phase**: Compiles the backend TypeScript router into a robust, high-performance CommonJS artifact `dist/server.cjs` with `esbuild`, completely avoiding Node ES relative importing concerns during cold starts.
- **Production Server**: Directly boots using `node dist/server.cjs` on Port `3000` with container ingressing protocols.
