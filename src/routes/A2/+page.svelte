<script lang="ts">
    import * as d3 from "d3";
    import { Scatter, Line, PL } from "$lib";
    import { onMount } from "svelte";
    import type { TMovie } from "../../types";

    // Reactive variable for storing the data
    let movies: TMovie[] = $state([]);

    let yearRange: [Date, Date] | undefined = $state();
    let selectedGenre = $state("All");

    function getYearCountArray(movies: TMovie[]) {
        let yearCount: { [year: number]: number } = {};
        const allYears = [...new Set(movies.map((d) => d.year.getFullYear()))];
        for (let year of allYears) {
            yearCount[year] = movies.filter(
                (d) => d.year.getFullYear() == year,
            ).length;
        }

        // Convert the map to an array of { year, count } objects
        const yearCountArray = Object.entries(yearCount).map(
            ([year, count]) => ({
                x: new Date(year),
                y: count as number,
            }),
        );

        // Sort the array by year in ascending order
        yearCountArray.sort((a, b) => (a.x < b.x ? -1 : 1));
        return yearCountArray;
    }

    let yearCountArray = $derived(getYearCountArray(movies));

    let genreOptions = $derived(
        Array.from(new Set(movies.flatMap((movie) => movie.genres))).sort(),
    );

    type TAxisSelection = {
        x: keyof TMovie;
        y: keyof TMovie;
        size: keyof TMovie;
    };

    // tip4: axisSelection is a reactive variable that stores the axis selection
    let axisSelection: TAxisSelection = $state({
        x: "year",
        y: "average_rating",
        size: "num_votes",
    });

    // Function to load the CSV
    async function loadCsv() {
        try {
            const csvUrl = "/summer_movies.csv";
            // movies = await d3.csv(csvUrl, (row) => {
            //     // all values are strings, so use row conversion function to format them
            //     return {
            //         ...row,
            //         num_votes: Number(row.num_votes),
            //         runtime_minutes: Number(row.runtime_minutes),
            //         genres: row.genres.split(","),
            //         year: new Date(row.year),
            //         average_rating: Number(row.average_rating),
            //     };
            // });

            movies = await d3.csv(csvUrl, (row): TMovie | undefined => {
                const year = Number(row.year);
                if (!Number.isFinite(year)) return undefined;

                return {
                    tconst: row.tconst,
                    title_type: row.title_type,
                    primary_title: row.primary_title,
                    original_title: row.original_title,
                    num_votes: Number(row.num_votes),
                    runtime_minutes: Number(row.runtime_minutes),
                    genres: row.genres.split(","),
                    year: new Date(year, 0, 1),
                    average_rating: Number(row.average_rating),
                };
            });

            console.log("Loaded CSV Data:", movies);
        } catch (error) {
            console.error("Error loading CSV:", error);
        }
    }
    // Call the loader when the component mounts
    onMount(loadCsv);

    // tip4: below are the derived stores for the options of the selectors
    const attrOptionsX = $derived(movies[0] ? Object.keys(movies[0]) : []);
    const attrOptionsY = $derived(
        movies[0] ? Object.keys(movies[0]).filter((d) => d != "genres") : [],
    );
    const attrOptionsS = $derived(
        movies[0] ? Object.keys(movies[0]).filter((d) => d != "genres") : [],
    );
</script>

<div class="container">
    <h1>Summer Movies</h1>

    <p>Here are {movies.length == 0 ? "..." : movies.length + " "} movies</p>
    {#if movies.length > 0}
        <div class="selectors">
            <!-- tip4: add the selectors for binding data attributes with x axis, y axis, and size. You will need to use bind:value for each selector.  -->
            <!-- 
          X Axis:
         <select bind:value={xxx}>
              {#each xxx}
                  <option value={key}>{key}</option>
              {/each}
          </select>

          Y Axis:
          <select bind:value={xxx}>
              {#each xxx}
                  <option value={key}>{key}</option>
              {/each}
          </select>

          Size:
          <select bind:value={xxx}>
              {#each xxx}
                  <option value={key}>{key}</option>
              {/each}
          </select>

          --->
            X Axis:
            <select bind:value={axisSelection.x}>
                {#each attrOptionsX as key}
                    <option value={key}>{key}</option>
                {/each}
            </select>

            Y Axis:
            <select bind:value={axisSelection.y}>
                {#each attrOptionsY as key}
                    <option value={key}>{key}</option>
                {/each}
            </select>

            Size:
            <select bind:value={axisSelection.size}>
                {#each attrOptionsS as key}
                    <option value={key}>{key}</option>
                {/each}
            </select>
          
        </div>

        <Scatter
            movies={yearRange
                ? movies.filter((d) => {
                      const [start, end] = yearRange!;
                      return d.year >= start && d.year <= end;
                  })
                : movies}
            x={axisSelection.x}
            y={axisSelection.y}
            size={axisSelection.size}
        />
        <br />

        <Line data={yearCountArray} bind:yearRange />

        <div class="genre-selector">
            <label for="genre">Genre:</label>
            <select id="genre" bind:value={selectedGenre}>
                <option value="All">All genres</option>
                {#each genreOptions as genre}
                    <option value={genre}>{genre}</option>
                {/each}
            </select>
        </div>

        <PL movies={movies} genre={selectedGenre} {yearRange} />
    {/if}
</div>

<style>
    .container {
        width: 60vw;
        margin: 10px auto;
        padding: 10px;
    }
</style>
