export type TMovie = {
    num_votes: number;
    runtime_minutes:  number;
    genres: string[];
    year: Date;
    average_rating: number;
    tconst: string;
    title_type: string;
    primary_title: string;
    original_title: string;
}

export type TDiagnosis = {
    subject_id: number;
    stay_id: number;
    seq_num: number;
    icd_code: string;
    icd_version: number;
    icd_title: string;
};

export type TEdStay = {
    subject_id: number;
    hadm_id: number | null;
    stay_id: number;
    intime: Date;
    outtime: Date;
    gender: string;
    race: string;
    arrival_transport: string;
    disposition: string;
};

export type TMedRecon = {
    subject_id: number;
    stay_id: number;
    charttime: Date;
    name: string;
    gsn: string;
    ndc: string;
    etc_rn: number;
    etccode: string | null;
    etcdescription: string | null;
};

export type TPyxis = {
    subject_id: number;
    stay_id: number;
    charttime: Date;
    med_rn: number;
    name: string;
    gsn_rn: number;
    gsn: string | null;
};

export type TTriage = {
    subject_id: number;
    stay_id: number;
    temperature: number | null;
    heartrate: number | null;
    resprate: number | null;
    o2sat: number | null;
    sbp: number | null;
    dbp: number | null;
    pain: number | null;
    acuity: number | null;
    chiefcomplaint: string;
};

export type TVitalSign = {
    subject_id: number;
    stay_id: number;
    charttime: Date;
    temperature: number | null;
    heartrate: number | null;
    resprate: number | null;
    o2sat: number | null;
    sbp: number | null;
    dbp: number | null;
    rhythm: string | null;
    pain: number | null;
};
