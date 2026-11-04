/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Crop-Aware Irrigation Profiles
 * Single authoritative source for crop-specific moisture bands, pump dynamics,
 * water demand, and alert thresholds.
 * Thresholds are strictly defined in moisture percent, and ADC is derived
 * exclusively via soilPctToAdc in lib/units.ts.
 */

import { soilPctToAdc, soilAdcToPct } from './units';

export type CropCategory = 'General' | 'Cereals' | 'Vegetables' | 'Cash crops' | 'Pulses' | 'Fruits';
export type WaterDemand = 'Very low' | 'Low' | 'Low-medium' | 'Medium' | 'High' | 'Very high';
export type PumpRunCycle = 'Short' | 'Normal' | 'Long';

export interface IrrigationProfile {
  id: string;
  name: string;
  category: CropCategory;
  onBelowPct: number;          // Pump ON below this moisture %
  offAbovePct: number;         // Pump OFF above this moisture %
  waterDemand: WaterDemand;
  pumpRunCycle: PumpRunCycle;
  pumpRateMultiplier: number;  // How fast pump restores moisture
  waterUseMultiplier: number;  // How fast tank drains
  overwaterWarnPct: number;    // Above this, show "Waterlogging risk"
  drynessWarnPct: number;       // Below this, show "Crop stress risk"
  idealTempRange: [number, number];
  note: string;
  image: string;
}

export const IRRIGATION_PROFILES: IrrigationProfile[] = [
  {
    id: 'general',
    name: 'General (Baseline)',
    category: 'General',
    onBelowPct: 63,
    offAbovePct: 70,
    waterDemand: 'Medium',
    pumpRunCycle: 'Normal',
    pumpRateMultiplier: 1.0,
    waterUseMultiplier: 1.0,
    overwaterWarnPct: 80,
    drynessWarnPct: 45,
    idealTempRange: [20, 32],
    note: 'Standard baseline thresholds (ON < 63%, OFF > 70%), matching traditional 500/450 ADC calibration.',
    image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'rice',
    name: 'Rice (Paddy)',
    category: 'Cereals',
    onBelowPct: 80,
    offAbovePct: 95,
    waterDemand: 'Very high',
    pumpRunCycle: 'Long',
    pumpRateMultiplier: 1.5,
    waterUseMultiplier: 2.5,
    overwaterWarnPct: 98,
    drynessWarnPct: 75,
    idealTempRange: [22, 35],
    note: 'Keeps soil saturated; flooded condition required during vegetative phase.',
    image: 'https://images.unsplash.com/photo-1536657464919-892534f60d6e?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'sugarcane',
    name: 'Sugarcane',
    category: 'Cash crops',
    onBelowPct: 65,
    offAbovePct: 80,
    waterDemand: 'High',
    pumpRunCycle: 'Long',
    pumpRateMultiplier: 1.3,
    waterUseMultiplier: 1.8,
    overwaterWarnPct: 88,
    drynessWarnPct: 55,
    idealTempRange: [24, 38],
    note: 'Consistent moisture needed for continuous stalk elongation and sucrose accumulation.',
    image: 'https://images.unsplash.com/photo-1543883441-2a1c6a282f93?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'banana',
    name: 'Banana',
    category: 'Fruits',
    onBelowPct: 65,
    offAbovePct: 80,
    waterDemand: 'High',
    pumpRunCycle: 'Long',
    pumpRateMultiplier: 1.3,
    waterUseMultiplier: 1.8,
    overwaterWarnPct: 88,
    drynessWarnPct: 55,
    idealTempRange: [22, 34],
    note: 'Broad shallow root system demands consistent high moisture without anaerobic stagnation.',
    image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'tomato',
    name: 'Tomato',
    category: 'Vegetables',
    onBelowPct: 55,
    offAbovePct: 70,
    waterDemand: 'Medium',
    pumpRunCycle: 'Normal',
    pumpRateMultiplier: 1.0,
    waterUseMultiplier: 1.1,
    overwaterWarnPct: 78,
    drynessWarnPct: 45,
    idealTempRange: [18, 30],
    note: 'Avoid waterlogging; fluctuating soil moisture leads to blossom end rot and fruit splitting.',
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'potato',
    name: 'Potato',
    category: 'Vegetables',
    onBelowPct: 55,
    offAbovePct: 70,
    waterDemand: 'Medium',
    pumpRunCycle: 'Normal',
    pumpRateMultiplier: 1.0,
    waterUseMultiplier: 1.1,
    overwaterWarnPct: 78,
    drynessWarnPct: 45,
    idealTempRange: [15, 25],
    note: 'Avoid waterlogging; uniform moisture prevents tuber hollow heart and skin cracking.',
    image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'maize',
    name: 'Maize (Corn)',
    category: 'Cereals',
    onBelowPct: 50,
    offAbovePct: 65,
    waterDemand: 'Medium',
    pumpRunCycle: 'Normal',
    pumpRateMultiplier: 1.0,
    waterUseMultiplier: 1.0,
    overwaterWarnPct: 75,
    drynessWarnPct: 40,
    idealTempRange: [18, 32],
    note: 'Moderate water requirement; critically sensitive to moisture stress at tasseling and silking.',
    image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'wheat',
    name: 'Wheat',
    category: 'Cereals',
    onBelowPct: 45,
    offAbovePct: 60,
    waterDemand: 'Low-medium',
    pumpRunCycle: 'Short',
    pumpRateMultiplier: 0.8,
    waterUseMultiplier: 0.85,
    overwaterWarnPct: 70,
    drynessWarnPct: 35,
    idealTempRange: [12, 25],
    note: 'Dislikes wet feet; excess moisture causes crown rot and inhibits deep root penetration.',
    image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'cotton',
    name: 'Cotton',
    category: 'Cash crops',
    onBelowPct: 40,
    offAbovePct: 55,
    waterDemand: 'Low-medium',
    pumpRunCycle: 'Short',
    pumpRateMultiplier: 0.8,
    waterUseMultiplier: 0.8,
    overwaterWarnPct: 65,
    drynessWarnPct: 30,
    idealTempRange: [21, 35],
    note: 'Deep taproot system; vulnerable to waterlogging which induces square and boll shedding.',
    image: 'https://images.unsplash.com/photo-1606041008023-472dfb5e530f?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'chickpea',
    name: 'Chickpea (Gram)',
    category: 'Pulses',
    onBelowPct: 35,
    offAbovePct: 50,
    waterDemand: 'Low',
    pumpRunCycle: 'Short',
    pumpRateMultiplier: 0.7,
    waterUseMultiplier: 0.65,
    overwaterWarnPct: 60,
    drynessWarnPct: 25,
    idealTempRange: [15, 28],
    note: 'Root rot risk if wet; thrives on residual soil moisture and low supplemental irrigation.',
    image: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'bajra',
    name: 'Bajra (Pearl Millet)',
    category: 'Cereals',
    onBelowPct: 30,
    offAbovePct: 45,
    waterDemand: 'Very low',
    pumpRunCycle: 'Short',
    pumpRateMultiplier: 0.7,
    waterUseMultiplier: 0.5,
    overwaterWarnPct: 55,
    drynessWarnPct: 20,
    idealTempRange: [22, 38],
    note: 'Extremely drought tolerant; excessive irrigation causes collar rot and lodging.',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=300&q=80'
  }
];

