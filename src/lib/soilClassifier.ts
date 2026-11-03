/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Crop Advisor Soil Classifier & Agronomic Evaluation
 * Transparent rule-based soil texture and regional classification with soil health scoring.
 */

import { SoilProfile } from '../types';
import { clamp } from './units';

export interface SoilInputParams {
  sandPct?: number;
  siltPct?: number;
  clayPct?: number;
  ph: number;
  moisturePct: number;
  n?: number;
  p?: number;
  k?: number;
  ec?: number;
  rainfallMm?: number;
}

/**
 * USDA Soil Texture Triangle Classification
 */
export function classifyUsdaTexture(sand: number, silt: number, clay: number): string {
  // Normalize percentages if they don't sum to exactly 100
  const total = sand + silt + clay;
  const s = total > 0 ? (sand / total) * 100 : 40;
  const si = total > 0 ? (silt / total) * 100 : 40;
  const c = total > 0 ? (clay / total) * 100 : 20;

  if (s >= 85 && (si + 1.5 * c) < 15) return 'Sand';
  if (s >= 70 && s <= 90 && (si + 1.5 * c) >= 15 && (si + 2 * c) < 30) return 'Loamy Sand';
  if ((c >= 7 && c < 20 && s > 52 && (si + 2 * c) >= 30) || (c < 7 && si < 50 && (si + 2 * c) >= 30)) return 'Sandy Loam';
  if (c >= 7 && c < 27 && si >= 28 && si < 50 && s <= 52) return 'Loam';
  if ((si >= 50 && c >= 12 && c < 27) || (si >= 50 && si < 80 && c < 12)) return 'Silt Loam';
  if (si >= 80 && c < 12) return 'Silt';
  if (c >= 20 && c < 35 && s > 45 && si < 28) return 'Sandy Clay Loam';
  if (c >= 27 && c < 40 && s > 20 && s <= 45) return 'Clay Loam';
  if (c >= 27 && c < 40 && s <= 20) return 'Silty Clay Loam';
  if (c >= 35 && s > 45) return 'Sandy Clay';
  if (c >= 40 && si >= 40) return 'Silty Clay';
  if (c >= 40) return 'Clay';

  return 'Loam';
}

/**
 * Classify Indian Regional Soil Type & Drainage
 */
export function classifyIndianSoil(
  texture: string,
  ph: number,
  moisturePct: number,
  ec: number
): { regionalTag: string; drainage: 'Slow' | 'Moderate' | 'Rapid'; ruleFired: string } {
  // 1. Black Cotton Soil (Regur / Kali Mitti): High clay, neutral to alkaline pH, slow drainage, high moisture retention
  if ((texture.includes('Clay') || moisturePct > 55) && ph >= 7.2 && ph <= 8.5) {
    return {
      regionalTag: 'Black cotton (Kali mitti)',
      drainage: 'Slow',
      ruleFired: `High clay content with alkaline pH (${ph.toFixed(1)}) and high water retention matches Deccan basaltic Black Cotton soil.`
    };
  }

  // 2. Red Laterite Soil (Lal Mitti): Acidic pH (< 6.2), rich in iron/aluminium oxides, rapid to moderate drainage
  if (ph < 6.2) {
    return {
      regionalTag: 'Red laterite (Lal mitti)',
      drainage: 'Rapid',
      ruleFired: `Acidic pH (${ph.toFixed(1)}) with moderate organic content characterizes weathered tropical Red & Laterite soils.`
    };
  }

  // 3. Sandy Desert Soil (Retili Balui): High sand content, very rapid drainage, alkaline or neutral
  if (texture.includes('Sand') || (moisturePct < 25 && ph >= 7.5)) {
    return {
      regionalTag: 'Sandy (Retili balui)',
      drainage: 'Rapid',
      ruleFired: `Coarse texture with fast drainage and lower moisture holding capacity matches Arid/Desert sandy soils.`
    };
  }

  // 4. Calcareous Soil (Chuna Mitti): High pH (> 8.0), moderate to high EC
  if (ph > 8.0 || ec > 2.5) {
    return {
      regionalTag: 'Calcareous (Chuna mitti)',
      drainage: 'Moderate',
      ruleFired: `High lime/carbonate index indicated by pH (${ph.toFixed(1)}) and salinity reflects Calcareous soils.`
    };
  }

  // 5. Alluvial Soil (Khadar / Bhangar): Balanced loamy texture, optimal pH (6.5 - 7.5), moderate drainage
  return {
    regionalTag: 'Alluvial (Jalodh mitti)',
    drainage: 'Moderate',
    ruleFired: `Balanced texture profile and neutral pH (${ph.toFixed(1)}) matches Indo-Gangetic Alluvial depositional plains.`
  };
}

