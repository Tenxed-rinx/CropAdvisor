/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Sliders, ShieldCheck, Check } from 'lucide-react';
import { SimulationSettings } from '../../types';
import { soilAdcToPct } from '../../lib/units';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SimulationSettings;
  onUpdate: (newSettings: Partial<SimulationSettings>) => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdate
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto border-l border-[#2F6B3A]/15">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2F6B3A]/15">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#2F6B3A]" />
            <h3 className="text-lg font-bold text-[#1F2A24]">Pump & Safety Thresholds</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#5B665F] hover:text-[#1F2A24] hover:bg-[#E8F1E4] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-6 py-6 text-sm flex-1">
          {/* Merged Pump Moisture Control Thresholds Card with simple words */}
          <div className="p-4 bg-[#FAF7F0] rounded-xl border border-[#2F6B3A]/20 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#1F2A24] block">
                Automatic Pump Watering Window
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Recommended
              </span>
            </div>
            <p className="text-xs text-[#5B665F] leading-relaxed">
              The pump starts watering when the soil gets too dry, and turns off once the crop roots have enough water.
            </p>

            {/* Start Watering Setting */}
            <div className="space-y-1.5 bg-white p-3 rounded-lg border border-neutral-200">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-[#1F2A24]">Start Watering When Dry:</span>
                <span className="font-mono font-bold text-[#2F6B3A]">
                  ADC &gt; {settings.pumpOnThresholdAdc} ({soilAdcToPct(settings.pumpOnThresholdAdc)}% moisture)
                </span>
              </div>
              <input
                type="range"
                min="460"
                max="800"
                step="10"
                value={settings.pumpOnThresholdAdc}
                onChange={(e) => onUpdate({ pumpOnThresholdAdc: Number(e.target.value) })}
                className="w-full accent-[#2F6B3A]"
              />
              <span className="text-[10px] text-[#5B665F] block">
                Recommended: 500 ADC (~63% moisture). Higher value = waits until soil is drier.
              </span>
            </div>

            {/* Stop Watering Setting */}
            <div className="space-y-1.5 bg-white p-3 rounded-lg border border-neutral-200">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-[#1F2A24]">Stop Watering When Hydrated:</span>
                <span className="font-mono font-bold text-[#2F6B3A]">
                  ADC &lt; {settings.pumpOffThresholdAdc} ({soilAdcToPct(settings.pumpOffThresholdAdc)}% moisture)
                </span>
              </div>
              <input
                type="range"
                min="300"
                max="490"
                step="10"
                value={settings.pumpOffThresholdAdc}
                onChange={(e) => onUpdate({ pumpOffThresholdAdc: Number(e.target.value) })}
                className="w-full accent-[#2F6B3A]"
              />
              <span className="text-[10px] text-[#5B665F] block">
                Recommended: 450 ADC (~70% moisture). Prevents pump from turning on and off too quickly.
              </span>
            </div>
          </div>

          {/* High Temperature Alert */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-[#1F2A24]">High Temperature Alert (Heat Stress)</span>
              <span className="font-mono text-xs text-[#C2410C] font-semibold">
                {settings.highTempThresholdC}°C (Recommended: 35°C)
              </span>
            </div>
            <input
              type="range"
              min="28"
              max="45"
              step="1"
              value={settings.highTempThresholdC}
              onChange={(e) => onUpdate({ highTempThresholdC: Number(e.target.value) })}
              className="w-full accent-[#C2410C]"
            />
            <p className="text-[11px] text-[#5B665F]">
              Warns you when extreme heat may cause fast water evaporation.
            </p>
          </div>

          {/* Low Water Tank Protection */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-[#1F2A24]">Tank Safety Cutoff (Empty Tank Guard)</span>
              <span className="font-mono text-xs text-[#D98A0B] font-semibold">
                {settings.lowWaterThresholdAdc} ADC (Recommended: 200 ADC / ~20%)
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="400"
              step="10"
              value={settings.lowWaterThresholdAdc}
              onChange={(e) => onUpdate({ lowWaterThresholdAdc: Number(e.target.value) })}
              className="w-full accent-[#D98A0B]"
            />
            <p className="text-[11px] text-[#5B665F]">
              Stops the water pump if the tank runs low to protect motor from burning out.
            </p>
          </div>

          {/* Toggles */}
          <div className="pt-4 border-t border-neutral-100 space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-semibold text-[#1F2A24] block text-xs">Realistic Natural Fluctuation (±2%)</span>
                <span className="text-[11px] text-[#5B665F]">Adds slight natural sensor variations</span>
              </div>
              <input
                type="checkbox"
                checked={settings.realisticNoise}
                onChange={(e) => onUpdate({ realisticNoise: e.target.checked })}
                className="w-4 h-4 accent-[#2F6B3A] rounded"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-semibold text-[#1F2A24] block text-xs">Auto-Save Telemetry to Records</span>
                <span className="text-[11px] text-[#5B665F]">Logs updates into table for soil analysis</span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoLog}
                onChange={(e) => onUpdate({ autoLog: e.target.checked })}
                className="w-4 h-4 accent-[#2F6B3A] rounded"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#2F6B3A]/15 flex items-center justify-between">
          <button
            onClick={() => onUpdate({
              pumpOnThresholdAdc: 500,
              pumpOffThresholdAdc: 450,
              highTempThresholdC: 35,
              lowWaterThresholdAdc: 200,
              realisticNoise: true,
              autoLog: true
            })}
            className="text-xs text-[#5B665F] hover:text-[#1F2A24] underline"
          >
            Reset to Recommended
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#2F6B3A] text-white font-medium text-xs rounded-xl hover:bg-[#25562e] transition-colors"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
