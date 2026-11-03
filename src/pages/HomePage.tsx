/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Play,
  ArrowRight,
  Droplet,
  Thermometer,
  CloudSun,
  Waves,
  Sparkles,
  Layers,
  Sprout
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getMoistureStatus } from '../lib/units';
import { scoreAllCrops } from '../lib/cropScoring';

export const HomePage: React.FC = () => {
  const { readings, crops, activeSoilProfile, farmerInputs } = useApp();

  // Hero Live Preview values that gently cycle every 2 seconds
  const [livePreview, setLivePreview] = useState({
    soilMoisturePct: 54,
    soilAdc: 580,
    tempC: 27.2,
    humidityPct: 62,
    waterLevelAdc: 640
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setLivePreview(prev => {
        // Subtle natural drift
        const dMoisture = (Math.random() * 2 - 1);
        const newPct = Math.round(Math.min(90, Math.max(25, prev.soilMoisturePct + dMoisture)));
        const newTemp = Number((prev.tempC + (Math.random() * 0.4 - 0.2)).toFixed(1));
        const newHum = Math.round(Math.min(95, Math.max(30, prev.humidityPct + (Math.random() * 1.6 - 0.8))));
        const newWater = Math.round(Math.min(950, Math.max(250, prev.waterLevelAdc + (Math.random() * 4 - 2))));

        return {
          soilMoisturePct: newPct,
          soilAdc: Math.round(1023 - (newPct / 100) * (1023 - 200)),
          tempC: newTemp,
          humidityPct: newHum,
          waterLevelAdc: newWater
        };
      });
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  // Compute top recommended crop live from preview
  const liveScored = scoreAllCrops(
    crops,
    activeSoilProfile,
    farmerInputs,
    { temperatureC: livePreview.tempC, humidityPct: livePreview.humidityPct, rainfallMm: 700 }
  );
  const topLiveCrop = liveScored[0] || { crop: { name: 'Wheat' }, suitability: 92 };

  const scrollToData = () => {
    const el = document.getElementById('sample-data-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#FAF7F0] border-b border-[#2F6B3A]/15 min-h-[580px] flex items-center">
        {/* Background Field Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/src/assets/images/hero_crop_field_1793736647170.jpg"
            alt="Lush green agricultural crop field at sunrise"
            className="w-full h-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          {/* Subtle cream gradient overlay on the left so text is crisp */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#FAF7F0] via-[#FAF7F0]/95 md:via-[#FAF7F0]/85 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 py-12 md:py-20 w-full grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Core Value Proposition */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#1F2A24]">
                Crop Advisor
              </h1>
              <p className="text-xl sm:text-2xl font-semibold text-[#2F6B3A]">
                Know your soil. Choose the right crop.
              </p>
            </div>

            {/* Exact Required Explanation Paragraph */}
            <p className="text-sm sm:text-base text-[#1F2A24] leading-relaxed max-w-xl">
              Many farmers choose a crop without knowing what their soil really needs. Crop Advisor fixes that in three steps. First, sensors measure the soil: moisture, temperature, humidity and water level. Second, we read that data to find your soil type and how healthy it is. Third, we suggest the crops that suit your soil and can earn you the best price in the market.
            </p>

            <div className="text-xs text-[#5B665F] italic">
              This demo uses a virtual sensor board, so you can try it without any hardware.
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/simulator"
                className="flex items-center gap-2 px-6 py-3 bg-[#2F6B3A] text-white font-semibold text-sm rounded-xl hover:bg-[#25562e] transition-all shadow-md active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Try the simulator</span>
              </Link>
              <button
                onClick={scrollToData}
                className="flex items-center gap-2 px-5 py-3 bg-white/90 backdrop-blur-xs text-[#1F2A24] border border-[#2F6B3A]/25 font-semibold text-sm rounded-xl hover:bg-white transition-all shadow-xs"
              >
                <span>See sample data</span>
              </button>
            </div>
          </div>

          {/* Right Column: Live Telemetry Preview Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-[#2F6B3A]/20 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2F8F4E] animate-pulse"></span>
                  <span className="font-semibold text-xs text-[#1F2A24]">Live Sensor Telemetry</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                  Simulated
                </span>
              </div>

              {/* 4 Value Tiles */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#FAF7F0] rounded-xl border border-[#2F6B3A]/10 space-y-1">
                  <div className="flex items-center gap-1.5 text-[#5B665F]">
                    <Droplet className="w-3.5 h-3.5 text-[#2F6B3A]" />
                    <span>Soil Moisture</span>
                  </div>
                  <div className="text-lg font-bold text-[#1F2A24] font-mono">
                    {livePreview.soilMoisturePct}%
                  </div>
                  <span className="text-[10px] text-[#2F6B3A] font-medium block">
                    {getMoistureStatus(livePreview.soilMoisturePct)} ({livePreview.soilAdc} ADC)
                  </span>
                </div>

                <div className="p-3 bg-[#FAF7F0] rounded-xl border border-[#2F6B3A]/10 space-y-1">
                  <div className="flex items-center gap-1.5 text-[#5B665F]">
                    <Thermometer className="w-3.5 h-3.5 text-[#C2410C]" />
                    <span>Temperature</span>
                  </div>
                  <div className="text-lg font-bold text-[#1F2A24] font-mono">
                    {livePreview.tempC}°C
                  </div>
                  <span className="text-[10px] text-[#5B665F] font-medium block">
                    Ambient DHT22
                  </span>
                </div>

                <div className="p-3 bg-[#FAF7F0] rounded-xl border border-[#2F6B3A]/10 space-y-1">
                  <div className="flex items-center gap-1.5 text-[#5B665F]">
                    <CloudSun className="w-3.5 h-3.5 text-[#E0A526]" />
                    <span>Air Humidity</span>
                  </div>
                  <div className="text-lg font-bold text-[#1F2A24] font-mono">
                    {livePreview.humidityPct}%
                  </div>
                  <span className="text-[10px] text-[#5B665F] font-medium block">
                    Relative Humidity
                  </span>
                </div>

                <div className="p-3 bg-[#FAF7F0] rounded-xl border border-[#2F6B3A]/10 space-y-1">
                  <div className="flex items-center gap-1.5 text-[#5B665F]">
                    <Waves className="w-3.5 h-3.5 text-[#0284C7]" />
                    <span>Water Level</span>
                  </div>
                  <div className="text-lg font-bold text-[#1F2A24] font-mono">
                    {livePreview.waterLevelAdc} ADC
                  </div>
                  <span className="text-[10px] text-[#0284C7] font-medium block">
                    Tank Depth Normal
                  </span>
                </div>
              </div>

              {/* Real-time Suggested Crop Line */}
              <div className="p-3.5 bg-[#E8F1E4] rounded-xl border border-[#2F6B3A]/25 text-xs text-[#1F2A24] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#5B665F] block">
                    Dynamic Agro Match
                  </span>
                  <span className="font-bold text-[#2F6B3A]">
                    Suggested crop: {topLiveCrop.crop.name} ({topLiveCrop.suitability}% match)
                  </span>
                </div>
                <Link
                  to="/crop-advice"
                  className="p-1.5 text-[#2F6B3A] hover:bg-white rounded-lg transition-colors"
                  title="View recommendations"
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Step Pillars (Sense, Analyse, Advise) with Bolder, Elevated Agricultural Styling */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Sense */}
          <div className="bg-white rounded-2xl p-7 border-2 border-[#2F6B3A]/20 shadow-sm hover:shadow-md transition-all space-y-4 relative overflow-hidden group">
            <div className="w-14 h-14 rounded-2xl bg-[#E8F1E4] text-[#2F6B3A] flex items-center justify-center font-bold text-xl shadow-xs group-hover:scale-105 transition-transform">
              <Droplet className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2F6B3A]">Stage 01</span>
              <h3 className="text-xl font-bold text-[#1F2A24]">Sense & Measure</h3>
            </div>
            <p className="text-sm font-medium text-[#5B665F] leading-relaxed">
              Sensors collect soil and weather readings: moisture (A0), temperature and humidity (DHT22), light intensity (LDR), and water tank safety depth.
            </p>
            <div className="pt-2">
              <Link
                to="/simulator"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#2F6B3A] group-hover:translate-x-1 transition-transform"
              >
                <span>Launch virtual board</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 2: Analyse */}
          <div className="bg-white rounded-2xl p-7 border-2 border-[#2F6B3A]/20 shadow-sm hover:shadow-md transition-all space-y-4 relative overflow-hidden group">
            <div className="w-14 h-14 rounded-2xl bg-[#E8F1E4] text-[#2F6B3A] flex items-center justify-center font-bold text-xl shadow-xs group-hover:scale-105 transition-transform">
              <Layers className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2F6B3A]">Stage 02</span>
              <h3 className="text-xl font-bold text-[#1F2A24]">Analyse Soil Health</h3>
            </div>
            <p className="text-sm font-medium text-[#5B665F] leading-relaxed">
              We find your soil type and what it needs. Evaluates USDA textural mechanics, Indian regional types (Black cotton, Alluvial, Laterite), and computes a transparent 0–100 health score.
            </p>
            <div className="pt-2">
              <Link
                to="/soil-analysis"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#2F6B3A] group-hover:translate-x-1 transition-transform"
              >
                <span>Diagnose soil profile</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 3: Advise */}
          <div className="bg-white rounded-2xl p-7 border-2 border-[#2F6B3A]/20 shadow-sm hover:shadow-md transition-all space-y-4 relative overflow-hidden group">
            <div className="w-14 h-14 rounded-2xl bg-[#E8F1E4] text-[#2F6B3A] flex items-center justify-center font-bold text-xl shadow-xs group-hover:scale-105 transition-transform">
              <Sparkles className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2F6B3A]">Stage 03</span>
              <h3 className="text-xl font-bold text-[#1F2A24]">Advise & Optimize</h3>
            </div>
            <p className="text-sm font-medium text-[#5B665F] leading-relaxed">
              You get the best crops, with expected profit. Balances agronomic tolerance, season windows, water demands, and modal Agmarknet market mandi rates.
            </p>
            <div className="pt-2">
              <Link
                to="/crop-advice"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#2F6B3A] group-hover:translate-x-1 transition-transform"
              >
                <span>Find suitable crops</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* The Agronomic Challenge Card (Telemetry stats card removed per request) */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-2xl p-8 md:p-10 border border-[#2F6B3A]/15 shadow-xs space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[#2F6B3A]">
            The Agronomic Challenge
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1F2A24]">
            Why Traditional Crop Selection Leads to Soil Exhaustion and Yield Losses
          </h2>
          <p className="text-sm sm:text-base text-[#5B665F] leading-relaxed max-w-4xl">
            Agriculture accounts for over 70% of freshwater withdrawal across farming regions. When crops are planted without knowing the root-zone moisture holding capacity or soil pH, crops suffer severe moisture stress, fertilizers go unabsorbed, and smallholder farmers face unexpected economic loss. Crop Advisor provides an actionable, data-backed guide connecting real-time soil condition directly to market viability.
          </p>
        </div>
      </section>

      {/* Dataset Preview Section (Renamed, count removed per request) */}
      <section id="sample-data-section" className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#1F2A24]">Dataset Preview</h2>
            <p className="text-xs text-[#5B665F]">
              Baseline soil sensor telemetry and agro-climatic readings
            </p>
          </div>
          <Link
            to="/simulator"
            className="text-xs font-semibold text-[#2F6B3A] hover:underline flex items-center gap-1"
          >
            <span>Launch simulator to stream more</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-[#2F6B3A]/15 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono text-[11px]">
              <thead className="bg-[#FAF7F0] text-[#5B665F] font-sans border-b border-[#2F6B3A]/15">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-3">Soil ADC</th>
                  <th className="py-2.5 px-3">Moisture %</th>
                  <th className="py-2.5 px-3">Temp (°C)</th>
                  <th className="py-2.5 px-3">Humidity (%)</th>
                  <th className="py-2.5 px-3">Water Tank</th>
                  <th className="py-2.5 px-3">Pump</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {readings.slice(0, 8).map((r, i) => (
                  <tr key={r.id || i} className="hover:bg-[#FAF7F0]">
                    <td className="py-2 px-3 text-[#5B665F]">{i + 1}</td>
                    <td className="py-2 px-3 text-[#1F2A24] whitespace-nowrap">
                      {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-2 px-3 font-sans">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-800 uppercase font-semibold">
                        {r.source}
                      </span>
                    </td>
                    <td className="py-2 px-3">{r.soilMoistureAdc}</td>
                    <td className="py-2 px-3 text-[#2F6B3A] font-bold">{r.soilMoisturePct}%</td>
                    <td className="py-2 px-3">{r.tempC}°C</td>
                    <td className="py-2 px-3">{r.humidityPct}%</td>
                    <td className="py-2 px-3">{r.waterLevelAdc}</td>
                    <td className="py-2 px-3 font-sans">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        r.pumpOn ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {r.pumpOn ? 'ON' : 'OFF'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-[#FAF7F0] border-t border-[#2F6B3A]/10 text-xs text-[#5B665F] flex justify-between items-center">
            <span>Soil moisture, temperature, and environmental parameters stream.</span>
            <Link to="/simulator" className="text-[#2F6B3A] font-semibold hover:underline">
              Open Virtual Board →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
