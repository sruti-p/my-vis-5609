<script lang="ts">
  import * as d3 from "d3";
  import type { TMovie } from "../types";

  type Props = {
    movies: TMovie[];
    progress?: number;
    width?: number;
    height?: number;
  };

  type HoveredConnection = {
    source: string;
    target: string;
    count: number;
  };

  let { movies, progress = 100, width = 700, height = 600 }: Props = $props();
  let hoveredGenre: string | null = $state(null);
  let hoveredConnection: HoveredConnection | null = $state(null);

  const margin = 95;
  const chartRadius = $derived(Math.min(width, height) / 2 - margin);
  const innerRadius = $derived(Math.max(0, chartRadius - 20));
  const outerRadius = $derived(Math.max(0, chartRadius));

  const upYear = $derived.by(() => {
    if (movies.length === 0 || progress >= 100) return null;

    const years = movies
      .map((movie) => movie.year)
      .filter((year) => year instanceof Date && !Number.isNaN(year.getTime()));
    const yearRange = d3.extent(years);

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

      for (let sourceIndex = 0; sourceIndex < movieGenres.length; sourceIndex += 1) {
        for (let targetIndex = sourceIndex + 1; targetIndex < movieGenres.length; targetIndex += 1) {
          const source = genreIndex.get(movieGenres[sourceIndex]);
          const target = genreIndex.get(movieGenres[targetIndex]);

          if (source === undefined || target === undefined) continue;

          values[source][target] += 1;
          values[target][source] += 1;
        }
      }
    }

    return values;
  });

  const chordLayout = $derived(
    d3
      .chord()
      .padAngle(0.04)
      .sortSubgroups(d3.descending)
      .sortChords(d3.descending)(matrix),
  );

  const colorScale = $derived(
    d3.scaleOrdinal<string, string>().domain(genres).range(d3.schemeTableau10),
  );

  const arc = $derived(
    d3.arc<d3.ChordGroup>().innerRadius(innerRadius).outerRadius(outerRadius),
  );

  const ribbon = $derived(d3.ribbon<d3.Chord, d3.ChordSubgroup>().radius(innerRadius));

  function genreConnectionCount(index: number) {
    return d3.sum(matrix[index]);
  }

  function groupTransform(group: d3.ChordGroup) {
    const angle = ((group.startAngle + group.endAngle) / 2) * (180 / Math.PI) - 90;
    const flip = angle > 90 ? 180 : 0;
    return `rotate(${angle}) translate(${outerRadius + 14}) rotate(${flip})`;
  }

</script>

<h3>Genre relationships</h3>

{#if genres.length > 0}
  <div class="chart-container">
    <svg
      {width}
      {height}
      role="img"
      aria-label="Chord diagram showing movies shared between genres"
    >
      <g transform={`translate(${width / 2}, ${height / 2})`}>
        {#each chordLayout as chord}
          {@const sourceGenre = genres[chord.source.index]}
          {@const targetGenre = genres[chord.target.index]}
          {@const connectionCount = matrix[chord.source.index][chord.target.index]}
          <path
            class="chord"
            d={ribbon(chord) ?? ""}
            fill={colorScale(sourceGenre)}
            opacity={hoveredConnection?.source === sourceGenre && hoveredConnection?.target === targetGenre ? 1 : 0.25}
            tabindex="0"
            role="button"
            aria-label={`${sourceGenre} and ${targetGenre}: ${connectionCount} movies`}
            onmouseenter={() => (hoveredConnection = { source: sourceGenre, target: targetGenre, count: connectionCount })}
            onmouseleave={() => (hoveredConnection = null)}
            onfocus={() => (hoveredConnection = { source: sourceGenre, target: targetGenre, count: connectionCount })}
            onblur={() => (hoveredConnection = null)}
          >
            <title>
              {sourceGenre} + {targetGenre}: {connectionCount} movies
            </title>
          </path>
        {/each}

        {#if hoveredConnection !== null}
          <text class="hover-count" y={outerRadius + 45} text-anchor="middle">
            {hoveredConnection.source} + {hoveredConnection.target}: {hoveredConnection.count} movies
          </text>
        {/if}

        {#each chordLayout.groups as group}
          <path
            class="genre-arc"
            d={arc(group) ?? ""}
            fill={colorScale(genres[group.index])}
            stroke="#fff"
            stroke-width="1"
            opacity="1"
            tabindex="0"
            role="button"
            aria-label={`${genres[group.index]}: ${genreConnectionCount(group.index)} connections`}
            onmouseenter={() => (hoveredGenre = genres[group.index])}
            onmouseleave={() => (hoveredGenre = null)}
            onfocus={() => (hoveredGenre = genres[group.index])}
            onblur={() => (hoveredGenre = null)}
          >
            <title>
              {genres[group.index]}: {genreConnectionCount(group.index)} connections
            </title>
          </path>
          <text
            class="genre-label"
            transform={groupTransform(group)}
            text-anchor={((group.startAngle + group.endAngle) / 2) * (180 / Math.PI) - 90 > 90 ? "end" : "start"}
          >
            {hoveredGenre === genres[group.index]
              ? `${genres[group.index]}: ${genreConnectionCount(group.index)}`
              : genres[group.index]}
          </text>
        {/each}
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

  .chord {
    cursor: pointer;
    transition: opacity 0.15s ease;
  }

  .genre-arc {
    cursor: pointer;
    transition: opacity 0.15s ease;
  }

  .genre-label {
    fill: #222;
    font-size: 12px;
  }

  .hover-count {
    fill: #222;
    font-size: 13px;
    font-weight: 600;
    pointer-events: none;
  }

</style>
