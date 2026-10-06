<script lang="ts">
  import * as d3 from "d3";
  import type { TMovie } from "../types";

  type Props = {
    movies: TMovie[];
    width?: number;
    height?: number;
  };

  type RankedGenre = {
    genre: string;
    count: number;
  };

  type RankSeries = {
    rank: number;
    points: [number, number][];
  };

  type HoveredPoint = {
    year: number;
    rank: number;
    genre: string;
    count: number;
  };

  let { movies, width = 1300, height = 500 }: Props = $props();
  let hoveredPoint: HoveredPoint | null = $state(null);
  let hoveredRank: number | null = $state(null);
  let hoveredYear: number | null = $state(null);
  let hoveredGenre: string | null = $state(null);

  const margin = { top: 35, right: 30, bottom: 100, left: 140 };
  const rankColors = ["#1f77b4", "#ff7f0e", "#2ca02c"];
  const rankLabels = ["1st", "2nd", "3rd"];

  const filteredMovies = $derived(
    movies.filter((movie) => {
      const year = movie.year.getFullYear();
      return Number.isFinite(year) && year !== 2024;
    }),
  );

  const years = $derived(
    Array.from(new Set(filteredMovies.map((movie) => movie.year.getFullYear()))).sort(
      (firstYear, secondYear) => firstYear - secondYear,
    ),
  );

  function isLabeledYear(year: number, yearIndex: number) {
    return yearIndex === 0 || yearIndex === years.length - 1 || year % 10 === 0;
  }

  const genres = $derived(
    Array.from(new Set(filteredMovies.flatMap((movie) => movie.genres))).sort(),
  );

  const topGenresByYear = $derived.by(() => {
    const result = new Map<number, RankedGenre[]>();

    for (const year of years) {
      const counts = new Map<string, number>();

      for (const movie of filteredMovies) {
        if (movie.year.getFullYear() !== year) continue;

        for (const genre of movie.genres) {
          counts.set(genre, (counts.get(genre) ?? 0) + 1);
        }
      }

      result.set(
        year,
        Array.from(counts, ([genre, count]) => ({ genre, count }))
          .sort((first, second) => second.count - first.count || first.genre.localeCompare(second.genre))
          .slice(0, 3),
      );
    }

    return result;
  });

  const chartWidth = $derived(width);
  const innerWidth = $derived(chartWidth - margin.left - margin.right);
  const innerHeight = $derived(height - margin.top - margin.bottom);

  const xScale = $derived(
    d3.scalePoint<number>().domain(years).range([0, innerWidth]).padding(0.1),
  );
  const yScale = $derived(
    d3.scalePoint<string>().domain(genres).range([innerHeight, 0]).padding(0.5),
  );
  const maxGenreCount = $derived(
    Math.max(
      1,
      ...Array.from(topGenresByYear.values())
        .flat()
        .map((rankedGenre) => rankedGenre.count),
    ),
  );
  const pointRadius = $derived(
    d3
      .scalePow<number>()
      .exponent(0.75)
      .domain([0, maxGenreCount])
      .range([3, 12]),
  );
  const line = d3.line<[number, number]>();

  const rankSeries = $derived<RankSeries[]>(
    [0, 1, 2].map((rank) => ({
      rank,
      points: years.flatMap((year) => {
        const genre = topGenresByYear.get(year)?.[rank]?.genre;
        const x = xScale(year);
        const y = genre === undefined ? undefined : yScale(genre);

        return x === undefined || y === undefined ? [] : [[x, y]];
      }),
    })),
  );
</script>

<h3>Q1: How do the top three movie genres (by number of movies) change over time?</h3>

