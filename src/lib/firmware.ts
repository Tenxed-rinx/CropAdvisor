/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Crop Advisor Firmware Engine
 * Emulates the Arduino UNO firmware logic with crop-aware hysteresis control,
 * dynamic water consumption, and closed-loop environmental feedback.
 */

import { SimulationSettings, SensorReading, Source } from '../types';
import { soilAdcToPct, soilPctToAdc, clamp } from './units';
import {
  IrrigationProfile,
  IRRIGATION_PROFILES,
  findIrrigationProfile,
  getProfileOnAdc,
  getProfileOffAdc
} from './irrigationProfiles';

export const DEFAULT_SETTINGS: SimulationSettings = {
  pumpOnThresholdAdc: 500,
  pumpOffThresholdAdc: 450,
  highTempThresholdC: 35,
  lowWaterThresholdAdc: 200,
  realisticNoise: true,
  autoLog: true,
  speed: 1,
  selectedCropId: 'general',
};

export interface SimulatorState {
  soilAdc: number;
  tempC: number;
  humidity: number;
  lightAdc: number;
  waterAdc: number;
  ph: number;
  pumpOn: boolean;
  running: boolean;
  tick: number;
  overrideMode: 'auto' | 'on' | 'off';
  selectedCropId: string;
  // Session override of thresholds if user edits them
  customThresholds?: { onBelowPct: number; offAbovePct: number } | null;
  // Irrigation tracking counters
  pumpCycles: number;
  totalPumpOnTicks: number;
  estimatedWaterUsedL: number; // 2 L per ON tick assumption
}

/**
 * Computes firmware decision and alert strings based on active crop profile thresholds and override mode.
 */
export function evaluateFirmwareRules(
  currentPumpState: boolean,
  soilAdc: number,
  tempC: number,
  waterAdc: number,
  overrideMode: 'auto' | 'on' | 'off',
  settings: SimulationSettings,
  cropProfile: IrrigationProfile,
  customThresholds?: { onBelowPct: number; offAbovePct: number } | null
): { pumpOn: boolean; alerts: string[]; caption: string } {
  let newPumpState = currentPumpState;
  const alerts: string[] = [];

  const effectiveOnPct = customThresholds?.onBelowPct ?? cropProfile.onBelowPct;
  const effectiveOffPct = customThresholds?.offAbovePct ?? cropProfile.offAbovePct;

  // Derive exact ADC from moisture percent via soilPctToAdc (single conversion formula)
  const onAdc = soilPctToAdc(effectiveOnPct);
  const offAdc = soilPctToAdc(effectiveOffPct);

  const currentMoisturePct = soilAdcToPct(soilAdc);

  // 1. Waterlogging and Crop Stress Alerts (from crop profile)
  if (currentMoisturePct > cropProfile.overwaterWarnPct) {
    alerts.push(`Waterlogging risk for ${cropProfile.name}`);
  }
  if (currentMoisturePct < cropProfile.drynessWarnPct) {
    alerts.push(`Crop stress risk (${cropProfile.name})`);
  }

  // 2. Hardware and Ambient Alerts
  if (soilAdc > onAdc) {
    alerts.push(`Soil dry for ${cropProfile.name} (< ${effectiveOnPct}%)`);
  }
  if (tempC > settings.highTempThresholdC) {
    alerts.push('High temperature alert');
  }
  if (waterAdc < settings.lowWaterThresholdAdc) {
    alerts.push('Low water tank');
  }

  // 3. Evaluate pump hysteresis in AUTO mode
  // Higher ADC means drier soil. Pump ON when soilAdc > onAdc (moisture < effectiveOnPct).
  // Pump OFF when soilAdc < offAdc (moisture > effectiveOffPct).
  if (overrideMode === 'auto') {
    if (soilAdc > onAdc) {
      if (waterAdc < settings.lowWaterThresholdAdc) {
        newPumpState = false;
        alerts.push('Pump blocked: low water reservoir');
      } else {
        newPumpState = true;
      }
    } else if (soilAdc < offAdc) {
      // Hydration threshold reached -> stop pump
      newPumpState = false;
    }
    // If between offAdc and onAdc, maintain current pump state (hysteresis deadband)
  } else if (overrideMode === 'on') {
    newPumpState = true;
  } else if (overrideMode === 'off') {
    newPumpState = false;
  }

  // 4. Construct plain-language descriptive caption
  let caption = '';
  if (overrideMode === 'on') {
    caption = `Pump is manually FORCED ON for ${cropProfile.name} (Soil is ${currentMoisturePct}%, ADC ${Math.round(soilAdc)}).`;
  } else if (overrideMode === 'off') {
    caption = `Pump is manually FORCED OFF for ${cropProfile.name} (Soil is ${currentMoisturePct}%, ADC ${Math.round(soilAdc)}).`;
  } else if (newPumpState) {
    caption = `Soil moisture is low for ${cropProfile.name} (${currentMoisturePct}% < ${effectiveOnPct}% target), pump is ON.`;
  } else if (waterAdc < settings.lowWaterThresholdAdc) {
    const tankPct = Math.round((waterAdc / 1023) * 100);
    caption = `Pump is OFF: Water tank level low (${tankPct}%), protecting pump motor from dry run.`;
  } else if (currentMoisturePct >= effectiveOffPct) {
    caption = `${cropProfile.name} moisture target reached (${currentMoisturePct}% ≥ ${effectiveOffPct}%), pump is OFF (standby).`;
  } else {
    caption = `${cropProfile.name} soil moisture is within optimal target band (${effectiveOnPct}% - ${effectiveOffPct}%), pump resting.`;
  }

  return { pumpOn: newPumpState, alerts, caption };
}

