/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sprout,
  DollarSign,
  Droplet,
  Clock,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Check,
  ShieldAlert,
  ArrowUpDown,
  Sliders,
  Scale,
  Sparkles,
  ArrowRight,
  Layers
} from 'lucide-react';
import {
  LineChart,
  Line,
  ResponsiveContainer
} from 'recharts';
import { useApp } from '../context/AppContext';
import { scoreAllCrops } from '../lib/cropScoring';
import { findIrrigationProfile } from '../lib/irrigationProfiles';
import { CropResult } from '../types';

const SOIL_PRESETS = [
  {
    name: 'Alluvial Loam',
    tag: 'Alluvial Loam (Indo-Gangetic Plains)',
    ph: 6.8,
    moisturePct: 52.0,
    n: 85,
    p: 42,
    k: 46,
    ec: 1.2,
    rainfallMm: 650,
    sandPct: 40,
    siltPct: 35,
    clayPct: 25
  },
  {
    name: 'Black Cotton',
    tag: 'Black Cotton Soil (Deccan Vertisol)',
    ph: 7.8,
    moisturePct: 68.0,
    n: 60,
    p: 28,
    k: 55,
    ec: 1.6,
    rainfallMm: 850,
    sandPct: 20,
    siltPct: 30,
    clayPct: 50
  },
  {
    name: 'Red Laterite',
    tag: 'Red Laterite Soil (Southern Peninsula)',
    ph: 5.6,
    moisturePct: 38.0,
    n: 50,
    p: 35,
    k: 35,
    ec: 0.8,
    rainfallMm: 1400,
    sandPct: 55,
    siltPct: 25,
    clayPct: 20
  },
  {
    name: 'Arid Sandy',
    tag: 'Arid Sandy Soil (Desert Zone)',
    ph: 8.2,
    moisturePct: 24.0,
    n: 40,
    p: 22,
    k: 30,
    ec: 2.2,
    rainfallMm: 350,
    sandPct: 82,
    siltPct: 10,
    clayPct: 8
  }
];

