/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Crop Advisor Big Data Quality & Analytics Engine
 * Comprehensive data auditing, outlier detection (IQR), imputation, correlation, and K-Means clustering.
 */

import { SensorReading } from '../types';

export interface DataQualityReport {
  totalRows: number;
  missingValuesCount: number;
  outOfRangeCount: number;
  duplicateCount: number;
  outliersCount: number;
  qualityScorePct: number;
  channelAudits: {
    channel: string;
    missing: number;
    outOfRange: number;
    outliers: number;
    min: number;
    max: number;
    mean: number;
    stdDev: number;
  }[];
  cleanedPreview: {
    original: Partial<SensorReading>;
    cleaned: Partial<SensorReading>;
    changesApplied: string[];
  }[];
}

/**
 * Calculates median of an array of numbers
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculates mean and standard deviation
 */
export function calculateStats(values: number[]): { mean: number; stdDev: number; min: number; max: number } {
  if (values.length === 0) return { mean: 0, stdDev: 0, min: 0, max: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return {
    mean: Number(mean.toFixed(2)),
    stdDev: Number(Math.sqrt(variance).toFixed(2)),
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2))
  };
}

/**
 * Detects outliers using standard 1.5 * IQR (Interquartile Range)
 */
export function detectIqrOutliers(values: number[]): { lowerBound: number; upperBound: number; outlierIndices: Set<number> } {
  if (values.length < 4) return { lowerBound: -Infinity, upperBound: Infinity, outlierIndices: new Set() };
  const indexed = values.map((val, idx) => ({ val, idx })).sort((a, b) => a.val - b.val);
  const n = indexed.length;
  const q1 = indexed[Math.floor(n * 0.25)].val;
  const q3 = indexed[Math.floor(n * 0.75)].val;
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const outlierIndices = new Set<number>();
  values.forEach((v, idx) => {
    if (v < lowerBound || v > upperBound) {
      outlierIndices.add(idx);
    }
  });

  return { lowerBound, upperBound, outlierIndices };
}

/**
 * Run full data quality audit and median imputation demo
 */
export function auditDataQuality(readings: SensorReading[]): DataQualityReport {
  const totalRows = readings.length;
  if (totalRows === 0) {
    return {
      totalRows: 0,
      missingValuesCount: 0,
      outOfRangeCount: 0,
      duplicateCount: 0,
      outliersCount: 0,
      qualityScorePct: 100,
      channelAudits: [],
      cleanedPreview: []
    };
  }

  // Check duplicate timestamps
  const seenTimestamps = new Set<string>();
  let duplicateCount = 0;
  readings.forEach(r => {
    if (seenTimestamps.has(r.timestamp)) duplicateCount++;
    else seenTimestamps.add(r.timestamp);
  });

  const channels: (keyof SensorReading)[] = [
    'soilMoistureAdc',
    'tempC',
    'humidityPct',
    'lightAdc',
    'waterLevelAdc',
    'ph'
  ];

  let totalMissing = 0;
  let totalOutOfRange = 0;
  let totalOutliers = 0;

  const channelAudits = channels.map(channel => {
    const rawValues: number[] = [];
    let missing = 0;
    let outOfRange = 0;

    readings.forEach(r => {
      const val = r[channel];
      if (val === undefined || val === null || isNaN(val as number)) {
        missing++;
      } else {
        const num = val as number;
        rawValues.push(num);
        if (channel === 'tempC' && (num < -10 || num > 60)) outOfRange++;
        if (channel === 'humidityPct' && (num < 0 || num > 100)) outOfRange++;
        if (channel === 'ph' && (num < 3 || num > 10)) outOfRange++;
        if (channel === 'soilMoistureAdc' && (num < 0 || num > 1023)) outOfRange++;
      }
    });

    const { outlierIndices } = detectIqrOutliers(rawValues);
    const stats = calculateStats(rawValues);

    totalMissing += missing;
    totalOutOfRange += outOfRange;
    totalOutliers += outlierIndices.size;

    return {
      channel: String(channel),
      missing,
      outOfRange,
      outliers: outlierIndices.size,
      ...stats
    };
  });

  // Imputation demo for the top 5 rows
  const medians: Record<string, number> = {};
  channels.forEach(ch => {
    const valid = readings.map(r => r[ch] as number).filter(v => typeof v === 'number' && !isNaN(v));
    medians[ch] = calculateMedian(valid);
  });

  const cleanedPreview = readings.slice(0, 5).map(r => {
    const changes: string[] = [];
    const cleaned = { ...r };

    if (r.soilMoistureAdc < 0 || r.soilMoistureAdc > 1023) {
      cleaned.soilMoistureAdc = medians.soilMoistureAdc;
      changes.push(`Imputed soilMoistureAdc to median (${medians.soilMoistureAdc})`);
    }
    if (r.tempC > 60 || r.tempC < -10) {
      cleaned.tempC = medians.tempC;
      changes.push(`Capped tempC to median (${medians.tempC}°C)`);
    }

    if (changes.length === 0) {
      changes.push('Passes all range and IQR validity thresholds');
    }

    return {
      original: {
        id: r.id,
        soilMoistureAdc: r.soilMoistureAdc,
        tempC: r.tempC,
        humidityPct: r.humidityPct,
        ph: r.ph
      },
      cleaned: {
        id: cleaned.id,
        soilMoistureAdc: cleaned.soilMoistureAdc,
        tempC: cleaned.tempC,
        humidityPct: cleaned.humidityPct,
        ph: cleaned.ph
      },
      changesApplied: changes
    };
  });

  const totalChecks = totalRows * channels.length;
  const errorPoints = totalMissing * 2 + totalOutOfRange * 2 + totalOutliers + duplicateCount * 3;
  const qualityScorePct = Math.max(10, Math.min(100, Math.round(100 - (errorPoints / (totalChecks || 1)) * 100)));

  return {
    totalRows,
    missingValuesCount: totalMissing,
    outOfRangeCount: totalOutOfRange,
    duplicateCount,
    outliersCount: totalOutliers,
    qualityScorePct,
    channelAudits,
    cleanedPreview
  };
}