{#if years.length > 0 && genres.length > 0}
  <div class="chart-container">
    <svg
      width={chartWidth}
      {height}
      role="img"
      aria-label="Parallel coordinates chart showing the three most popular movie genres for each year"
    >
      <g transform={`translate(${margin.left}, ${margin.top})`}>
        {#if hoveredGenre !== null && yScale(hoveredGenre) !== undefined}
          <rect
            class="genre-highlight"
            x="0"
            y={(yScale(hoveredGenre) ?? 0) - yScale.step() / 2}
            width={innerWidth}
            height={yScale.step()}
          />
        {/if}

        {#each rankSeries as series}
          <path
            d={line(series.points) ?? ""}
            fill="none"
            stroke={rankColors[series.rank]}
            stroke-width="1.5"
            stroke-linejoin="round"
            stroke-linecap="round"
            opacity={hoveredRank === series.rank ? 1 : 0}
          />
        {/each}

        {#each years.filter((year) => year !== 2024) as year, yearIndex}
          <g transform={`translate(${xScale(year) ?? 0}, 0)`}>
            {#if isLabeledYear(year, yearIndex) || hoveredYear === year}
              <line
                class="axis-line"
                y1={innerHeight}
                opacity={hoveredYear === null ? 0.65 : hoveredYear === year ? 1 : 0.2}
              />
            {/if}
            {#if yearIndex === 0}
              {#each genres as genre}
                <text
                  class="genre-label"
                  class:active-genre={hoveredGenre === genre}
                  x="-8"
                  y={(yScale(genre) ?? 0) + 4}
                  text-anchor="end"
                  tabindex="0"
                  role="img"
                  aria-label={`Highlight ${genre} genre`}
                  onmouseenter={() => (hoveredGenre = genre)}
                  onmouseleave={() => (hoveredGenre = null)}
                  onfocus={() => (hoveredGenre = genre)}
                  onblur={() => (hoveredGenre = null)}
                >
                  {genre}
                </text>
                {/each}
            {/if}

            {#each [0, 1, 2] as rank}
              {@const rankedGenre = topGenresByYear.get(year)?.[rank]}
              {#if rankedGenre}
                <circle
                  class="data-point"
                  cx="0"
                  cy={yScale(rankedGenre.genre)}
                  r={pointRadius(rankedGenre.count)}
                  fill={rankColors[rank]}
                  opacity={hoveredRank === null ? 0.65 : hoveredRank === rank ? 1 : 0.2}
                  tabindex="0"
                  role="img"
                  aria-label={`${year}, ${rankLabels[rank]} most popular genre: ${rankedGenre.genre}, ${rankedGenre.count} movies`}
                  onmouseenter={() => {
                    hoveredRank = rank;
                    hoveredYear = year;
                    hoveredGenre = rankedGenre.genre;
                    hoveredPoint = {
                      year,
                      rank,
                      genre: rankedGenre.genre,
                      count: rankedGenre.count,
                    };
                  }}
                  onmouseleave={() => {
                    hoveredRank = null;
                    hoveredYear = null;
                    hoveredGenre = null;
                    hoveredPoint = null;
                  }}
                  onfocus={() => {
                    hoveredRank = rank;
                    hoveredYear = year;
                    hoveredGenre = rankedGenre.genre;
                    hoveredPoint = {
                      year,
                      rank,
                      genre: rankedGenre.genre,
                      count: rankedGenre.count,
                    };
                  }}
                  onblur={() => {
                    hoveredRank = null;
                    hoveredYear = null;
                    hoveredGenre = null;
                    hoveredPoint = null;
                  }}
                />
                {#if hoveredPoint !== null && hoveredPoint.year === year && hoveredPoint.rank === rank}
                  <text
                    class="count-label"
                    x="8"
                    y={(yScale(rankedGenre.genre) ?? 0) - 8}
                  >
                    {hoveredPoint.year}: {hoveredPoint.genre}, {hoveredPoint.count}
                  </text>
                {/if}
              {/if}
            {/each}

            {#if isLabeledYear(year, yearIndex)}
              <text class="year-label" y={innerHeight + 25} text-anchor="middle">
                {'\'' + String(year).slice(-2)}
              </text>
            {/if}
          </g>
        {/each}

        <text
          class="axis-title"
          transform={`translate(${-margin.left + 25}, ${innerHeight / 2}) rotate(-90)`}
          text-anchor="middle"
        >Genre</text>
        <text class="axis-title" x={innerWidth / 2} y={innerHeight + 75} text-anchor="middle">
          Year
        </text>
      </g>
    </svg>

    <div class="legend" aria-label="Genre ranks">
      {#each rankLabels as label, index}
        <span class="legend-item">
          <span class="legend-swatch" style={`background-color: ${rankColors[index]}`}></span>
          {label} most popular
        </span>
      {/each}
    </div>
  </div>
{:else}
  <p>No movie data available.</p>
{/if}

<style>
  .chart-container {
    max-width: 100%;
    overflow-x: auto;
  }

  svg {
    display: block;
  }

  .axis-line {
    stroke: #555;
    stroke-width: 1;
    pointer-events: none;
  }

  .genre-highlight {
    fill: #f0c419;
    opacity: 0.2;
    pointer-events: none;
  }

  .genre-label {
    fill: #555;
    font-size: 11px;
  }

  .genre-label.active-genre {
    fill: #222;
    font-weight: 700;
  }

  .year-label {
    fill: #222;
    font-size: 12px;
  }

  .axis-title {
    fill: #222;
    font-size: 13px;
    font-weight: 600;
  }

  .data-point {
    cursor: pointer;
    stroke: white;
    stroke-width: 1.5;
  }

  .count-label {
    fill: #222;
    font-size: 12px;
    font-weight: 600;
    pointer-events: none;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    margin-top: 0.75rem;
  }

  .legend-item {
    align-items: center;
    display: inline-flex;
    font-size: 12px;
    gap: 0.35rem;
  }

  .legend-swatch {
    border-radius: 50%;
    display: inline-block;
    height: 10px;
    width: 10px;
  }
</style>
