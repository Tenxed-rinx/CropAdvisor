export type Source = 'sample' | 'simulated' | 'manual';

export interface SensorReading {
  id: string;
  timestamp: string;           // ISO format
  source: Source;
  soilMoistureAdc: number;     // 0-1023, higher = drier
  soilMoisturePct: number;     // 0-100%
  tempC: number;               // -10 to 80 C
  humidityPct: number;         // 0-100%
  lightAdc: number;            // 0-1023
  waterLevelAdc: number;       // 0-1023
  ph: number;                  // 3-10
  n?: number;                  // mg/kg, optional
  p?: number;                  // mg/kg, optional
  k?: number;                  // mg/kg, optional
  ec?: number;                 // dS/m, optional
  rainfallMm?: number;         // mm, optional
  sandPct?: number;            // % sand
  siltPct?: number;            // % silt
  clayPct?: number;            // % clay
  pumpOn: boolean;
  alerts: string[];
}

export interface SoilProfile {
  type: string;                // e.g. Loamy, Clay, Sandy, Black cotton, Red laterite, Alluvial, Calcareous
  textureClass: string;
  regionalTag: string;
  ph: number;
  moisturePct: number;
  drainage: 'Slow' | 'Moderate' | 'Rapid';
  nutrients: { n: number; p: number; k: number };
  ec: number;
  healthScore: number;         // 0-100
  formulaBreakdown: {
    phComponent: number;
    moistureComponent: number;
    nutrientComponent: number;
    salinityComponent: number;
  };
  ruleFired: string;
  isEstimated: boolean;
  recommendations: string[];
}

export interface Crop {
  name: string;
  category: string;
  seasons: ('Kharif' | 'Rabi' | 'Zaid')[];
  phRange: [number, number];
  tempRange: [number, number];
  rainRange: [number, number];
  humidityRange: [number, number];
  npkNeeds: { n: number; p: number; k: number };
  waterNeed: 'Low' | 'Medium' | 'High';
  durationDays: number;
  yieldQtlPerAcre: number;
  costPerAcre: number;
  msp?: number;
  priceMin: number;
  priceMax: number;
  priceModal: number;
  priceTrend12m: number[];
  perishability: 'Low' | 'Medium' | 'High';
  image: string;
  soilTypes: string[];
}

export interface CropResult {
  crop: Crop;
  suitability: number;        // 0-100%
  expectedYield: number;      // quintals
  cost: number;               // INR
  revenue: number;            // INR
  profit: number;             // INR
  profitPerAcre: number;
  costPerAcre: number;
  revenuePerAcre: number;
  reasons: string[];
  warnings: string[];
  scoreBreakdown: {
    soilScore: number;
    climateScore: number;
    waterScore: number;
    profitScore: number;
    riskScore: number;
  };
}

export interface SimulationSettings {
  pumpOnThresholdAdc: number;   // default 500
  pumpOffThresholdAdc: number;  // default 450 (hysteresis)
  highTempThresholdC: number;   // default 35
  lowWaterThresholdAdc: number; // default 200
  realisticNoise: boolean;      // default true (+-2%)
  autoLog: boolean;             // default true
  speed: 1 | 2 | 5;             // 1x, 2x, 5x
}

export interface FarmerInputs {
  season: 'Kharif' | 'Rabi' | 'Zaid';
  landSizeAcres: number;
  irrigation: 'rain-fed' | 'canal' | 'borewell';
  budget: 'low' | 'medium' | 'high';
  state: string;
  weights: {
    soilWeight: number;      // default 35
    climateWeight: number;   // default 25
    waterWeight: number;     // default 15
    profitWeight: number;    // default 20
    riskWeight: number;      // default 5
  };
}
