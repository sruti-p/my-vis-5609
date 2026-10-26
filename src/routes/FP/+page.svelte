<script lang="ts">
  import * as d3 from "d3";
  import { onMount } from "svelte";
  import { base } from "$app/paths";
  import FPSandbox from "$lib/FPSandbox.svelte";
  import FPQ1I1 from "$lib/FPQ1I1.svelte";
  import FPQ1I2 from "$lib/FPQ1I2.svelte";
  import FPQ2I3 from "$lib/FPQ2I3.svelte";
  import FPPainAcuity from "$lib/FPPainAcuity.svelte";
  import FPDiagnosisComparison from "$lib/FPDiagnosisComparison.svelte";
  import FPDiagnosisHistogram from "$lib/FPDiagnosisHistogram.svelte";
  import FPLengthOfStay from "$lib/FPLengthOfStay.svelte";
  import type {
    TDiagnosis,
    TEdStay,
    TMedRecon,
    TPyxis,
    TTriage,
    TVitalSign
  } from "../../types";

  const dataDirectory = `${base}/FP/data/mimic-iv-ed-demo-2.2/ed_cardiac_subset`;
  const allDataDirectory = `${base}/FP/data/mimic-iv-ed-demo-2.2/ed`;

  let diagnoses: TDiagnosis[] = $state([]);
  let allDiagnoses: TDiagnosis[] = $state([]);
  let edstays: TEdStay[] = $state([]);
  let allEdstays: TEdStay[] = $state([]);
  let medrecon: TMedRecon[] = $state([]);
  let pyxis: TPyxis[] = $state([]);
  let triage: TTriage[] = $state([]);
  let allTriage: TTriage[] = $state([]);
  let vitalsigns: TVitalSign[] = $state([]);

  function parseNumber(value: string | undefined): number | null {
    if (value === undefined || value.trim() === "") return null;

    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  function parseDate(value: string | undefined): Date | null {
    if (value === undefined || value.trim() === "") return null;

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function parseRequiredDate(value: string | undefined): Date {
    const parsed = parseDate(value);
    if (parsed === null) throw new Error(`Invalid date value: ${value}`);

    return parsed;
  }

  async function loadDiagnoses(): Promise<TDiagnosis[]> {
    return d3.csv(`${dataDirectory}/diagnosis.csv`, (row) => ({
      subject_id: Number(row.subject_id),
      stay_id: Number(row.stay_id),
      seq_num: Number(row.seq_num),
      icd_code: row.icd_code,
      icd_version: Number(row.icd_version),
      icd_title: row.icd_title
    }));
  }

  async function loadAllDiagnoses(): Promise<TDiagnosis[]> {
    return d3.csv(`${allDataDirectory}/diagnosis.csv`, (row) => ({
      subject_id: Number(row.subject_id),
      stay_id: Number(row.stay_id),
      seq_num: Number(row.seq_num),
      icd_code: row.icd_code,
      icd_version: Number(row.icd_version),
      icd_title: row.icd_title
    }));
  }

  async function loadEdStays(): Promise<TEdStay[]> {
    return d3.csv(`${dataDirectory}/edstays.csv`, (row) => ({
      subject_id: Number(row.subject_id),
      hadm_id: parseNumber(row.hadm_id),
      stay_id: Number(row.stay_id),
      intime: parseRequiredDate(row.intime),
      outtime: parseRequiredDate(row.outtime),
      gender: row.gender,
      race: row.race,
      arrival_transport: row.arrival_transport,
      disposition: row.disposition
    }));
  }

  async function loadAllEdStays(): Promise<TEdStay[]> {
    return d3.csv(`${allDataDirectory}/edstays.csv`, (row) => ({
      subject_id: Number(row.subject_id),
      hadm_id: parseNumber(row.hadm_id),
      stay_id: Number(row.stay_id),
      intime: parseRequiredDate(row.intime),
      outtime: parseRequiredDate(row.outtime),
      gender: row.gender,
      race: row.race,
      arrival_transport: row.arrival_transport,
      disposition: row.disposition
    }));
  }

  async function loadMedRecon(): Promise<TMedRecon[]> {
    return d3.csv(`${dataDirectory}/medrecon.csv`, (row) => ({
      subject_id: Number(row.subject_id),
      stay_id: Number(row.stay_id),
      charttime: parseRequiredDate(row.charttime),
      name: row.name,
      gsn: row.gsn,
      ndc: row.ndc,
      etc_rn: Number(row.etc_rn),
      etccode: row.etccode || null,
      etcdescription: row.etcdescription || null
    }));
  }

  async function loadPyxis(): Promise<TPyxis[]> {
    return d3.csv(`${dataDirectory}/pyxis.csv`, (row) => ({
      subject_id: Number(row.subject_id),
      stay_id: Number(row.stay_id),
      charttime: parseRequiredDate(row.charttime),
      med_rn: Number(row.med_rn),
      name: row.name,
      gsn_rn: Number(row.gsn_rn),
      gsn: row.gsn || null
    }));
  }

  async function loadTriage(): Promise<TTriage[]> {
    return d3.csv(`${dataDirectory}/triage.csv`, (row) => ({
      subject_id: Number(row.subject_id),
      stay_id: Number(row.stay_id),
      temperature: parseNumber(row.temperature),
      heartrate: parseNumber(row.heartrate),
      resprate: parseNumber(row.resprate),
      o2sat: parseNumber(row.o2sat),
      sbp: parseNumber(row.sbp),
      dbp: parseNumber(row.dbp),
      pain: parseNumber(row.pain),
      acuity: parseNumber(row.acuity),
      chiefcomplaint: row.chiefcomplaint
    }));
  }

  async function loadAllTriage(): Promise<TTriage[]> {
    return d3.csv(`${allDataDirectory}/triage.csv`, (row) => ({
      subject_id: Number(row.subject_id),
      stay_id: Number(row.stay_id),
      temperature: parseNumber(row.temperature),
      heartrate: parseNumber(row.heartrate),
      resprate: parseNumber(row.resprate),
      o2sat: parseNumber(row.o2sat),
      sbp: parseNumber(row.sbp),
      dbp: parseNumber(row.dbp),
      pain: parseNumber(row.pain),
      acuity: parseNumber(row.acuity),
      chiefcomplaint: row.chiefcomplaint
    }));
  }

  async function loadVitalsigns(): Promise<TVitalSign[]> {
    return d3.csv(`${dataDirectory}/vitalsign.csv`, (row) => ({
      subject_id: Number(row.subject_id),
      stay_id: Number(row.stay_id),
      charttime: parseRequiredDate(row.charttime),
      temperature: parseNumber(row.temperature),
      heartrate: parseNumber(row.heartrate),
      resprate: parseNumber(row.resprate),
      o2sat: parseNumber(row.o2sat),
      sbp: parseNumber(row.sbp),
      dbp: parseNumber(row.dbp),
      rhythm: row.rhythm || null,
      pain: parseNumber(row.pain)
    }));
  }

  async function loadData() {
    try {
      [diagnoses, allDiagnoses, edstays, allEdstays, medrecon, pyxis, triage, allTriage, vitalsigns] =
        await Promise.all([
        loadDiagnoses(),
        loadAllDiagnoses(),
        loadEdStays(),
        loadAllEdStays(),
        loadMedRecon(),
        loadPyxis(),
        loadTriage(),
        loadAllTriage(),
        loadVitalsigns()
        ]);
    } catch (error) {
      console.error("Error loading ED CSV data:", error);
    }
  }

  onMount(loadData);
</script>

<h1>MIMIC-IV ED Data</h1>

<ul>
  <li>Diagnoses: {diagnoses.length}</li>
  <li>ED stays: {edstays.length}</li>
  <li>Medication reconciliation: {medrecon.length}</li>
  <li>Pyxis medication records: {pyxis.length}</li>
  <li>Triage records: {triage.length}</li>
  <li>Vital-sign records: {vitalsigns.length}</li>
</ul>

<FPSandbox edstays={edstays} />
<FPQ1I1 triage={triage} />
<FPQ1I2 diagnoses={diagnoses} />
<FPQ2I3 vitalsigns={vitalsigns} />
<FPPainAcuity cardiacTriage={triage} allTriage={allTriage} />
<FPDiagnosisComparison cardiacDiagnoses={diagnoses} allDiagnoses={allDiagnoses} />
<FPDiagnosisHistogram cardiacDiagnoses={diagnoses} allDiagnoses={allDiagnoses} />
<FPLengthOfStay cardiacEdstays={edstays} allEdstays={allEdstays} />
