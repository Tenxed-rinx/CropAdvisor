/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Crop Advisor Agronomic Scoring & Economics Engine
 * Rule-based multi-criteria suitability scoring with yield & revenue modeling.
 */

import { Crop, CropResult, SoilProfile, FarmerInputs } from '../types';
import { clamp } from './units';

export interface EnvironmentalContext {
  temperatureC: number;
  humidityPct: number;
  rainfallMm: number;
}

/**
 * Evaluates individual crop against soil, climate, water availability, and economic factors.
 */
export function evaluateCrop(
  crop: Crop,
  soil: SoilProfile,
  farmer: FarmerInputs,
  climate: EnvironmentalContext
): CropResult {
  const reasons: string[] = [];
  const warnings: string[] = [];

  // --- 1. Soil Match (35% default weight) ---
  let soilScore = 0;
  
  // pH match
  const [minPh, maxPh] = crop.phRange;
  if (soil.ph >= minPh && soil.ph <= maxPh) {
    soilScore += 40;
    reasons.push(`Optimal soil pH (${soil.ph}) within preferred range ${minPh}-${maxPh}`);
  } else {
    const phDiff = soil.ph < minPh ? minPh - soil.ph : soil.ph - maxPh;
    soilScore += clamp(40 - phDiff * 25, 0, 40);
    if (soil.ph < minPh) warnings.push(`Soil pH (${soil.ph}) is below preferred ${minPh}`);
    if (soil.ph > maxPh) warnings.push(`Soil pH (${soil.ph}) is above preferred ${maxPh}`);
  }

  // Soil type compatibility
  const matchedSoilType = crop.soilTypes.some(st => 
    soil.regionalTag.toLowerCase().includes(st.toLowerCase()) || 
    soil.textureClass.toLowerCase().includes(st.toLowerCase())
  );
  if (matchedSoilType) {
    soilScore += 35;
    reasons.push(`Matches native soil structure: ${soil.textureClass} / ${soil.regionalTag}`);
  } else {
    soilScore += 15;
    warnings.push(`Sub-optimal soil texture: ${soil.textureClass} requires amendments for ${crop.name}`);
  }

  // NPK sufficiency
  const nDiff = Math.abs(soil.nutrients.n - crop.npkNeeds.n);
  const pDiff = Math.abs(soil.nutrients.p - crop.npkNeeds.p);
  const kDiff = Math.abs(soil.nutrients.k - crop.npkNeeds.k);
  const npkPenalty = clamp((nDiff + pDiff + kDiff) * 0.15, 0, 25);
  soilScore += (25 - npkPenalty);
  if (soil.nutrients.n >= crop.npkNeeds.n * 0.8) {
    reasons.push(`Soil Nitrogen (${soil.nutrients.n} mg/kg) adequate for vegetative growth`);
  } else {
    warnings.push(`Nitrogen deficit: requires additional fertilizer top-dressing`);
  }

  // --- 2. Climate Match (25% default weight) ---
  let climateScore = 0;

  // Temperature
  const [minTemp, maxTemp] = crop.tempRange;
  if (climate.temperatureC >= minTemp && climate.temperatureC <= maxTemp) {
    climateScore += 45;
    reasons.push(`Ambient temperature (${climate.temperatureC}°C) in ideal ${minTemp}-${maxTemp}°C band`);
  } else {
    const tempDiff = climate.temperatureC < minTemp ? minTemp - climate.temperatureC : climate.temperatureC - maxTemp;
    climateScore += clamp(45 - tempDiff * 4, 5, 45);
    warnings.push(`Temperature (${climate.temperatureC}°C) outside ideal ${minTemp}-${maxTemp}°C`);
  }

  // Humidity
  const [minHum, maxHum] = crop.humidityRange;
  if (climate.humidityPct >= minHum && climate.humidityPct <= maxHum) {
    climateScore += 30;
  } else {
    climateScore += 15;
  }

  // Season compatibility
  if (crop.seasons.includes(farmer.season)) {
    climateScore += 25;
    reasons.push(`Agronomically aligned with ${farmer.season} cropping calendar`);
  } else {
    climateScore += 5;
    warnings.push(`Not traditionally grown in ${farmer.season} season in this agro-climatic zone`);
  }

  // --- 3. Water Need vs Availability (15% default weight) ---
  let waterScore = 0;
  if (farmer.irrigation === 'borewell' || farmer.irrigation === 'canal') {
    waterScore = 95;
    reasons.push(`Assured irrigation (${farmer.irrigation}) supports ${crop.waterNeed.toLowerCase()} water demand`);
  } else { // rain-fed
    if (crop.waterNeed === 'Low') {
      waterScore = 90;
      reasons.push(`Drought-tolerant crop thrives in rain-fed conditions`);
    } else if (crop.waterNeed === 'Medium') {
      waterScore = 55;
      warnings.push(`Rain-fed cultivation has moderate moisture stress risk`);
    } else { // High
      waterScore = 20;
      warnings.push(`Critical risk: High water requirement unsuitable for purely rain-fed farming`);
    }
  }

  // --- 4. Profit Potential (20% default weight) ---
  // Modal market price * expected yield - cost per acre
  const revenuePerAcre = crop.priceModal * crop.yieldQtlPerAcre;
  const costPerAcre = crop.costPerAcre;
  const netProfitPerAcre = revenuePerAcre - costPerAcre;
  
  // Profit benchmark: 0 to 80,000 INR/acre
  const profitScore = clamp((netProfitPerAcre / 55000) * 100, 10, 100);
  if (netProfitPerAcre > 30000) {
    reasons.push(`High net return: ₹${netProfitPerAcre.toLocaleString('en-IN')}/acre estimated profit`);
  }

  // --- 5. Risk Assessment (5% default weight) ---
  let riskScore = 80;
  if (crop.perishability === 'High') {
    riskScore -= 30;
    warnings.push(`High perishability: requires prompt cold-storage or proximity to wholesale mandi`);
  } else if (crop.perishability === 'Low') {
    riskScore += 15;
    reasons.push(`Low perishability: can be stored to sell during market price peaks`);
  }

  if (crop.msp) {
    riskScore += 10;
    reasons.push(`Protected by Government MSP safety net (₹${crop.msp}/quintal)`);
  }

  riskScore = clamp(riskScore, 10, 100);

  // --- Weighted Suitability Score ---
  const weights = farmer.weights;
  const totalWeight = weights.soilWeight + weights.climateWeight + weights.waterWeight + weights.profitWeight + weights.riskWeight;
  
  const finalSuitability = Math.round(
    (soilScore * weights.soilWeight +
     climateScore * weights.climateWeight +
     waterScore * weights.waterWeight +
     profitScore * weights.profitWeight +
     riskScore * weights.riskWeight) / (totalWeight || 100)
  );

  // Scaled for farmer's land size
  const land = farmer.landSizeAcres || 1;
  const expectedTotalYield = Number((crop.yieldQtlPerAcre * land).toFixed(1));
  const totalCost = Math.round(costPerAcre * land);
  const totalRevenue = Math.round(revenuePerAcre * land);
  const totalProfit = Math.round(netProfitPerAcre * land);

  return {
    crop,
    suitability: clamp(finalSuitability, 5, 99),
    expectedYield: expectedTotalYield,
    cost: totalCost,
    revenue: totalRevenue,
    profit: totalProfit,
    profitPerAcre: netProfitPerAcre,
    costPerAcre,
    revenuePerAcre,
    reasons: reasons.slice(0, 4),
    warnings: warnings.slice(0, 3),
    scoreBreakdown: {
      soilScore: Math.round(soilScore),
      climateScore: Math.round(climateScore),
      waterScore: Math.round(waterScore),
      profitScore: Math.round(profitScore),
      riskScore: Math.round(riskScore)
    }
  };
}

/**
 * Score all available crops and rank them
 */
export function scoreAllCrops(
  crops: Crop[],
  soil: SoilProfile,
  farmer: FarmerInputs,
  climate: EnvironmentalContext
): CropResult[] {
  const scored = crops.map(c => evaluateCrop(c, soil, farmer, climate));
  // Sort descending by suitability
  return scored.sort((a, b) => b.suitability - a.suitability);
}
