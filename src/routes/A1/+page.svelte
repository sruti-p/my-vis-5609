<script lang="ts">
  import * as d3 from "d3";
  import { onMount } from "svelte";
  import type { TMovie } from "../../types";

  import Bar from "$lib/Bar.svelte";
  import ParallelCoordinates from "$lib/ParallelCoordinates.svelte";
  import Chord from "$lib/Chord.svelte";
  import HeatMap from "$lib/HeatMap.svelte";

  // Reactive variable for storing the data
  let movies: TMovie[] = [];

  // Function to load the CSV
  async function loadCsv() {
    try {
      const csvUrl = "./summer_movies.csv";
      movies = await d3.csv(csvUrl, (row) => {
        // TIP: in row, all values are strings, so we need to use a row conversion function here to format them
        return {
          // ...row, // spread syntax to copy all properties from row
          // num_votes: Number(row.num_votes),
          // year: new Date(row.year),
          // runtime_minutes: new Number(row.runtime_minutes), 
          // genres: new String(row.genres), 
          // average_rating: new Number(row.average_rating), 
          // tconst: new String(row.tconst),
          // title_type: new String(row.title_type), 
          // primary_title: new String(row.primary_title), 
          // original_title: new String(row.original_title)
            ...row,
            num_votes: Number(row.num_votes),
            year: new Date(row.year),
            runtime_minutes: Number(row.runtime_minutes),
            genres: row.genres ? row.genres.split(",") : [],
            average_rating: Number(row.average_rating),
            tconst: row.tconst,
            title_type: row.title_type,
            primary_title: row.primary_title,
            original_title: row.original_title

          // please also format the values for other non-string attributes. You can check the attributes in the CSV file
        };
      });

      console.log("Loaded CSV Data:", movies);
    } catch (error) {
      console.error("Error loading CSV:", error);
    }
  }
  // Call the loader when the component mounts
  onMount(loadCsv);
</script>

<h1>Summer Movies</h1>

<p>Here are {movies.length == 0 ? "..." : movies.length + " "} movies</p>
<Bar {movies} />
<ParallelCoordinates {movies}/>
<!-- <Chord {movies}/> -->
<HeatMap {movies}/>
