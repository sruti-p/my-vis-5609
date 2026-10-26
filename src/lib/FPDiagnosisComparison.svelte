<script lang="ts">
  import type { TDiagnosis } from "../types";

  type Props = {
    cardiacDiagnoses?: TDiagnosis[];
    allDiagnoses?: TDiagnosis[];
    width?: number;
    height?: number;
  };

  type DiagnosisGroup = {
    label: string;
    count: number;
    subjectCount: number;
    isCardiac: boolean;
  };

  type PieSlice = DiagnosisGroup & {
    startAngle: number;
    endAngle: number;
    percentage: number;
  };

  let {
    cardiacDiagnoses = [],
    allDiagnoses = [],
    width = 560,
    height = 400
  }: Props = $props();

  const cardiacSubjectIds = $derived(
    new Set(cardiacDiagnoses.map((diagnosis) => diagnosis.subject_id))
  );

  const groups = $derived<DiagnosisGroup[]>([
    {
      label: "Cardiac subset",
      count: allDiagnoses.filter((diagnosis) => cardiacSubjectIds.has(diagnosis.subject_id)).length,
      subjectCount: new Set(
        allDiagnoses
          .filter((diagnosis) => cardiacSubjectIds.has(diagnosis.subject_id))
          .map((diagnosis) => diagnosis.subject_id)
      ).size,
      isCardiac: true
    },
    {
      label: "Not in cardiac subset",
      count: allDiagnoses.filter((diagnosis) => !cardiacSubjectIds.has(diagnosis.subject_id)).length,
      subjectCount: new Set(
        allDiagnoses
          .filter((diagnosis) => !cardiacSubjectIds.has(diagnosis.subject_id))
          .map((diagnosis) => diagnosis.subject_id)
      ).size,
      isCardiac: false
    }
  ]);

  const totalDiagnoses = $derived(groups.reduce((total, group) => total + group.count, 0));
  const radius = $derived(Math.min(width * 0.27, height * 0.34));
  const centerX = $derived(width * 0.38);
  const centerY = $derived(height / 2);

  const slices = $derived.by((): PieSlice[] => {
    if (totalDiagnoses === 0) return [];

    let currentAngle = -Math.PI / 2;
    return groups.map((group) => {
      const angle = (group.count / totalDiagnoses) * Math.PI * 2;
      const slice = {
        ...group,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        percentage: (group.count / totalDiagnoses) * 100
      };
      currentAngle += angle;
      return slice;
    });
  });

  function pointOnCircle(angle: number): [number, number] {
    return [centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle)];
  }

  function slicePath(slice: PieSlice): string {
    if (slice.count === totalDiagnoses) {
      const [startX, startY] = pointOnCircle(slice.startAngle);
      const [middleX, middleY] = pointOnCircle(slice.startAngle + Math.PI);
      return `M ${centerX} ${centerY} L ${startX} ${startY} A ${radius} ${radius} 0 1 1 ${middleX} ${middleY} A ${radius} ${radius} 0 1 1 ${startX} ${startY} Z`;
    }

    const [startX, startY] = pointOnCircle(slice.startAngle);
    const [endX, endY] = pointOnCircle(slice.endAngle);
    const largeArcFlag = slice.endAngle - slice.startAngle > Math.PI ? 1 : 0;

    return `M ${centerX} ${centerY} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
  }
</script>

<section class="figure" style={`width: ${width}px`}>
  <h3>Diagnosis Records by Subject Group</h3>

  {#if totalDiagnoses > 0}
    <svg {width} {height} role="img" aria-label="Diagnosis records by subject group pie chart">
      {#each slices as slice}
        <path
          d={slicePath(slice)}
          fill={slice.isCardiac ? "#000000" : "#ffffff"}
          stroke="#000000"
          stroke-width="1"
        >
          <title>
            {slice.label}: {slice.count} diagnosis records ({slice.percentage.toFixed(1)}%) across
            {slice.subjectCount} subjects
          </title>
        </path>
      {/each}

      <text x={centerX} y={centerY - 8} text-anchor="middle" class="total">
        {totalDiagnoses}
      </text>
      <text x={centerX} y={centerY + 12} text-anchor="middle" class="total-label">
        diagnoses
      </text>
    </svg>

    <div class="legend" aria-label="Subject group legend">
      {#each slices as slice}
        <div class="legend-item">
          <i class:cardiac={slice.isCardiac} class:other={!slice.isCardiac}></i>
          <span>
            {slice.label}: {slice.count} ({slice.percentage.toFixed(1)}%) · {slice.subjectCount} subjects
          </span>
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
    margin: 0 0 8px;
  }

  svg {
    max-width: 100%;
    overflow: visible;
  }

  text {
    fill: #24292f;
  }

  .total {
    font-size: 1.4rem;
    font-weight: 700;
  }

  .total-label {
    font-size: 0.8rem;
  }

  .legend {
    display: grid;
    gap: 8px;
    margin-left: 58px;
    font-size: 0.85rem;
  }

  .legend-item {
    display: flex;
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
