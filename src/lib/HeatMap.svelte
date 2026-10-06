<script lang="ts">
  import * as d3 from "d3";
  import type { TMovie } from "../types";

  type Props = {
    movies: TMovie[];
    progress?: number;
    width?: number;
    height?: number;
  };

  type HeatCell = {
    rowGenre: string;
    columnGenre: string;
    rowIndex: number;
    columnIndex: number;
    count: number;
    total: number;
    proportion: number;
  };

  let { movies, progress = 100, width = 700, height = 525 }: Props = $props();
  let selectedCell: HeatCell | null = $state(null);

  const margin = { top: 160, right: 30, bottom: 40, left: 120 };

  const upYear = $derived.by(() => {
    if (movies.length === 0 || progress >= 100) return null;

    const validYears = movies
      .map((movie) => movie.year)
      .filter((year) => year instanceof Date && !Number.isNaN(year.getTime()));
    const yearRange = d3.extent(validYears);

    if (!yearRange[0] || !yearRange[1]) return null;

    return d3.scaleTime().domain(yearRange).range([0, 100]).invert(progress);
  });

  const visibleMovies = $derived(
    upYear === null ? movies : movies.filter((movie) => movie.year <= upYear),
  );

  const genres = $derived(
    Array.from(new Set(visibleMovies.flatMap((movie) => movie.genres))).sort(),
  );

  const genreIndex = $derived(new Map(genres.map((genre, index) => [genre, index])));

  const matrix = $derived.by(() => {
    const values = genres.map(() => genres.map(() => 0));

    for (const movie of visibleMovies) {
      const movieGenres = Array.from(new Set(movie.genres)).filter((genre) =>
        genreIndex.has(genre),
      );

      for (const rowGenre of movieGenres) {
        for (const columnGenre of movieGenres) {
          const rowIndex = genreIndex.get(rowGenre);
          const columnIndex = genreIndex.get(columnGenre);

          if (rowIndex === undefined || columnIndex === undefined) continue;
          values[rowIndex][columnIndex] += 1;
        }
      }
    }

    return values;
  });

  const chartWidth = $derived(Math.max(width, margin.left + margin.right + genres.length * 27));
  const chartHeight = $derived(Math.max(height, margin.top + margin.bottom + genres.length * 27));
  const innerWidth = $derived(chartWidth - margin.left - margin.right);
  const innerHeight = $derived(chartHeight - margin.top - margin.bottom);

  const xScale = $derived(
    d3.scaleBand<string>().domain(genres).range([0, innerWidth]).padding(0.05),
  );
  const yScale = $derived(
    d3.scaleBand<string>().domain(genres).range([0, innerHeight]).padding(0.05),
  );
  const maxCount = $derived(
    Math.max(1, d3.max(matrix.flat(), (count) => count) ?? 0),
  );
  const genreTotals = $derived(
    matrix.map((row, rowIndex) =>
      row.reduce(
        (total, count, columnIndex) =>
          total + (rowIndex === columnIndex ? 0 : count),
        0,
      ),
    ),
  );
  const colorScale = $derived(
    d3.scaleSequential((value) => d3.interpolateRgb("#ffffff", "#000000")(value)).domain([0, 1]),
  );

  const cells = $derived<HeatCell[]>(
    genres.flatMap((rowGenre, rowIndex) =>
      genres.map((columnGenre, columnIndex) => ({
        rowGenre,
        columnGenre,
        rowIndex,
        columnIndex,
        count: rowIndex === columnIndex ? 0 : matrix[rowIndex][columnIndex],
        total: genreTotals[rowIndex],
        proportion:
          rowIndex === columnIndex || genreTotals[rowIndex] === 0
            ? 0
            : matrix[rowIndex][columnIndex] / genreTotals[rowIndex],
      })),
    ),
  );
</script>

<h3>Q2: Are there any correlations between different genres?</h3>

{#if genres.length > 0}
  <div class="chart-container">
    <svg
      width={chartWidth}
      height={chartHeight}
      role="img"
      aria-label="Heatmap showing movie genre co-occurrences"
    >
      <g transform={`translate(${margin.left}, ${margin.top})`}>
        {#each cells as cell}
          {@const x = xScale(cell.columnGenre) ?? 0}
          {@const y = yScale(cell.rowGenre) ?? 0}
          <rect
            class="heat-cell"
            x={x}
            y={y}
            width={xScale.bandwidth()}
            height={yScale.bandwidth()}
            fill={cell.rowIndex === cell.columnIndex ? "#000000" : colorScale(cell.proportion)}
            stroke={selectedCell?.rowGenre === cell.rowGenre && selectedCell?.columnGenre === cell.columnGenre ? "#111" : "none"}
            stroke-width="2"
            tabindex="0"
            role="button"
            aria-label={cell.rowIndex === cell.columnIndex ? undefined : `${cell.rowGenre} and ${cell.columnGenre}: ${cell.count} movies`}
            onmouseenter={() => {
              if (cell.rowIndex !== cell.columnIndex) selectedCell = cell;
            }}
            onmouseleave={() => (selectedCell = null)}
            onfocus={() => {
              if (cell.rowIndex !== cell.columnIndex) selectedCell = cell;
            }}
            onblur={() => (selectedCell = null)}
          >
            {#if cell.rowIndex !== cell.columnIndex}
              <title>
                {cell.rowGenre} + {cell.columnGenre}: {cell.count} movies
              </title>
            {/if}
          </rect>
        {/each}

        {#each genres as genre}
          <text
            class="x-label"
            transform={`translate(${xScale(genre) ?? 0}, -18) rotate(-45)`}
            text-anchor="start"
          >{genre}</text>
          <text
            class="y-label"
            x="-8"
            y={(yScale(genre) ?? 0) + yScale.bandwidth() / 2 + 4}
            text-anchor="end"
          >{genre}</text>
        {/each}

        <text
          class="y-axis-title"
          transform={`translate(${-margin.left + 25}, ${innerHeight / 2}) rotate(-90)`}
          text-anchor="middle"
        >Genre of Interest</text>

        <text class="x-axis-title" x={innerWidth / 2} y="-100" text-anchor="middle">
          Co-occuring Genres
        </text>

        {#if selectedCell !== null}
          <text class="hover-count" x={innerWidth / 2} y={innerHeight + 35} text-anchor="middle">
            {selectedCell.rowGenre} + {selectedCell.columnGenre}: {selectedCell.count} movies
          </text>
        {/if}
      </g>
    </svg>
  </div>
{:else}
  <p>No movie data available.</p>
{/if}

<style>
  .chart-container {
    max-width: 100%;
    overflow: auto;
  }

  svg {
    display: block;
  }

  .heat-cell {
    cursor: pointer;
    transition: stroke 0.1s ease;
  }

  .x-label,
  .y-label {
    fill: #222;
    font-size: 11px;
  }

  .hover-count {
    fill: #222;
    font-size: 13px;
    font-weight: 600;
  }

  .y-axis-title {
    fill: #222;
    font-size: 13px;
    font-weight: 600;
  }

  .x-axis-title {
    fill: #222;
    font-size: 13px;
    font-weight: 600;
  }
</style>
