/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  Database,
  Layers,
  Download,
  Upload,
  RotateCcw,
  CheckCircle,
  GitBranch,
  Sparkles,
  Filter,
  BarChart2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  auditDataQuality,
  computeCorrelationMatrix
} from '../lib/dataQuality';

export const DataLabPage: React.FC = () => {
  const {
    readings,
    resetToSampleData,
    exportCsvData,
    importCsvData,
    settings
  } = useApp();

  const [importNotice, setImportNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Run data quality audit
  const auditReport = useMemo(() => {
    return auditDataQuality(readings);
  }, [readings]);

  // Compute correlation matrix
  const correlation = useMemo(() => {
    return computeCorrelationMatrix(readings);
  }, [readings]);

  const simVelocityRpm = settings.speed * 30;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await importCsvData(file);
    setImportNotice(res.message);
    setTimeout(() => setImportNotice(null), 5000);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#2F6B3A]/15 p-6 shadow-xs">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2A24]">
          Data Lab · Pipeline Architecture & Analytics
        </h1>
        <p className="text-sm text-[#5B665F] mt-1 max-w-2xl">
          See how Kaggle agricultural datasets and live sensor telemetry flow through data cleaning, soil classification, and crop analytics.
        </p>
      </div>

      {/* Simplified, Easy-to-Explain Pipeline (Requirement 1) */}
      <div className="bg-white rounded-2xl p-6 border border-[#2F6B3A]/15 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-[#2F6B3A]" />
            <h2 className="text-base font-bold text-[#1F2A24]">
              How the Data Pipeline Works (4 Easy Steps)
            </h2>
          </div>
          <span className="text-xs font-semibold text-[#2F6B3A] bg-[#E8F1E4] px-2.5 py-1 rounded-lg">
            Continuous Live Ingestion
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {/* Step 1 */}
          <div className="p-4 bg-[#FAF7F0] rounded-xl border border-[#2F6B3A]/15 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#2F6B3A]">STEP 1</span>
              <Database className="w-4 h-4 text-[#2F6B3A]" />
            </div>
            <h3 className="font-bold text-sm text-[#1F2A24]">Data Ingestion</h3>
            <p className="text-[11px] text-[#5B665F] leading-relaxed">
              Takes benchmark farm records from Kaggle agronomy datasets and merges them in real time with live sensor streams from the virtual board.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 bg-[#FAF7F0] rounded-xl border border-[#2F6B3A]/15 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#2F6B3A]">STEP 2</span>
              <Filter className="w-4 h-4 text-[#2F6B3A]" />
            </div>
            <h3 className="font-bold text-sm text-[#1F2A24]">Data Cleaning</h3>
            <p className="text-[11px] text-[#5B665F] leading-relaxed">
              Detects erroneous sensor glitches and extreme outliers using the 1.5×IQR formula. Automatically fills missing points with healthy median values.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 bg-[#FAF7F0] rounded-xl border border-[#2F6B3A]/15 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#2F6B3A]">STEP 3</span>
              <Layers className="w-4 h-4 text-[#2F6B3A]" />
            </div>
            <h3 className="font-bold text-sm text-[#1F2A24]">Soil Profiling</h3>
            <p className="text-[11px] text-[#5B665F] leading-relaxed">
              Classifies soil texture via the USDA triangle and determines regional soil types (Black cotton, Alluvial, Red laterite, Calcareous, Sandy).
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-4 bg-[#E8F1E4] rounded-xl border border-[#2F6B3A]/25 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#2F6B3A]">STEP 4</span>
              <Sparkles className="w-4 h-4 text-[#2F6B3A]" />
            </div>
            <h3 className="font-bold text-sm text-[#2F6B3A]">Prescriptive Advice</h3>
            <p className="text-[11px] text-[#1F2A24]/80 leading-relaxed">
              Matches soil characteristics with market prices from data.gov.in mandis to recommend high-yielding crops and maximize farmer income.
            </p>
          </div>
        </div>
      </div>

      {/* The 5 Vs of Big Data Card (No static total entries count mentioned) */}
      <div className="bg-white rounded-2xl p-6 border border-[#2F6B3A]/15 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div>
            <h2 className="text-base font-bold text-[#1F2A24]">
              The 5 Vs of Big Data Management
            </h2>
            <span className="text-xs text-[#5B665F]">Demonstrated live through continuous streaming telemetry</span>
          </div>
          <span className="font-mono text-xs text-[#2F6B3A] font-bold">
            Data Quality: {auditReport.qualityScorePct}% Valid
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs">
          {/* 1. Volume */}
          <div className="p-4 bg-[#FAF7F0] rounded-xl border border-[#2F6B3A]/15 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#2F6B3A]">
              1. Volume
            </span>
            <div className="text-sm font-bold text-[#1F2A24]">
              Continuous Stream
            </div>
            <p className="text-[11px] text-[#5B665F]">
              Dynamic database growing continuously as new sensor readings arrive.
            </p>
          </div>

          {/* 2. Velocity */}
          <div className="p-4 bg-[#FAF7F0] rounded-xl border border-[#2F6B3A]/15 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#2F6B3A]">
              2. Velocity
            </span>
            <div className="text-sm font-bold text-[#1F2A24] font-mono">
              {simVelocityRpm} readings/min
            </div>
            <p className="text-[11px] text-[#5B665F]">
              Real-time update frequency from active sensor loop.
            </p>
          </div>

          {/* 3. Variety */}
          <div className="p-4 bg-[#FAF7F0] rounded-xl border border-[#2F6B3A]/15 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#2F6B3A]">
              3. Variety
            </span>
            <div className="text-sm font-bold text-[#1F2A24]">
              Multiple Formats
            </div>
            <p className="text-[11px] text-[#5B665F]">
              Time-series sensor telemetry, Kaggle agronomic records, categorical soil labels, and mandi prices.
            </p>
          </div>

          {/* 4. Veracity */}
          <div className="p-4 bg-[#FAF7F0] rounded-xl border border-[#2F6B3A]/15 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#2F6B3A]">
              4. Veracity
            </span>
            <div className="text-sm font-bold text-[#1F2A24] font-mono">
              {auditReport.outliersCount} anomalies handled
            </div>
            <p className="text-[11px] text-[#5B665F]">
              Automated outlier checks filter false readings.
            </p>
          </div>

          {/* 5. Value */}
          <div className="p-4 bg-[#E8F1E4] rounded-xl border border-[#2F6B3A]/25 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#2F6B3A]">
              5. Value
            </span>
            <div className="text-sm font-bold text-[#2F6B3A]">
              Actionable Guidance
            </div>
            <p className="text-[11px] text-[#1F2A24]/80">
              Converts raw sensor millivolts into optimal crop choices, avoiding crop failure and maximizing profit.
            </p>
          </div>
        </div>
      </div>

      {/* Data Quality & Cleaning Demo Table */}
      <div className="bg-white rounded-2xl p-6 border border-[#2F6B3A]/15 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div>
            <h2 className="text-base font-bold text-[#1F2A24]">
              Data Quality Audit & Median Imputation Preview
            </h2>
            <span className="text-xs text-[#5B665F]">
              Automated cleansing applied before feeding readings into classification models
            </span>
          </div>
          <span className="px-2.5 py-1 bg-[#E8F1E4] text-[#2F6B3A] font-semibold text-xs rounded-lg">
            IQR Factor: 1.5×
          </span>
        </div>

        {/* Channel Summary Metrics */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#2F6B3A]/15 text-[#5B665F]">
                <th className="py-2 px-3">Telemetry Channel</th>
                <th className="py-2 px-3">Min</th>
                <th className="py-2 px-3">Max</th>
                <th className="py-2 px-3">Mean</th>
                <th className="py-2 px-3">Std Dev (σ)</th>
                <th className="py-2 px-3">IQR Outliers</th>
                <th className="py-2 px-3">Range Violations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-mono text-[11px]">
              {auditReport.channelAudits.map(ca => (
                <tr key={ca.channel} className="hover:bg-[#FAF7F0]">
                  <td className="py-2 px-3 font-semibold text-[#1F2A24] font-sans">{ca.channel}</td>
                  <td className="py-2 px-3">{ca.min}</td>
                  <td className="py-2 px-3">{ca.max}</td>
                  <td className="py-2 px-3">{ca.mean}</td>
                  <td className="py-2 px-3">{ca.stdDev}</td>
                  <td className="py-2 px-3">
                    <span className={ca.outliers > 0 ? 'text-[#C2410C] font-bold' : 'text-[#2F8F4E]'}>
                      {ca.outliers}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className={ca.outOfRange > 0 ? 'text-[#C2410C] font-bold' : 'text-[#2F8F4E]'}>
                      {ca.outOfRange}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Before vs After Cleaning Demonstration Table */}
        <div className="pt-3 border-t border-neutral-100 space-y-2">
          <span className="text-xs font-semibold text-[#1F2A24] uppercase tracking-wider block">
            Transformation Record (Raw Input vs Cleaned Normalized Tuple)
          </span>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono text-[11px]">
              <thead>
                <tr className="bg-[#FAF7F0] text-[#5B665F] font-sans">
                  <th className="py-2 px-3">Observation ID</th>
                  <th className="py-2 px-3">Raw Soil ADC</th>
                  <th className="py-2 px-3">Cleaned Soil ADC</th>
                  <th className="py-2 px-3">Raw Temp (°C)</th>
                  <th className="py-2 px-3">Cleaned Temp (°C)</th>
                  <th className="py-2 px-3">Transformation Rule Applied</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {auditReport.cleanedPreview.map((item, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50">
                    <td className="py-2 px-3 text-[#1F2A24] font-semibold">{item.original.id}</td>
                    <td className="py-2 px-3">{item.original.soilMoistureAdc}</td>
                    <td className="py-2 px-3 text-[#2F6B3A] font-bold">{item.cleaned.soilMoistureAdc}</td>
                    <td className="py-2 px-3">{item.original.tempC}°C</td>
                    <td className="py-2 px-3 text-[#2F6B3A] font-bold">{item.cleaned.tempC}°C</td>
                    <td className="py-2 px-3 text-[#5B665F] font-sans text-xs">
                      {item.changesApplied.join('; ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Analytics: Correlation Matrix & Feature Dependencies */}
      <div className="bg-white rounded-2xl p-6 border border-[#2F6B3A]/15 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
          <div>
            <h3 className="text-base font-bold text-[#1F2A24]">
              Pearson Correlation Matrix (r)
            </h3>
            <span className="text-xs text-[#5B665F]">Pairwise telemetry & soil parameter dependencies</span>
          </div>
          <span className="text-xs font-mono text-[#2F6B3A] font-semibold bg-[#E8F1E4] px-2.5 py-1 rounded-lg">
            Normalized scale: -1.0 to +1.0
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Heatmap Table (7 cols) */}
          <div className="lg:col-span-7 overflow-x-auto">
            <table className="w-full text-center text-xs border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left text-[11px] text-[#5B665F]">Variable</th>
                  {correlation.keys.map(k => (
                    <th key={k} className="p-1.5 text-[10px] text-[#5B665F] font-medium">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {correlation.matrix.map((row, rIdx) => (
                  <tr key={rIdx} className="border-t border-neutral-100">
                    <td className="p-2 text-left text-[11px] font-semibold text-[#1F2A24]">
                      {correlation.keys[rIdx]}
                    </td>
                    {row.map((val, cIdx) => {
                      let bg = '#FFFFFF';
                      let text = '#1F2A24';
                      if (val === 1.0) {
                        bg = '#E8F1E4';
                        text = '#2F6B3A';
                      } else if (val > 0.4) {
                        bg = '#DCFCE7';
                        text = '#15803D';
                      } else if (val < -0.4) {
                        bg = '#FFEDD5';
                        text = '#C2410C';
                      }
                      return (
                        <td
                          key={cIdx}
                          style={{ backgroundColor: bg, color: text }}
                          className="p-2 font-mono text-[11px] font-semibold rounded"
                        >
                          {val.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Practical Agronomic Insights (5 cols) */}
          <div className="lg:col-span-5 bg-[#FAF7F0] p-4 rounded-xl border border-[#2F6B3A]/15 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-[#2F6B3A] font-bold">
              <BarChart2 className="w-4 h-4" />
              <span>Agronomic Interpretation of Correlations</span>
            </div>
            <div className="space-y-2 text-[11px] text-[#5B665F]">
              <div className="p-2.5 bg-white rounded-lg border border-neutral-200">
                <span className="font-semibold text-[#1F2A24] block mb-0.5">Moisture vs Temperature</span>
                Negative correlation reflects soil evapotranspiration: higher canopy temperatures accelerate moisture loss from upper root zones.
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-neutral-200">
                <span className="font-semibold text-[#1F2A24] block mb-0.5">Nitrogen vs Yield Potential</span>
                Strong positive relationship indicating balanced organic nitrogen directly promotes robust vegetative biomass.
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-neutral-200">
                <span className="font-semibold text-[#1F2A24] block mb-0.5">pH vs Nutrient Solubility</span>
                Near-neutral pH (6.0 - 7.5) displays maximum bioavailability for phosphorus and essential micronutrients.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dataset Controls Bar */}
      <div className="bg-[#FAF7F0] rounded-2xl p-5 border border-[#2F6B3A]/20 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div>
          <span className="font-bold text-sm text-[#1F2A24] block">Dataset Controls & Reset</span>
          <span className="text-[#5B665F]">
            Continuously updated from live sensor telemetry and Kaggle benchmark records
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportCsvData}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#2F6B3A]/25 text-[#2F6B3A] font-semibold rounded-xl hover:bg-[#E8F1E4] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#2F6B3A]/25 text-[#2F6B3A] font-semibold rounded-xl hover:bg-[#E8F1E4] transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Kaggle CSV</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={() => {
              if (window.confirm('Reset dataset to initial Kaggle benchmark records?')) {
                resetToSampleData();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-[#1F2A24] font-medium rounded-xl transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Benchmark</span>
          </button>
        </div>
      </div>

      {importNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{importNotice}</span>
        </div>
      )}
    </div>
  );
};
