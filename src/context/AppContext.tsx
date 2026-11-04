/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Crop Advisor Shared Application Context & Persistence
 * Safe localStorage wrappers, sample data bootstrapping, and cross-section state flow.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import { SensorReading, SimulationSettings, FarmerInputs, Crop, SoilProfile } from '../types';
import { DEFAULT_SETTINGS, createSensorReading } from '../lib/firmware';
import { soilAdcToPct, validateAndClampInput } from '../lib/units';
import { analyzeSoilProfile } from '../lib/soilClassifier';

interface AppContextType {
  readings: SensorReading[];
  settings: SimulationSettings;
  updateSettings: (newSettings: Partial<SimulationSettings>) => void;
  addReading: (reading: SensorReading) => void;
  deleteReading: (id: string) => void;
  clearAllReadings: () => void;
  resetToSampleData: () => Promise<void>;
  importCsvData: (file: File) => Promise<{ success: boolean; message: string; rowsAdded: number }>;
  exportCsvData: () => void;
  crops: Crop[];
  activeSoilProfile: SoilProfile;
  selectedReadingForAnalysis: SensorReading | null;
  selectReadingForAnalysis: (reading: SensorReading) => void;
  customSoilParams: {
    ph: number;
    moisturePct: number;
    n: number;
    p: number;
    k: number;
    ec: number;
    rainfallMm: number;
    sandPct: number;
    siltPct: number;
    clayPct: number;
  };
  setCustomSoilParams: React.Dispatch<React.SetStateAction<{
    ph: number;
    moisturePct: number;
    n: number;
    p: number;
    k: number;
    ec: number;
    rainfallMm: number;
    sandPct: number;
    siltPct: number;
    clayPct: number;
  }>>;
  farmerInputs: FarmerInputs;
  setFarmerInputs: React.Dispatch<React.SetStateAction<FarmerInputs>>;
  selectedCropId: string;
  setSelectedCropId: (cropId: string) => void;
  storageSizeKb: number;
}

const STORAGE_KEYS = {
  READINGS: 'crop_advisor_readings_v1',
  SETTINGS: 'crop_advisor_settings_v1',
  FARMER_INPUTS: 'crop_advisor_farmer_inputs_v1',
  SOIL_PARAMS: 'crop_advisor_soil_params_v1',
  SELECTED_CROP: 'crop_advisor_selected_crop_v1'
};

const DEFAULT_FARMER_INPUTS: FarmerInputs = {
  season: 'Kharif',
  landSizeAcres: 2.5,
  irrigation: 'borewell',
  budget: 'medium',
  state: 'Punjab',
  weights: {
    soilWeight: 35,
    climateWeight: 25,
    waterWeight: 15,
    profitWeight: 20,
    riskWeight: 5
  }
};

