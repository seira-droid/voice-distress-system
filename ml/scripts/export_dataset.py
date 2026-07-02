"""
Dataset Export and Validation Script
Exports inference logs to ML-ready datasets with validation.
"""

import os
import sys
import json
import csv
from datetime import datetime
from typing import Dict, List, Set
from collections import Counter

# Add project root to path
project_root = os.path.join(os.path.dirname(__file__), "..", "..")
sys.path.insert(0, project_root)

# Initialize Django before importing models
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.config.settings")
import django
django.setup()

from backend.distress_app.services.inference_logging_service import get_inference_logs


# Configuration
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "datasets")
CSV_FILENAME = "voice_distress_dataset.csv"
JSONL_FILENAME = "voice_distress_dataset.jsonl"

# Required fields for validation
REQUIRED_FIELDS = ["transcription", "risk_score", "label", "timestamp"]


def validate_record(record: Dict) -> bool:
    """
    Validate a single record for quality.
    
    Args:
        record: Inference log record
        
    Returns:
        bool: True if record is valid
    """
    # Check required fields exist
    for field in REQUIRED_FIELDS:
        if field not in record or record[field] is None:
            return False
    
    # Check transcription is not empty
    transcription = record.get("transcription", "").strip()
    if not transcription:
        return False
    
    # Check risk_score is valid
    risk_score = record.get("risk_score")
    if risk_score is None or not isinstance(risk_score, (int, float)):
        return False
    
    # Check label is valid
    label = record.get("label", "")
    if label not in ["distress", "low_risk", "neutral"]:
        return False
    
    return True


def remove_duplicates(records: List[Dict]) -> List[Dict]:
    """
    Remove duplicate records based on transcription and timestamp.
    
    Args:
        records: List of inference records
        
    Returns:
        List[Dict]: Deduplicated records
    """
    seen: Set[str] = set()
    unique_records = []
    
    for record in records:
        # Create unique key from transcription and timestamp
        transcription = record.get("transcription", "").strip()
        timestamp = record.get("timestamp", "")
        key = f"{transcription}_{timestamp}"
        
        if key not in seen:
            seen.add(key)
            unique_records.append(record)
    
    return unique_records


def flatten_record(record: Dict) -> Dict:
    """
    Flatten voice features into top-level columns.
    
    Args:
        record: Inference log record with nested voice_features
        
    Returns:
        Dict: Flattened record
    """
    voice_features = record.get("voice_features", {})
    
    return {
        "timestamp": record.get("timestamp", ""),
        "transcription": record.get("transcription", ""),
        "pitch": voice_features.get("pitch", 0.0),
        "energy": voice_features.get("energy", 0.0),
        "speech_rate": voice_features.get("speech_rate", 0.0),
        "pause_ratio": voice_features.get("pause_ratio", 0.0),
        "text_score": record.get("text_score", 0.0),
        "voice_score": record.get("voice_score", 0.0),
        "risk_score": record.get("risk_score", 0.0),
        "label": record.get("label", "neutral"),
        "text_confidence": record.get("text_confidence", 0.0),
        "voice_confidence": record.get("voice_confidence", 0.0)
    }


