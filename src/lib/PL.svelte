<script lang="ts">
  import * as d3 from "d3";
  import type { TMovie } from "../types";

  type Props = {
    movies: TMovie[];
    genre?: string;
    yearRange?: [Date, Date];
    width?: number;
    height?: number;
  };

  let {
    movies,
    genre = "All",
    yearRange,
    width = 760,
    height = 430,
  }: Props = $props();

  let highlightedGenre: string | null = $state(null);

  const margin = { top: 35, right: 30, bottom: 45, left: 30 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const axisNames = ["Average rating", "Runtime (minutes)", "Genres"];
  const lineGenerator = d3.line<[number, number]>();

  const filteredMovies = $derived(
    movies.filter((movie) => {
      const hasValidYear = Number.isFinite(movie.year.getTime());
      const isInYearRange =
        !yearRange ||
        (movie.year >= yearRange[0] && movie.year <= yearRange[1]);
      const isInGenre = genre === "All" || movie.genres.includes(genre);

      return hasValidYear && isInYearRange && isInGenre;
    }),
  );

  const displayedGenres = $derived(
    Array.from(new Set(filteredMovies.flatMap((movie) => movie.genres))).sort(),
  );

  const ratingScale = $derived(
    d3
      .scaleLinear()
      .domain(
        d3.extent(filteredMovies, (movie) => movie.average_rating) as [
          number,
          number,
        ],
      )
      .nice()
      .range([innerHeight, 0]),
  );

  const runtimeScale = $derived(
    d3
      .scaleLinear()
      .domain(
        d3.extent(filteredMovies, (movie) => movie.runtime_minutes) as [
          number,
          number,
        ],
      )
      .nice()
      .range([innerHeight, 0]),
  );

  const genreScale = $derived(
    d3
      .scalePoint<string>()
      .domain(displayedGenres)
      .range([innerHeight, 0])
      .padding(0.5),
  );

  const axisX = [0, innerWidth / 2, innerWidth];
  const ratingTicks = $derived(ratingScale.ticks(5));
  const runtimeTicks = $derived(runtimeScale.ticks(5));

  const moviePaths = $derived.by(() => {
    const paths: Array<{ d: string; title: string; genre: string }> = [];

    for (const movie of filteredMovies) {
      for (const movieGenre of movie.genres) {
        const genreY = genreScale(movieGenre);
        if (genreY === undefined) continue;

        const points: [number, number][] = [
          [axisX[0], ratingScale(movie.average_rating)],
          [axisX[1], runtimeScale(movie.runtime_minutes)],
          [axisX[2], genreY],
        ];

        const d = lineGenerator(points);
        if (d) {
          paths.push({
            d,
            title: `${movie.primary_title} (${movie.year.getFullYear()})`,
            genre: movieGenre,
          });
        }
      }
    }

    return paths;
  });
</script>

<div class="parallel-lines">
  <h2>Movies by rating, runtime, and genre</h2>
  {#if filteredMovies.length > 0 && displayedGenres.length > 0}
    <p>
      Showing {filteredMovies.length} movie{filteredMovies.length === 1 ? "" : "s"}
      {genre === "All" ? "" : ` in ${genre}`}
      {yearRange
        ? ` from ${yearRange[0].getFullYear()}–${yearRange[1].getFullYear()}`
        : ""}.
    </p>

    <svg
      {width}
      {height}
      role="img"
      aria-label="Parallel lines plot of movie ratings, runtimes, and genres"
    >
      <g transform={`translate(${margin.left}, ${margin.top})`}>
        {#each moviePaths as moviePath}
          <path
            d={moviePath.d}
            fill="none"
            stroke="steelblue"
            stroke-width="1"
            opacity={highlightedGenre === null
              ? 0.25
              : highlightedGenre === moviePath.genre
                ? 1
                : 0.05}
          >
            <title>{moviePath.title} — {moviePath.genre}</title>
          </path>
        {/each}

        {#each ratingTicks as tick}
          {@const y = ratingScale(tick)}
          <line class="grid-line" x1={axisX[0]} x2={axisX[1]} y1={y} y2={y} />
          <text class="tick-label" x={axisX[0] - 8} y={y + 4} text-anchor="end">
            {tick}
          </text>
        {/each}

        {#each runtimeTicks as tick}
          {@const y = runtimeScale(tick)}
          <line class="grid-line" x1={axisX[1]} x2={axisX[2]} y1={y} y2={y} />
          <text class="tick-label" x={axisX[1] - 8} y={y + 4} text-anchor="end">
            {tick}
          </text>
        {/each}

        {#each displayedGenres as displayedGenre}
          {@const y = genreScale(displayedGenre)}
          {#if y !== undefined}
            <line class="grid-line" x1={axisX[2]} x2={axisX[2] + 6} y1={y} y2={y} />
            <text
              class="tick-label genre-label"
              class:highlighted={highlightedGenre === displayedGenre}
              x={axisX[2] + 10}
              y={y + 4}
              role="button"
              tabindex="0"
              aria-label={`Highlight ${displayedGenre} movies`}
              onclick={() => {
                highlightedGenre =
                  highlightedGenre === displayedGenre ? null : displayedGenre;
              }}
              onkeydown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  highlightedGenre =
                    highlightedGenre === displayedGenre ? null : displayedGenre;
                }
              }}
            >
              {displayedGenre}
            </text>
          {/if}
        {/each}

        {#each axisX as x, index}
          <line class="axis-line" x1={x} x2={x} y1="0" y2={innerHeight} />
          <text class="axis-label" x={x} y={-12} text-anchor="middle">
            {axisNames[index]}
          </text>
        {/each}
      </g>
    </svg>
  {:else}
    <p>No movies match the selected genre and year range.</p>
  {/if}
</div>

<style>
  .parallel-lines {
    margin-top: 24px;
  }

  .parallel-lines h2 {
    margin-bottom: 4px;
  }

  .parallel-lines p {
    margin-top: 0;
  }

  svg {
    max-width: 100%;
    overflow: visible;
  }

  .axis-line {
    stroke: #333;
    stroke-width: 1.5;
  }

  .grid-line {
    stroke: #d9d9d9;
    stroke-width: 1;
  }

  .axis-label {
    font-weight: 600;
  }

  .tick-label {
    font-size: 11px;
  }

  .genre-label {
    cursor: pointer;
  }

  .genre-label.highlighted {
    font-weight: 700;
    fill: steelblue;
  }
</style>