export const IRRIGATION_CATEGORIES: CropCategory[] = [
  'General',
  'Cereals',
  'Vegetables',
  'Cash crops',
  'Pulses',
  'Fruits'
];

/**
 * Derives the exact ADC threshold where pump turns ON for this profile.
 * Formula: adc = 1023 - (pct / 100) * 823
 */
export function getProfileOnAdc(profile: IrrigationProfile, overrideOnPct?: number): number {
  const pct = overrideOnPct ?? profile.onBelowPct;
  return soilPctToAdc(pct);
}

/**
 * Derives the exact ADC threshold where pump turns OFF for this profile.
 * Formula: adc = 1023 - (pct / 100) * 823
 */
export function getProfileOffAdc(profile: IrrigationProfile, overrideOffPct?: number): number {
  const pct = overrideOffPct ?? profile.offAbovePct;
  return soilPctToAdc(pct);
}

/**
 * Finds irrigation profile by ID or partial name
 */
export function findIrrigationProfile(cropIdOrName?: string): IrrigationProfile {
  if (!cropIdOrName) return IRRIGATION_PROFILES[0];
  const query = cropIdOrName.toLowerCase().trim();
  const found = IRRIGATION_PROFILES.find(p => 
    p.id.toLowerCase() === query ||
    p.name.toLowerCase().includes(query) ||
    query.includes(p.id.toLowerCase())
  );
  return found || IRRIGATION_PROFILES[0];
}