def export_to_csv(records: List[Dict], output_path: str) -> bool:
    """
    Export records to CSV format.
    
    Args:
        records: List of flattened records
        output_path: Path to output CSV file
        
    Returns:
        bool: True if export succeeded
    """
    try:
        if not records:
            print("No records to export")
            return False
        
        # Get fieldnames from first record
        fieldnames = list(records[0].keys())
        
        with open(output_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(records)
        
        return True
    except Exception as e:
        print(f"CSV export failed: {e}")
        return False


def export_to_jsonl(records: List[Dict], output_path: str) -> bool:
    """
    Export records to JSONL format.
    
    Args:
        records: List of flattened records
        output_path: Path to output JSONL file
        
    Returns:
        bool: True if export succeeded
    """
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            for record in records:
                f.write(json.dumps(record) + "\n")
        
        return True
    except Exception as e:
        print(f"JSONL export failed: {e}")
        return False


def print_summary(records: List[Dict]) -> None:
    """
    Print dataset summary statistics.
    
    Args:
        records: List of flattened records
    """
    if not records:
        print("\nNo records to summarize")
        return
    
    print("\n" + "="*60)
    print("DATASET EXPORT SUMMARY")
    print("="*60)
    
    # Total records
    print(f"Total Records: {len(records)}")
    
    # Label counts
    label_counts = Counter(record.get("label", "unknown") for record in records)
    print(f"\nLabel Distribution:")
    for label, count in sorted(label_counts.items()):
        percentage = (count / len(records)) * 100
        print(f"  {label:12s}: {count:5d} ({percentage:5.1f}%)")
    
    # Average metrics
    print(f"\nAverage Metrics:")
    
    risk_scores = [r.get("risk_score", 0) for r in records if r.get("risk_score") is not None]
    if risk_scores:
        avg_risk = sum(risk_scores) / len(risk_scores)
        print(f"  Risk Score:    {avg_risk:6.2f}")
    
    pitches = [r.get("pitch", 0) for r in records if r.get("pitch", 0) > 0]
    if pitches:
        avg_pitch = sum(pitches) / len(pitches)
        print(f"  Pitch:         {avg_pitch:6.2f} Hz")
    
    speech_rates = [r.get("speech_rate", 0) for r in records if r.get("speech_rate", 0) > 0]
    if speech_rates:
        avg_speech_rate = sum(speech_rates) / len(speech_rates)
        print(f"  Speech Rate:   {avg_speech_rate:6.2f} words/sec")
    
    energies = [r.get("energy", 0) for r in records if r.get("energy", 0) > 0]
    if energies:
        avg_energy = sum(energies) / len(energies)
        print(f"  Energy:        {avg_energy:6.3f}")
    
    pause_ratios = [r.get("pause_ratio", 0) for r in records if r.get("pause_ratio", 0) > 0]
    if pause_ratios:
        avg_pause_ratio = sum(pause_ratios) / len(pause_ratios)
        print(f"  Pause Ratio:   {avg_pause_ratio:6.3f}")
    
    print("="*60)


def main():
    """Main export function."""
    print("Starting dataset export...")
    print(f"Output directory: {OUTPUT_DIR}\n")
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Fetch all inference logs
    print("Fetching inference logs...")
    records = get_inference_logs(limit=10000)  # Export up to 10,000 records
    print(f"Fetched {len(records)} records\n")
    
    # Validate records
    print("Validating records...")
    valid_records = [r for r in records if validate_record(r)]
    print(f"Valid records: {len(valid_records)}")
    print(f"Invalid records removed: {len(records) - len(valid_records)}\n")
    
    # Remove duplicates
    print("Removing duplicates...")
    unique_records = remove_duplicates(valid_records)
    print(f"Unique records: {len(unique_records)}")
    print(f"Duplicates removed: {len(valid_records) - len(unique_records)}\n")
    
    # Flatten records
    print("Flattening records...")
    flattened_records = [flatten_record(r) for r in unique_records]
    
    # Export to CSV
    csv_path = os.path.join(OUTPUT_DIR, CSV_FILENAME)
    print(f"Exporting to CSV: {csv_path}")
    csv_success = export_to_csv(flattened_records, csv_path)
    if csv_success:
        print(f"✓ CSV export successful ({len(flattened_records)} records)\n")
    
    # Export to JSONL
    jsonl_path = os.path.join(OUTPUT_DIR, JSONL_FILENAME)
    print(f"Exporting to JSONL: {jsonl_path}")
    jsonl_success = export_to_jsonl(flattened_records, jsonl_path)
    if jsonl_success:
        print(f"✓ JSONL export successful ({len(flattened_records)} records)\n")
    
    # Print summary
    print_summary(flattened_records)
    
    # Final status
    if csv_success or jsonl_success:
        print(f"\n✓ Dataset export completed successfully!")
        print(f"  CSV:  {csv_path}")
        print(f"  JSONL: {jsonl_path}")
        return 0
    else:
        print("\n✗ Dataset export failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())