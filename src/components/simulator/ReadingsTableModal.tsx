/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { X, Search, Download, Upload, Trash2, CheckCircle, AlertCircle, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SensorReading, Source } from '../../types';
import { getMoistureStatus } from '../../lib/units';

interface ReadingsTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReading?: (reading: SensorReading) => void;
}

export const ReadingsTableModal: React.FC<ReadingsTableModalProps> = ({
  isOpen,
  onClose,
  onSelectReading
}) => {
  const { readings, deleteReading, clearAllReadings, exportCsvData, importCsvData } = useApp();
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | Source>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [importStatus, setImportStatus] = useState<{ message: string; success: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pageSize = 15;

  const filteredReadings = useMemo(() => {
    return readings.filter(r => {
      const matchesSource = sourceFilter === 'all' || r.source === sourceFilter;
      const matchesSearch =
        r.id.toLowerCase().includes(search.toLowerCase()) ||
        r.alerts.some(a => a.toLowerCase().includes(search.toLowerCase())) ||
        r.timestamp.includes(search);
      return matchesSource && matchesSearch;
    });
  }, [readings, sourceFilter, search]);

  const totalPages = Math.ceil(filteredReadings.length / pageSize) || 1;
  const paginatedReadings = filteredReadings.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importCsvData(file);
    setImportStatus({ message: result.message, success: result.success });
    setTimeout(() => setImportStatus(null), 5000);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRowClick = (r: SensorReading) => {
    if (onSelectReading) {
      onSelectReading(r);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] shadow-2xl flex flex-col border border-[#2F6B3A]/20">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#2F6B3A]/15 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#1F2A24]">
              {onSelectReading ? 'Select a Sensor Reading for Soil Analysis' : 'Sensor Telemetry Dataset'}
            </h3>
            <p className="text-xs text-[#5B665F]">
              {onSelectReading
                ? 'Click on any row below to load its exact soil moisture, pH, and nutrient values.'
                : 'Browse all logged observations'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#5B665F] hover:text-[#1F2A24] hover:bg-[#E8F1E4] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-[#FAF7F0] border-b border-[#2F6B3A]/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#5B665F] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search ID, timestamp, alert..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="pl-8 pr-3 py-1.5 bg-white border border-[#2F6B3A]/20 rounded-lg text-xs text-[#1F2A24] focus:outline-none focus:ring-1 focus:ring-[#2F6B3A] w-56"
              />
            </div>

            {/* Source Segmented Filter */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-[#2F6B3A]/15">
              {(['all', 'simulated', 'sample', 'manual'] as const).map(src => (
                <button
                  key={src}
                  onClick={() => { setSourceFilter(src); setCurrentPage(1); }}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium capitalize transition-colors ${
                    sourceFilter === src
                      ? 'bg-[#2F6B3A] text-white shadow-xs'
                      : 'text-[#5B665F] hover:text-[#1F2A24]'
                  }`}
                >
                  {src}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={exportCsvData}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#2F6B3A]/25 text-[#2F6B3A] font-medium rounded-lg hover:bg-[#E8F1E4] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#2F6B3A]/25 text-[#2F6B3A] font-medium rounded-lg hover:bg-[#E8F1E4] transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Import CSV</span>
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
                if (window.confirm('Are you sure you want to clear all readings?')) {
                  clearAllReadings();
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-[#C2410C] hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          </div>
        </div>

        {/* Selection Banner if in selection mode */}
        {onSelectReading && (
          <div className="px-4 py-2 bg-[#E8F1E4] border-b border-[#2F6B3A]/20 text-xs text-[#2F6B3A] font-semibold flex items-center justify-between">
            <span>👉 Click anywhere on any row below to instantly load it into Soil Analysis</span>
            <span className="font-mono text-[11px]">Filtered: {filteredReadings.length} records</span>
          </div>
        )}

        {/* Import Notification Banner */}
        {importStatus && (
          <div className={`px-4 py-2 text-xs flex items-center gap-2 ${
            importStatus.success ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
          }`}>
            {importStatus.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{importStatus.message}</span>
          </div>
        )}

        {/* Table Content */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#FAF7F0] sticky top-0 border-b border-[#2F6B3A]/15 text-[#5B665F] font-semibold">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">ID / Time</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-3">Soil Moisture</th>
                <th className="py-2.5 px-3">Temp (°C)</th>
                <th className="py-2.5 px-3">Hum (%)</th>
                <th className="py-2.5 px-3">pH</th>
                <th className="py-2.5 px-3">N-P-K (mg/kg)</th>
                <th className="py-2.5 px-3">Pump</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-mono text-[11px]">
              {paginatedReadings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#5B665F] font-sans">
                    No readings found matching filters.
                  </td>
                </tr>
              ) : (
                paginatedReadings.map((r, i) => {
                  const status = getMoistureStatus(r.soilMoisturePct);
                  return (
                    <tr
                      key={r.id}
                      onClick={() => handleRowClick(r)}
                      className={`transition-colors ${
                        onSelectReading
                          ? 'cursor-pointer hover:bg-[#E8F1E4]/70 active:bg-[#E8F1E4]'
                          : 'hover:bg-[#F7FAF6]'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-[#5B665F]">{(currentPage - 1) * pageSize + i + 1}</td>
                      <td className="py-2.5 px-3 text-[#1F2A24] whitespace-nowrap">
                        <span className="font-semibold block">{r.id}</span>
                        <span className="text-[10px] text-[#5B665F]">
                          {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-sans font-semibold ${
                          r.source === 'simulated'
                            ? 'bg-blue-50 text-blue-700'
                            : r.source === 'sample'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-purple-50 text-purple-700'
                        }`}>
                          {r.source}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`font-bold ${status === 'Dry' ? 'text-[#C2410C]' : status === 'Wet' ? 'text-blue-600' : 'text-[#2F8F4E]'}`}>
                          {r.soilMoisturePct}%
                        </span>
                        <span className="text-[10px] text-[#5B665F] block font-sans">
                          {status} ({r.soilMoistureAdc} ADC)
                        </span>
                      </td>
                      <td className="py-2.5 px-3">{r.tempC}°C</td>
                      <td className="py-2.5 px-3">{r.humidityPct}%</td>
                      <td className="py-2.5 px-3 font-bold text-[#1F2A24]">{r.ph.toFixed(1)}</td>
                      <td className="py-2.5 px-3 text-[#5B665F]">
                        {r.n ?? 80}-{r.p ?? 40}-{r.k ?? 45}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-medium ${
                          r.pumpOn ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-600'
                        }`}>
                          {r.pumpOn ? 'ON' : 'OFF'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {onSelectReading && (
                            <button
                              onClick={() => handleRowClick(r)}
                              className="px-2.5 py-1 text-xs bg-[#2F6B3A] text-white font-semibold rounded hover:bg-[#25562e] transition-colors flex items-center gap-1"
                              title="Load row into Soil Analysis"
                            >
                              <Check className="w-3 h-3" />
                              <span>Select</span>
                            </button>
                          )}
                          <button
                            onClick={() => deleteReading(r.id)}
                            className="p-1 text-neutral-400 hover:text-red-600 transition-colors"
                            title="Delete observation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-[#FAF7F0] border-t border-[#2F6B3A]/15 flex items-center justify-between text-xs text-[#5B665F]">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-white border border-[#2F6B3A]/20 rounded hover:bg-[#E8F1E4] disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-white border border-[#2F6B3A]/20 rounded hover:bg-[#E8F1E4] disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