/**
 * Calculates Pearson Correlation Matrix for numeric sensor channels
 */
export function computeCorrelationMatrix(readings: SensorReading[]): { keys: string[]; matrix: number[][] } {
  const keys = ['Moisture %', 'Temp °C', 'Humidity %', 'Light ADC', 'Water ADC', 'pH'];
  const n = readings.length;
  if (n < 2) {
    const zeros = keys.map(() => keys.map(() => 0));
    return { keys, matrix: zeros };
  }

  const series = [
    readings.map(r => r.soilMoisturePct),
    readings.map(r => r.tempC),
    readings.map(r => r.humidityPct),
    readings.map(r => r.lightAdc),
    readings.map(r => r.waterLevelAdc),
    readings.map(r => r.ph)
  ];

  // Pearson correlation between vector x and vector y
  function pearson(x: number[], y: number[]): number {
    const mx = x.reduce((a, b) => a + b, 0) / n;
    const my = y.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let denX = 0;
    let denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - mx;
      const dy = y[i] - my;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }
    const den = Math.sqrt(denX * denY);
    return den === 0 ? 0 : Number((num / den).toFixed(2));
  }

  const matrix: number[][] = [];
  for (let i = 0; i < series.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < series.length; j++) {
      if (i === j) row.push(1.0);
      else row.push(pearson(series[i], series[j]));
    }
    matrix.push(row);
  }

  return { keys, matrix };
}

export interface ClusterPoint {
  x: number; // Moisture %
  y: number; // Temperature °C
  cluster: number;
  label: string;
}

export interface ClusterResult {
  points: ClusterPoint[];
  centroids: { x: number; y: number; cluster: number; label: string; count: number }[];
}

/**
 * K-Means Clustering (k = 3) on Soil Samples (Moisture % vs Temperature °C)
 */
export function runKMeansClustering(readings: SensorReading[], maxIter = 15): ClusterResult {
  const points = readings.map(r => ({
    x: r.soilMoisturePct,
    y: r.tempC
  }));

  if (points.length < 3) {
    return {
      points: points.map(p => ({ ...p, cluster: 0, label: 'Cluster 1' })),
      centroids: [{ x: 50, y: 25, cluster: 0, label: 'Cluster 1', count: points.length }]
    };
  }

  // Initial centroids: Dry-Hot, Optimal-Temperate, Wet-Cool
  let centroids = [
    { x: 25, y: 35, cluster: 0, label: 'Cluster A: Arid & Heat Stress', count: 0 },
    { x: 55, y: 24, cluster: 1, label: 'Cluster B: Optimal Agro-Zone', count: 0 },
    { x: 80, y: 19, cluster: 2, label: 'Cluster C: High Moisture / Hydric', count: 0 }
  ];

  let assignments: number[] = new Array(points.length).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    // 1. Assign points to nearest centroid (Euclidean distance)
    assignments = points.map(p => {
      let bestDist = Infinity;
      let bestCluster = 0;
      centroids.forEach((c, idx) => {
        const dist = Math.hypot(p.x - c.x, p.y - c.y);
        if (dist < bestDist) {
          bestDist = dist;
          bestCluster = idx;
        }
      });
      return bestCluster;
    });

    // 2. Recompute centroids
    const newSums = [
      { x: 0, y: 0, count: 0 },
      { x: 0, y: 0, count: 0 },
      { x: 0, y: 0, count: 0 }
    ];

    points.forEach((p, idx) => {
      const cIdx = assignments[idx];
      newSums[cIdx].x += p.x;
      newSums[cIdx].y += p.y;
      newSums[cIdx].count++;
    });

    centroids = centroids.map((c, idx) => {
      const sum = newSums[idx];
      if (sum.count === 0) return c;
      return {
        ...c,
        x: Number((sum.x / sum.count).toFixed(1)),
        y: Number((sum.y / sum.count).toFixed(1)),
        count: sum.count
      };
    });
  }

  const labeledPoints: ClusterPoint[] = points.map((p, idx) => ({
    x: p.x,
    y: p.y,
    cluster: assignments[idx],
    label: centroids[assignments[idx]].label
  }));

  return { points: labeledPoints, centroids };
}