export const CropAdvicePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    crops,
    activeSoilProfile,
    customSoilParams,
    setCustomSoilParams,
    farmerInputs,
    setFarmerInputs,
    readings,
    setSelectedCropId
  } = useApp();

  const [expandedCropId, setExpandedCropId] = useState<string | null>(null);
  const [whyNotOpen, setWhyNotOpen] = useState(false);
  const [weightsOpen, setWeightsOpen] = useState(false);

  // Environmental context (derived from latest reading or defaults)
  const latest = readings[0];
  const climateContext = useMemo(() => ({
    temperatureC: latest ? latest.tempC : 26.5,
    humidityPct: latest ? latest.humidityPct : 62,
    rainfallMm: customSoilParams.rainfallMm || 750
  }), [latest?.tempC, latest?.humidityPct, customSoilParams.rainfallMm]);

  // Score and rank all crops based on current farmer inputs & weights in real time
  const scoredCrops = useMemo(() => {
    if (!crops || crops.length === 0) return [];
    return scoreAllCrops(crops, activeSoilProfile, farmerInputs, climateContext);
  }, [
    crops,
    activeSoilProfile.ph,
    activeSoilProfile.moisturePct,
    activeSoilProfile.textureClass,
    activeSoilProfile.regionalTag,
    activeSoilProfile.nutrients.n,
    activeSoilProfile.nutrients.p,
    activeSoilProfile.nutrients.k,
    activeSoilProfile.ec,
    farmerInputs,
    climateContext
  ]);

  const top5Crops = scoredCrops.slice(0, 5);
  const top3Crops = scoredCrops.slice(0, 3);
  const lowScoringCrops = scoredCrops.slice(8);

  // Identify standout tags among top 3
  const bestForProfit = useMemo(() => {
    return [...top3Crops].sort((a, b) => b.profitPerAcre - a.profitPerAcre)[0]?.crop.name;
  }, [top3Crops]);

  const bestForSoil = useMemo(() => {
    return [...top3Crops].sort((a, b) => b.scoreBreakdown.soilScore - a.scoreBreakdown.soilScore)[0]?.crop.name;
  }, [top3Crops]);

  const lowestRisk = useMemo(() => {
    return [...top3Crops].sort((a, b) => b.scoreBreakdown.riskScore - a.scoreBreakdown.riskScore)[0]?.crop.name;
  }, [top3Crops]);

  const updateWeight = (field: keyof typeof farmerInputs.weights, value: number) => {
    setFarmerInputs(prev => ({
      ...prev,
      weights: {
        ...prev.weights,
        [field]: value
      }
    }));
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden bg-white border border-[#2F6B3A]/15 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#2F6B3A]">
            Section 3 · Prescriptive Agronomy & Economics
          </span>
          <span className="text-neutral-300">·</span>
          <span className="text-xs text-[#5B665F]">Multi-Criteria Decision Modeling</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2A24]">
          Crop Suitability & Profit Optimization
        </h1>
        <p className="text-sm text-[#5B665F] max-w-2xl mt-1">
          Evaluating Indian crops against your {activeSoilProfile.regionalTag} profile, seasonal climatic windows, and live mandi price trends.
        </p>
      </div>

      {/* Real-time Synchronized Soil Analysis Status Card */}
      <div className="bg-[#FAF7F0] rounded-2xl p-5 border-2 border-[#2F6B3A]/30 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#2F6B3A]/15">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2F8F4E] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#2F8F4E]"></span>
            </span>
            <div>
              <span className="text-xs font-bold text-[#2F6B3A] uppercase tracking-wider block">
                Live Soil Analysis Feed Active
              </span>
              <span className="text-sm font-bold text-[#1F2A24]">
                {activeSoilProfile.regionalTag}
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate('/analysis')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#2F6B3A]/25 text-[#2F6B3A] text-xs font-semibold rounded-xl hover:bg-[#E8F1E4] transition-colors self-start sm:self-auto"
          >
            <span>Fine-tune in Soil Analysis</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live Soil Parameter Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs">
          <div className="p-2.5 bg-white rounded-xl border border-neutral-200">
            <span className="text-[10px] text-[#5B665F] block">Soil pH</span>
            <span className="text-sm font-mono font-bold text-[#1F2A24]">{activeSoilProfile.ph}</span>
            <span className="text-[10px] text-[#2F6B3A] block">
              {activeSoilProfile.ph < 6.0 ? 'Acidic' : activeSoilProfile.ph > 7.5 ? 'Alkaline' : 'Optimal Neutral'}
            </span>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-neutral-200">
            <span className="text-[10px] text-[#5B665F] block">Moisture</span>
            <span className="text-sm font-mono font-bold text-[#2F6B3A]">{activeSoilProfile.moisturePct}%</span>
            <span className="text-[10px] text-[#5B665F] block">Live Telemetry</span>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-neutral-200">
            <span className="text-[10px] text-[#5B665F] block">Texture</span>
            <span className="text-xs font-bold text-[#1F2A24] block truncate">{activeSoilProfile.textureClass}</span>
            <span className="text-[10px] text-[#5B665F] block">USDA Triangle</span>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-neutral-200">
            <span className="text-[10px] text-[#5B665F] block">Nitrogen (N)</span>
            <span className="text-sm font-mono font-bold text-[#1F2A24]">{activeSoilProfile.nutrients.n}</span>
            <span className="text-[10px] text-[#5B665F] block">mg/kg</span>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-neutral-200">
            <span className="text-[10px] text-[#5B665F] block">Phosphorus (P)</span>
            <span className="text-sm font-mono font-bold text-[#1F2A24]">{activeSoilProfile.nutrients.p}</span>
            <span className="text-[10px] text-[#5B665F] block">mg/kg</span>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-neutral-200">
            <span className="text-[10px] text-[#5B665F] block">Potassium (K)</span>
            <span className="text-sm font-mono font-bold text-[#1F2A24]">{activeSoilProfile.nutrients.k}</span>
            <span className="text-[10px] text-[#5B665F] block">mg/kg</span>
          </div>
        </div>

        {/* Quick Soil Preset Switcher for Live Testing */}
        <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-semibold text-[#5B665F] flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-[#2F6B3A]" />
            <span>Test Soil Preset:</span>
          </span>
          {SOIL_PRESETS.map((preset) => {
            const isActive = Math.abs(customSoilParams.ph - preset.ph) < 0.1 && Math.abs(customSoilParams.moisturePct - preset.moisturePct) < 1;
            return (
              <button
                key={preset.name}
                onClick={() => setCustomSoilParams({ ...preset })}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#2F6B3A] text-white shadow-xs'
                    : 'bg-white text-[#1F2A24] border border-[#2F6B3A]/20 hover:bg-[#E8F1E4]'
                }`}
              >
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Farmer Inputs Control Deck */}
      <div className="bg-white rounded-2xl p-5 border border-[#2F6B3A]/15 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#2F6B3A]" />
            <h3 className="text-sm font-bold text-[#1F2A24]">Farm Parameters & Economic Constraints</h3>
          </div>
          <button
            onClick={() => setWeightsOpen(!weightsOpen)}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#FAF7F0] border border-[#2F6B3A]/20 text-[#2F6B3A] rounded-lg text-xs font-medium hover:bg-[#E8F1E4] transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{weightsOpen ? 'Hide scoring weights' : 'Customize scoring weights'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
          {/* Season */}
          <div>
            <label className="font-semibold text-[#1F2A24] block mb-1.5">Cropping Season</label>
            <select
              value={farmerInputs.season}
              onChange={(e) => setFarmerInputs(prev => ({ ...prev, season: e.target.value as any }))}
              className="w-full p-2 bg-[#FAF7F0] border border-[#2F6B3A]/20 rounded-xl font-medium text-[#1F2A24]"
            >
              <option value="Kharif">Kharif (Monsoon, Jun-Oct)</option>
              <option value="Rabi">Rabi (Winter, Nov-Apr)</option>
              <option value="Zaid">Zaid (Summer, Mar-Jun)</option>
            </select>
          </div>

          {/* Land Size */}
          <div>
            <label className="font-semibold text-[#1F2A24] block mb-1.5">Land Holding (Acres)</label>
            <input
              type="number"
              min="0.5"
              max="100"
              step="0.5"
              value={farmerInputs.landSizeAcres}
              onChange={(e) => setFarmerInputs(prev => ({ ...prev, landSizeAcres: Math.max(0.5, Number(e.target.value)) }))}
              className="w-full p-2 bg-[#FAF7F0] border border-[#2F6B3A]/20 rounded-xl font-mono text-[#1F2A24]"
            />
          </div>

          {/* Irrigation Availability */}
          <div>
            <label className="font-semibold text-[#1F2A24] block mb-1.5">Irrigation Source</label>
            <select
              value={farmerInputs.irrigation}
              onChange={(e) => setFarmerInputs(prev => ({ ...prev, irrigation: e.target.value as any }))}
              className="w-full p-2 bg-[#FAF7F0] border border-[#2F6B3A]/20 rounded-xl font-medium text-[#1F2A24]"
            >
              <option value="borewell">Assured Borewell / Tube-well</option>
              <option value="canal">Canal Gravity Flow</option>
              <option value="rain-fed">Rain-fed (No tube-well)</option>
            </select>
          </div>

          {/* Budget */}
          <div>
            <label className="font-semibold text-[#1F2A24] block mb-1.5">Working Capital Budget</label>
            <select
              value={farmerInputs.budget}
              onChange={(e) => setFarmerInputs(prev => ({ ...prev, budget: e.target.value as any }))}
              className="w-full p-2 bg-[#FAF7F0] border border-[#2F6B3A]/20 rounded-xl font-medium text-[#1F2A24]"
            >
              <option value="low">Low (&lt; ₹15,000/acre)</option>
              <option value="medium">Medium (₹15,000 - ₹35,000)</option>
              <option value="high">High (&gt; ₹35,000/acre)</option>
            </select>
          </div>

          {/* State */}
          <div>
            <label className="font-semibold text-[#1F2A24] block mb-1.5">Target Mandi State</label>
            <select
              value={farmerInputs.state}
              onChange={(e) => setFarmerInputs(prev => ({ ...prev, state: e.target.value }))}
              className="w-full p-2 bg-[#FAF7F0] border border-[#2F6B3A]/20 rounded-xl font-medium text-[#1F2A24]"
            >
              <option value="Punjab">Punjab</option>
              <option value="Haryana">Haryana</option>
              <option value="Madhya Pradesh">Madhya Pradesh</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Gujarat">Gujarat</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="Rajasthan">Rajasthan</option>
              <option value="Karnataka">Karnataka</option>
            </select>
          </div>
        </div>

        {/* Custom Scoring Weights Drawer */}
        {weightsOpen && (
          <div className="p-4 bg-[#FAF7F0] rounded-xl border border-[#2F6B3A]/20 space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-[#1F2A24]">
                Multi-Criteria Ranking Weights (Sum: {
                  farmerInputs.weights.soilWeight +
                  farmerInputs.weights.climateWeight +
                  farmerInputs.weights.waterWeight +
                  farmerInputs.weights.profitWeight +
                  farmerInputs.weights.riskWeight
                }%)
              </span>
              <button
                onClick={() => setFarmerInputs(prev => ({
                  ...prev,
                  weights: { soilWeight: 35, climateWeight: 25, waterWeight: 15, profitWeight: 20, riskWeight: 5 }
                }))}
                className="text-[11px] text-[#2F6B3A] underline"
              >
                Reset to Standard Model
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Soil Match</span>
                  <span className="font-mono font-bold">{farmerInputs.weights.soilWeight}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={farmerInputs.weights.soilWeight}
                  onChange={(e) => updateWeight('soilWeight', Number(e.target.value))}
                  className="w-full accent-[#2F6B3A]"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Climate Match</span>
                  <span className="font-mono font-bold">{farmerInputs.weights.climateWeight}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={farmerInputs.weights.climateWeight}
                  onChange={(e) => updateWeight('climateWeight', Number(e.target.value))}
                  className="w-full accent-[#2F6B3A]"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Water Safety</span>
                  <span className="font-mono font-bold">{farmerInputs.weights.waterWeight}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="40"
                  value={farmerInputs.weights.waterWeight}
                  onChange={(e) => updateWeight('waterWeight', Number(e.target.value))}
                  className="w-full accent-[#2F6B3A]"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Profit Potential</span>
                  <span className="font-mono font-bold">{farmerInputs.weights.profitWeight}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={farmerInputs.weights.profitWeight}
                  onChange={(e) => updateWeight('profitWeight', Number(e.target.value))}
                  className="w-full accent-[#2F6B3A]"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Risk Mitigation</span>
                  <span className="font-mono font-bold">{farmerInputs.weights.riskWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={farmerInputs.weights.riskWeight}
                  onChange={(e) => updateWeight('riskWeight', Number(e.target.value))}
                  className="w-full accent-[#2F6B3A]"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comparison Table of Top 3 Crops */}
      {top3Crops.length >= 3 && (
        <div className="bg-white rounded-2xl p-5 border border-[#2F6B3A]/15 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#1F2A24]">
              Top 3 Agronomic Candidates (Side-by-Side Comparison)
            </h3>
            <span className="text-xs text-[#5B665F]">For {farmerInputs.landSizeAcres} Acres</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#2F6B3A]/15 text-[#5B665F]">
                  <th className="py-2.5 px-3">Crop Name</th>
                  <th className="py-2.5 px-3">Suitability</th>
                  <th className="py-2.5 px-3">Standout Trait</th>
                  <th className="py-2.5 px-3">Net Profit / Acre</th>
                  <th className="py-2.5 px-3">Total Estimated Net Return</th>
                  <th className="py-2.5 px-3">Water Demand</th>
                  <th className="py-2.5 px-3">Maturity Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {top3Crops.map((item) => (
                  <tr key={item.crop.name} className="hover:bg-[#FAF7F0] transition-colors">
                    <td className="py-3 px-3 font-semibold text-[#1F2A24]">
                      {item.crop.name}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-[#2F6B3A] text-sm">
                        {item.suitability}%
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {item.crop.name === bestForProfit && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-semibold">
                          Best for Profit
                        </span>
                      )}
                      {item.crop.name === bestForSoil && item.crop.name !== bestForProfit && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-semibold">
                          Best for Soil
                        </span>
                      )}
                      {item.crop.name === lowestRisk && item.crop.name !== bestForProfit && item.crop.name !== bestForSoil && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-semibold">
                          Lowest Risk
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-[#1F2A24]">
                      ₹{item.profitPerAcre.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-[#2F6B3A]">
                      ₹{item.profit.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        item.crop.waterNeed === 'High' ? 'bg-blue-50 text-blue-700' : 'bg-neutral-100 text-neutral-700'
                      }`}>
                        {item.crop.waterNeed}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#5B665F]">
                      {item.crop.durationDays} days
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top 5 Result Cards */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#1F2A24]">Recommended Crop Portfolios</h2>

        <div className="grid grid-cols-1 gap-5">
          {top5Crops.map((item, index) => {
            const isExpanded = expandedCropId === item.crop.name;
            const sparklineData = item.crop.priceTrend12m.map((price, idx) => ({ month: idx + 1, price }));

            return (
              <div
                key={item.crop.name}
                className="bg-white rounded-2xl border border-[#2F6B3A]/15 overflow-hidden shadow-xs hover:border-[#2F6B3A]/40 transition-all"
              >
                <div className="p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-neutral-100 shrink-0 border border-[#2F6B3A]/15">
                      <img
                        src={item.crop.image}
                        alt={item.crop.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[#5B665F]">#0{index + 1}</span>
                        <h3 className="text-lg font-bold text-[#1F2A24]">{item.crop.name}</h3>
                        <span className="text-xs text-[#5B665F]">· {item.crop.category}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5B665F]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {item.crop.durationDays} days
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Droplet className="w-3.5 h-3.5 text-[#2F6B3A]" /> {item.crop.waterNeed} Water ({findIrrigationProfile(item.crop.name).waterDemand} demand)
                        </span>
                        <span>·</span>
                        <span>Yield: <strong className="text-[#1F2A24]">{item.crop.yieldQtlPerAcre} qtl/acre</strong></span>
                      </div>
                      <div className="text-xs text-[#5B665F] flex flex-wrap items-center gap-3 pt-0.5">
                        <span>Modal Mandi Price: <strong className="text-[#1F2A24]">₹{item.crop.priceModal}/qtl</strong>{item.crop.msp && <span className="ml-1 text-emerald-700 font-semibold">(MSP: ₹{item.crop.msp})</span>}</span>
                        <span>·</span>
                        <span className="text-[#2F6B3A] font-medium">
                          Simulator Rate: {findIrrigationProfile(item.crop.name).waterUseMultiplier}x tank drain ({findIrrigationProfile(item.crop.name).onBelowPct}% - {findIrrigationProfile(item.crop.name).offAbovePct}% target)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Sparkline & Price Trend */}
                  <div className="w-full lg:w-48 h-12 shrink-0">
                    <div className="text-[10px] text-[#5B665F] mb-0.5">12-Month Mandi Trend:</div>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparklineData}>
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="#2F6B3A"
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Right: Profit & Score & Simulator Button */}
                  <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start sm:items-center justify-between lg:justify-end gap-4 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-neutral-100">
                    <div className="text-left lg:text-right">
                      <span className="text-[10px] text-[#5B665F] uppercase tracking-wider block">Estimated Profit</span>
                      <div className="text-xl font-bold text-[#2F6B3A] font-mono">
                        ₹{item.profit.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[11px] text-[#5B665F]">
                        (₹{item.profitPerAcre.toLocaleString('en-IN')}/acre)
                      </span>
                    </div>

                    <div className="bg-[#E8F1E4] px-4 py-2.5 rounded-xl border border-[#2F6B3A]/20 text-center shrink-0">
                      <span className="text-[10px] text-[#5B665F] font-semibold uppercase block">Suitability</span>
                      <span className="text-xl font-bold text-[#2F6B3A] font-mono">
                        {item.suitability}%
                      </span>
                    </div>

                    {/* Test in Simulator Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const profile = findIrrigationProfile(item.crop.name);
                        setSelectedCropId(profile.id);
                        navigate(`/simulator?crop=${profile.id}`);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#FAF7F0] hover:bg-[#E8F1E4] border border-[#2F6B3A]/25 text-[#2F6B3A] rounded-xl text-xs font-semibold transition-colors shrink-0 shadow-xs"
                      title={`Open Simulator with ${item.crop.name} irrigation profile`}
                    >
                      <Droplet className="w-3.5 h-3.5" />
                      <span>Test in Simulator</span>
                    </button>
                  </div>
                </div>

                {/* Expander Trigger */}
                <button
                  onClick={() => setExpandedCropId(isExpanded ? null : item.crop.name)}
                  className="w-full px-5 py-2.5 bg-[#FAF7F0] border-t border-[#2F6B3A]/10 text-xs font-semibold text-[#2F6B3A] flex items-center justify-between hover:bg-[#E8F1E4] transition-colors"
                >
                  <span>Why this crop? (Agronomic and Economic breakdown)</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="p-5 border-t border-[#2F6B3A]/10 bg-white space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Matched Factors */}
                      <div className="space-y-1.5">
                        <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-600" />
                          Agronomic & Market Synergies:
                        </span>
                        <ul className="space-y-1 pl-5 list-disc text-[#1F2A24]">
                          {item.reasons.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Warnings / Cautions */}
                      <div className="space-y-1.5">
                        <span className="font-semibold text-amber-800 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          Management Considerations:
                        </span>
                        {item.warnings.length > 0 ? (
                          <ul className="space-y-1 pl-5 list-disc text-[#1F2A24]">
                            {item.warnings.map((w, i) => (
                              <li key={i}>{w}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[#5B665F]">Zero agronomic constraints flagged for this profile.</p>
                        )}
                      </div>
                    </div>

                    {/* Economics summary for entered acres */}
                    <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-4 text-xs">
                      <div>
                        <span className="text-[#5B665F]">Per Acre Economics: </span>
                        <span>Gross Revenue: <strong className="text-[#1F2A24]">₹{item.revenuePerAcre.toLocaleString('en-IN')}</strong></span>
                        <span className="mx-2">·</span>
                        <span>Production Cost: <strong className="text-[#1F2A24]">₹{item.costPerAcre.toLocaleString('en-IN')}</strong></span>
                      </div>
                      <div className="text-[11px] text-[#5B665F]">
                        Crop Rotation: Avoid planting in unbroken succession; rotate with pulse legumes.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* "Why Not X?" Expander */}
      <div className="bg-white rounded-2xl border border-[#2F6B3A]/15 overflow-hidden shadow-xs">
        <button
          onClick={() => setWhyNotOpen(!whyNotOpen)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-[#FAF7F0] transition-colors"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span className="font-bold text-sm text-[#1F2A24]">
              "Why Not X?" · Non-Recommended Crops Analysis
            </span>
          </div>
          <span className="text-xs font-semibold text-[#2F6B3A]">
            {whyNotOpen ? 'Hide analysis' : `Inspect ${lowScoringCrops.length} low-scoring crops`}
          </span>
        </button>

        {whyNotOpen && (
          <div className="p-5 border-t border-neutral-100 bg-[#FAF7F0] space-y-3">
            <p className="text-xs text-[#5B665F]">
              The following crops yielded lower suitability scores under the current combination of soil pH ({activeSoilProfile.ph}), {farmerInputs.season} season, and {farmerInputs.irrigation} irrigation:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {lowScoringCrops.map(item => (
                <div key={item.crop.name} className="p-3 bg-white rounded-xl border border-neutral-200 space-y-1">
                  <div className="flex justify-between font-semibold text-[#1F2A24]">
                    <span>{item.crop.name}</span>
                    <span className="text-amber-700 font-mono">{item.suitability}% Match</span>
                  </div>
                  <p className="text-[#5B665F] text-[11px] leading-relaxed">
                    {item.warnings.length > 0 ? item.warnings.join('. ') : 'Low relative profit margin compared to top alternatives.'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mandatory Disclaimer */}
      <div className="p-4 bg-white rounded-xl border border-neutral-200 text-xs text-[#5B665F] text-center">
        Advisory only. Market prices represent Agmarknet mandi historical snapshots (data.gov.in). Actual agricultural yields depend on localized microclimatic factors, pest pressure, and seed quality. Consult your local Krishi Vigyan Kendra (KVK) or Block Agriculture Office.
      </div>
    </div>
  );
};
