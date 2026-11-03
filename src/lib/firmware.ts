/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Crop Advisor Firmware Engine
 * Emulates the Arduino UNO firmware logic with hysteresis control and closed-loop environmental feedback.
 */

import { SimulationSettings, SensorReading, Source } from '../types';
import { soilAdcToPct, clamp } from './units';

export const DEFAULT_SETTINGS: SimulationSettings = {
  pumpOnThresholdAdc: 500,
  pumpOffThresholdAdc: 450,
  highTempThresholdC: 35,
  lowWaterThresholdAdc: 200,
  realisticNoise: true,
  autoLog: true,
  speed: 1,
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
}

/**
 * Computes firmware decision and alert strings based on current thresholds and override mode.
 */
export function evaluateFirmwareRules(
  currentPumpState: boolean,
  soilAdc: number,
  tempC: number,
  waterAdc: number,
  overrideMode: 'auto' | 'on' | 'off',
  settings: SimulationSettings
): { pumpOn: boolean; alerts: string[]; caption: string } {
  let newPumpState = currentPumpState;
  const alerts: string[] = [];

  // Check conditions
  if (soilAdc > settings.pumpOnThresholdAdc) {
    alerts.push('Soil is dry');
  }
  if (tempC > settings.highTempThresholdC) {
    alerts.push('High temperature');
  }
  if (waterAdc < settings.lowWaterThresholdAdc) {
    alerts.push('Low water tank');
  }

  // Evaluate pump hysteresis in AUTO mode
  if (overrideMode === 'auto') {
    if (soilAdc > settings.pumpOnThresholdAdc) {
      // Turn pump on when dry, unless water tank is empty
      if (waterAdc < settings.lowWaterThresholdAdc) {
        newPumpState = false;
        alerts.push('Pump blocked: water tank low');
      } else {
        newPumpState = true;
      }
    } else if (soilAdc < settings.pumpOffThresholdAdc) {
      // Hysteresis cutoff when soil is sufficiently hydrated
      newPumpState = false;
    }
    // If between pumpOffThresholdAdc and pumpOnThresholdAdc, state remains unchanged (hysteresis)
  } else if (overrideMode === 'on') {
    newPumpState = true;
  } else if (overrideMode === 'off') {
    newPumpState = false;
  }

  // Construct plain-English descriptive caption
  let caption = '';
  if (overrideMode === 'on') {
    caption = `Pump is manually FORCED ON (Soil ADC ${Math.round(soilAdc)}).`;
  } else if (overrideMode === 'off') {
    caption = `Pump is manually FORCED OFF (Soil ADC ${Math.round(soilAdc)}).`;
  } else if (newPumpState) {
    caption = `Soil is dry (ADC ${Math.round(soilAdc)} > ${settings.pumpOnThresholdAdc}), so the pump is ON.`;
  } else if (waterAdc < settings.lowWaterThresholdAdc) {
    caption = `Pump is OFF: Water tank level low (ADC ${Math.round(waterAdc)} < ${settings.lowWaterThresholdAdc}).`;
  } else if (soilAdc < settings.pumpOffThresholdAdc) {
    caption = `Soil is well watered (ADC ${Math.round(soilAdc)} < ${settings.pumpOffThresholdAdc}), pump is OFF (hysteresis standby).`;
  } else {
    caption = `Soil moisture is within optimal deadband (ADC ${Math.round(soilAdc)}), pump remains OFF.`;
  }

  return { pumpOn: newPumpState, alerts, caption };
}

/**
 * Closed loop simulation tick calculation:
 * - Pump ON: soil ADC drops by ~15 (soil gets wetter), water ADC drops by ~8 (tank drains)
 * - Pump OFF: soil ADC rises by ~5 (soil gradually dries out)
 * - Noise: ±2% variation if enabled
 */
export function simulateTickPhysics(
  state: SimulatorState,
  settings: SimulationSettings
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
} {
  let { soilAdc, tempC, humidity, lightAdc, waterAdc, ph, pumpOn, overrideMode } = state;

  // Closed loop physical drift
  if (pumpOn) {
    // Soil gets wet: ADC decreases
    soilAdc -= 15 + (Math.random() * 4 - 2);
    // Water tank drains
    waterAdc -= 8 + (Math.random() * 2 - 1);
  } else {
    // Soil dries out naturally over time
    soilAdc += 5 + (Math.random() * 2 - 1);
    // Water tank stays roughly steady or slight evaporation
    waterAdc -= 0.5;
  }

  // Clamping to realistic physical boundaries
  soilAdc = clamp(soilAdc, 200, 1023);
  waterAdc = clamp(waterAdc, 50, 1023);

  // Apply optional realistic sensor noise (+-2%)
  let displaySoilAdc = soilAdc;
  let displayTempC = tempC;
  let displayHumidity = humidity;
  let displayLightAdc = lightAdc;
  let displayWaterAdc = waterAdc;

  if (settings.realisticNoise) {
    displaySoilAdc = clamp(soilAdc * (1 + (Math.random() * 0.04 - 0.02)), 0, 1023);
    displayTempC = clamp(tempC + (Math.random() * 0.4 - 0.2), -10, 60);
    displayHumidity = clamp(humidity + (Math.random() * 1.0 - 0.5), 10, 100);
    displayLightAdc = clamp(lightAdc + (Math.random() * 10 - 5), 0, 1023);
    displayWaterAdc = clamp(waterAdc * (1 + (Math.random() * 0.02 - 0.01)), 0, 1023);
  }

  // Evaluate firmware rules
  const { pumpOn: evaluatedPump, alerts, caption } = evaluateFirmwareRules(
    pumpOn,
    displaySoilAdc,
    displayTempC,
    displayWaterAdc,
    overrideMode,
    settings
  );

  return {
    newSoilAdc: Math.round(displaySoilAdc),
    newTempC: Number(displayTempC.toFixed(1)),
    newHumidity: Number(displayHumidity.toFixed(1)),
    newLightAdc: Math.round(displayLightAdc),
    newWaterAdc: Math.round(displayWaterAdc),
    newPh: Number(ph.toFixed(1)),
    newPumpOn: evaluatedPump,
    alerts,
    caption
  };
}

