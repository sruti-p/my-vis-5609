<script lang="ts">
  import type { TEdStay } from "../types";

  type Props = {
    edstays?: TEdStay[];
    width?: number;
    height?: number;
  };

  let { edstays = [], width = 500, height = 220 }: Props = $props();

  const patientCount = $derived(new Set(edstays.map((stay) => stay.subject_id)).size);
  const admittedCount = $derived(
    edstays.filter((stay) => stay.disposition === "ADMITTED").length
  );
</script>

<section class="sandbox" style={`width: ${width}px; min-height: ${height}px`}>
  <h3>ED Data Sandbox</h3>
  <div class="summary">
    <div>
      <strong>{edstays.length}</strong>
      <span>ED stays</span>
    </div>
    <div>
      <strong>{patientCount}</strong>
      <span>patients</span>
    </div>
    <div>
      <strong>{admittedCount}</strong>
      <span>admitted</span>
    </div>
  </div>
</section>

<style>
  .sandbox {
    box-sizing: border-box;
    padding: 16px;
    border: 1px solid #d0d7de;
    border-radius: 8px;
    font-family: Arial, Helvetica, sans-serif;
  }

  h3 {
    margin: 0 0 16px;
  }

  .summary {
    display: flex;
    gap: 12px;
  }

  .summary div {
    display: grid;
    gap: 4px;
    min-width: 100px;
    padding: 12px;
    background: #f6f8fa;
    border-radius: 6px;
  }

  strong {
    font-size: 1.5rem;
  }

  span {
    color: #57606a;
    font-size: 0.85rem;
  }
</style>
