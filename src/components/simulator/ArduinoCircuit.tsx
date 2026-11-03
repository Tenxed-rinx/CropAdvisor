/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Cpu,
  Droplet,
  Thermometer,
  Zap,
  Waves,
  Sun,
  FlaskConical,
  X,
  Info,
  CheckCircle2
} from 'lucide-react';
import { soilAdcToPct, getMoistureStatus } from '../../lib/units';

interface ComponentDetail {
  id: string;
  name: string;
  category: string;
  pin: string;
  briefDetails: string;
  principle: string;
  operatingLimits: string;
  recommendedRange: string;
}

const COMPONENT_DATA: Record<string, ComponentDetail> = {
  soil: {
    id: 'soil',
    name: 'Soil Moisture Probe',
    category: 'Analog Resistive Sensor',
    pin: 'Pin A0 (Analog Input)',
    briefDetails: 'Directly detects water content in the plant root-zone to trigger irrigation when soil becomes dry.',
    principle: 'Electrical resistance principle: Moist soil contains dissolved mineral ions that conduct current freely (low ADC / high %). Dry soil resists electrical flow (high ADC / low %).',
    operatingLimits: '0 to 1023 ADC (0% to 100% Volumetric Water Content)',
    recommendedRange: '35% to 70% Moisture (Optimal crop growth band)'
  },
  dht: {
    id: 'dht',
    name: 'DHT22 Temperature & Humidity Sensor',
    category: 'Digital 1-Wire Sensor',
    pin: 'Pin D2 (Digital GPIO)',
    briefDetails: 'Monitors ambient field temperature and air humidity to detect crop heat stress and evapotranspiration rates.',
    principle: 'Uses a precision NTC thermistor for temperature and a polymer capacitive film that adsorbs moisture from the air to measure relative humidity.',
    operatingLimits: '-10°C to 80°C | 0% to 100% Air Humidity',
    recommendedRange: '18°C to 32°C Temperature | 45% to 75% Humidity'
  },
  relay: {
    id: 'relay',
    name: '5V Optoisolated Relay & Water Pump',
    category: 'Electro-mechanical Actuator',
    pin: 'Pin D7 (Digital Output Active HIGH)',
    briefDetails: 'Switches the submersible irrigation pump ON when soil dries out and OFF once adequate root hydration is restored.',
    principle: 'An optocoupler electrically isolates the 5V Arduino microcontroller from the inductive pump motor, switching electromagnetic contacts safely.',
    operatingLimits: '5V DC control coil / 250V AC 10A contacts',
    recommendedRange: 'Controlled automatically by hysteresis rules (ON > 500 ADC, OFF < 450 ADC)'
  },
  water: {
    id: 'water',
    name: 'Water Tank Depth Sensor',
    category: 'Analog Conductive Sensor',
    pin: 'Pin A2 (Analog Input)',
    briefDetails: 'Tracks remaining irrigation water in the supply reservoir to prevent the pump from running dry.',
    principle: 'Interleaved parallel copper traces measure conductivity proportional to the water immersion depth.',
    operatingLimits: '0 to 1023 ADC (0% to 100% tank volume)',
    recommendedRange: 'Maintain above 200 ADC (> 20% capacity) for safe pump operation'
  },
  ldr: {
    id: 'ldr',
    name: 'LDR Photoresistor (Sunlight Sensor)',
    category: 'Analog Optical Sensor',
    pin: 'Pin A1 (Analog Input)',
    briefDetails: 'Measures daylight intensity to gauge solar energy availability and daytime field evaporation rates.',
    principle: 'Photoconductive effect: Photons striking cadmium sulfide semiconductor material dislodge electrons, lowering sensor resistance.',
    operatingLimits: '0 ADC (Dark Night) to 1023 ADC (Full Sunlight)',
    recommendedRange: '400 to 900 ADC during active daytime crop growing hours'
  },
  ph: {
    id: 'ph',
    name: 'Analog Soil pH Sensor Module',
    category: 'Electrochemical Sensor (Simulated)',
    pin: 'Pin A3 (Analog Input)',
    briefDetails: 'Detects soil acidity or alkalinity to ensure fertilizers and micro-nutrients can be assimilated by roots.',
    principle: 'Measures the micro-voltage generated across a thin glass membrane proportional to hydrogen ion (H+) activity.',
    operatingLimits: '3.0 pH (Acidic) to 10.0 pH (Alkaline)',
    recommendedRange: '6.0 to 7.5 pH (Neutral range optimal for most Indian crops)'
  }
};

