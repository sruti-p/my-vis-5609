#!/usr/bin/env python3
"""List subject IDs with likely cardiac-related ED diagnoses."""

import csv
import re
from pathlib import Path


DIAGNOSIS_FILE = Path(__file__).parent / "ed" / "diagnosis.csv"

CARDIAC_TERMS = re.compile(
    r"\b(?:"
    r"heart|cardiac|myocard|coronar|ischemi|infarct|"
    r"atrial|ventric|fibrillat|flutter|tachycard|bradycard|arrhythm|"
    r"congestive|pericard|valv|angina|hypertens|chest pain|aortic"
    r")\b",
    re.IGNORECASE,
)


def cardiac_subject_ids() -> set[str]:
    subject_ids: set[str] = set()

    with DIAGNOSIS_FILE.open(newline="", encoding="utf-8") as diagnosis_file:
        for diagnosis in csv.DictReader(diagnosis_file):
            title = diagnosis.get("icd_title", "")
            subject_id = diagnosis.get("subject_id", "")

            if subject_id and CARDIAC_TERMS.search(title):
                subject_ids.add(subject_id)

    return subject_ids


if __name__ == "__main__":
    for subject_id in sorted(cardiac_subject_ids(), key=int):
        print(subject_id)
