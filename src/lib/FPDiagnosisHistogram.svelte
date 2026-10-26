<script lang="ts">
  import type { TDiagnosis } from "../types";

  type Props = {
    cardiacDiagnoses?: TDiagnosis[];
    allDiagnoses?: TDiagnosis[];
    width?: number;
    height?: number;
  };

  type HistogramBin = {
    diagnosisCount: number;
    subjectFrequency: number;
    percentage: number;
  };

  type Histogram = {
    title: string;
    bins: HistogramBin[];
    subjectCount: number;
    isCardiac: boolean;
  };

  let {
    cardiacDiagnoses = [],
    allDiagnoses = [],
    width = 760,
    height = 360
  }: Props = $props();

  const margin = { top: 24, right: 16, bottom: 58, left: 52 };
  const chartGap = 24;
  const chartWidth = $derived((width - chartGap) / 2);
  const plotWidth = $derived(chartWidth - margin.left - margin.right);
  const plotHeight = $derived(height - margin.top - margin.bottom);

  const cardiacSubjectIds = $derived(
    new Set(cardiacDiagnoses.map((diagnosis) => diagnosis.subject_id))
  );

  function diagnosisCountsBySubject(diagnoses: TDiagnosis[]): Map<number, number> {
    const counts = new Map<number, number>();

    for (const diagnosis of diagnoses) {
      counts.set(diagnosis.subject_id, (counts.get(diagnosis.subject_id) ?? 0) + 1);
    }

    return counts;
  }

  function histogramForSubjects(
    subjectDiagnosisCounts: Map<number, number>,
    subjectIds: Set<number>,
    maxDiagnoses: number
  ): HistogramBin[] {
    const frequencies = new Map<number, number>();

    for (const subjectId of subjectIds) {
      const diagnosisCount = subjectDiagnosisCounts.get(subjectId) ?? 0;
      frequencies.set(diagnosisCount, (frequencies.get(diagnosisCount) ?? 0) + 1);
    }

    return Array.from({ length: maxDiagnoses }, (_, index) => {
      const diagnosisCount = index + 1;
      return {
        diagnosisCount,
        subjectFrequency: frequencies.get(diagnosisCount) ?? 0,
        percentage:
          subjectIds.size === 0
            ? 0
            : ((frequencies.get(diagnosisCount) ?? 0) / subjectIds.size) * 100
      };
    });
  }

  const allSubjectDiagnosisCounts = $derived(diagnosisCountsBySubject(allDiagnoses));
  const allSubjectIds = $derived(new Set(allSubjectDiagnosisCounts.keys()));
  const nonCardiacSubjectIds = $derived(
    new Set([...allSubjectIds].filter((subjectId) => !cardiacSubjectIds.has(subjectId)))
  );
  const maxDiagnoses = $derived(
    Math.max(...allSubjectDiagnosisCounts.values(), 1)
  );
  const labelStep = $derived(maxDiagnoses <= 10 ? 1 : maxDiagnoses <= 20 ? 2 : 5);
  const cardiacBins = $derived(
    histogramForSubjects(allSubjectDiagnosisCounts, cardiacSubjectIds, maxDiagnoses)
  );
  const nonCardiacBins = $derived(
    histogramForSubjects(allSubjectDiagnosisCounts, nonCardiacSubjectIds, maxDiagnoses)
  );
  const charts = $derived<Histogram[]>([
    {
      title: "Cardiac subset subjects",
      bins: cardiacBins,
      subjectCount: cardiacSubjectIds.size,
      isCardiac: true
    },
    {
      title: "Non-cardiac subjects",
      bins: nonCardiacBins,
      subjectCount: nonCardiacSubjectIds.size,
      isCardiac: false
    }
  ]);

  function yPosition(percentage: number): number {
    return margin.top + plotHeight - (percentage / 100) * plotHeight;
  }
</script>

<section class="figure" style={`width: ${width}px`}>
  <h3>Frequency of Subjects by Number of Diagnoses</h3>

  {#if allDiagnoses.length > 0}
    <div class="charts">
      {#each charts as chart}
        <div class="chart-panel">
          <h4>{chart.title} ({chart.subjectCount} subjects)</h4>
          <svg
            width={chartWidth}
            {height}
            role="img"
            aria-label={`${chart.title}: subject frequency by number of diagnoses`}
          >
            <g class="grid">
              {#each [0, 25, 50, 75, 100] as percentage}
                <line
                  x1={margin.left}
                  x2={chartWidth - margin.right}
                  y1={yPosition(percentage)}
                  y2={yPosition(percentage)}
                />
                <text x={margin.left - 8} y={yPosition(percentage) + 4} text-anchor="end">
                  {percentage}%
                </text>
              {/each}
            </g>

            <g class="axes">
              <line
                x1={margin.left}
                x2={chartWidth - margin.right}
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

            {#each chart.bins as bin, index}
              {@const barWidth = Math.max(plotWidth / Math.max(maxDiagnoses, 1) - 2, 2)}
              {@const x = margin.left + index * (plotWidth / Math.max(maxDiagnoses, 1)) + 1}
              <rect
                x={x}
                y={yPosition(bin.percentage)}
                width={barWidth}
                height={height - margin.bottom - yPosition(bin.percentage)}
                fill={chart.isCardiac ? "#000000" : "#ffffff"}
                stroke="#000000"
                stroke-width="1"
                rx="1"
              >
                <title>
                  {bin.percentage.toFixed(1)}% ({bin.subjectFrequency} subjects) with
                  {bin.diagnosisCount} diagnoses
                </title>
              </rect>
              {#if index % labelStep === 0 || index === chart.bins.length - 1}
                <text
                  x={x + barWidth / 2}
                  y={height - margin.bottom + 18}
                  text-anchor="middle"
                >
                  {bin.diagnosisCount}
                </text>
              {/if}
            {/each}

            <text
              class="axis-label"
              x={margin.left + plotWidth / 2}
              y={height - 8}
              text-anchor="middle"
            >
              Number of diagnoses
            </text>
            <text
              class="axis-label"
              transform={`translate(14, ${margin.top + plotHeight / 2}) rotate(-90)`}
              text-anchor="middle"
            >
              Percentage of subjects
            </text>
          </svg>
        </div>
      {/each}
    </div>
  {:else}
    <p>No diagnosis records are loaded.</p>
  {/if}
</section>

<style>
  .figure {
    font-family: Arial, Helvetica, sans-serif;
  }

  h3 {
    margin: 0 0 12px;
  }

  .charts {
    display: flex;
    gap: 24px;
  }

  .chart-panel {
    min-width: 0;
  }

  h4 {
    margin: 0 0 4px;
    font-size: 0.95rem;
    font-weight: 600;
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

  p {
    color: #57606a;
  }
</style>
