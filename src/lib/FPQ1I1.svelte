<script lang="ts">
  import type { TTriage } from "../types";

  type Props = {
    triage?: TTriage[];
    width?: number;
    height?: number;
  };

  let { triage = [], width = 500, height = 220 }: Props = $props();

  const acuityCounts = $derived(
    Array.from(
      triage.reduce((counts, record) => {
        if (record.acuity !== null) {
          counts.set(record.acuity, (counts.get(record.acuity) ?? 0) + 1);
        }
        return counts;
      }, new Map<number, number>())
    ).sort(([first], [second]) => first - second)
  );

  const maxCount = $derived(Math.max(...acuityCounts.map(([, count]) => count), 1));
</script>

<section class="chart" style={`width: ${width}px`}>
  <h3>Triage Acuity</h3>
  {#if acuityCounts.length > 0}
    <svg {width} {height} role="img" aria-label="Triage acuity distribution">
      {#each acuityCounts as [acuity, count], index}
        {@const barWidth = Math.max(width / acuityCounts.length - 16, 20)}
        {@const barHeight = (count / maxCount) * (height - 60)}
        {@const x = index * (width / acuityCounts.length) + 8}
        {@const y = height - barHeight - 30}
        <rect x={x} y={y} width={barWidth} height={barHeight} fill="#449900" rx="3" />
        <text x={x + barWidth / 2} y={y - 6} text-anchor="middle">{count}</text>
        <text x={x + barWidth / 2} y={height - 10} text-anchor="middle">{acuity}</text>
      {/each}
    </svg>
  {:else}
    <p>No triage records loaded.</p>
  {/if}
</section>

<style>
  .chart {
    font-family: Arial, Helvetica, sans-serif;
  }

  h3 {
    margin: 0 0 8px;
  }

  svg {
    max-width: 100%;
    overflow: visible;
  }

  text {
    font-size: 12px;
  }

  p {
    color: #57606a;
  }
</style>
