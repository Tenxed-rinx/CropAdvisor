/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  ArrowRight,
  Info,
  CheckCircle2,
  Lock,
  Edit3,
  HelpCircle,
  FlaskConical,
  ChevronDown,
  Droplets
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { useApp } from '../context/AppContext';
import { validateAndClampInput } from '../lib/units';
import { findIrrigationProfile } from '../lib/irrigationProfiles';
import { ReadingsTableModal } from '../components/simulator/ReadingsTableModal';

const SAMPLE_KAGGLE_PRESETS = [
  {
    label: 'Alluvial Loam (Punjab / Indo-Gangetic)',
    ph: 6.8,
    moisturePct: 52.0,
    n: 90,
    p: 45,
    k: 45,
    ec: 1.1,
    rainfallMm: 650,
    sandPct: 40,
    siltPct: 40,
    clayPct: 20
  },
  {
    label: 'Black Cotton / Regur Soil (Maharashtra / Deccan)',
    ph: 7.8,
    moisturePct: 68.0,
    n: 110,
    p: 55,
    k: 70,
    ec: 1.6,
    rainfallMm: 850,
    sandPct: 20,
    siltPct: 30,
    clayPct: 50
  },
  {
    label: 'Red & Laterite Soil (Karnataka / Kerala)',
    ph: 5.5,
    moisturePct: 42.0,
    n: 60,
    p: 35,
    k: 35,
    ec: 0.8,
    rainfallMm: 1400,
    sandPct: 55,
    siltPct: 25,
    clayPct: 20
  },
  {
    label: 'Arid Sandy Soil (Rajasthan / Gujarat Desert)',
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

export const SoilAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    readings,
    activeSoilProfile,
    customSoilParams,
    setCustomSoilParams,
    selectReadingForAnalysis,
    selectedReadingForAnalysis,
    selectedCropId
  } = useApp();

  const activeCropProfile = findIrrigationProfile(selectedCropId);
  const isMoistureBelow = customSoilParams.moisturePct < activeCropProfile.onBelowPct;
  const isMoistureAbove = customSoilParams.moisturePct > activeCropProfile.offAbovePct;

  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [sourceMode, setSourceMode] = useState<'latest' | 'picker' | 'sample' | 'manual'>('latest');
  const [showFormulaDetails, setShowFormulaDetails] = useState(false);
  const [selectedSamplePresetIndex, setSelectedSamplePresetIndex] = useState(0);

  // Autofill handlers
  const handleSelectSource = (mode: 'latest' | 'picker' | 'sample' | 'manual') => {
    setSourceMode(mode);
    if (mode === 'latest') {
      const latest = readings.find(r => r.source === 'simulated') || readings[0];
      if (latest) {
        selectReadingForAnalysis(latest);
      }
    } else if (mode === 'sample') {
      const preset = SAMPLE_KAGGLE_PRESETS[selectedSamplePresetIndex];
      setCustomSoilParams({ ...preset });
    } else if (mode === 'picker') {
      setTableModalOpen(true);
    }
  };

  const handleApplySamplePreset = (index: number) => {
    setSelectedSamplePresetIndex(index);
    const preset = SAMPLE_KAGGLE_PRESETS[index];
    setCustomSoilParams({ ...preset });
  };

  const handleParamChange = (field: keyof typeof customSoilParams, val: number) => {
    if (sourceMode !== 'manual') return; // Enforce strict read-only when not manual
    setCustomSoilParams(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const isReadOnly = sourceMode !== 'manual';

  // Radar chart data
  const radarData = [
    { subject: 'Nitrogen (N)', current: Math.min(100, (customSoilParams.n / 120) * 100), optimal: 75, fullMark: 100 },
    { subject: 'Phosphorus (P)', current: Math.min(100, (customSoilParams.p / 60) * 100), optimal: 75, fullMark: 100 },
    { subject: 'Potassium (K)', current: Math.min(100, (customSoilParams.k / 80) * 100), optimal: 75, fullMark: 100 },
    { subject: 'Organic Index', current: 70, optimal: 80, fullMark: 100 },
    { subject: 'Moisture Balance', current: Math.min(100, (customSoilParams.moisturePct / 65) * 100), optimal: 80, fullMark: 100 },
    { subject: 'pH Balance', current: Math.max(20, 100 - Math.abs(customSoilParams.ph - 6.8) * 30), optimal: 90, fullMark: 100 },
  ];

  // Bar chart comparison
  const benchmarkBarData = [
    { metric: 'pH (x10)', current: customSoilParams.ph * 10, benchmark: 68 },
    { metric: 'Moisture (%)', current: customSoilParams.moisturePct, benchmark: 50 },
    { metric: 'Nitrogen (mg/kg)', current: customSoilParams.n, benchmark: 80 },
    { metric: 'Phosphorus (mg/kg)', current: customSoilParams.p, benchmark: 42 },
    { metric: 'Potassium (mg/kg)', current: customSoilParams.k, benchmark: 48 },
  ];

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-[#2F6B3A]/15 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#2F6B3A]">
            Soil Analysis & Health Assessment
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2A24] mt-0.5">
            Soil Health Analysis & Regional Profiling
          </h1>
          <p className="text-sm text-[#5B665F] max-w-2xl mt-1">
            Examines soil moisture, pH, and nutrients to classify soil type and evaluate suitability for regional crops.
          </p>
        </div>

        <button
          onClick={() => navigate('/crop-advice')}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#2F6B3A] text-white rounded-xl text-xs font-semibold hover:bg-[#25562e] transition-all shadow-sm active:scale-95 shrink-0"
        >
          <span>View Recommended Crops</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Data Source Selector */}
      <div className="bg-white rounded-2xl p-4 border border-[#2F6B3A]/15 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-[#2F6B3A]" />
            <span className="font-bold text-[#1F2A24]">Select Input Source:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleSelectSource('latest')}
              className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
                sourceMode === 'latest'
                  ? 'bg-[#2F6B3A] text-white shadow-xs'
                  : 'bg-[#FAF7F0] text-[#5B665F] hover:text-[#1F2A24] border border-[#2F6B3A]/15'
              }`}
            >
              Latest Simulated Reading
            </button>
            <button
              onClick={() => handleSelectSource('picker')}
              className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
                sourceMode === 'picker'
                  ? 'bg-[#2F6B3A] text-white shadow-xs'
                  : 'bg-[#FAF7F0] text-[#5B665F] hover:text-[#1F2A24] border border-[#2F6B3A]/15'
              }`}
            >
              Pick a Row from Table
            </button>
            <button
              onClick={() => handleSelectSource('sample')}
              className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
                sourceMode === 'sample'
                  ? 'bg-[#2F6B3A] text-white shadow-xs'
                  : 'bg-[#FAF7F0] text-[#5B665F] hover:text-[#1F2A24] border border-[#2F6B3A]/15'
              }`}
            >
              Sample Kaggle Dataset
            </button>
            <button
              onClick={() => handleSelectSource('manual')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
                sourceMode === 'manual'
                  ? 'bg-[#2F6B3A] text-white shadow-xs'
                  : 'bg-[#FAF7F0] text-[#5B665F] hover:text-[#1F2A24] border border-[#2F6B3A]/15'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Enter Manually</span>
            </button>
          </div>
        </div>

        {/* Source Specific Detail Banners */}
        {sourceMode === 'sample' && (
          <div className="p-3 bg-[#E8F1E4] rounded-xl border border-[#2F6B3A]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#1F2A24]">Kaggle Regional Soil Presets:</span>
              <select
                value={selectedSamplePresetIndex}
                onChange={(e) => handleApplySamplePreset(Number(e.target.value))}
                className="bg-white border border-[#2F6B3A]/30 rounded-lg px-2.5 py-1 font-semibold text-[#2F6B3A] text-xs"
              >
                {SAMPLE_KAGGLE_PRESETS.map((p, idx) => (
                  <option key={idx} value={idx}>{p.label}</option>
                ))}
              </select>
            </div>
            <span className="text-[11px] text-[#5B665F]">
              Loaded preset parameters into analysis and crop recommendations
            </span>
          </div>
        )}

        {sourceMode === 'picker' && selectedReadingForAnalysis && (
          <div className="p-3 bg-[#E8F1E4] rounded-xl border border-[#2F6B3A]/20 flex items-center justify-between text-xs text-[#2F6B3A]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2F6B3A]" />
              <span className="font-semibold">
                Loaded Observation: <strong className="font-mono text-[#1F2A24]">{selectedReadingForAnalysis.id}</strong> ({selectedReadingForAnalysis.source}) · Soil Moisture: {selectedReadingForAnalysis.soilMoisturePct}% · pH: {selectedReadingForAnalysis.ph}
              </span>
            </div>
            <button
              onClick={() => setTableModalOpen(true)}
              className="text-xs underline font-bold hover:text-[#1F2A24]"
            >
              Change Selected Row
            </button>
          </div>
        )}

        {isReadOnly && (
          <div className="p-2.5 bg-neutral-100 rounded-lg border border-neutral-200 text-xs text-[#5B665F] flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <span>
              <strong>Parameters Locked:</strong> Currently loaded from {sourceMode === 'latest' ? 'latest simulated sensor reading' : sourceMode === 'sample' ? 'Kaggle dataset preset' : 'selected table record'}. Switch to <strong className="text-[#2F6B3A]">"Enter Manually"</strong> to edit pH, moisture, and nutrients.
            </span>
          </div>
        )}
      </div>

      {/* Main Grid: Form (5 cols) + Results & Radar (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input Form (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-[#2F6B3A]/15 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
            <h3 className="text-sm font-bold text-[#1F2A24]">Soil Chemical & Physical Parameters</h3>
            {isReadOnly ? (
              <span className="text-[10px] font-semibold text-neutral-500 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Read-Only
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-[#2F6B3A] flex items-center gap-1">
                <Edit3 className="w-3 h-3" /> Manual Mode (Editable)
              </span>
            )}
          </div>

          <div className="space-y-4 text-xs">
            {/* pH Slider (Controlled & locked unless manual) */}
            <div className={`space-y-1 ${isReadOnly ? 'opacity-80' : ''}`}>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-[#1F2A24] flex items-center gap-1">
                  Soil pH Level
                  {isReadOnly && <Lock className="w-3 h-3 text-neutral-400" />}
                </label>
                <span className="font-mono font-bold text-sm text-[#2F6B3A]">{customSoilParams.ph.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="3.5"
                max="9.5"
                step="0.1"
                disabled={isReadOnly}
                value={customSoilParams.ph}
                onChange={(e) => handleParamChange('ph', Number(e.target.value))}
                className={`w-full accent-[#2F6B3A] ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              />
              <div className="flex justify-between text-[10px] text-[#5B665F]">
                <span>3.5 (Acidic)</span>
                <span>7.0 (Neutral)</span>
                <span>9.5 (Alkaline)</span>
              </div>
            </div>

            {/* Moisture % Slider (Controlled & locked unless manual) */}
            <div className={`space-y-1 ${isReadOnly ? 'opacity-80' : ''}`}>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-[#1F2A24] flex items-center gap-1">
                  Soil Moisture Content (%)
                  {isReadOnly && <Lock className="w-3 h-3 text-neutral-400" />}
                </label>
                <span className="font-mono font-bold text-sm text-[#2F6B3A]">{customSoilParams.moisturePct}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="95"
                step="1"
                disabled={isReadOnly}
                value={customSoilParams.moisturePct}
                onChange={(e) => handleParamChange('moisturePct', Number(e.target.value))}
                className={`w-full accent-[#2F6B3A] ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              />
              <div className="flex justify-between text-[10px] text-[#5B665F]">
                <span>10% (Dry Sand)</span>
                <span>50% (Optimal)</span>
                <span>95% (Waterlogged)</span>
              </div>

              {/* Crop Target Moisture Comparison Alert */}
              <div className={`mt-2 p-2.5 rounded-xl border text-xs space-y-1 ${
                isMoistureBelow
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : isMoistureAbove
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-[#2F6B3A]" />
                    <span>{activeCropProfile.name} Target Band ({activeCropProfile.onBelowPct}% - {activeCropProfile.offAbovePct}%)</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                    {isMoistureBelow ? 'Under-Hydrated' : isMoistureAbove ? 'Excess Moisture' : 'In Band'}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {isMoistureBelow
                    ? `Moisture is below the target for ${activeCropProfile.name}. Soil moisture (${customSoilParams.moisturePct}%) is drier than the minimum ${activeCropProfile.onBelowPct}% required.`
                    : isMoistureAbove
                    ? `Moisture is above the target for ${activeCropProfile.name}. Soil moisture (${customSoilParams.moisturePct}%) exceeds the ${activeCropProfile.offAbovePct}% upper limit.`
                    : `Current moisture (${customSoilParams.moisturePct}%) satisfies the target band for ${activeCropProfile.name}.`}
                </p>
              </div>
            </div>

            {/* Nutrients NPK */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-100">
              <div>
                <label className="font-semibold text-[#1F2A24] block mb-1">Nitrogen (N)</label>
                <input
                  type="number"
                  min="0"
                  max="300"
                  disabled={isReadOnly}
                  value={customSoilParams.n}
                  onChange={(e) => handleParamChange('n', validateAndClampInput('n', Number(e.target.value)))}
                  className={`w-full px-2.5 py-1.5 bg-[#FAF7F0] border border-[#2F6B3A]/20 rounded-lg font-mono text-xs ${
                    isReadOnly ? 'cursor-not-allowed bg-neutral-100 text-neutral-600' : ''
                  }`}
                />
                <span className="text-[10px] text-[#5B665F] mt-0.5 block">mg/kg</span>
              </div>
              <div>
                <label className="font-semibold text-[#1F2A24] block mb-1">Phosphorus (P)</label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  disabled={isReadOnly}
                  value={customSoilParams.p}
                  onChange={(e) => handleParamChange('p', validateAndClampInput('p', Number(e.target.value)))}
                  className={`w-full px-2.5 py-1.5 bg-[#FAF7F0] border border-[#2F6B3A]/20 rounded-lg font-mono text-xs ${
                    isReadOnly ? 'cursor-not-allowed bg-neutral-100 text-neutral-600' : ''
                  }`}
                />
                <span className="text-[10px] text-[#5B665F] mt-0.5 block">mg/kg</span>
              </div>
              <div>
                <label className="font-semibold text-[#1F2A24] block mb-1">Potassium (K)</label>
                <input
                  type="number"
                  min="0"
                  max="300"
                  disabled={isReadOnly}
                  value={customSoilParams.k}
                  onChange={(e) => handleParamChange('k', validateAndClampInput('k', Number(e.target.value)))}
                  className={`w-full px-2.5 py-1.5 bg-[#FAF7F0] border border-[#2F6B3A]/20 rounded-lg font-mono text-xs ${
                    isReadOnly ? 'cursor-not-allowed bg-neutral-100 text-neutral-600' : ''
                  }`}
                />
                <span className="text-[10px] text-[#5B665F] mt-0.5 block">mg/kg</span>
              </div>
            </div>

            {/* Salinity & Rainfall */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="font-semibold text-[#1F2A24] block mb-1">Salinity (EC)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10.0"
                  disabled={isReadOnly}
                  value={customSoilParams.ec}
                  onChange={(e) => handleParamChange('ec', validateAndClampInput('ec', Number(e.target.value)))}
                  className={`w-full px-2.5 py-1.5 bg-[#FAF7F0] border border-[#2F6B3A]/20 rounded-lg font-mono text-xs ${
                    isReadOnly ? 'cursor-not-allowed bg-neutral-100 text-neutral-600' : ''
                  }`}
                />
                <span className="text-[10px] text-[#5B665F] mt-0.5 block">dS/m</span>
              </div>
              <div>
                <label className="font-semibold text-[#1F2A24] block mb-1">Annual Rainfall</label>
                <input
                  type="number"
                  min="100"
                  max="3000"
                  step="50"
                  disabled={isReadOnly}
                  value={customSoilParams.rainfallMm}
                  onChange={(e) => handleParamChange('rainfallMm', validateAndClampInput('rainfallMm', Number(e.target.value)))}
                  className={`w-full px-2.5 py-1.5 bg-[#FAF7F0] border border-[#2F6B3A]/20 rounded-lg font-mono text-xs ${
                    isReadOnly ? 'cursor-not-allowed bg-neutral-100 text-neutral-600' : ''
                  }`}
                />
                <span className="text-[10px] text-[#5B665F] mt-0.5 block">mm / year</span>
              </div>
            </div>

            {/* Sand, Silt, Clay % (USDA Texture Triangle) */}
            <div className="pt-2 border-t border-neutral-100 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-[#1F2A24]">Soil Textural Fractions (%)</span>
                <span className="text-[10px] text-[#5B665F]">
                  Total: {customSoilParams.sandPct + customSoilParams.siltPct + customSoilParams.clayPct}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-[#5B665F] block">Sand %</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    disabled={isReadOnly}
                    value={customSoilParams.sandPct}
                    onChange={(e) => handleParamChange('sandPct', Number(e.target.value))}
                    className={`w-full px-2 py-1 bg-[#FAF7F0] border border-[#2F6B3A]/20 rounded font-mono text-xs ${
                      isReadOnly ? 'cursor-not-allowed bg-neutral-100' : ''
                    }`}
                  />
                </div>
                <div>
                  <span className="text-[10px] text-[#5B665F] block">Silt %</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    disabled={isReadOnly}
                    value={customSoilParams.siltPct}
                    onChange={(e) => handleParamChange('siltPct', Number(e.target.value))}
                    className={`w-full px-2 py-1 bg-[#FAF7F0] border border-[#2F6B3A]/20 rounded font-mono text-xs ${
                      isReadOnly ? 'cursor-not-allowed bg-neutral-100' : ''
                    }`}
                  />
                </div>
                <div>
                  <span className="text-[10px] text-[#5B665F] block">Clay %</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    disabled={isReadOnly}
                    value={customSoilParams.clayPct}
                    onChange={(e) => handleParamChange('clayPct', Number(e.target.value))}
                    className={`w-full px-2 py-1 bg-[#FAF7F0] border border-[#2F6B3A]/20 rounded font-mono text-xs ${
                      isReadOnly ? 'cursor-not-allowed bg-neutral-100' : ''
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Classification & Diagnosis (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Soil Classification Card */}
          <div className="bg-white rounded-2xl p-6 border border-[#2F6B3A]/15 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
              <div>
                <span className="text-xs uppercase tracking-wider text-[#2F6B3A] font-bold">
                  Classified Soil Profile
                </span>
                <h2 className="text-2xl font-bold text-[#1F2A24] mt-0.5">
                  {activeSoilProfile.regionalTag}
                </h2>
                <div className="flex items-center gap-2 text-xs text-[#5B665F] mt-1">
                  <span>USDA Texture: <strong className="text-[#1F2A24]">{activeSoilProfile.textureClass}</strong></span>
                  <span>·</span>
                  <span>Drainage: <strong className="text-[#1F2A24]">{activeSoilProfile.drainage}</strong></span>
                </div>
              </div>

              {/* Health Score Badge */}
              <div className="bg-[#E8F1E4] rounded-2xl p-3 border border-[#2F6B3A]/20 text-center shrink-0 min-w-[120px]">
                <span className="text-[10px] text-[#5B665F] font-semibold uppercase block">Health Score</span>
                <div className="text-2xl font-bold text-[#2F6B3A] font-mono">
                  {activeSoilProfile.healthScore}<span className="text-xs text-[#5B665F]">/100</span>
                </div>
                <button
                  onClick={() => setShowFormulaDetails(!showFormulaDetails)}
                  className="text-[10px] text-[#2F6B3A] underline flex items-center justify-center gap-0.5 mx-auto mt-0.5 hover:text-[#1F2A24]"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>Breakdown</span>
                </button>
              </div>
            </div>

            {/* Why this soil type? Explainer */}
            <div className="p-3 bg-[#FAF7F0] rounded-xl border border-[#2F6B3A]/15 text-xs space-y-1">
              <span className="font-semibold text-[#1F2A24] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#2F6B3A]" />
                Why this soil type? (Agronomic Rule)
              </span>
              <p className="text-[#5B665F] leading-relaxed">
                {activeSoilProfile.ruleFired}
              </p>
            </div>

            {/* Formula breakdown expander */}
            {showFormulaDetails && (
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-[#1F2A24] space-y-2">
                <span className="font-semibold block">Soil Health Index Component Scores:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px] font-mono">
                  <div className="p-2 bg-white rounded border">
                    <span className="text-[#5B665F] block text-[10px]">pH (30%)</span>
                    <span className="font-bold text-[#2F6B3A]">{activeSoilProfile.formulaBreakdown.phComponent} pts</span>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <span className="text-[#5B665F] block text-[10px]">Moisture (25%)</span>
                    <span className="font-bold text-[#2F6B3A]">{activeSoilProfile.formulaBreakdown.moistureComponent} pts</span>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <span className="text-[#5B665F] block text-[10px]">NPK Ratio (30%)</span>
                    <span className="font-bold text-[#2F6B3A]">{activeSoilProfile.formulaBreakdown.nutrientComponent} pts</span>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <span className="text-[#5B665F] block text-[10px]">Salinity (15%)</span>
                    <span className="font-bold text-[#2F6B3A]">{activeSoilProfile.formulaBreakdown.salinityComponent} pts</span>
                  </div>
                </div>
              </div>
            )}

            {/* Properties Range Bars */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-semibold text-[#1F2A24] uppercase tracking-wider block">
                Soil Fertility & Index Indicators
              </span>

              {/* pH Range Bar */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#5B665F]">Acidity / Alkalinity (pH {customSoilParams.ph.toFixed(1)})</span>
                  <span className="font-semibold font-mono text-[#1F2A24]">
                    {customSoilParams.ph < 6.0 ? 'Acidic' : customSoilParams.ph > 7.5 ? 'Alkaline' : 'Optimal Neutral'}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden flex">
                  <div className="bg-red-400 h-full w-[35%]" title="Acidic (<6.0)"></div>
                  <div className="bg-emerald-500 h-full w-[25%]" title="Optimal (6.0 - 7.5)"></div>
                  <div className="bg-amber-400 h-full w-[40%]" title="Alkaline (>7.5)"></div>
                </div>
              </div>

              {/* Moisture Range Bar */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#5B665F]">Moisture Content ({customSoilParams.moisturePct}%)</span>
                  <span className="font-semibold font-mono text-[#1F2A24]">
                    {customSoilParams.moisturePct < 35 ? 'Low Moisture (Dry)' : customSoilParams.moisturePct > 70 ? 'High Moisture (Wet)' : 'Optimal'}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden flex">
                  <div className="bg-amber-400 h-full w-[35%]" title="Low (<35%)"></div>
                  <div className="bg-emerald-500 h-full w-[35%]" title="Optimal (35-70%)"></div>
                  <div className="bg-blue-500 h-full w-[30%]" title="Wet (>70%)"></div>
                </div>
              </div>

              {/* Salinity EC Bar */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#5B665F]">Salinity Index ({customSoilParams.ec} dS/m)</span>
                  <span className="font-semibold font-mono text-[#1F2A24]">
                    {customSoilParams.ec < 1.5 ? 'Normal (Safe)' : 'Elevated Salinity'}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${customSoilParams.ec > 2.5 ? 'bg-red-500' : customSoilParams.ec > 1.5 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, (customSoilParams.ec / 4.0) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Rule-Based Actions */}
            <div className="pt-3 border-t border-neutral-100 space-y-2">
              <span className="text-xs font-semibold text-[#1F2A24] uppercase tracking-wider block">
                Prescriptive Soil Management Actions
              </span>
              <div className="space-y-2 text-xs">
                {activeSoilProfile.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 text-[#1F2A24] leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-[#2F6B3A] shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agronomic Charts: Radar & Comparison Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Radar Chart */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-5 border border-[#2F6B3A]/15 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#1F2A24]">Soil Nutrient Harmony Radar</h3>
              <span className="text-[11px] text-[#5B665F]">Current sample vs optimal agronomic target</span>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke="#E8F1E4" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#1F2A24' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#5B665F' }} />
                <Radar name="Current Soil" dataKey="current" stroke="#2F6B3A" fill="#2F6B3A" fillOpacity={0.4} />
                <Radar name="Optimal Target" dataKey="optimal" stroke="#E0A526" fill="#E0A526" fillOpacity={0.2} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Tooltip contentStyle={{ backgroundColor: '#FAF7F0', borderRadius: '8px', fontSize: '11px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-5 border border-[#2F6B3A]/15 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#1F2A24]">Benchmark Comparison</h3>
              <span className="text-[11px] text-[#5B665F]">Current parameters vs Indo-Gangetic regional baseline</span>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={benchmarkBarData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8F1E4" vertical={false} />
                <XAxis dataKey="metric" tick={{ fontSize: 10, fill: '#5B665F' }} />
                <YAxis tick={{ fontSize: 10, fill: '#5B665F' }} />
                <Tooltip contentStyle={{ backgroundColor: '#FAF7F0', borderRadius: '8px', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="current" name="Your Soil" fill="#2F6B3A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="benchmark" name="Regional Average" fill="#D98A0B" radius={[4, 4, 0, 0]} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row picker modal */}
      <ReadingsTableModal
        isOpen={tableModalOpen}
        onClose={() => setTableModalOpen(false)}
        onSelectReading={(reading) => {
          selectReadingForAnalysis(reading);
          setSourceMode('picker');
        }}
      />
    </div>
  );
};