/**
 * Creates a SensorReading object from simulator values
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
  source: Source = 'simulated'
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
    alerts
  };
}

/**
 * Formats a farmer-friendly telemetry update
 */
export function formatSerialFrame(reading: SensorReading, tick: number): string {
  const time = new Date(reading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const status = reading.soilMoisturePct > 70 ? 'Moist / Wet' : reading.soilMoisturePct >= 35 ? 'Optimal' : 'Dry (Needs Water)';
  const tankPct = Math.round((reading.waterLevelAdc / 1023) * 100);

  if (reading.alerts.length > 0 && reading.pumpOn) {
    return `[${time}] ⚠️ ${reading.alerts.join(' & ')} · Soil is ${reading.soilMoisturePct}% · Pump is currently watering the field.`;
  }
  if (reading.alerts.length > 0) {
    return `[${time}] ⚠️ ALERT: ${reading.alerts.join(' & ')} · Soil is ${reading.soilMoisturePct}% (${status}).`;
  }
  if (reading.pumpOn) {
    return `[${time}] 💧 Pump is ON: Irrigating field · Soil moisture is ${reading.soilMoisturePct}% · Water tank at ${tankPct}%.`;
  }
  return `[${time}] Field status normal: Soil is ${status} (${reading.soilMoisturePct}%) · Air ${reading.tempC}°C, ${reading.humidityPct}% humidity · Pump: OFF.`;
}

/**
 * Generates the clean Arduino C++ (.ino) code using the active settings
 */
export function generateArduinoInoCode(settings: SimulationSettings): string {
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
 */

#include <DHT.h>

#define DHTPIN 2
#define DHTTYPE DHT22
#define PIN_SOIL A0
#define PIN_LDR A1
#define PIN_WATER A2
#define PIN_PH A3
#define PIN_PUMP 7

// Calibrated Hysteresis Thresholds
const int SOIL_DRY_THRESHOLD = ${settings.pumpOnThresholdAdc};   // Pump ON threshold (ADC)
const int SOIL_WET_THRESHOLD = ${settings.pumpOffThresholdAdc};   // Pump OFF hysteresis threshold (ADC)
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
  Serial.println(F("Hysteresis: ON > 500 ADC | OFF < 450 ADC"));
  Serial.println(F("=========================================="));
}

void loop() {
  // 1. Read Analog Sensors
  int soilAdc = analogRead(PIN_SOIL);
  int lightAdc = analogRead(PIN_LDR);
  int waterAdc = analogRead(PIN_WATER);
  int phAdc = analogRead(PIN_PH);

  // Convert soil ADC to percentage: (1023 - adc) / (1023 - 200) * 100
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

  // 3. Firmware Control Logic (Hysteresis & Tank Safety)
  if (soilAdc > SOIL_DRY_THRESHOLD) {
    if (waterAdc < WATER_LOW_THRESHOLD) {
      pumpState = false; // Dry-run protection
    } else {
      pumpState = true;  // Activate irrigation pump
    }
  } else if (soilAdc < SOIL_WET_THRESHOLD) {
    pumpState = false;   // Stop pump once well watered
  }
  
  digitalWrite(PIN_PUMP, pumpState ? HIGH : LOW);

  // 4. Telemetry Frame Output (9600 Baud Serial Stream)
  Serial.print(F("SOIL_ADC=")); Serial.print(soilAdc);
  Serial.print(F(" (")); Serial.print(soilPct, 1); Serial.print(F("%)"));
  Serial.print(F(" | TEMP=")); Serial.print(tempC, 1); Serial.print(F("C"));
  Serial.print(F(" | HUM=")); Serial.print(humidity, 1); Serial.print(F("%"));
  Serial.print(F(" | LIGHT=")); Serial.print(lightAdc);
  Serial.print(F(" | WATER=")); Serial.print(waterAdc);
  Serial.print(F(" | PUMP=")); Serial.print(pumpState ? F("ON") : F("OFF"));

  if (soilAdc > SOIL_DRY_THRESHOLD) Serial.print(F(" [ALERT: Soil is dry]"));
  if (tempC > TEMP_ALERT_C) Serial.print(F(" [ALERT: High temperature]"));
  if (waterAdc < WATER_LOW_THRESHOLD) Serial.print(F(" [ALERT: Low water tank]"));
  Serial.println();

  delay(2000); // 2-second sampling interval
}
`;
}
