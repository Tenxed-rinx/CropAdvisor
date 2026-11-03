/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Crop Advisor Unit System & Sensor Conversions
 * Single authoritative source for all unit transformations and range validations.
 */

export const SENSOR_EXPLANATION = "Higher ADC = drier soil, because resistive sensors conduct less in dry soil.";

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/**
 * Converts Soil Moisture ADC (0-1023) to percentage (0-100%).
 * Calibration formula:
 * 200 ADC = saturated wet (100%)
 * 1023 ADC = bone dry air (0%)
 */
export function soilAdcToPct(adc: number): number {
  const clampedAdc = clamp(adc, 0, 1023);
  const pct = ((1023 - clampedAdc) / (1023 - 200)) * 100;
  return Number(clamp(pct, 0, 100).toFixed(1));
}

/**
 * Inverse conversion from percentage (0-100%) to ADC (0-1023).
 */
export function soilPctToAdc(pct: number): number {
  const clampedPct = clamp(pct, 0, 100);
  const adc = 1023 - (clampedPct / 100) * (1023 - 200);
  return Math.round(clamp(adc, 0, 1023));
}

export type MoistureStatus = 'Wet' | 'Optimal' | 'Dry';

/**
 * Returns single standardized moisture status label across the entire app.
 */
export function getMoistureStatus(pct: number): MoistureStatus {
  if (pct > 70) return 'Wet';
  if (pct >= 35) return 'Optimal';
  return 'Dry';
}

export function getMoistureStatusAdc(adc: number): MoistureStatus {
  return getMoistureStatus(soilAdcToPct(adc));
}

/**
 * Strict Input Clamping & Validation
 */
export const VALIDATION_RANGES = {
  soilMoistureAdc: { min: 0, max: 1023, unit: 'ADC', label: 'Soil Moisture' },
  tempC: { min: -10, max: 80, unit: '°C', label: 'Temperature' },
  humidityPct: { min: 0, max: 100, unit: '%', label: 'Air Humidity' },
  lightAdc: { min: 0, max: 1023, unit: 'ADC', label: 'Light Intensity' },
  waterLevelAdc: { min: 0, max: 1023, unit: 'ADC', label: 'Tank Water Level' },
  ph: { min: 3.0, max: 10.0, unit: 'pH', label: 'Soil pH' },
  n: { min: 0, max: 300, unit: 'mg/kg', label: 'Nitrogen (N)' },
  p: { min: 0, max: 200, unit: 'mg/kg', label: 'Phosphorus (P)' },
  k: { min: 0, max: 300, unit: 'mg/kg', label: 'Potassium (K)' },
  ec: { min: 0.1, max: 10.0, unit: 'dS/m', label: 'Electrical Conductivity (EC)' },
  rainfallMm: { min: 0, max: 3500, unit: 'mm', label: 'Annual Rainfall' }
} as const;

export function validateAndClampInput(field: keyof typeof VALIDATION_RANGES, value: number): number {
  const range = VALIDATION_RANGES[field];
  if (!range) return value;
  return clamp(value, range.min, range.max);
}
