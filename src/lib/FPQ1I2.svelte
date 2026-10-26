<script lang="ts">
  import type { TDiagnosis } from "../types";

  type Props = {
    diagnoses?: TDiagnosis[];
    width?: number;
    height?: number;
  };

  let { diagnoses = [], width = 500, height = 220 }: Props = $props();

  const diagnosisCounts = $derived(
    Array.from(
      diagnoses.reduce((counts, diagnosis) => {
        counts.set(diagnosis.icd_title, (counts.get(diagnosis.icd_title) ?? 0) + 1);
        return counts;
      }, new Map<string, number>())
    )
      .sort(([, first], [, second]) => second - first)
      .slice(0, 8)
  );

  const maxCount = $derived(Math.max(...diagnosisCounts.map(([, count]) => count), 1));
</script>

<section class="chart" style={`width: ${width}px`}>
  <h3>Most Common Diagnoses</h3>
  {#if diagnosisCounts.length > 0}
    <svg {width} {height} role="img" aria-label="Most common diagnoses">
      {#each diagnosisCounts as [title, count], index}
        {@const barHeight = Math.max((count / maxCount) * 22, 2)}
        {@const y = index * 24 + 4}
        <text x="0" y={y + 15} class="label">{title}</text>
        <rect
          x={width * 0.55}
          y={y}
          width={(count / maxCount) * (width * 0.35)}
          height={barHeight}
          fill="#449900"
          rx="3"
        />
        <text x={width * 0.92} y={y + 15} text-anchor="end">{count}</text>
      {/each}
    </svg>
  {:else}
    <p>No diagnosis records loaded.</p>
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
    font-size: 11px;
  }

  .label {
    max-width: 50%;
  }

  p {
    color: #57606a;
  }
</style>
