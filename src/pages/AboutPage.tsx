/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Cpu,
  Database,
  ExternalLink,
  Target,
  AlertCircle,
  Sparkles
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header (Only main heading kept per requirement 1) */}
      <div className="bg-white rounded-2xl border border-[#2F6B3A]/15 p-6 shadow-xs">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2A24]">
          Methodology, Hardware & Agronomic Architecture
        </h1>
      </div>

      {/* Problem Statement & Objectives */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-[#2F6B3A]/15 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-[#C2410C]">
            <Target className="w-5 h-5" />
            <h3 className="font-bold text-base text-[#1F2A24]">Problem Statement</h3>
          </div>
          <p className="text-xs text-[#5B665F] leading-relaxed">
            Many smallholder and marginal farmers select crops based solely on historical precedent or peer imitation without understanding their soil's actual physical structure, pH balance, or moisture retention capacity. This leads to improper crop-soil mismatch, soil degradation from over-irrigation, and reduced farm profitability.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#2F6B3A]/15 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-[#2F6B3A]">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-bold text-base text-[#1F2A24]">Core Objectives</h3>
          </div>
          <ul className="text-xs text-[#5B665F] space-y-2 list-disc pl-4 leading-relaxed">
            <li>Emulate an edge IoT soil sensing node with calibrated analog-to-digital conversions.</li>
            <li>Implement closed-loop firmware hysteresis control for smart irrigation.</li>
            <li>Classify soils into USDA texture triangles and Indian regional soil types.</li>
            <li>Score crops dynamically using agronomic suitability and market economics.</li>
            <li>Demonstrate modern data quality audits, outlier filtering, and clustering.</li>
          </ul>
        </div>
      </div>

      {/* Hardware Materials Table ("Bill" removed per requirement 4) */}
      <div className="bg-white rounded-2xl p-6 border border-[#2F6B3A]/15 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-[#2F6B3A]" />
          <h3 className="font-bold text-base text-[#1F2A24]">Hardware Materials (Emulated Architecture)</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#2F6B3A]/15 text-[#5B665F]">
                <th className="py-2.5 px-3">Component</th>
                <th className="py-2.5 px-3">Arduino Pin</th>
                <th className="py-2.5 px-3">Signal Type</th>
                <th className="py-2.5 px-3">Calibrated Range</th>
                <th className="py-2.5 px-3">Working Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-mono text-[11px]">
              <tr className="hover:bg-[#FAF7F0]">
                <td className="py-2 px-3 font-semibold text-[#1F2A24] font-sans">Arduino UNO R3</td>
                <td className="py-2 px-3">ATmega328P</td>
                <td className="py-2 px-3 font-sans">Microcontroller</td>
                <td className="py-2 px-3">16 MHz / 5V Logic</td>
                <td className="py-2 px-3 font-sans text-xs">Central processing & firmware hysteresis loop</td>
              </tr>
              <tr className="hover:bg-[#FAF7F0]">
                <td className="py-2 px-3 font-semibold text-[#1F2A24] font-sans">Soil Moisture Probe</td>
                <td className="py-2 px-3">Pin A0</td>
                <td className="py-2 px-3 font-sans">Analog ADC</td>
                <td className="py-2 px-3">200 (Wet) - 1023 (Dry)</td>
                <td className="py-2 px-3 font-sans text-xs">Measures soil conductivity / water availability</td>
              </tr>
              <tr className="hover:bg-[#FAF7F0]">
                <td className="py-2 px-3 font-semibold text-[#1F2A24] font-sans">GL5528 Photoresistor (LDR)</td>
                <td className="py-2 px-3">Pin A1</td>
                <td className="py-2 px-3 font-sans">Analog ADC</td>
                <td className="py-2 px-3">0 (Dark) - 1023 (Sunlight)</td>
                <td className="py-2 px-3 font-sans text-xs">Detects solar exposure & daylight hours</td>
              </tr>
              <tr className="hover:bg-[#FAF7F0]">
                <td className="py-2 px-3 font-semibold text-[#1F2A24] font-sans">Submersible Depth Sensor</td>
                <td className="py-2 px-3">Pin A2</td>
                <td className="py-2 px-3 font-sans">Analog ADC</td>
                <td className="py-2 px-3">0 (Empty) - 1023 (Full)</td>
                <td className="py-2 px-3 font-sans text-xs">Tank depth monitor; dry-run pump lockout protection</td>
              </tr>
              <tr className="hover:bg-[#FAF7F0]">
                <td className="py-2 px-3 font-semibold text-[#1F2A24] font-sans">Analog pH Meter Module</td>
                <td className="py-2 px-3">Pin A3</td>
                <td className="py-2 px-3 font-sans">Analog ADC</td>
                <td className="py-2 px-3">3.0 - 10.0 pH Units</td>
                <td className="py-2 px-3 font-sans text-xs">Soil solution acidity index</td>
              </tr>
              <tr className="hover:bg-[#FAF7F0]">
                <td className="py-2 px-3 font-semibold text-[#1F2A24] font-sans">DHT22 Digital Sensor</td>
                <td className="py-2 px-3">Pin D2</td>
                <td className="py-2 px-3 font-sans">1-Wire Digital</td>
                <td className="py-2 px-3">-40 to 80°C / 0-100% RH</td>
                <td className="py-2 px-3 font-sans text-xs">Calibrated ambient temperature & air humidity</td>
              </tr>
              <tr className="hover:bg-[#FAF7F0]">
                <td className="py-2 px-3 font-semibold text-[#1F2A24] font-sans">5V Relay & Water Pump</td>
                <td className="py-2 px-3">Pin D7</td>
                <td className="py-2 px-3 font-sans">Digital Output</td>
                <td className="py-2 px-3">Active HIGH (5V)</td>
                <td className="py-2 px-3 font-sans text-xs">Irrigation actuator triggered by hysteresis rules</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Dataset Sources */}
      <div className="bg-white rounded-2xl p-6 border border-[#2F6B3A]/15 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-[#2F6B3A]" />
          <h3 className="font-bold text-base text-[#1F2A24]">Dataset Citations & Attribution</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-[#FAF7F0] rounded-xl border border-neutral-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#1F2A24]">Government Mandi Prices (Agmarknet)</span>
              <a
                href="https://data.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2F6B3A] flex items-center gap-1 hover:underline"
              >
                <span>data.gov.in</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[#5B665F] text-[11px]">
              Snapshot dataset containing state-wise modal prices, min/max spreads, and MSP rates across Indian APMC mandis.
            </p>
          </div>

          <div className="p-3.5 bg-[#FAF7F0] rounded-xl border border-neutral-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#1F2A24]">Crop Recommendation Agronomic Dataset</span>
              <a
                href="https://www.kaggle.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2F6B3A] flex items-center gap-1 hover:underline"
              >
                <span>Kaggle</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[#5B665F] text-[11px]">
              Peer-reviewed experimental agricultural data benchmarking N, P, K, pH, and rainfall tolerances across 22 crops.
            </p>
          </div>
        </div>
      </div>

      {/* Assumptions, Limitations & Future Scope */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-[#2F6B3A]/15 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-bold text-base text-[#1F2A24]">Assumptions & Practical Considerations</h3>
          </div>
          <ul className="text-xs text-[#5B665F] space-y-1.5 list-disc pl-4 leading-relaxed">
            <li>Virtual sensors run within browser event loop with realistic natural variations.</li>
            <li>Market prices represent historical Agmarknet samples for seasonal planning.</li>
            <li>Decision logic utilizes transparent multi-criteria scoring rather than unexplainable black boxes.</li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#2F6B3A]/15 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-[#2F6B3A]">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-bold text-base text-[#1F2A24]">Future Enhancements</h3>
          </div>
          <ul className="text-xs text-[#5B665F] space-y-1.5 list-disc pl-4 leading-relaxed">
            <li>Physical ESP32 hardware telemetry streaming over MQTT protocol.</li>
            <li>Multi-season historical yield trend tracking across district clusters.</li>
            <li>Direct SMS broadcasts and weather alerts in vernacular languages.</li>
            <li>Drone multispectral aerial imaging for field-wide crop stress mapping.</li>
          </ul>
        </div>
      </div>

      {/* Agronomic Advisory Disclaimer Banner (Requirement 6) */}
      <div className="p-4 bg-[#FAF7F0] rounded-xl border border-[#2F6B3A]/20 flex items-center gap-3 text-xs text-[#5B665F]">
        <AlertCircle className="w-5 h-5 text-[#2F6B3A] shrink-0" />
        <div>
          <strong className="text-[#1F2A24] block">Crop Moisture & Irrigation Threshold Advisory:</strong>
          <span>Indicative values, verify with your state agriculture department and local Krishi Vigyan Kendra (KVK) for field-specific irrigation recommendations.</span>
        </div>
      </div>
    </div>
  );
};