/**
 * Calculates a comprehensive Soil Health Score (0-100)
 * Weighted factors:
 * - pH balance (30%)
 * - Moisture status (25%)
 * - Nutrient sufficiency NPK (30%)
 * - Salinity / EC (15%)
 */
export function calculateSoilHealthScore(
  ph: number,
  moisturePct: number,
  n: number,
  p: number,
  k: number,
  ec: number
): { score: number; breakdown: { phComponent: number; moistureComponent: number; nutrientComponent: number; salinityComponent: number } } {
  // pH score: 6.0 - 7.5 is ideal (100 pts)
  let phScore = 100;
  if (ph < 6.0) {
    phScore = clamp(100 - (6.0 - ph) * 35, 20, 100);
  } else if (ph > 7.5) {
    phScore = clamp(100 - (ph - 7.5) * 35, 20, 100);
  }

  // Moisture score: 40% - 65% is ideal for active biology (100 pts)
  let moistureScore = 100;
  if (moisturePct < 40) {
    moistureScore = clamp(100 - (40 - moisturePct) * 2.5, 20, 100);
  } else if (moisturePct > 65) {
    moistureScore = clamp(100 - (moisturePct - 65) * 2.5, 20, 100);
  }

  // Nutrients score (N target: 60-120 mg/kg, P: 30-60, K: 40-80)
  const nScore = clamp(100 - Math.abs(n - 90) * 0.8, 30, 100);
  const pScore = clamp(100 - Math.abs(p - 45) * 1.4, 30, 100);
  const kScore = clamp(100 - Math.abs(k - 60) * 1.1, 30, 100);
  const nutrientScore = (nScore + pScore + kScore) / 3;

  // Salinity score (EC < 1.5 dS/m ideal, > 3.0 degrades score)
  let salinityScore = 100;
  if (ec > 1.5) {
    salinityScore = clamp(100 - (ec - 1.5) * 25, 20, 100);
  }

  const weightedTotal = Math.round(
    phScore * 0.30 +
    moistureScore * 0.25 +
    nutrientScore * 0.30 +
    salinityScore * 0.15
  );

  return {
    score: clamp(weightedTotal, 0, 100),
    breakdown: {
      phComponent: Math.round(phScore),
      moistureComponent: Math.round(moistureScore),
      nutrientComponent: Math.round(nutrientScore),
      salinityComponent: Math.round(salinityScore)
    }
  };
}

/**
 * Produces agronomic action recommendations based on soil profile metrics
 */
