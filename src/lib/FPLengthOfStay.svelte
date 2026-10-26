<script lang="ts">
  import type { TEdStay } from "../types";

  type Props = {
    cardiacEdstays?: TEdStay[];
    allEdstays?: TEdStay[];
    width?: number;
    height?: number;
  };

  type StayBin = {
    label: string;
    count: number;
    percentage: number;
  };

  type StayGroup = {
    label: string;
    bins: StayBin[];
    subjectCount: number;
    isCardiac: boolean;
  };

  let {
    cardiacEdstays = [],
    allEdstays = [],
    width = 760,
    height = 380
  }: Props = $props();

  const margin = { top: 24, right: 16, bottom: 72, left: 58 };
  const chartGap = 24;
  const plotWidth = $derived(width - margin.left - margin.right);
  const plotHeight = $derived(height - margin.top - margin.bottom);
  const cardiacSubjectIds = $derived(
    new Set(cardiacEdstays.map((stay) => stay.subject_id))
  );
  const binEdges = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, Infinity];
  const binLabels = [
    "0–2",
    "2–4",
    "4–6",
    "6–8",
    "8–10",
    "10–12",
    "12–14",
    "14–16",
    "16–18",
    "18–20",
    "20–22",
    "22–24",
    "24+"
  ];
  const groupWidth = $derived(plotWidth / binLabels.length);
  const barWidth = $derived(Math.max(groupWidth / 2 - 6, 8));

  function stayLengthHours(stay: TEdStay): number {
    return (stay.outtime.getTime() - stay.intime.getTime()) / (1000 * 60 * 60);
  }

  function makeBins(stays: TEdStay[]): StayBin[] {
    const counts = Array.from({ length: binLabels.length }, () => 0);
    const validStays = stays.filter((stay) => Number.isFinite(stayLengthHours(stay)));

    for (const stay of validStays) {
      const duration = stayLengthHours(stay);
      const binIndex = binEdges.findIndex(
        (edge, index) => duration >= edge && duration < (binEdges[index + 1] ?? Infinity)
      );
      if (binIndex >= 0) counts[binIndex] += 1;
    }

    return counts.map((count, index) => ({
      label: binLabels[index],
      count,
      percentage: validStays.length === 0 ? 0 : (count / validStays.length) * 100
    }));
  }

  const cardiacStays = $derived(
    allEdstays.filter((stay) => cardiacSubjectIds.has(stay.subject_id))
  );
  const nonCardiacStays = $derived(
    allEdstays.filter((stay) => !cardiacSubjectIds.has(stay.subject_id))
  );
  const groups = $derived<StayGroup[]>([
    {
      label: "Cardiac subset",
      bins: makeBins(cardiacStays),
      subjectCount: new Set(cardiacStays.map((stay) => stay.subject_id)).size,
      isCardiac: true
    },
    {
      label: "Not in cardiac subset",
      bins: makeBins(nonCardiacStays),
      subjectCount: new Set(nonCardiacStays.map((stay) => stay.subject_id)).size,
      isCardiac: false
    }
  ]);

  function xPosition(index: number, isCardiac: boolean): number {
    return (
      margin.left +
      index * groupWidth +
      groupWidth / 2 +
      (isCardiac ? -barWidth - 2 : 2)
    );
  }

  function yPosition(percentage: number): number {
    return margin.top + plotHeight - (percentage / 100) * plotHeight;
  }
</script>

<section class="figure" style={`width: ${width}px`}>
  <h3>ED Stay Length Distribution</h3>

  {#if allEdstays.length > 0}
    <svg {width} {height} role="img" aria-label="ED stay length comparison by subject group">
      <g class="grid">
        {#each [0, 25, 50, 75, 100] as percentage}
          <line
            x1={margin.left}
            x2={width - margin.right}
            y1={yPosition(percentage)}
            y2={yPosition(percentage)}
          />
          <text x={margin.left - 10} y={yPosition(percentage) + 4} text-anchor="end">
            {percentage}%
          </text>
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

      {#each binLabels as label, index}
        <text
          x={margin.left + index * groupWidth + groupWidth / 2}
          y={height - margin.bottom + 22}
          text-anchor="middle"
        >
          {label}
        </text>
      {/each}

      {#each groups as group}
        {#each group.bins as bin, index}
          <rect
            x={xPosition(index, group.isCardiac)}
            y={yPosition(bin.percentage)}
            width={barWidth}
            height={height - margin.bottom - yPosition(bin.percentage)}
            fill={group.isCardiac ? "#000000" : "#ffffff"}
            stroke="#000000"
            stroke-width="1"
            rx="2"
          >
            <title>
              {group.label} · {bin.label} hours · {bin.percentage.toFixed(1)}% ({bin.count} stays)
            </title>
          </rect>
        {/each}
      {/each}

      <text
        class="axis-label"
        x={margin.left + plotWidth / 2}
        y={height - 8}
        text-anchor="middle"
      >
        ED stay length in hours
      </text>
      <text
        class="axis-label"
        transform={`translate(15, ${margin.top + plotHeight / 2}) rotate(-90)`}
        text-anchor="middle"
      >
        Percentage of ED stays
      </text>
    </svg>

    <div class="legend" aria-label="Subject group legend">
      <span><i class="cardiac"></i> Cardiac subset ({groups[0].subjectCount} subjects)</span>
      <span><i class="other"></i> Not in cardiac subset ({groups[1].subjectCount} subjects)</span>
    </div>
  {:else}
    <p>No ED stay records are loaded.</p>
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
    font-size: 11px;
  }

  .axis-label {
    font-size: 12px;
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
    border-radius: 2px;
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
