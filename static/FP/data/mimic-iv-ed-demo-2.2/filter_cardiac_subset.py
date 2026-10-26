#!/usr/bin/env python3
"""Write cardiac-subset copies of every ED CSV file."""

import csv
from pathlib import Path

from list_cardiac_subject_ids import cardiac_subject_ids


DATA_DIRECTORY = Path(__file__).parent
SOURCE_DIRECTORY = DATA_DIRECTORY / "ed"
OUTPUT_DIRECTORY = DATA_DIRECTORY / "ed_cardiac_subset"


def filter_csv(source_path: Path, subject_ids: set[str]) -> tuple[Path, int]:
    output_path = OUTPUT_DIRECTORY / source_path.name
    row_count = 0

    with source_path.open(newline="", encoding="utf-8") as source_file:
        reader = csv.DictReader(source_file)
        if reader.fieldnames is None:
            raise ValueError(f"CSV has no header: {source_path}")
        if "subject_id" not in reader.fieldnames:
            raise ValueError(f"CSV has no subject_id column: {source_path}")

        with output_path.open("w", newline="", encoding="utf-8") as output_file:
            writer = csv.DictWriter(output_file, fieldnames=reader.fieldnames)
            writer.writeheader()

            for row in reader:
                if row.get("subject_id", "") in subject_ids:
                    writer.writerow(row)
                    row_count += 1

    return output_path, row_count


def main() -> None:
    subject_ids = cardiac_subject_ids()
    OUTPUT_DIRECTORY.mkdir(parents=True, exist_ok=True)

    for source_path in sorted(SOURCE_DIRECTORY.glob("*.csv")):
        output_path, row_count = filter_csv(source_path, subject_ids)
        print(f"{output_path.name}: {row_count} rows")


if __name__ == "__main__":
    main()