export function generateRecommendations(
  ph: number,
  moisturePct: number,
  n: number,
  p: number,
  k: number,
  ec: number,
  drainage: 'Slow' | 'Moderate' | 'Rapid'
): string[] {
  const recs: string[] = [];

  // pH interventions
  if (ph < 6.0) {
    recs.push(`Soil is acidic (pH ${ph.toFixed(1)}): Apply agricultural lime (calcium carbonate) or dolomite at 1.5 tonnes/acre to neutralize acidity and enhance nutrient uptake.`);
  } else if (ph > 7.8) {
    recs.push(`Soil is moderately alkaline (pH ${ph.toFixed(1)}): Apply gypsum (calcium sulphate) or composted manure to lower alkalinity and improve micronutrient availability.`);
  }

  // Moisture & drainage interventions
  if (moisturePct < 35) {
    recs.push(`Low moisture detected (${moisturePct.toFixed(1)}%): Implement drip micro-irrigation and apply crop residue mulching to retain root-zone humidity.`);
  } else if (moisturePct > 75 && drainage === 'Slow') {
    recs.push(`Excess waterlogging risk detected: Construct raised sowing beds or surface drainage trenches to prevent fungal root rot.`);
  }

  // Organic matter and soil structure
  if (drainage === 'Rapid') {
    recs.push(`Rapid drainage detected: Incorporate farmyard manure (FYM) or vermicompost (3 tonnes/acre) to build soil organic carbon and water retention.`);
  }

  // Nutrient balancing
  if (n < 50) {
    recs.push(`Low available nitrogen (${n} mg/kg): Top-dress with neem-coated urea or incorporate nitrogen-fixing green manuring legumes (Dhaincha/Sunn hemp).`);
  }
  if (p < 30) {
    recs.push(`Phosphorus deficiency (${p} mg/kg): Apply Single Super Phosphate (SSP) or rock phosphate during preparatory tillage.`);
  }
  if (k < 35) {
    recs.push(`Potassium deficit (${k} mg/kg): Apply Muriate of Potash (MOP) to improve drought tolerance and grain filling.`);
  }

  // Salinity intervention
  if (ec > 2.0) {
    recs.push(`Elevated salinity (EC ${ec.toFixed(1)} dS/m): Flush soil with good quality canal water and ensure adequate sub-surface drainage to leach excess salts.`);
  }

  // Guarantee at least 3 distinct actionable points
  if (recs.length < 3) {
    recs.push('Maintain balanced crop rotation with leguminous pulses every 2 seasons to naturally rejuvenate soil microbial health.');
  }
  if (recs.length < 3) {
    recs.push('Perform periodic soil testing at 6-month intervals before Kharif and Rabi sowings to monitor micro-nutrient trends.');
  }

  return recs.slice(0, 4);
}

/**
 * Main Soil Profile Evaluation function
 */
export function analyzeSoilProfile(input: SoilInputParams): SoilProfile {
  let textureClass = 'Loam';
  let isEstimated = false;

  if (input.sandPct !== undefined && input.siltPct !== undefined && input.clayPct !== undefined) {
    textureClass = classifyUsdaTexture(input.sandPct, input.siltPct, input.clayPct);
  } else {
    isEstimated = true;
    if (input.moisturePct > 65) {
      textureClass = 'Clay Loam';
    } else if (input.moisturePct < 30) {
      textureClass = 'Sandy Loam';
    } else {
      textureClass = 'Loam';
    }
  }

  const n = input.n ?? 80;
  const p = input.p ?? 40;
  const k = input.k ?? 45;
  const ec = input.ec ?? 1.1;

  const { regionalTag, drainage, ruleFired } = classifyIndianSoil(
    textureClass,
    input.ph,
    input.moisturePct,
    ec
  );

  const { score: healthScore, breakdown: formulaBreakdown } = calculateSoilHealthScore(
    input.ph,
    input.moisturePct,
    n,
    p,
    k,
    ec
  );

  const recommendations = generateRecommendations(
    input.ph,
    input.moisturePct,
    n,
    p,
    k,
    ec,
    drainage
  );

  return {
    type: regionalTag,
    textureClass,
    regionalTag,
    ph: Number(input.ph.toFixed(1)),
    moisturePct: Number(input.moisturePct.toFixed(1)),
    drainage,
    nutrients: { n, p, k },
    ec: Number(ec.toFixed(1)),
    healthScore,
    formulaBreakdown,
    ruleFired: isEstimated ? `${ruleFired} (Estimated texture from sensor moisture profile due to absence of laboratory sand/silt/clay fractions)` : ruleFired,
    isEstimated,
    recommendations
  };
}