interface ArduinoCircuitProps {
  soilAdc: number;
  tempC: number;
  humidity: number;
  lightAdc: number;
  waterAdc: number;
  ph: number;
  pumpOn: boolean;
  running: boolean;
}

export const ArduinoCircuit: React.FC<ArduinoCircuitProps> = ({
  soilAdc,
  tempC,
  humidity,
  lightAdc,
  waterAdc,
  ph,
  pumpOn,
  running,
}) => {
  const [selectedCompId, setSelectedCompId] = useState<string>('soil');

  const soilPct = soilAdcToPct(soilAdc);
  const moistureStatus = getMoistureStatus(soilPct);

  const getReadingForComp = (id: string) => {
    switch (id) {
      case 'soil':
        return {
          value: `${soilPct}% (${soilAdc} ADC)`,
          status: moistureStatus,
          isOk: moistureStatus !== 'Dry'
        };
      case 'dht':
        return {
          value: `${tempC}°C · ${humidity}% Hum`,
          status: tempC > 35 ? 'High Temp Alert' : 'Normal',
          isOk: tempC <= 35
        };
      case 'relay':
        return {
          value: pumpOn ? 'PUMP ACTIVE (ON)' : 'STANDBY (OFF)',
          status: pumpOn ? 'Pumping Water' : 'Resting',
          isOk: true
        };
      case 'water':
        return {
          value: `${waterAdc} ADC (${Math.round((waterAdc / 1023) * 100)}%)`,
          status: waterAdc < 200 ? 'Low Tank Alert' : 'Adequate Water',
          isOk: waterAdc >= 200
        };
      case 'ldr':
        return {
          value: `${lightAdc} ADC`,
          status: lightAdc > 700 ? 'Bright Sunlight' : 'Ambient Light',
          isOk: true
        };
      case 'ph':
        return {
          value: `${ph.toFixed(1)} pH`,
          status: ph < 6.0 ? 'Acidic' : ph > 7.5 ? 'Alkaline' : 'Optimal Neutral',
          isOk: ph >= 6.0 && ph <= 7.5
        };
      default:
        return { value: '—', status: 'Active', isOk: true };
    }
  };

  const selectedData = COMPONENT_DATA[selectedCompId];
  const selectedReading = getReadingForComp(selectedCompId);

  return (
    <div className="bg-white rounded-2xl border border-[#2F6B3A]/15 p-5 shadow-xs space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-[#2F6B3A]" />
          <div>
            <h3 className="font-bold text-sm text-[#1F2A24]">
              Hardware Simulation Schematic
            </h3>
            <span className="text-[11px] text-[#5B665F]">
              Click any sensor or actuator module on the board to view its operating limits, status, and connection
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#5B665F]">
          <span className="flex items-center gap-1 font-mono text-[10px]">
            <span className="w-2.5 h-1 bg-red-500 rounded-sm"></span> 5V
          </span>
          <span className="flex items-center gap-1 font-mono text-[10px]">
            <span className="w-2.5 h-1 bg-neutral-800 rounded-sm"></span> GND
          </span>
          <span className="flex items-center gap-1 font-mono text-[10px]">
            <span className="w-2.5 h-1 bg-emerald-600 rounded-sm"></span> Signal
          </span>
        </div>
      </div>

      {/* SVG Circuit Schematic Diagram */}
      <div className="relative w-full bg-[#FAF7F0] rounded-xl border border-[#2F6B3A]/20 p-3 overflow-x-auto shadow-inner">
        <svg
          viewBox="0 0 760 420"
          className="w-full min-w-[620px] h-auto select-none font-sans"
        >
          <defs>
            <filter id="circuitGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="pumpActiveGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ================= WIRES ================= */}
          {/* Signal wires (Green) */}
          {/* Pin A0 to Soil Sensor */}
          <path
            d="M 330 330 L 330 360 L 130 360 L 130 305"
            fill="none"
            stroke="#16a34a"
            strokeWidth="2.5"
            strokeDasharray={running ? "5,5" : undefined}
          />
          {/* Pin A1 to LDR */}
          <path
            d="M 350 330 L 350 345 L 130 345 L 130 205"
            fill="none"
            stroke="#16a34a"
            strokeWidth="2.5"
          />
          {/* Pin A2 to Water Depth Sensor */}
          <path
            d="M 370 330 L 370 345 L 630 345 L 630 205"
            fill="none"
            stroke="#16a34a"
            strokeWidth="2.5"
          />
          {/* Pin A3 to pH Sensor */}
          <path
            d="M 390 330 L 390 360 L 630 360 L 630 305"
            fill="none"
            stroke="#16a34a"
            strokeWidth="2.5"
          />

          {/* Pin D2 to DHT22 */}
          <path
            d="M 330 100 L 330 50 L 130 50 L 130 105"
            fill="none"
            stroke="#16a34a"
            strokeWidth="2.5"
            strokeDasharray={running ? "5,5" : undefined}
          />
          {/* Pin D7 to Relay */}
          <path
            d="M 430 100 L 430 50 L 630 50 L 630 105"
            fill="none"
            stroke={pumpOn ? "#2F8F4E" : "#16a34a"}
            strokeWidth={pumpOn ? "3.5" : "2.5"}
            strokeDasharray={pumpOn ? "6,3" : undefined}
          />

          {/* 5V Power Rails (Red) */}
          <path d="M 320 330 L 320 375 L 650 375" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.7" />
          <path d="M 320 375 L 110 375" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.7" />
          {/* GND Rails (Black) */}
          <path d="M 340 330 L 340 385 L 650 385" fill="none" stroke="#1f2937" strokeWidth="1.5" strokeOpacity="0.7" />
          <path d="M 340 385 L 110 385" fill="none" stroke="#1f2937" strokeWidth="1.5" strokeOpacity="0.7" />

          {/* ================= ARDUINO UNO BOARD (Center) ================= */}
          <g transform="translate(270, 95)">
            {/* PCB Body */}
            <rect x="0" y="0" width="220" height="235" rx="10" fill="#0b5e82" stroke="#06435e" strokeWidth="2.5" />
            
            {/* USB Connector */}
            <rect x="-14" y="20" width="28" height="42" rx="3" fill="#cbd5e1" stroke="#94a3b8" />
            <rect x="-8" y="26" width="16" height="30" rx="1" fill="#475569" />

            {/* Power Jack */}
            <rect x="-14" y="150" width="30" height="45" rx="3" fill="#1e293b" stroke="#0f172a" />
            <circle cx="2" cy="172" r="5" fill="#64748b" />

            {/* ATmega328P DIP Chip */}
            <rect x="85" y="85" width="115" height="42" rx="3" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
            <text x="142" y="110" fill="#cbd5e1" fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              ATmega328P
            </text>
            {/* Chip Pins */}
            {[...Array(14)].map((_, i) => (
              <rect key={`tp-${i}`} x={90 + i * 7.5} y="81" width="3" height="4" fill="#cbd5e1" />
            ))}
            {[...Array(14)].map((_, i) => (
              <rect key={`bp-${i}`} x={90 + i * 7.5} y="127" width="3" height="4" fill="#cbd5e1" />
            ))}

            {/* Crystal Oscillator */}
            <rect x="35" y="90" width="16" height="30" rx="4" fill="#94a3b8" />
            <text x="43" y="108" fill="#334155" fontSize="7" fontFamily="monospace" textAnchor="middle">16MHz</text>

            {/* Top Digital Header */}
            <rect x="25" y="0" width="185" height="16" fill="#0f172a" rx="2" />
            <text x="60" y="12" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold">D2 (DHT)</text>
            <text x="145" y="12" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold">D7 (PUMP)</text>
            {[...Array(14)].map((_, i) => (
              <circle key={`dp-${i}`} cx={35 + i * 12.5} cy="8" r="2" fill="#e2e8f0" />
            ))}

            {/* Bottom Analog & Power Header */}
            <rect x="25" y="219" width="185" height="16" fill="#0f172a" rx="2" />
            <text x="60" y="231" fill="#4ade80" fontSize="9" fontFamily="monospace" fontWeight="bold">A0 (SOIL)</text>
            <text x="120" y="231" fill="#4ade80" fontSize="9" fontFamily="monospace" fontWeight="bold">A1</text>
            <text x="145" y="231" fill="#4ade80" fontSize="9" fontFamily="monospace" fontWeight="bold">A2</text>
            <text x="170" y="231" fill="#4ade80" fontSize="9" fontFamily="monospace" fontWeight="bold">A3</text>
            {[...Array(14)].map((_, i) => (
              <circle key={`ap-${i}`} cx={35 + i * 12.5} cy="227" r="2" fill="#e2e8f0" />
            ))}

            {/* Board Brand & Label */}
            <text x="110" y="160" fill="#ffffff" fontSize="15" fontWeight="bold">ARDUINO</text>
            <text x="110" y="176" fill="#7dd3fc" fontSize="11">UNO R3</text>
            <text x="110" y="196" fill="#bae6fd" fontSize="8" fontStyle="italic">Crop Advisor Hardware</text>

            {/* Status LEDs */}
            <circle cx="70" cy="55" r="3.5" fill="#22c55e" filter={running ? "url(#circuitGlow)" : undefined} />
            <text x="78" y="58" fill="#e2e8f0" fontSize="7">PWR</text>
            <circle cx="95" cy="55" r="3.5" fill={running ? "#eab308" : "#713f12"} />
            <text x="103" y="58" fill="#e2e8f0" fontSize="7">TX/RX</text>
          </g>

          {/* ================= COMPONENT MODULES ================= */}

          {/* 1. Soil Moisture Probe (Bottom Left) */}
          <g
            transform="translate(45, 235)"
            className="cursor-pointer"
            onClick={() => setSelectedCompId('soil')}
          >
            <rect
              x="0"
              y="0"
              width="170"
              height="75"
              rx="10"
              fill={selectedCompId === 'soil' ? '#F0FDF4' : '#FFFFFF'}
              stroke={selectedCompId === 'soil' ? '#2F6B3A' : '#94A3B8'}
              strokeWidth={selectedCompId === 'soil' ? '2.5' : '1.5'}
            />
            <rect x="0" y="0" width="170" height="24" rx="10" fill="#E8F1E4" />
            <text x="10" y="16" fill="#1F2A24" fontSize="10" fontWeight="bold">Soil Moisture Sensor</text>
            <text x="145" y="16" fill="#2F6B3A" fontSize="9" fontWeight="bold">A0</text>
            
            <text x="10" y="44" fill="#5B665F" fontSize="10">Moisture: <tspan fill="#2F6B3A" fontWeight="bold">{soilPct}%</tspan></text>
            <text x="10" y="60" fill="#5B665F" fontSize="10">Raw ADC: <tspan fill="#1F2A24" fontWeight="bold">{soilAdc}</tspan> · {moistureStatus}</text>
            
            {/* Visual probe icon */}
            <rect x="135" y="32" width="22" height="32" rx="3" fill="#6B4A2F" />
            <line x1="141" y1="38" x2="141" y2="58" stroke="#FFFFFF" strokeWidth="1.5" />
            <line x1="151" y1="38" x2="151" y2="58" stroke="#FFFFFF" strokeWidth="1.5" />
          </g>

          {/* 2. DHT22 Sensor (Top Left) */}
          <g
            transform="translate(45, 30)"
            className="cursor-pointer"
            onClick={() => setSelectedCompId('dht')}
          >
            <rect
              x="0"
              y="0"
              width="170"
              height="75"
              rx="10"
              fill={selectedCompId === 'dht' ? '#F0FDF4' : '#FFFFFF'}
              stroke={selectedCompId === 'dht' ? '#2F6B3A' : '#94A3B8'}
              strokeWidth={selectedCompId === 'dht' ? '2.5' : '1.5'}
            />
            <rect x="0" y="0" width="170" height="24" rx="10" fill="#E8F1E4" />
            <text x="10" y="16" fill="#1F2A24" fontSize="10" fontWeight="bold">DHT22 Temp & Humidity</text>
            <text x="145" y="16" fill="#2F6B3A" fontSize="9" fontWeight="bold">D2</text>

            <text x="10" y="44" fill="#5B665F" fontSize="10">Temp: <tspan fill="#C2410C" fontWeight="bold">{tempC}°C</tspan></text>
            <text x="10" y="60" fill="#5B665F" fontSize="10">Humidity: <tspan fill="#0284C7" fontWeight="bold">{humidity}%</tspan></text>
            
            <circle cx="145" cy="48" r="12" fill="#E0F2FE" />
            <path d="M 145 42 C 145 42 139 48 139 52 C 139 55 142 57 145 57 C 148 57 151 55 151 52 C 151 48 145 42 145 42 Z" fill="#0284C7" />
          </g>

          {/* 3. LDR Light Sensor (Middle Left) */}
          <g
            transform="translate(45, 130)"
            className="cursor-pointer"
            onClick={() => setSelectedCompId('ldr')}
          >
            <rect
              x="0"
              y="0"
              width="170"
              height="75"
              rx="10"
              fill={selectedCompId === 'ldr' ? '#F0FDF4' : '#FFFFFF'}
              stroke={selectedCompId === 'ldr' ? '#2F6B3A' : '#94A3B8'}
              strokeWidth={selectedCompId === 'ldr' ? '2.5' : '1.5'}
            />
            <rect x="0" y="0" width="170" height="24" rx="10" fill="#E8F1E4" />
            <text x="10" y="16" fill="#1F2A24" fontSize="10" fontWeight="bold">LDR Sunlight Sensor</text>
            <text x="145" y="16" fill="#2F6B3A" fontSize="9" fontWeight="bold">A1</text>

            <text x="10" y="44" fill="#5B665F" fontSize="10">Solar Light: <tspan fill="#D98A0B" fontWeight="bold">{lightAdc} ADC</tspan></text>
            <text x="10" y="60" fill="#5B665F" fontSize="10">Flux: {lightAdc > 700 ? 'Bright Noon' : 'Moderate Ambient'}</text>

            <circle cx="145" cy="48" r="10" fill="#FEF08A" stroke="#EAB308" />
            <circle cx="145" cy="48" r="4" fill="#CA8A04" />
          </g>

          {/* 4. Relay + Submersible Pump (Top Right) */}
          <g
            transform="translate(545, 30)"
            className="cursor-pointer"
            onClick={() => setSelectedCompId('relay')}
          >
            <rect
              x="0"
              y="0"
              width="170"
              height="75"
              rx="10"
              fill={pumpOn ? '#DCFCE7' : selectedCompId === 'relay' ? '#F0FDF4' : '#FFFFFF'}
              stroke={pumpOn ? '#22C55E' : selectedCompId === 'relay' ? '#2F6B3A' : '#94A3B8'}
              strokeWidth={pumpOn ? '2.5' : '1.5'}
              filter={pumpOn ? 'url(#pumpActiveGlow)' : undefined}
            />
            <rect x="0" y="0" width="170" height="24" rx="10" fill={pumpOn ? '#BBF7D0' : '#E8F1E4'} />
            <text x="10" y="16" fill="#1F2A24" fontSize="10" fontWeight="bold">5V Relay & Water Pump</text>
            <text x="145" y="16" fill="#2F6B3A" fontSize="9" fontWeight="bold">D7</text>

            <text x="10" y="44" fill="#5B665F" fontSize="10">State: <tspan fill={pumpOn ? '#15803D' : '#5B665F'} fontWeight="bold">{pumpOn ? 'PUMP ACTIVE (ON)' : 'STANDBY (OFF)'}</tspan></text>
            <text x="10" y="60" fill="#5B665F" fontSize="10">{pumpOn ? 'Irrigating crop soil...' : 'Soil adequately watered'}</text>

            <circle cx="145" cy="48" r="12" fill={pumpOn ? '#22C55E' : '#94A3B8'} />
            <path d="M 140 48 L 145 42 L 150 48 L 147 48 L 147 54 L 143 54 L 143 48 Z" fill="#FFFFFF" />
          </g>

          {/* 5. Water Depth Sensor (Middle Right) */}
          <g
            transform="translate(545, 130)"
            className="cursor-pointer"
            onClick={() => setSelectedCompId('water')}
          >
            <rect
              x="0"
              y="0"
              width="170"
              height="75"
              rx="10"
              fill={selectedCompId === 'water' ? '#F0FDF4' : '#FFFFFF'}
              stroke={selectedCompId === 'water' ? '#2F6B3A' : '#94A3B8'}
              strokeWidth={selectedCompId === 'water' ? '2.5' : '1.5'}
            />
            <rect x="0" y="0" width="170" height="24" rx="10" fill="#E8F1E4" />
            <text x="10" y="16" fill="#1F2A24" fontSize="10" fontWeight="bold">Water Tank Depth</text>
            <text x="145" y="16" fill="#2F6B3A" fontSize="9" fontWeight="bold">A2</text>

            <text x="10" y="44" fill="#5B665F" fontSize="10">Tank Level: <tspan fill="#0284C7" fontWeight="bold">{Math.round((waterAdc / 1023) * 100)}%</tspan></text>
            <text x="10" y="60" fill="#5B665F" fontSize="10">Raw ADC: {waterAdc} ({waterAdc < 200 ? 'Low Tank Alert' : 'Normal'})</text>

            {/* Tank Graphic */}
            <rect x="136" y="36" width="18" height="26" rx="2" fill="#E2E8F0" stroke="#94A3B8" />
            <rect
              x="137"
              y={61 - Math.max(2, (waterAdc / 1023) * 24)}
              width="16"
              height={Math.max(2, (waterAdc / 1023) * 24)}
              fill="#0EA5E9"
            />
          </g>

          {/* 6. pH Meter (Bottom Right) */}
          <g
            transform="translate(545, 235)"
            className="cursor-pointer"
            onClick={() => setSelectedCompId('ph')}
          >
            <rect
              x="0"
              y="0"
              width="170"
              height="75"
              rx="10"
              fill={selectedCompId === 'ph' ? '#F0FDF4' : '#FFFFFF'}
              stroke={selectedCompId === 'ph' ? '#2F6B3A' : '#94A3B8'}
              strokeWidth={selectedCompId === 'ph' ? '2.5' : '1.5'}
            />
            <rect x="0" y="0" width="170" height="24" rx="10" fill="#E8F1E4" />
            <text x="10" y="16" fill="#1F2A24" fontSize="10" fontWeight="bold">Soil pH Meter Module</text>
            <text x="145" y="16" fill="#2F6B3A" fontSize="9" fontWeight="bold">A3</text>

            <text x="10" y="44" fill="#5B665F" fontSize="10">Acidity Index: <tspan fill="#8B5CF6" fontWeight="bold">{ph.toFixed(1)} pH</tspan></text>
            <text x="10" y="60" fill="#5B665F" fontSize="10">{ph < 6.0 ? 'Acidic Soil' : ph > 7.5 ? 'Alkaline Soil' : 'Optimal Neutral'}</text>

            <rect x="136" y="38" width="18" height="24" rx="3" fill="#EDE9FE" stroke="#8B5CF6" />
            <text x="145" y="54" fill="#6D28D9" fontSize="9" fontWeight="bold" textAnchor="middle">pH</text>
          </g>

          {/* Central Instruction Tag */}
          <text x="380" y="405" fill="#5B665F" fontSize="11" textAnchor="middle">
            Click any sensor block to inspect operating principles, limits, and wiring connections.
          </text>
        </svg>
      </div>

      {/* Component Details Card (Brief details, principle, limits, readings, status, connection) */}
      {selectedData && selectedReading && (
        <div className="p-4 bg-[#FAF7F0] rounded-xl border-2 border-[#2F6B3A]/25 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#2F6B3A]/15">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#2F6B3A] block">
                {selectedData.category}
              </span>
              <h4 className="font-bold text-base text-[#1F2A24]">{selectedData.name}</h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-[#2F6B3A] text-white font-mono text-xs font-bold rounded-lg">
                Connection: {selectedData.pin}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Left: Purpose and Principle */}
            <div className="space-y-2">
              <div>
                <span className="font-bold text-[#1F2A24] block mb-0.5">Brief Details & Purpose:</span>
                <p className="text-[#5B665F] leading-relaxed">{selectedData.briefDetails}</p>
              </div>
              <div>
                <span className="font-bold text-[#1F2A24] block mb-0.5">Scientific Principle:</span>
                <p className="text-[#5B665F] leading-relaxed">{selectedData.principle}</p>
              </div>
            </div>

            {/* Right: Operational Limits, Current Reading & Status */}
            <div className="space-y-2.5 bg-white p-3.5 rounded-lg border border-neutral-200">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#1F2A24]">Current Live Reading:</span>
                <span className="font-mono font-bold text-sm text-[#2F6B3A]">{selectedReading.value}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#1F2A24]">Operating Status:</span>
                <span className={`font-semibold ${selectedReading.isOk ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {selectedReading.status}
                </span>
              </div>
              <div className="pt-2 border-t border-neutral-100">
                <span className="text-[10px] text-[#5B665F] block font-medium">Operating Sensor Limits:</span>
                <span className="text-xs font-mono text-[#1F2A24]">{selectedData.operatingLimits}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#5B665F] block font-medium">Recommended Normal Range:</span>
                <span className="text-xs font-semibold text-[#2F6B3A]">{selectedData.recommendedRange}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
