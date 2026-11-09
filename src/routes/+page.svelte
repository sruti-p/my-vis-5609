<script lang="ts">
    import { base } from "$app/paths";
</script>

<svelte:head>
    <title>Sruti's VIS Site</title>
</svelte:head>

<main>
    <h1>Sruti's VIS Site</h1>
    <p>Select a visualization:</p>
    <nav>
        <a href={`${base}/A0`}>Assignment 0</a>
        <a href={`${base}/A1`}>Assignment 1</a>
        <a href={`${base}/A2`}>Assignment 2</a>
        <a href={`${base}/A3`}>Assignment 3</a>
        <a href={`${base}/FP`}>Final Project</a>
    </nav>
</main>

<style>
    main {
        max-width: 48rem;
        margin: 3rem auto;
        padding: 0 1.5rem;
        font-family: Arial, Helvetica, sans-serif;
    }

    nav {
        display: grid;
        gap: 0.75rem;
    }

    a {
        color: #800080;
    }
</style>
