# Machine Learning Directory

This directory contains all machine learning-related code, datasets, and models for the Voice Distress System.

## Directory Structure

### `datasets/`
Stores ML-ready datasets exported from the backend inference pipeline.
- Datasets are exported as JSONL or CSV files
- Files are named with timestamps: `dataset_YYYYMMDD_HHMMSS.jsonl`
- Contains labeled inference data with text and voice features
- Used for training and evaluating ML models

### `exports/`
Temporary export directory for dataset generation.
- Backend exports are temporarily stored here before moving to `datasets/`
- Can be cleaned after dataset consolidation

### `models/`
Stores trained ML models and model artifacts.
- Model files: `.pkl`, `.joblib`, `.h5`, etc.
- Model metadata and performance metrics
- Version-controlled model releases

### `notebooks/`
Jupyter notebooks for:
- Exploratory data analysis (EDA)
- Model experimentation and prototyping
- Visualization of inference logs
- Performance analysis and reporting

### `scripts/`
Python scripts for:
- Dataset preprocessing and cleaning
- Model training pipelines
- Model evaluation and validation
- Automated dataset export from backend
- Data quality checks and validation

## Dataset Schema

Each record in the dataset contains:

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "transcription": "help me please",
  "pitch": 150.5,
  "energy": 0.45,
  "speech_rate": 2.3,
  "pause_ratio": 0.15,
  "text_score": 75.0,
  "voice_score": 45.0,
  "text_confidence": 0.75,
  "voice_confidence": 0.55,
  "risk_score": 65,
  "label": "distress" | "low_risk" | "neutral",
  "dataset_version": "v1.0.0"
}
```

## Labels

- **distress**: risk_score >= 70 (emergency situation detected)
- **low_risk**: 40 <= risk_score < 70 (potential concern)
- **neutral**: risk_score < 40 (safe environment)

## Getting Started

1. Export dataset from backend using `export_dataset()` function
2. Explore data in `notebooks/`
3. Preprocess data using scripts in `scripts/`
4. Train models and save to `models/`
5. Version and track experiments

## Notes

- Do not commit model files or large datasets to git (see `.gitignore`)
- Use the backend's inference logging system to collect training data
- Dataset version is tracked in every record for reproducibility
- All inference data is automatically labeled using rule-based system (bootstrap strategy)