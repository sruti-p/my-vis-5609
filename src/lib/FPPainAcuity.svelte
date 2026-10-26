<script lang="ts">
  import type { TTriage } from "../types";

  type Props = {
    cardiacTriage?: TTriage[];
    allTriage?: TTriage[];
    width?: number;
    height?: number;
  };

  type PainSummary = {
    acuity: number;
    isCardiac: boolean;
    averagePain: number;
    recordCount: number;
    subjectCount: number;
  };

  let {
    cardiacTriage = [],
    allTriage = [],
    width = 720,
    height = 460
  }: Props = $props();

  const margin = { top: 24, right: 24, bottom: 58, left: 58 };
  const plotWidth = $derived(width - margin.left - margin.right);
  const plotHeight = $derived(height - margin.top - margin.bottom);

  const cardiacSubjectIds = $derived(new Set(cardiacTriage.map((record) => record.subject_id)));
  const records = $derived(
    allTriage
      .filter(
        (record) =>
          record.pain !== null &&
          record.acuity !== null &&
          Number.isFinite(record.pain) &&
          Number.isFinite(record.acuity)
      )
      .map((record) => ({
        ...record,
        isCardiac: cardiacSubjectIds.has(record.subject_id)
      }))
  );

  const acuities = $derived(
    Array.from(new Set(records.map((record) => record.acuity as number))).sort((a, b) => a - b)
  );
  const painTicks = [0, 2, 4, 6, 8, 10];
  const groupWidth = $derived(plotWidth / Math.max(acuities.length, 1));
  const barWidth = $derived(Math.max(Math.min(groupWidth / 2 - 6, 48), 12));

  const painSummaries = $derived(
    acuities.flatMap((acuity) =>
      [true, false].map((isCardiac): PainSummary => {
        const matchingRecords = records.filter(
          (record) => record.acuity === acuity && record.isCardiac === isCardiac
        );
        const subjectCount = new Set(matchingRecords.map((record) => record.subject_id)).size;
        const averagePain =
          matchingRecords.reduce((total, record) => total + (record.pain as number), 0) /
          matchingRecords.length;

        return {
          acuity,
          isCardiac,
          averagePain: matchingRecords.length > 0 ? averagePain : 0,
          recordCount: matchingRecords.length,
          subjectCount
        };
      })
    )
  );

  function xPosition(acuity: number, isCardiac: boolean): number {
    const index = acuities.indexOf(acuity);
    const groupStart = margin.left + index * groupWidth;
    return groupStart + groupWidth / 2 + (isCardiac ? -barWidth - 2 : 2);
  }

  function yPosition(pain: number): number {
    return margin.top + plotHeight - (pain / 10) * plotHeight;
  }
</script>

<section class="figure" style={`width: ${width}px`}>
  <h3>Pain Versus Triage Acuity by Subject</h3>

  {#if records.length > 0}
    <svg {width} {height} role="img" aria-label="Average pain versus triage acuity by subject group">
      <g class="grid">
        {#each painTicks as pain}
          <line
            x1={margin.left}
            x2={width - margin.right}
            y1={yPosition(pain)}
            y2={yPosition(pain)}
          />
        {/each}
      </g>

      <g class="axes">
        <line
          x1={margin.left}
          x2={width - margin.right}
          y1={height - margin.bottom}
          y2={height - margin.bottom}
        />
        <line
          x1={margin.left}
          x2={margin.left}
          y1={margin.top}
          y2={height - margin.bottom}
        />
      </g>

      {#each painTicks as pain}
        <text x={margin.left - 10} y={yPosition(pain) + 4} text-anchor="end">{pain}</text>
      {/each}

      {#each acuities as acuity}
        <text
          x={margin.left + acuities.indexOf(acuity) * groupWidth + groupWidth / 2}
          y={height - margin.bottom + 22}
          text-anchor="middle"
        >
          {acuity}
        </text>
      {/each}

      <text
        class="axis-label"
        x={margin.left + plotWidth / 2}
        y={height - 8}
        text-anchor="middle"
      >
        Triage acuity
      </text>
      <text
        class="axis-label"
        transform={`translate(15, ${margin.top + plotHeight / 2}) rotate(-90)`}
        text-anchor="middle"
      >
        Average pain score
      </text>

      {#each painSummaries as summary}
        <rect
          x={xPosition(summary.acuity, summary.isCardiac)}
          y={yPosition(summary.averagePain)}
          width={barWidth}
          height={height - margin.bottom - yPosition(summary.averagePain)}
          fill={summary.isCardiac ? "#000000" : "#ffffff"}
          stroke="#000000"
          stroke-width="1"
          rx="2"
        >
          <title>
            {summary.isCardiac ? "Cardiac subset" : "Not in cardiac subset"} · Acuity
            {summary.acuity} · Average pain {summary.averagePain.toFixed(1)} ·
            {summary.subjectCount} subjects · {summary.recordCount} records
          </title>
        </rect>
      {/each}
    </svg>

    <div class="legend" aria-label="Subject group legend">
      <span><i class="cardiac"></i> Cardiac subset</span>
      <span><i class="other"></i> Not in cardiac subset</span>
    </div>
  {:else}
    <p>No triage records with both pain and acuity values are loaded.</p>
  {/if}
</section>

<style>
  .figure {
    font-family: Arial, Helvetica, sans-serif;
  }

  h3 {
    margin: 0 0 8px;
  }

  svg {
    max-width: 100%;
    overflow: visible;
  }

  .grid line {
    stroke: #e5e7eb;
    stroke-dasharray: 3 3;
  }

  .axes line {
    stroke: #57606a;
  }

  text {
    fill: #24292f;
    font-size: 12px;
  }

  .axis-label {
    font-size: 13px;
    font-weight: 600;
  }

  .legend {
    display: flex;
    gap: 18px;
    margin-left: 58px;
    font-size: 0.85rem;
  }

  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .legend i {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .cardiac {
    background: #000000;
  }

  .other {
    background: #ffffff;
    border: 1px solid #000000;
  }

  p {
    color: #57606a;
  }
</style>