/**
 * Closed loop simulation tick calculation:
 * - Pump ON: soil moisture rises (ADC drops) proportional to pumpRateMultiplier
 *   Water tank drains proportional to waterUseMultiplier (Rice/Sugarcane drain much faster!)
 * - Pump OFF: soil dries out naturally, accelerated by higher ambient temperatures
 * - Noise: ±2% variation if enabled
 */
export function simulateTickPhysics(
  state: SimulatorState,
  settings: SimulationSettings,
  cropProfile: IrrigationProfile,
  customThresholds?: { onBelowPct: number; offAbovePct: number } | null
): {
  newSoilAdc: number;
  newTempC: number;
  newHumidity: number;
  newLightAdc: number;
  newWaterAdc: number;
  newPh: number;
  newPumpOn: boolean;
  alerts: string[];
  caption: string;
  pumpCycles: number;
  totalPumpOnTicks: number;
  estimatedWaterUsedL: number;
} {
  let {
    soilAdc,
    tempC,
    humidity,
    lightAdc,
    waterAdc,
    ph,
    pumpOn,
    overrideMode,
    pumpCycles,
    totalPumpOnTicks,
    estimatedWaterUsedL
  } = state;

  // Base physics rates
  const baseRiseAdc = 15; // ADC drop when pump is ON (soil gets wetter)
  const baseDrainAdc = 8; // Tank ADC drop per tick when pump is ON
  const baseDryAdc = 5;   // Natural drying per tick when pump is OFF

  // Temperature acceleration for soil evaporation
  const heatFactor = tempC > 30 ? (tempC - 30) * 0.15 : 0;

  let newPumpOnTicks = totalPumpOnTicks;
  let newEstimatedWaterL = estimatedWaterUsedL;

  if (pumpOn) {
    newPumpOnTicks += 1;
    // 2 Litres of water assumed per ON tick at baseline 1.0 multiplier
    newEstimatedWaterL += 2.0 * cropProfile.waterUseMultiplier;

    // Soil gets wetter (ADC drops) scaled by crop pumpRateMultiplier
    const deltaAdc = baseRiseAdc * cropProfile.pumpRateMultiplier + (Math.random() * 4 - 2);
    soilAdc -= deltaAdc;

    // Water tank drains scaled by crop waterUseMultiplier
    const tankDrain = baseDrainAdc * cropProfile.waterUseMultiplier + (Math.random() * 2 - 1);
    waterAdc -= tankDrain;
  } else {
    // Soil dries out naturally over time (faster at high heat)
    const dryDelta = baseDryAdc * (1 + heatFactor) + (Math.random() * 2 - 1);
    soilAdc += dryDelta;
    // Slight reservoir ambient evaporation
    waterAdc -= 0.3;
  }

  // Physical boundaries
  soilAdc = clamp(soilAdc, 200, 1023);
  waterAdc = clamp(waterAdc, 50, 1023);

  // Apply optional realistic sensor noise (+-2%)
  let displaySoilAdc = soilAdc;
  let displayTempC = tempC;
  let displayHumidity = humidity;
  let displayLightAdc = lightAdc;
  let displayWaterAdc = waterAdc;

  if (settings.realisticNoise) {
    displaySoilAdc = clamp(soilAdc * (1 + (Math.random() * 0.04 - 0.02)), 200, 1023);
    displayTempC = clamp(tempC + (Math.random() * 0.4 - 0.2), -10, 60);
    displayHumidity = clamp(humidity + (Math.random() * 1.0 - 0.5), 10, 100);
    displayLightAdc = clamp(lightAdc + (Math.random() * 10 - 5), 0, 1023);
    displayWaterAdc = clamp(waterAdc * (1 + (Math.random() * 0.02 - 0.01)), 50, 1023);
  }

  // Evaluate firmware rules for next state
  const { pumpOn: evaluatedPump, alerts, caption } = evaluateFirmwareRules(
    pumpOn,
    displaySoilAdc,
    displayTempC,
    displayWaterAdc,
    overrideMode,
    settings,
    cropProfile,
    customThresholds
  );

  // Track cycle count (transition from OFF to ON)
  let newPumpCycles = pumpCycles;
  if (!pumpOn && evaluatedPump) {
    newPumpCycles += 1;
  }

  return {
    newSoilAdc: Math.round(displaySoilAdc),
    newTempC: Number(displayTempC.toFixed(1)),
    newHumidity: Number(displayHumidity.toFixed(1)),
    newLightAdc: Math.round(displayLightAdc),
    newWaterAdc: Math.round(displayWaterAdc),
    newPh: Number(ph.toFixed(1)),
    newPumpOn: evaluatedPump,
    alerts,
    caption,
    pumpCycles: newPumpCycles,
    totalPumpOnTicks: newPumpOnTicks,
    estimatedWaterUsedL: Number(newEstimatedWaterL.toFixed(1))
  };
}

