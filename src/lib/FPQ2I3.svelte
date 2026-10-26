<script lang="ts">
  import type { TVitalSign } from "../types";

  type Props = {
    vitalsigns?: TVitalSign[];
    width?: number;
    height?: number;
  };

  let { vitalsigns = [], width = 500, height = 220 }: Props = $props();

  function average(values: Array<number | null>): number | null {
    const validValues = values.filter((value): value is number => value !== null);
    if (validValues.length === 0) return null;

    return validValues.reduce((total, value) => total + value, 0) / validValues.length;
  }

  const averageHeartRate = $derived(average(vitalsigns.map((record) => record.heartrate)));
  const averageOxygenSaturation = $derived(average(vitalsigns.map((record) => record.o2sat)));
  const averageTemperature = $derived(average(vitalsigns.map((record) => record.temperature)));

  function formatValue(value: number | null): string {
    return value === null ? "—" : value.toFixed(1);
  }
</script>

<section class="chart" style={`width: ${width}px; min-height: ${height}px`}>
  <h3>Average Vital Signs</h3>
  <div class="summary">
    <div>
      <strong>{formatValue(averageHeartRate)}</strong>
      <span>heart rate</span>
    </div>
    <div>
      <strong>{formatValue(averageOxygenSaturation)}</strong>
      <span>oxygen saturation</span>
    </div>
    <div>
      <strong>{formatValue(averageTemperature)}</strong>
      <span>temperature</span>
    </div>
  </div>
</section>

<style>
  .chart {
    box-sizing: border-box;
    padding: 16px;
    border: 1px solid #d0d7de;
    border-radius: 8px;
    font-family: Arial, Helvetica, sans-serif;
  }

  h3 {
    margin: 0 0 16px;
  }

  .summary {
    display: flex;
    gap: 12px;
  }

  .summary div {
    display: grid;
    gap: 4px;
    min-width: 120px;
    padding: 12px;
    background: #f6f8fa;
    border-radius: 6px;
  }

  strong {
    font-size: 1.35rem;
  }

  span {
    color: #57606a;
    font-size: 0.8rem;
  }
</style>
