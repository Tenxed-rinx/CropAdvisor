/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Play,
  Pause,
  RotateCcw,
  Settings,
  Database,
  Code,
  Copy,
  Check,
  Activity,
  Sparkles,
  Droplets,
  SlidersHorizontal,
  Info,
  AlertTriangle,
  Layers,
  Scale,
  Gauge
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Legend
} from 'recharts';
import { useApp } from '../context/AppContext';
import { ArduinoCircuit } from '../components/simulator/ArduinoCircuit';
import { SerialMonitor } from '../components/simulator/SerialMonitor';
import { SettingsDrawer } from '../components/simulator/SettingsDrawer';
import { ReadingsTableModal } from '../components/simulator/ReadingsTableModal';
import {
  SimulatorState,
  evaluateFirmwareRules,
  simulateTickPhysics,
  createSensorReading,
  formatSerialFrame,
  generateArduinoInoCode
} from '../lib/firmware';
import {
  soilAdcToPct,
  soilPctToAdc,
  getMoistureStatus,
  SENSOR_EXPLANATION
} from '../lib/units';
import {
  IRRIGATION_PROFILES,
  IRRIGATION_CATEGORIES,
  findIrrigationProfile,
  IrrigationProfile
} from '../lib/irrigationProfiles';

export const SimulatorPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    readings,
    settings,
    updateSettings,
    addReading,
    selectReadingForAnalysis,
    selectedCropId,
    setSelectedCropId
  } = useApp();

  // Initialize crop from URL parameter if provided (e.g. /simulator?crop=rice)
  useEffect(() => {
    const cropFromUrl = searchParams.get('crop');
    if (cropFromUrl) {
      const match = findIrrigationProfile(cropFromUrl);
      if (match) {
        setSelectedCropId(match.id);
      }
    }
  }, [searchParams, setSelectedCropId]);

  const activeProfile = useMemo(() => {
    return findIrrigationProfile(selectedCropId || 'general');
  }, [selectedCropId]);

  // Session-level custom thresholds override for the active crop
  const [customThresholds, setCustomThresholds] = useState<{ onBelowPct: number; offAbovePct: number } | null>(null);
  const [editingThresholds, setEditingThresholds] = useState(false);

  // Effective thresholds
  const effectiveOnPct = customThresholds?.onBelowPct ?? activeProfile.onBelowPct;
  const effectiveOffPct = customThresholds?.offAbovePct ?? activeProfile.offAbovePct;

  // Simulator Hardware State
  const [simState, setSimState] = useState<SimulatorState>({
    soilAdc: 620,
    tempC: 28.5,
    humidity: 58,
    lightAdc: 720,
    waterAdc: 650,
    ph: 6.8,
    pumpOn: false,
    running: false,
    tick: 0,
    overrideMode: 'auto',
    selectedCropId: activeProfile.id,
    customThresholds: null,
    pumpCycles: 0,
    totalPumpOnTicks: 0,
    estimatedWaterUsedL: 0
  });

  const [serialLines, setSerialLines] = useState<string[]>([
    `[Firmware Boot] Crop Profile: ${activeProfile.name} | Target Band: ${effectiveOnPct}% - ${effectiveOffPct}% | Pump: OFF`
  ]);
  const [caption, setCaption] = useState<string>(
    `${activeProfile.name}: Target moisture is ${effectiveOnPct}% to ${effectiveOffPct}%. Soil is normal.`
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [firmwareCodeOpen, setFirmwareCodeOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const simStateRef = useRef(simState);
  simStateRef.current = simState;

  // Handle switching crop profile
  const handleSelectCrop = (cropId: string) => {
    setSelectedCropId(cropId);
    setCustomThresholds(null);
    setEditingThresholds(false);

    const newProfile = findIrrigationProfile(cropId);
    const frameNotice = `Crop profile: ${newProfile.name} | ON < ${newProfile.onBelowPct}% | OFF > ${newProfile.offAbovePct}%`;
    setSerialLines(prev => [...prev.slice(-99), frameNotice]);

    // Re-evaluate rules immediately for current state
    const current = simStateRef.current;
    const { pumpOn, caption: newCaption } = evaluateFirmwareRules(
      current.pumpOn,
      current.soilAdc,
      current.tempC,
      current.waterAdc,
      current.overrideMode,
      settings,
      newProfile,
      null
    );
    setCaption(newCaption);
    setSimState(prev => ({
      ...prev,
      selectedCropId: cropId,
      customThresholds: null,
      pumpOn
    }));
  };

  // Perform single tick
  const stepSimulation = () => {
    const current = simStateRef.current;
    const nextTick = current.tick + 1;

    const result = simulateTickPhysics(current, settings, activeProfile, customThresholds);

    const reading = createSensorReading(
      result.newSoilAdc,
      result.newTempC,
      result.newHumidity,
      result.newLightAdc,
      result.newWaterAdc,
      result.newPh,
      result.newPumpOn,
      result.alerts,
      'simulated',
      activeProfile.name,
      effectiveOnPct,
      effectiveOffPct,
      result.estimatedWaterUsedL
    );

    const frame = formatSerialFrame(reading, nextTick);

    setSerialLines(prev => [...prev.slice(-99), frame]);
    setCaption(result.caption);

    setSimState(prev => ({
      ...prev,
      soilAdc: result.newSoilAdc,
      tempC: result.newTempC,
      humidity: result.newHumidity,
      lightAdc: result.newLightAdc,
      waterAdc: result.newWaterAdc,
      ph: result.newPh,
      pumpOn: result.newPumpOn,
      tick: nextTick,
      pumpCycles: result.pumpCycles,
      totalPumpOnTicks: result.totalPumpOnTicks,
      estimatedWaterUsedL: result.estimatedWaterUsedL
    }));

    if (settings.autoLog) {
      addReading(reading);
    }
  };

  // Timer loop
  useEffect(() => {
    if (!simState.running) return;

    const intervalMs = 2000 / settings.speed;
    const interval = setInterval(() => {
      stepSimulation();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [
    simState.running,
    settings.speed,
    settings.autoLog,
    settings.realisticNoise,
    activeProfile,
    customThresholds,
    effectiveOnPct,
    effectiveOffPct
  ]);

  // Handle Preset Buttons
  const applyPreset = (presetName: string) => {
    let newValues: Partial<SimulatorState> = {};
    let message = '';

    switch (presetName) {
      case 'wet':
        newValues = { soilAdc: 320, tempC: 22.0, humidity: 82, lightAdc: 400, waterAdc: 800, ph: 6.6 };
        message = `Field condition: Wet Soil (85% moisture). Checking ${activeProfile.name} upper limit.`;
        break;
      case 'dry':
        newValues = { soilAdc: 780, tempC: 34.0, humidity: 40, lightAdc: 900, waterAdc: 600, ph: 7.2 };
        message = `Field condition: Dry Soil (30% moisture). Triggering irrigation for ${activeProfile.name} if < ${effectiveOnPct}%.`;
        break;
      case 'hot':
        newValues = { soilAdc: 650, tempC: 38.5, humidity: 35, lightAdc: 980, waterAdc: 450, ph: 7.0 };
        message = `Field condition: Hot Afternoon (38.5°C). Soil evaporation accelerated.`;
        break;
      case 'low_water':
        newValues = { soilAdc: 690, tempC: 29.0, humidity: 50, lightAdc: 650, waterAdc: 120, ph: 6.8 };
        message = `Field condition: Low Water Tank (12%). Pump dry-run lock engaged.`;
        break;
      default:
        break;
    }

    setSimState(prev => {
      const merged = { ...prev, ...newValues };
      const { pumpOn, caption: newCaption } = evaluateFirmwareRules(
        merged.pumpOn,
        merged.soilAdc,
        merged.tempC,
        merged.waterAdc,
        merged.overrideMode,
        settings,
        activeProfile,
        customThresholds
      );
      setCaption(newCaption);
      return { ...merged, pumpOn };
    });

    setSerialLines(prev => [...prev.slice(-99), message]);
  };

  // Handle Slider Changes
  const handleSliderChange = (field: keyof SimulatorState, value: number) => {
    setSimState(prev => {
      const updated = { ...prev, [field]: value };
      const { pumpOn, caption: newCaption } = evaluateFirmwareRules(
        updated.pumpOn,
        updated.soilAdc,
        updated.tempC,
        updated.waterAdc,
        updated.overrideMode,
        settings,
        activeProfile,
        customThresholds
      );
      setCaption(newCaption);
      return { ...updated, pumpOn };
    });
  };

  // Copy Arduino code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(generateArduinoInoCode(settings, activeProfile, customThresholds));
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Chart data: last 30 readings
  const chartData = [...readings].slice(0, 30).reverse().map(r => ({
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    moisturePct: r.soilMoisturePct,
    tempC: r.tempC
  }));

  const latestReading = readings[0] || createSensorReading(
    simState.soilAdc,
    simState.tempC,
    simState.humidity,
    simState.lightAdc,
    simState.waterAdc,
    simState.ph,
    simState.pumpOn,
    [],
    'simulated',
    activeProfile.name,
    effectiveOnPct,
    effectiveOffPct,
    simState.estimatedWaterUsedL
  );

  // Water comparison vs General profile
  const waterDiffPct = Math.round((activeProfile.waterUseMultiplier - 1.0) * 100);

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#2F6B3A]/15 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#2F6B3A]">
            Section 1 · Virtual IoT Sensor Board
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2A24] mt-0.5">
            Crop-Aware Virtual Sensor Board & Irrigation
          </h1>
          <p className="text-sm text-[#5B665F] mt-1 max-w-2xl">
            Monitor real-time soil telemetry and test crop-specific automated irrigation rules without physical hardware.
          </p>
        </div>

        {/* Global Reset */}
        <button
          onClick={() => {
            setSimState({
              soilAdc: 620,
              tempC: 28.5,
              humidity: 58,
              lightAdc: 720,
              waterAdc: 650,
              ph: 6.8,
              pumpOn: false,
              running: false,
              tick: 0,
              overrideMode: 'auto',
              selectedCropId: activeProfile.id,
              customThresholds: null,
              pumpCycles: 0,
              totalPumpOnTicks: 0,
              estimatedWaterUsedL: 0
            });
            setCaption(`Reset board to standard baseline for ${activeProfile.name}.`);
            setSerialLines(prev => [...prev, `Board reset to initial baseline values.`]);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 text-[#5B665F] hover:text-[#1F2A24] hover:bg-[#FAF7F0] border border-neutral-200 rounded-xl text-xs font-medium transition-colors self-start md:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Board</span>
        </button>
      </div>

      {/* Control Bar with Crop Dropdown & Stream Controls */}
      <div className="bg-white rounded-2xl p-4 border border-[#2F6B3A]/15 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Left: Playback controls & Crop Selector */}
        <div className="flex flex-wrap items-center gap-3">
          {simState.running ? (
            <button
              onClick={() => setSimState(prev => ({ ...prev, running: false }))}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause Live Stream</span>
            </button>
          ) : (
            <button
              onClick={() => setSimState(prev => ({ ...prev, running: true }))}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#2F6B3A] hover:bg-[#25562e] text-white font-semibold rounded-xl text-xs transition-colors shadow-xs"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Live Stream</span>
            </button>
          )}

          {/* Crop Profile Dropdown (Grouped by Category) */}
          <div className="flex items-center gap-2 bg-[#FAF7F0] px-3 py-1.5 rounded-xl border border-[#2F6B3A]/20">
            <span className="text-xs font-bold text-[#2F6B3A] flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5" />
              <span>Crop:</span>
            </span>
            <select
              value={activeProfile.id}
              onChange={(e) => handleSelectCrop(e.target.value)}
              className="bg-white border border-[#2F6B3A]/25 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#1F2A24] focus:outline-none focus:ring-1 focus:ring-[#2F6B3A]"
            >
              {IRRIGATION_CATEGORIES.map(category => {
                const cropsInCategory = IRRIGATION_PROFILES.filter(p => p.category === category);
                if (cropsInCategory.length === 0) return null;
                return (
                  <optgroup key={category} label={category}>
                    {cropsInCategory.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (ON &lt; {p.onBelowPct}%, OFF &gt; {p.offAbovePct}%)
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>
        </div>

        {/* Right: Simulation Speed & Thresholds */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Speed selector */}
          <div className="flex items-center gap-1 bg-[#FAF7F0] p-1 rounded-lg border border-[#2F6B3A]/15">
            <span className="text-[11px] text-[#5B665F] px-1.5 font-medium">Speed:</span>
            {([1, 2, 5] as const).map(s => (
              <button
                key={s}
                onClick={() => updateSettings({ speed: s })}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  settings.speed === s
                    ? 'bg-[#2F6B3A] text-white shadow-xs'
                    : 'text-[#5B665F] hover:text-[#1F2A24]'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Natural Noise toggle */}
          <button
            onClick={() => updateSettings({ realisticNoise: !settings.realisticNoise })}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-colors ${
              settings.realisticNoise
                ? 'bg-[#E8F1E4] border-[#2F6B3A]/30 text-[#2F6B3A] font-medium'
                : 'bg-white border-neutral-200 text-[#5B665F]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Natural Variation</span>
          </button>

          {/* Auto-Save toggle */}
          <button
            onClick={() => updateSettings({ autoLog: !settings.autoLog })}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-colors ${
              settings.autoLog
                ? 'bg-[#E8F1E4] border-[#2F6B3A]/30 text-[#2F6B3A] font-medium'
                : 'bg-white border-neutral-200 text-[#5B665F]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Auto-Save</span>
          </button>

          {/* Hardware Settings button */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#FAF7F0] border border-[#2F6B3A]/25 text-[#1F2A24] font-semibold rounded-lg hover:bg-[#E8F1E4] transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-[#2F6B3A]" />
            <span>Hardware Limits</span>
          </button>
        </div>
      </div>

      {/* Active Crop Profile Card & Target Band Overview */}
      <div className="bg-white rounded-2xl p-5 border border-[#2F6B3A]/20 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-3.5">
            <img
              src={activeProfile.image}
              alt={activeProfile.name}
              className="w-14 h-14 rounded-xl object-cover border border-[#2F6B3A]/20 shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#1F2A24]">{activeProfile.name}</h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E8F1E4] text-[#2F6B3A]">
                  {activeProfile.category}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  activeProfile.waterDemand === 'Very high'
                    ? 'bg-blue-100 text-blue-800'
                    : activeProfile.waterDemand === 'High'
                    ? 'bg-sky-100 text-sky-800'
                    : activeProfile.waterDemand === 'Medium'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {activeProfile.waterDemand} Water Demand
                </span>
              </div>
              <p className="text-xs text-[#5B665F] mt-0.5">
                {activeProfile.note}
              </p>
            </div>
          </div>

          {/* Threshold Action Button */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => setEditingThresholds(!editingThresholds)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF7F0] border border-[#2F6B3A]/20 text-[#2F6B3A] rounded-xl text-xs font-semibold hover:bg-[#E8F1E4] transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{editingThresholds ? 'Close threshold editor' : 'Edit thresholds'}</span>
            </button>
            {customThresholds && (
              <button
                onClick={() => setCustomThresholds(null)}
                className="text-xs text-[#C2410C] hover:underline"
              >
                Reset to default
              </button>
            )}
          </div>
        </div>

        {/* Target Moisture Band & Rule Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-[#FAF7F0] rounded-xl border border-[#2F6B3A]/15">
            <span className="text-[11px] text-[#5B665F] block">Target Moisture Band</span>
            <span className="text-sm font-bold text-[#2F6B3A] block mt-0.5">
              Keep between {effectiveOnPct}% and {effectiveOffPct}%
            </span>
            <span className="text-[10px] text-[#5B665F]">
              Derived ADC: {soilPctToAdc(effectiveOffPct)} (Wet) to {soilPctToAdc(effectiveOnPct)} (Dry)
            </span>
          </div>

          <div className="p-3 bg-[#FAF7F0] rounded-xl border border-[#2F6B3A]/15">
            <span className="text-[11px] text-[#5B665F] block">Firmware Hysteresis Rule</span>
            <span className="text-xs font-bold text-[#1F2A24] block mt-0.5">
              {activeProfile.name}: pump ON below {effectiveOnPct}%, OFF above {effectiveOffPct}%
            </span>
            <span className="text-[10px] text-[#5B665F]">
              Cycle type: {activeProfile.pumpRunCycle} runs
            </span>
          </div>

          <div className="p-3 bg-[#FAF7F0] rounded-xl border border-[#2F6B3A]/15">
            <span className="text-[11px] text-[#5B665F] block">Safety Limits</span>
            <span className="text-xs font-semibold text-[#1F2A24] block mt-0.5">
              Stress &lt; {activeProfile.drynessWarnPct}% · Waterlogging &gt; {activeProfile.overwaterWarnPct}%
            </span>
            <span className="text-[10px] text-[#5B665F]">
              Ideal temp: {activeProfile.idealTempRange[0]}°C - {activeProfile.idealTempRange[1]}°C
            </span>
          </div>

          <div className="p-3 bg-[#FAF7F0] rounded-xl border border-[#2F6B3A]/15">
            <span className="text-[11px] text-[#5B665F] block">Relative Water Consumption</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm font-bold text-[#1F2A24]">
                {activeProfile.waterUseMultiplier}x
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                waterDiffPct > 0 ? 'bg-orange-100 text-orange-900' : waterDiffPct < 0 ? 'bg-emerald-100 text-emerald-900' : 'bg-neutral-100 text-neutral-700'
              }`}>
                {waterDiffPct > 0 ? `+${waterDiffPct}% vs General` : waterDiffPct < 0 ? `${waterDiffPct}% vs General` : 'Matches General'}
              </span>
            </div>
            <span className="text-[10px] text-[#5B665F]">
              Drains water tank faster during irrigation
            </span>
          </div>
        </div>

        {/* In-Session Threshold Override Editor */}
        {editingThresholds && (
          <div className="p-4 bg-emerald-50/60 rounded-xl border border-[#2F6B3A]/25 space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#2F6B3A]">
                Custom Session Thresholds for {activeProfile.name}
              </span>
              <span className="text-[11px] text-[#5B665F]">
                Changes only apply to current browser simulation session
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-[#1F2A24]">Pump ON below (% Moisture)</span>
                  <span className="font-mono font-bold text-[#C2410C]">
                    {effectiveOnPct}% (ADC {soilPctToAdc(effectiveOnPct)})
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="85"
                  value={effectiveOnPct}
                  onChange={(e) => {
                    const newOn = Number(e.target.value);
                    setCustomThresholds({
                      onBelowPct: newOn,
                      offAbovePct: Math.max(newOn + 5, effectiveOffPct)
                    });
                  }}
                  className="w-full accent-[#C2410C]"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-[#1F2A24]">Pump OFF above (% Moisture)</span>
                  <span className="font-mono font-bold text-[#2F8F4E]">
                    {effectiveOffPct}% (ADC {soilPctToAdc(effectiveOffPct)})
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="98"
                  value={effectiveOffPct}
                  onChange={(e) => {
                    const newOff = Number(e.target.value);
                    setCustomThresholds({
                      onBelowPct: Math.min(effectiveOnPct, newOff - 5),
                      offAbovePct: newOff
                    });
                  }}
                  className="w-full accent-[#2F8F4E]"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Irrigation Counter & Water Resource Panel */}
      <div className="bg-white rounded-2xl p-5 border border-[#2F6B3A]/15 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-[#2F6B3A]" />
            <h3 className="text-sm font-bold text-[#1F2A24]">
              Active Irrigation & Resource Counter
            </h3>
          </div>
          <span className="text-[11px] text-[#5B665F]">
            Assumption: 2 Litres water consumed per active pump tick
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 text-xs">
          <div className="p-3 bg-[#FAF7F0] rounded-xl border border-neutral-200">
            <span className="text-[11px] text-[#5B665F] block">Total Pump Cycles</span>
            <div className="text-xl font-bold font-mono text-[#1F2A24] mt-1">
              {simState.pumpCycles}
            </div>
            <span className="text-[10px] text-[#5B665F]">ON/OFF transitions</span>
          </div>

          <div className="p-3 bg-[#FAF7F0] rounded-xl border border-neutral-200">
            <span className="text-[11px] text-[#5B665F] block">Pump Run Duration</span>
            <div className="text-xl font-bold font-mono text-[#2F6B3A] mt-1">
              {simState.totalPumpOnTicks} ticks
            </div>
            <span className="text-[10px] text-[#5B665F]">Active watering intervals</span>
          </div>

          <div className="p-3 bg-[#FAF7F0] rounded-xl border border-neutral-200">
            <span className="text-[11px] text-[#5B665F] block">Estimated Water Used</span>
            <div className="text-xl font-bold font-mono text-sky-700 mt-1">
              {simState.estimatedWaterUsedL} L
            </div>
            <span className="text-[10px] text-[#5B665F]">Derived volumetric consumption</span>
          </div>

          <div className="p-3 bg-[#FAF7F0] rounded-xl border border-neutral-200">
            <span className="text-[11px] text-[#5B665F] block">Water Use vs General</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-base font-bold font-mono ${
                waterDiffPct > 0 ? 'text-[#C2410C]' : waterDiffPct < 0 ? 'text-[#2F8F4E]' : 'text-[#1F2A24]'
              }`}>
                {waterDiffPct > 0 ? `+${waterDiffPct}%` : waterDiffPct < 0 ? `${waterDiffPct}%` : '0%'}
              </span>
              <span className="text-[10px] text-[#5B665F]">
                ({activeProfile.waterUseMultiplier}x rate)
              </span>
            </div>
            <span className="text-[10px] text-[#5B665F] block truncate">
              {activeProfile.name} tank drain rate
            </span>
          </div>
        </div>
      </div>

      {/* "What's happening" live caption banner in simple words */}
      <div className="p-3.5 bg-[#E8F1E4] border border-[#2F6B3A]/20 rounded-xl flex items-center justify-between text-xs text-[#1F2A24]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#2F6B3A] shrink-0" />
          <span className="font-bold text-[#2F6B3A]">System Action:</span>
          <span className="font-medium">{caption}</span>
        </div>
        <span className="hidden sm:inline text-[#5B665F] font-mono">
          Target: {effectiveOnPct}% - {effectiveOffPct}%
        </span>
      </div>

      {/* Main Two-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Labelled Circuit (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <ArduinoCircuit
            soilAdc={simState.soilAdc}
            tempC={simState.tempC}
            humidity={simState.humidity}
            lightAdc={simState.lightAdc}
            waterAdc={simState.waterAdc}
            ph={simState.ph}
            pumpOn={simState.pumpOn}
            running={simState.running}
          />

          {/* Quick Presets */}
          <div className="bg-white rounded-2xl p-4 border border-[#2F6B3A]/15 space-y-2">
            <span className="text-xs font-bold text-[#1F2A24] uppercase tracking-wider block">
              Quick Field Condition Presets
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => applyPreset('wet')}
                className="px-3 py-2 bg-[#FAF7F0] hover:bg-[#E8F1E4] border border-[#2F6B3A]/15 rounded-xl text-xs font-medium text-left transition-colors"
              >
                <span className="block font-bold text-[#1F2A24]">Wet field</span>
                <span className="text-[10px] text-[#5B665F]">85% Soil Moisture</span>
              </button>
              <button
                onClick={() => applyPreset('dry')}
                className="px-3 py-2 bg-[#FAF7F0] hover:bg-[#E8F1E4] border border-[#2F6B3A]/15 rounded-xl text-xs font-medium text-left transition-colors"
              >
                <span className="block font-bold text-[#1F2A24]">Dry field</span>
                <span className="text-[10px] text-[#5B665F]">30% Moisture (Dry)</span>
              </button>
              <button
                onClick={() => applyPreset('hot')}
                className="px-3 py-2 bg-[#FAF7F0] hover:bg-[#E8F1E4] border border-[#2F6B3A]/15 rounded-xl text-xs font-medium text-left transition-colors"
              >
                <span className="block font-bold text-[#1F2A24]">Hot afternoon</span>
                <span className="text-[10px] text-[#5B665F]">38.5°C · Sunny</span>
              </button>
              <button
                onClick={() => applyPreset('low_water')}
                className="px-3 py-2 bg-[#FAF7F0] hover:bg-[#E8F1E4] border border-[#2F6B3A]/15 rounded-xl text-xs font-medium text-left transition-colors"
              >
                <span className="block font-bold text-[#1F2A24]">Low water tank</span>
                <span className="text-[10px] text-[#5B665F]">Empty Tank Guard</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Sliders & Serial Monitor (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Sliders Panel */}
          <div className="bg-white rounded-2xl p-5 border border-[#2F6B3A]/15 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <h3 className="text-sm font-bold text-[#1F2A24]">Manual Adjustment Sliders</h3>
              <span className="text-[11px] text-[#5B665F]">Simulate real farm shifts</span>
            </div>

            {/* 1. Soil Moisture Slider with Crop Target Markers */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#1F2A24]">Soil Moisture Level</span>
                <span className="font-mono text-[#2F6B3A] font-bold">
                  {soilAdcToPct(simState.soilAdc)}% · {simState.soilAdc} ADC ({getMoistureStatus(soilAdcToPct(simState.soilAdc))})
                </span>
              </div>
              <input
                type="range"
                min="200"
                max="1023"
                value={simState.soilAdc}
                onChange={(e) => handleSliderChange('soilAdc', Number(e.target.value))}
                className="w-full accent-[#2F6B3A]"
              />
              <div className="flex justify-between text-[10px] text-[#5B665F]">
                <span>Wet / Watered (200 ADC)</span>
                <span>Dry / Arid (1023 ADC)</span>
              </div>
              {/* Note about ADC & Target Band */}
              <div className="pt-1 flex flex-col gap-1 text-[11px] bg-[#FAF7F0] p-2.5 rounded-lg border border-[#2F6B3A]/15">
                <div className="flex justify-between font-mono">
                  <span className="text-[#2F6B3A] font-semibold">
                    {activeProfile.name} Target: {effectiveOnPct}% - {effectiveOffPct}%
                  </span>
                  <span className={simState.pumpOn ? 'text-[#2F8F4E] font-bold' : 'text-[#5B665F]'}>
                    Pump: {simState.pumpOn ? 'ON' : 'OFF'}
                  </span>
                </div>
                <span className="text-[10px] text-[#5B665F]">
                  {SENSOR_EXPLANATION}
                </span>
              </div>
            </div>

            {/* 2. Temperature */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#1F2A24]">Air Temperature</span>
                <span className="font-mono text-[#1F2A24] font-bold">{simState.tempC}°C</span>
              </div>
              <input
                type="range"
                min="-10"
                max="60"
                step="0.5"
                value={simState.tempC}
                onChange={(e) => handleSliderChange('tempC', Number(e.target.value))}
                className="w-full accent-[#D98A0B]"
              />
            </div>

            {/* 3. Humidity */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#1F2A24]">Air Humidity</span>
                <span className="font-mono text-[#1F2A24] font-bold">{simState.humidity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={simState.humidity}
                onChange={(e) => handleSliderChange('humidity', Number(e.target.value))}
                className="w-full accent-[#0284C7]"
              />
            </div>

            {/* 4. Sunlight (LDR) */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#1F2A24]">Sunlight Intensity (LDR)</span>
                <span className="font-mono text-[#1F2A24] font-bold">
                  {simState.lightAdc} ADC ({simState.lightAdc > 700 ? 'Bright Daylight' : 'Low Light'})
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1023"
                value={simState.lightAdc}
                onChange={(e) => handleSliderChange('lightAdc', Number(e.target.value))}
                className="w-full accent-[#E0A526]"
              />
            </div>

            {/* 5. Water Level */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#1F2A24]">Water Tank Level</span>
                <span className="font-mono text-[#1F2A24] font-bold">
                  {Math.round((simState.waterAdc / 1023) * 100)}% ({simState.waterAdc} ADC)
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="1023"
                value={simState.waterAdc}
                onChange={(e) => handleSliderChange('waterAdc', Number(e.target.value))}
                className="w-full accent-[#0EA5E9]"
              />
            </div>

            {/* 6. pH */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#1F2A24]">Soil pH</span>
                <span className="font-mono text-[#1F2A24] font-bold">{simState.ph.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="3.0"
                max="10.0"
                step="0.1"
                value={simState.ph}
                onChange={(e) => handleSliderChange('ph', Number(e.target.value))}
                className="w-full accent-[#8B5CF6]"
              />
            </div>

            {/* Pump Override Mode */}
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1F2A24]">Pump Override:</span>
              <div className="flex items-center gap-1 bg-[#FAF7F0] p-1 rounded-lg border border-[#2F6B3A]/15 text-xs">
                {(['auto', 'on', 'off'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => {
                      setSimState(prev => {
                        const updated = { ...prev, overrideMode: mode };
                        const { pumpOn, caption: newCap } = evaluateFirmwareRules(
                          updated.pumpOn,
                          updated.soilAdc,
                          updated.tempC,
                          updated.waterAdc,
                          mode,
                          settings,
                          activeProfile,
                          customThresholds
                        );
                        setCaption(newCap);
                        return { ...updated, pumpOn };
                      });
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition-colors ${
                      simState.overrideMode === mode
                        ? 'bg-[#2F6B3A] text-white shadow-xs'
                        : 'text-[#5B665F] hover:text-[#1F2A24]'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Farmer-Friendly Serial Monitor */}
          <SerialMonitor
            lines={serialLines}
            onClear={() => setSerialLines([`[Buffer Cleared] Monitoring ${activeProfile.name}...`])}
            running={simState.running}
          />
        </div>
      </div>

      {/* Live Data Preview Section */}
      <div className="space-y-6 pt-4 border-t border-[#2F6B3A]/15">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#1F2A24]">Live Telemetry Stream & Crop Dynamics</h2>
            <p className="text-xs text-[#5B665F]">
              Monitoring active crop band ({effectiveOnPct}% - {effectiveOffPct}%) and sensor changes
            </p>
          </div>
          <button
            onClick={() => setTableModalOpen(true)}
            className="px-3 py-1.5 bg-white border border-[#2F6B3A]/25 text-[#2F6B3A] font-semibold text-xs rounded-xl hover:bg-[#E8F1E4] transition-colors"
          >
            View full dataset
          </button>
        </div>

        {/* Latest Reading Strip (6 Value Tiles) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl p-3.5 border border-[#2F6B3A]/15 shadow-xs">
            <span className="text-[11px] text-[#5B665F] block">Soil Moisture</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-[#1F2A24] font-mono">{latestReading.soilMoisturePct}%</span>
            </div>
            <span className={`inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded ${
              latestReading.soilMoisturePct < effectiveOnPct
                ? 'bg-amber-100 text-amber-900'
                : latestReading.soilMoisturePct > effectiveOffPct
                ? 'bg-blue-100 text-blue-900'
                : 'bg-emerald-100 text-emerald-900'
            }`}>
              {latestReading.soilMoisturePct < effectiveOnPct
                ? 'Below Target'
                : latestReading.soilMoisturePct > effectiveOffPct
                ? 'Above Target'
                : 'In Target Band'}
            </span>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-[#2F6B3A]/15 shadow-xs">
            <span className="text-[11px] text-[#5B665F] block">Temperature</span>
            <div className="text-xl font-bold text-[#1F2A24] font-mono mt-1">
              {latestReading.tempC}°C
            </div>
            <span className={`inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded ${
              latestReading.tempC > 35 ? 'bg-orange-100 text-orange-900' : 'bg-emerald-100 text-emerald-900'
            }`}>
              {latestReading.tempC > 35 ? 'Heat Alert' : 'Normal'}
            </span>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-[#2F6B3A]/15 shadow-xs">
            <span className="text-[11px] text-[#5B665F] block">Air Humidity</span>
            <div className="text-xl font-bold text-[#1F2A24] font-mono mt-1">
              {latestReading.humidityPct}%
            </div>
            <span className="inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800">
              {latestReading.humidityPct > 70 ? 'Humid' : latestReading.humidityPct < 40 ? 'Arid' : 'Moderate'}
            </span>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-[#2F6B3A]/15 shadow-xs">
            <span className="text-[11px] text-[#5B665F] block">Light Intensity</span>
            <div className="text-xl font-bold text-[#1F2A24] font-mono mt-1">
              {latestReading.lightAdc} ADC
            </div>
            <span className="inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800">
              {latestReading.lightAdc > 700 ? 'Sunlight' : 'Ambient'}
            </span>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-[#2F6B3A]/15 shadow-xs">
            <span className="text-[11px] text-[#5B665F] block">Water Tank</span>
            <div className="text-xl font-bold text-[#1F2A24] font-mono mt-1">
              {Math.round((latestReading.waterLevelAdc / 1023) * 100)}%
            </div>
            <span className={`inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded ${
              latestReading.waterLevelAdc < 200 ? 'bg-red-100 text-red-900' : 'bg-emerald-100 text-emerald-900'
            }`}>
              {latestReading.waterLevelAdc < 200 ? 'Low Tank' : 'Adequate'}
            </span>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-[#2F6B3A]/15 shadow-xs">
            <span className="text-[11px] text-[#5B665F] block">Pump Status</span>
            <div className="text-xl font-bold mt-1 font-mono">
              <span className={latestReading.pumpOn ? 'text-[#2F8F4E]' : 'text-neutral-500'}>
                {latestReading.pumpOn ? 'ACTIVE' : 'OFF'}
              </span>
            </div>
            <span className="inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
              {latestReading.pumpOn ? 'Irrigating' : 'Resting'}
            </span>
          </div>
        </div>

        {/* Charts & Table Preview Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Live Line Chart with Shaded Crop Target Band (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-[#2F6B3A]/15 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h3 className="text-sm font-bold text-[#1F2A24]">
                  {activeProfile.name} Moisture Dynamics & Target Band
                </h3>
                <span className="text-[11px] text-[#5B665F]">
                  Green shaded band shows ideal {effectiveOnPct}% - {effectiveOffPct}% range
                </span>
              </div>
              <div className="text-[11px] text-[#2F6B3A] font-mono font-semibold">
                ON &lt; {effectiveOnPct}% | OFF &gt; {effectiveOffPct}%
              </div>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8F1E4" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#5B665F' }} />
                  <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 10, fill: '#5B665F' }} />
                  <YAxis yAxisId="right" orientation="right" domain={[10, 50]} tick={{ fontSize: 10, fill: '#5B665F' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FAF7F0', borderColor: '#2F6B3A', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

                  {/* Shaded Target Moisture Band for Active Crop */}
                  <ReferenceArea
                    yAxisId="left"
                    y1={effectiveOnPct}
                    y2={effectiveOffPct}
                    fill="#2F8F4E"
                    fillOpacity={0.12}
                    stroke="#2F8F4E"
                    strokeDasharray="3 3"
                  />

                  {/* Pump ON line */}
                  <ReferenceLine
                    yAxisId="left"
                    y={effectiveOnPct}
                    label={{ value: `Pump ON (<${effectiveOnPct}%)`, fill: '#C2410C', fontSize: 10, position: 'insideBottomLeft' }}
                    stroke="#C2410C"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                  />

                  {/* Pump OFF line */}
                  <ReferenceLine
                    yAxisId="left"
                    y={effectiveOffPct}
                    label={{ value: `Pump OFF (>${effectiveOffPct}%)`, fill: '#2F8F4E', fontSize: 10, position: 'insideTopLeft' }}
                    stroke="#2F8F4E"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                  />

                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="moisturePct"
                    name="Soil Moisture (%)"
                    stroke="#2F6B3A"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="tempC"
                    name="Temperature (°C)"
                    stroke="#E0A526"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table Preview (Last 8 rows) with Crop Profile Column (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-[#2F6B3A]/15 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#1F2A24]">Recent Logged Records</h3>
                <span className="text-[11px] text-[#5B665F]">Includes active crop profile & targets</span>
              </div>
              <button
                onClick={() => setTableModalOpen(true)}
                className="text-xs text-[#2F6B3A] font-semibold hover:underline"
              >
                View all records
              </button>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-[11px] border-collapse font-mono">
                <thead>
                  <tr className="border-b border-neutral-100 text-[#5B665F] font-sans">
                    <th className="py-1.5 px-2">Time</th>
                    <th className="py-1.5 px-2">Crop</th>
                    <th className="py-1.5 px-2">Moisture</th>
                    <th className="py-1.5 px-2">Pump</th>
                    <th className="py-1.5 px-2">Water</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {readings.slice(0, 8).map((r, i) => (
                    <tr key={r.id || i} className="hover:bg-[#FAF7F0]">
                      <td className="py-1.5 px-2 text-[#1F2A24]">
                        {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-1.5 px-2 font-sans font-semibold text-[#2F6B3A]">
                        {r.cropProfile || 'General'}
                      </td>
                      <td className="py-1.5 px-2">
                        <span className="text-[#1F2A24] font-semibold">{r.soilMoisturePct}%</span>
                        <span className="text-[10px] text-[#5B665F] block font-sans">
                          {r.targetMinPct ? `${r.targetMinPct}-${r.targetMaxPct}%` : '63-70%'}
                        </span>
                      </td>
                      <td className="py-1.5 px-2">
                        <span className={`px-1 py-0.5 rounded text-[9px] font-sans ${
                          r.pumpOn ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-600'
                        }`}>
                          {r.pumpOn ? 'ON' : 'OFF'}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-[#5B665F]">
                        {r.waterUsedL ?? 0} L
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Collapsible Arduino Firmware Code (.ino) with Crop Profile Selector */}
        <div className="bg-white rounded-2xl border border-[#2F6B3A]/15 overflow-hidden shadow-xs">
          <button
            onClick={() => setFirmwareCodeOpen(!firmwareCodeOpen)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-[#FAF7F0] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Code className="w-5 h-5 text-[#2F6B3A]" />
              <div>
                <span className="font-semibold text-sm text-[#1F2A24] block">
                  Production Arduino UNO C++ Firmware (`crop_advisor_firmware.ino`)
                </span>
                <span className="text-xs text-[#5B665F]">
                  Selected profile: {activeProfile.name} (ON below {soilPctToAdc(effectiveOnPct)} ADC | OFF above {soilPctToAdc(effectiveOffPct)} ADC)
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-[#2F6B3A]">
              {firmwareCodeOpen ? 'Hide code' : 'View Arduino .ino'}
            </span>
          </button>

          {firmwareCodeOpen && (
            <div className="p-4 bg-[#0B0F19] border-t border-neutral-800 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-400 font-mono">
                  Configured for: {activeProfile.name} ({effectiveOnPct}% - {effectiveOffPct}%) · Includes #define profile selector
                </span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs transition-colors"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied to clipboard' : 'Copy code'}</span>
                </button>
              </div>
              <pre className="p-3 text-neutral-200 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[350px] custom-scrollbar-dark">
                {generateArduinoInoCode(settings, activeProfile, customThresholds)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdate={updateSettings}
      />

      {/* Full Telemetry Table Modal */}
      <ReadingsTableModal
        isOpen={tableModalOpen}
        onClose={() => setTableModalOpen(false)}
        onSelectReading={(reading) => {
          selectReadingForAnalysis(reading);
          navigate('/soil-analysis');
        }}
      />
    </div>
  );
};