/**
 * Creates a SensorReading object from simulator values including crop-aware fields
 */
export function createSensorReading(
  soilAdc: number,
  tempC: number,
  humidity: number,
  lightAdc: number,
  waterAdc: number,
  ph: number,
  pumpOn: boolean,
  alerts: string[],
  source: Source = 'simulated',
  cropProfileName: string = 'General',
  targetMinPct: number = 63,
  targetMaxPct: number = 70,
  waterUsedL: number = 0
): SensorReading {
  return {
    id: `sim-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    source,
    soilMoistureAdc: soilAdc,
    soilMoisturePct: soilAdcToPct(soilAdc),
    tempC,
    humidityPct: humidity,
    lightAdc,
    waterLevelAdc: waterAdc,
    ph,
    n: 80,
    p: 40,
    k: 45,
    ec: 1.2,
    rainfallMm: 0,
    pumpOn,
    alerts,
    cropProfile: cropProfileName,
    targetMinPct,
    targetMaxPct,
    waterUsedL
  };
}

/**
 * Formats a farmer-friendly telemetry update including crop profile context
 */
export function formatSerialFrame(reading: SensorReading, tick: number): string {
  const time = new Date(reading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const status = reading.soilMoisturePct > 70 ? 'Moist / Wet' : reading.soilMoisturePct >= 35 ? 'Optimal' : 'Dry (Needs Water)';
  const tankPct = Math.round((reading.waterLevelAdc / 1023) * 100);
  const crop = reading.cropProfile || 'General';

  if (reading.alerts.length > 0 && reading.pumpOn) {
    return `[${time}] ⚠️ [${crop}] ${reading.alerts.join(' & ')} · Soil: ${reading.soilMoisturePct}% · Pump is currently watering.`;
  }
  if (reading.alerts.length > 0) {
    return `[${time}] ⚠️ [${crop}] ALERT: ${reading.alerts.join(' & ')} · Soil is ${reading.soilMoisturePct}% (${status}).`;
  }
  if (reading.pumpOn) {
    return `[${time}] 💧 [${crop}] Pump is ON: Irrigating field · Soil: ${reading.soilMoisturePct}% (Target: ${reading.targetMinPct}% - ${reading.targetMaxPct}%) · Tank: ${tankPct}%.`;
  }
  return `[${time}] [${crop}] Field normal: Soil ${status} (${reading.soilMoisturePct}%) · Air ${reading.tempC}°C, ${reading.humidityPct}% hum · Pump: OFF.`;
}

/**
 * Generates the clean Arduino C++ (.ino) code using the active crop profile thresholds
 * and includes a #define CROP selector for students to toggle profiles.
 */
export function generateArduinoInoCode(
  settings: SimulationSettings,
  activeProfile: IrrigationProfile,
  customThresholds?: { onBelowPct: number; offAbovePct: number } | null
): string {
  const onPct = customThresholds?.onBelowPct ?? activeProfile.onBelowPct;
  const offPct = customThresholds?.offAbovePct ?? activeProfile.offAbovePct;
  const onAdc = soilPctToAdc(onPct);
  const offAdc = soilPctToAdc(offPct);

  // Generate selector define name like CROP_RICE, CROP_GENERAL
  const cropMacro = `CROP_${activeProfile.id.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;

  return `/*
 * Crop Advisor - Virtual IoT Agriculture Firmware
 * Board: Arduino UNO (ATmega328P)
 * Pins:
 *   - A0: Soil Moisture Sensor (Analog Resistive)
 *   - A1: LDR Photoresistor (Analog Light)
 *   - A2: Water Tank Level Sensor (Analog Submersible)
 *   - A3: Analog pH Meter Sensor
 *   - D2: DHT22 Temperature & Humidity Sensor
 *   - D7: Relay Module (Submersible Water Pump)
 * 
 * Crop-Aware Profile: ${activeProfile.name} (${activeProfile.category})
 * Target Moisture Band: ${onPct}% to ${offPct}%
 * Derived Thresholds: ON below ${onAdc} ADC | OFF above ${offAdc} ADC
 * Note: ${activeProfile.note}
 */

#include <DHT.h>

#define DHTPIN 2
#define DHTTYPE DHT22
#define PIN_SOIL A0
#define PIN_LDR A1
#define PIN_WATER A2
#define PIN_PH A3
#define PIN_PUMP 7

// ================= CROP PROFILE SELECTOR =================
// Uncomment the crop profile you wish to deploy:
#define ${cropMacro}  // Active: ${activeProfile.name}
// #define CROP_GENERAL
// #define CROP_RICE
// #define CROP_SUGARCANE
// #define CROP_WHEAT
// #define CROP_COTTON
// #define CROP_TOMATO
// #define CROP_BAJRA

#if defined(CROP_RICE)
  const char* ACTIVE_CROP = "Rice (Paddy)";
  const int ON_BELOW_ADC = 365;   // 80% moisture (Flooded paddy)
  const int OFF_ABOVE_ADC = 241;  // 95% moisture
#elif defined(CROP_SUGARCANE)
  const char* ACTIVE_CROP = "Sugarcane";
  const int ON_BELOW_ADC = 488;   // 65% moisture
  const int OFF_ABOVE_ADC = 365;  // 80% moisture
#elif defined(CROP_WHEAT)
  const char* ACTIVE_CROP = "Wheat";
  const int ON_BELOW_ADC = 653;   // 45% moisture (Dislikes wet feet)
  const int OFF_ABOVE_ADC = 529;  // 60% moisture
#elif defined(CROP_COTTON)
  const char* ACTIVE_CROP = "Cotton";
  const int ON_BELOW_ADC = 694;   // 40% moisture
  const int OFF_ABOVE_ADC = 570;  // 55% moisture
#elif defined(CROP_TOMATO)
  const char* ACTIVE_CROP = "Tomato";
  const int ON_BELOW_ADC = 570;   // 55% moisture
  const int OFF_ABOVE_ADC = 447;  // 70% moisture
#elif defined(CROP_BAJRA)
  const char* ACTIVE_CROP = "Bajra";
  const int ON_BELOW_ADC = 776;   // 30% moisture (Drought hardy)
  const int OFF_ABOVE_ADC = 653;  // 45% moisture
#else
  // Active Crop: ${activeProfile.name}
  const char* ACTIVE_CROP = "${activeProfile.name}";
  const int ON_BELOW_ADC = ${onAdc};   // Pump ON threshold (${onPct}% moisture)
  const int OFF_ABOVE_ADC = ${offAdc};  // Pump OFF threshold (${offPct}% moisture)
#endif

// Safety & Alarm Limits
const float TEMP_ALERT_C = ${settings.highTempThresholdC}.0;
const int WATER_LOW_THRESHOLD = ${settings.lowWaterThresholdAdc};

DHT dht(DHTPIN, DHTTYPE);
bool pumpState = false;

void setup() {
  Serial.begin(9600);
  pinMode(PIN_PUMP, OUTPUT);
  digitalWrite(PIN_PUMP, LOW); // Relay off initially
  dht.begin();
  
  Serial.println(F("=========================================="));
  Serial.println(F("Crop Advisor IoT Firmware Initialized"));
  Serial.print(F("Profile: ")); Serial.println(ACTIVE_CROP);
  Serial.print(F("Thresholds: ON below ADC ")); Serial.print(ON_BELOW_ADC);
  Serial.print(F(" | OFF above ADC ")); Serial.println(OFF_ABOVE_ADC);
  Serial.println(F("=========================================="));
}

void loop() {
  // 1. Read Analog Sensors
  int soilAdc = analogRead(PIN_SOIL);
  int lightAdc = analogRead(PIN_LDR);
  int waterAdc = analogRead(PIN_WATER);
  int phAdc = analogRead(PIN_PH);

  // Calibration formula: pct = (1023 - adc) / (1023 - 200) * 100
  float soilPct = constrain(((1023.0 - soilAdc) / (1023.0 - 200.0)) * 100.0, 0.0, 100.0);
  float phVal = constrain(map(phAdc, 0, 1023, 30, 100) / 10.0, 3.0, 10.0);

  // 2. Read Digital DHT22 Sensor
  float tempC = dht.readTemperature();
  float humidity = dht.readHumidity();

  if (isnan(tempC) || isnan(humidity)) {
    Serial.println(F("ERROR: DHT22 read failure"));
    delay(2000);
    return;
  }

  // 3. Firmware Control Logic (Crop-Aware Hysteresis & Tank Safety)
  // Note: Higher ADC means drier soil
  if (soilAdc > ON_BELOW_ADC) {
    if (waterAdc < WATER_LOW_THRESHOLD) {
      pumpState = false; // Dry-run protection
    } else {
      pumpState = true;  // Activate irrigation pump
    }
  } else if (soilAdc < OFF_ABOVE_ADC) {
    pumpState = false;   // Stop pump once upper target reached
  }
  
  digitalWrite(PIN_PUMP, pumpState ? HIGH : LOW);

  // 4. Telemetry Frame Output (9600 Baud Serial Stream)
  Serial.print(F("[")); Serial.print(ACTIVE_CROP); Serial.print(F("] "));
  Serial.print(F("SOIL_ADC=")); Serial.print(soilAdc);
  Serial.print(F(" (")); Serial.print(soilPct, 1); Serial.print(F("%)"));
  Serial.print(F(" | TEMP=")); Serial.print(tempC, 1); Serial.print(F("C"));
  Serial.print(F(" | HUM=")); Serial.print(humidity, 1); Serial.print(F("%"));
  Serial.print(F(" | WATER=")); Serial.print(waterAdc);
  Serial.print(F(" | PUMP=")); Serial.print(pumpState ? F("ON") : F("OFF"));

  if (soilAdc > ON_BELOW_ADC) Serial.print(F(" [ALERT: Dry soil for crop]"));
  if (tempC > TEMP_ALERT_C) Serial.print(F(" [ALERT: High temperature]"));
  if (waterAdc < WATER_LOW_THRESHOLD) Serial.print(F(" [ALERT: Low water tank]"));
  Serial.println();

  delay(2000); // 2-second sampling interval
}
`;
}