const DEFAULT_SOIL_PARAMS = {
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
};

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [settings, setSettings] = useState<SimulationSettings>(DEFAULT_SETTINGS);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectedReadingForAnalysis, setSelectedReadingForAnalysis] = useState<SensorReading | null>(null);
  const [farmerInputs, setFarmerInputs] = useState<FarmerInputs>(DEFAULT_FARMER_INPUTS);
  const [customSoilParams, setCustomSoilParams] = useState(DEFAULT_SOIL_PARAMS);
  const [selectedCropId, setSelectedCropIdState] = useState<string>('general');
  const [storageSizeKb, setStorageSizeKb] = useState<number>(0);

  const setSelectedCropId = (cropId: string) => {
    setSelectedCropIdState(cropId);
    saveToStorage(STORAGE_KEYS.SELECTED_CROP, cropId);
  };

  // Calculate approximate storage usage
  const calculateStorageSize = useCallback(() => {
    try {
      let totalBytes = 0;
      for (const key in localStorage) {
        if (key.startsWith('crop_advisor_')) {
          totalBytes += (localStorage.getItem(key) || '').length * 2;
        }
      }
      setStorageSizeKb(Number((totalBytes / 1024).toFixed(1)));
    } catch {
      setStorageSizeKb(0);
    }
  }, []);

  // Safe localStorage helper
  const saveToStorage = <T,>(key: string, data: T) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      calculateStorageSize();
    } catch (e) {
      console.warn(`Failed to save ${key} to localStorage:`, e);
    }
  };

  const loadFromStorage = <T,>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return fallback;
      return JSON.parse(item) as T;
    } catch (e) {
      console.warn(`Failed to read ${key} from localStorage:`, e);
      return fallback;
    }
  };

  // Load Crops Master Data
  useEffect(() => {
    fetch('/data/crop_master.json')
      .then(res => res.json())
      .then((data: Crop[]) => setCrops(data))
      .catch(err => console.error('Failed to load crop_master.json:', err));
  }, []);

  // Load initial settings, farmer inputs, and readings
  useEffect(() => {
    const storedSettings = loadFromStorage<SimulationSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    const storedFarmerInputs = loadFromStorage<FarmerInputs>(STORAGE_KEYS.FARMER_INPUTS, DEFAULT_FARMER_INPUTS);
    const storedSoilParams = loadFromStorage(STORAGE_KEYS.SOIL_PARAMS, DEFAULT_SOIL_PARAMS);
    const storedReadings = loadFromStorage<SensorReading[]>(STORAGE_KEYS.READINGS, []);

    setSettings(storedSettings);
    setFarmerInputs(storedFarmerInputs);
    setCustomSoilParams(storedSoilParams);

    if (storedReadings && storedReadings.length > 0) {
      setReadings(storedReadings);
      setSelectedReadingForAnalysis(storedReadings[0]);
    } else {
      // First visit: fetch sample readings CSV
      fetch('/data/sample_soil_readings.csv')
        .then(res => res.text())
        .then(csvText => {
          Papa.parse<any>(csvText, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: (results) => {
              const loaded: SensorReading[] = results.data.map((row, idx) => ({
                id: row.id || `sample-${idx + 1}`,
                timestamp: row.timestamp || new Date(Date.now() - idx * 1800000).toISOString(),
                source: 'sample',
                soilMoistureAdc: Number(row.soilMoistureAdc ?? 600),
                soilMoisturePct: Number(row.soilMoisturePct ?? soilAdcToPct(Number(row.soilMoistureAdc ?? 600))),
                tempC: Number(row.tempC ?? 25.0),
                humidityPct: Number(row.humidityPct ?? 60),
                lightAdc: Number(row.lightAdc ?? 500),
                waterLevelAdc: Number(row.waterLevelAdc ?? 600),
                ph: Number(row.ph ?? 6.8),
                n: Number(row.n ?? 80),
                p: Number(row.p ?? 40),
                k: Number(row.k ?? 45),
                ec: Number(row.ec ?? 1.2),
                rainfallMm: Number(row.rainfallMm ?? 0),
                pumpOn: row.pumpOn === true || row.pumpOn === 'true',
                alerts: row.alerts && row.alerts !== 'None' ? String(row.alerts).split(';').map(s => s.trim()) : []
              }));

              setReadings(loaded);
              saveToStorage(STORAGE_KEYS.READINGS, loaded);
              if (loaded.length > 0) {
                setSelectedReadingForAnalysis(loaded[0]);
              }
            }
          });
        })
        .catch(err => {
          console.error('Failed to load sample readings CSV:', err);
          // Fallback reading
          const initial = [createSensorReading(600, 25, 60, 500, 600, 6.8, false, [], 'sample')];
          setReadings(initial);
          setSelectedReadingForAnalysis(initial[0]);
        });
    }

    calculateStorageSize();
  }, [calculateStorageSize]);

  // Sync settings when updated
  const updateSettings = (newSettings: Partial<SimulationSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      saveToStorage(STORAGE_KEYS.SETTINGS, updated);
      return updated;
    });
  };

  // Add reading (simulator / manual)
  const addReading = (reading: SensorReading) => {
    setReadings(prev => {
      const updated = [reading, ...prev];
      // Keep up to 200 readings in memory to avoid storage exhaustion
      const capped = updated.slice(0, 200);
      saveToStorage(STORAGE_KEYS.READINGS, capped);
      return capped;
    });
  };

  // Delete reading
  const deleteReading = (id: string) => {
    setReadings(prev => {
      const updated = prev.filter(r => r.id !== id);
      saveToStorage(STORAGE_KEYS.READINGS, updated);
      return updated;
    });
  };

  // Clear all readings
  const clearAllReadings = () => {
    setReadings([]);
    saveToStorage(STORAGE_KEYS.READINGS, []);
    setSelectedReadingForAnalysis(null);
  };

  // Reset to initial 50 sample readings
  const resetToSampleData = async () => {
    try {
      const res = await fetch('/data/sample_soil_readings.csv');
      const csvText = await res.text();
      Papa.parse<any>(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          const loaded: SensorReading[] = results.data.map((row, idx) => ({
            id: row.id || `sample-${idx + 1}`,
            timestamp: row.timestamp || new Date(Date.now() - idx * 1800000).toISOString(),
            source: 'sample',
            soilMoistureAdc: Number(row.soilMoistureAdc ?? 600),
            soilMoisturePct: Number(row.soilMoisturePct ?? soilAdcToPct(Number(row.soilMoistureAdc ?? 600))),
            tempC: Number(row.tempC ?? 25.0),
            humidityPct: Number(row.humidityPct ?? 60),
            lightAdc: Number(row.lightAdc ?? 500),
            waterLevelAdc: Number(row.waterLevelAdc ?? 600),
            ph: Number(row.ph ?? 6.8),
            n: Number(row.n ?? 80),
            p: Number(row.p ?? 40),
            k: Number(row.k ?? 45),
            ec: Number(row.ec ?? 1.2),
            rainfallMm: Number(row.rainfallMm ?? 0),
            pumpOn: row.pumpOn === true || row.pumpOn === 'true',
            alerts: row.alerts && row.alerts !== 'None' ? String(row.alerts).split(';').map(s => s.trim()) : [],
            cropProfile: row.cropProfile || 'General',
            targetMinPct: Number(row.targetMinPct ?? 63),
            targetMaxPct: Number(row.targetMaxPct ?? 70),
            waterUsedL: Number(row.waterUsedL ?? 0)
          }));
          setReadings(loaded);
          saveToStorage(STORAGE_KEYS.READINGS, loaded);
          if (loaded.length > 0) setSelectedReadingForAnalysis(loaded[0]);
        }
      });
    } catch (e) {
      console.error('Failed to reset sample data:', e);
    }
  };

  // CSV Import with schema and range validation
  const importCsvData = async (file: File): Promise<{ success: boolean; message: string; rowsAdded: number }> => {
    return new Promise((resolve) => {
      Papa.parse<any>(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          if (!results.data || results.data.length === 0) {
            resolve({ success: false, message: 'Uploaded CSV is empty or formatted incorrectly.', rowsAdded: 0 });
            return;
          }

          const parsedRows: SensorReading[] = [];
          let errorCount = 0;

          results.data.forEach((row, i) => {
            try {
              const soilAdc = validateAndClampInput('soilMoistureAdc', Number(row.soilMoistureAdc ?? row.soil_adc ?? 600));
              const temp = validateAndClampInput('tempC', Number(row.tempC ?? row.temp_c ?? row.temp ?? 25));
              const hum = validateAndClampInput('humidityPct', Number(row.humidityPct ?? row.humidity ?? 60));
              const light = validateAndClampInput('lightAdc', Number(row.lightAdc ?? row.light ?? 500));
              const water = validateAndClampInput('waterLevelAdc', Number(row.waterLevelAdc ?? row.water ?? 500));
              const ph = validateAndClampInput('ph', Number(row.ph ?? 6.8));

              parsedRows.push({
                id: row.id ? String(row.id) : `import-${Date.now()}-${i}`,
                timestamp: row.timestamp ? String(row.timestamp) : new Date().toISOString(),
                source: (row.source === 'sample' || row.source === 'simulated' || row.source === 'manual') ? row.source : 'manual',
                soilMoistureAdc: soilAdc,
                soilMoisturePct: soilAdcToPct(soilAdc),
                tempC: temp,
                humidityPct: hum,
                lightAdc: light,
                waterLevelAdc: water,
                ph: ph,
                n: row.n ? Number(row.n) : 80,
                p: row.p ? Number(row.p) : 40,
                k: row.k ? Number(row.k) : 45,
                ec: row.ec ? Number(row.ec) : 1.2,
                rainfallMm: row.rainfallMm ? Number(row.rainfallMm) : 0,
                pumpOn: row.pumpOn === true || row.pumpOn === 'true',
                alerts: row.alerts ? (Array.isArray(row.alerts) ? row.alerts : String(row.alerts).split(';').map(s => s.trim())) : [],
                cropProfile: row.cropProfile || row.crop || 'General',
                targetMinPct: Number(row.targetMinPct ?? 63),
                targetMaxPct: Number(row.targetMaxPct ?? 70),
                waterUsedL: Number(row.waterUsedL ?? 0)
              });
            } catch {
              errorCount++;
            }
          });

          if (parsedRows.length === 0) {
            resolve({ success: false, message: 'No valid rows found matching schema.', rowsAdded: 0 });
            return;
          }

          setReadings(prev => {
            const combined = [...parsedRows, ...prev].slice(0, 300);
            saveToStorage(STORAGE_KEYS.READINGS, combined);
            return combined;
          });

          resolve({
            success: true,
            message: `Successfully imported ${parsedRows.length} readings (${errorCount} rows skipped/clamped).`,
            rowsAdded: parsedRows.length
          });
        },
        error: (err) => {
          resolve({ success: false, message: `CSV parsing error: ${err.message}`, rowsAdded: 0 });
        }
      });
    });
  };

  // CSV Export matching exact columns including crop awareness
  const exportCsvData = () => {
    if (readings.length === 0) return;
    const formatted = readings.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      source: r.source,
      cropProfile: r.cropProfile || 'General',
      targetMinPct: r.targetMinPct ?? 63,
      targetMaxPct: r.targetMaxPct ?? 70,
      soilMoistureAdc: r.soilMoistureAdc,
      soilMoisturePct: r.soilMoisturePct,
      waterUsedL: r.waterUsedL ?? 0,
      tempC: r.tempC,
      humidityPct: r.humidityPct,
      lightAdc: r.lightAdc,
      waterLevelAdc: r.waterLevelAdc,
      ph: r.ph,
      n: r.n ?? 80,
      p: r.p ?? 40,
      k: r.k ?? 45,
      ec: r.ec ?? 1.2,
      rainfallMm: r.rainfallMm ?? 0,
      pumpOn: r.pumpOn,
      alerts: r.alerts.length > 0 ? r.alerts.join('; ') : 'None'
    }));

    const csv = Papa.unparse(formatted);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `crop_advisor_readings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compute active soil profile based on either selected reading or custom params
  const activeSoilProfile = analyzeSoilProfile({
    ph: customSoilParams.ph,
    moisturePct: customSoilParams.moisturePct,
    n: customSoilParams.n,
    p: customSoilParams.p,
    k: customSoilParams.k,
    ec: customSoilParams.ec,
    rainfallMm: customSoilParams.rainfallMm,
    sandPct: customSoilParams.sandPct,
    siltPct: customSoilParams.siltPct,
    clayPct: customSoilParams.clayPct
  });

  const selectReadingForAnalysis = (reading: SensorReading) => {
    setSelectedReadingForAnalysis(reading);
    setCustomSoilParams(prev => ({
      ...prev,
      ph: reading.ph,
      moisturePct: reading.soilMoisturePct,
      n: reading.n ?? prev.n,
      p: reading.p ?? prev.p,
      k: reading.k ?? prev.k,
      ec: reading.ec ?? prev.ec,
      rainfallMm: reading.rainfallMm ?? prev.rainfallMm
    }));
  };

  return (
    <AppContext.Provider
      value={{
        readings,
        settings,
        updateSettings,
        addReading,
        deleteReading,
        clearAllReadings,
        resetToSampleData,
        importCsvData,
        exportCsvData,
        crops,
        activeSoilProfile,
        selectedReadingForAnalysis,
        selectReadingForAnalysis,
        customSoilParams,
        setCustomSoilParams,
        farmerInputs,
        setFarmerInputs,
        selectedCropId,
        setSelectedCropId,
        storageSizeKb
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
