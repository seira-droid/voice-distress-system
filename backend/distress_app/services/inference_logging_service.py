"""
Inference Logging Service
Logs structured inference data for future ML model training.
"""

import json
import os
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

# Dataset version tracking
DATASET_VERSION = "v1.0.0"


def log_inference_data(data: Dict[str, Any]) -> bool:
    """
    Log structured inference data for ML training.
    
    Args:
        data: Dict containing:
            - transcription: str
            - voice_features: dict
            - text_score: float
            - voice_score: float
            - text_confidence: float
            - voice_confidence: float
            - final_risk_score: float
            - alert_triggered: bool
            - timestamp: datetime
            
    Returns:
        bool: True if logging succeeded, False otherwise
    """
    try:
        # Data quality filtering
        if not _passes_quality_check(data):
            logger.warning("Inference data failed quality check, skipping log")
            return False
        
        # Auto-label based on risk score
        label = _assign_label(data.get("final_risk_score", 0.0))
        
        # Create log entry
        log_entry = {
            "dataset_version": DATASET_VERSION,
            "timestamp": data.get("timestamp", datetime.utcnow().isoformat()),
            "transcription": data.get("transcription", ""),
            "voice_features": data.get("voice_features", {}),
            "text_score": data.get("text_score", 0.0),
            "voice_score": data.get("voice_score", 0.0),
            "text_confidence": data.get("text_confidence", 0.0),
            "voice_confidence": data.get("voice_confidence", 0.0),
            "risk_score": data.get("final_risk_score", 0.0),
            "alert_triggered": data.get("alert_triggered", False),
            "label": label
        }
        
        # Try to log to database first
        try:
            _log_to_database(log_entry)
            return True
        except Exception as db_error:
            logger.warning(f"Database logging failed, falling back to file: {db_error}")
            return _log_to_file(log_entry)
            
    except Exception as e:
        logger.error(f"Inference logging error: {e}")
        return False


def _passes_quality_check(data: Dict[str, Any]) -> bool:
    """
    Check if inference data meets quality standards.
    
    Args:
        data: Inference data dict
        
    Returns:
        bool: True if passes quality check
    """
    # Exclude if transcription is empty
    transcription = data.get("transcription", "").strip()
    if not transcription:
        logger.warning("Quality check failed: transcription is empty")
        return False
    
    # Exclude if risk_score is null
    risk_score = data.get("final_risk_score")
    if risk_score is None:
        logger.warning("Quality check failed: risk_score is None")
        return False
    
    # Warn if voice feature extraction failed (all zeros), but don't reject
    voice_features = data.get("voice_features", {})
    if voice_features:
        all_zeros = all(
            voice_features.get(feature, 0.0) == 0.0 
            for feature in ["pitch", "energy", "speech_rate", "pause_ratio"]
        )
        if all_zeros:
            logger.info("Voice features unavailable for this inference. Saving with zero-valued features.")
    
    return True


def _assign_label(risk_score: float) -> str:
    """
    Assign emotion label based on risk score.
    
    Args:
        risk_score: Risk score (0-100)
        
    Returns:
        str: Label ("distress" | "low_risk" | "neutral")
    """
    if risk_score >= 70:
        return "distress"
    elif risk_score >= 40:
        return "low_risk"
    else:
        return "neutral"


def _log_to_database(log_entry: Dict[str, Any]) -> None:
    """
    Log inference data to database.
    
    Args:
        log_entry: Structured log entry
    """
    try:
        from ..models import InferenceLog
        
        InferenceLog.objects.create(
            timestamp=datetime.fromisoformat(log_entry["timestamp"].replace('Z', '+00:00')),
            transcription=log_entry["transcription"],
            voice_features=log_entry["voice_features"],
            text_score=log_entry["text_score"],
            voice_score=log_entry["voice_score"],
            text_confidence=log_entry["text_confidence"],
            voice_confidence=log_entry["voice_confidence"],
            final_risk_score=log_entry["risk_score"],
            alert_triggered=log_entry["alert_triggered"],
            label=log_entry["label"],
            dataset_version=log_entry["dataset_version"]
        )
        
    except ImportError:
        # Model doesn't exist yet, skip database logging
        raise Exception("InferenceLog model not found")


def _log_to_file(log_entry: Dict[str, Any]) -> bool:
    """
    Log inference data to file as fallback.
    
    Args:
        log_entry: Structured log entry
        
    Returns:
        bool: True if file logging succeeded
    """
    try:
        log_dir = os.path.join(os.path.dirname(__file__), "..", "..", "logs")
        os.makedirs(log_dir, exist_ok=True)
        log_file = os.path.join(log_dir, "inference_logs.jsonl")
        
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry) + "\n")
        
        return True
    except Exception as e:
        logger.error(f"File logging failed: {e}")
        return False


def get_inference_logs(limit: int = 100) -> list:
    """
    Retrieve recent inference logs for analysis.
    
    Args:
        limit: Maximum number of logs to retrieve
        
    Returns:
        list: List of inference log entries
    """
    try:
        # Try database first
        try:
            from ..models import InferenceLog
            logs = InferenceLog.objects.all().order_by("-timestamp")[:limit]
            return [
                {
                    "timestamp": log.timestamp.isoformat(),
                    "transcription": log.transcription,
                    "voice_features": log.voice_features,
                    "text_score": log.text_score,
                    "voice_score": log.voice_score,
                    "text_confidence": log.text_confidence,
                    "voice_confidence": log.voice_confidence,
                    "final_risk_score": log.final_risk_score,
                    "alert_triggered": log.alert_triggered,
                    "label": log.label,
                    "dataset_version": log.dataset_version
                }
                for log in logs
            ]
        except ImportError:
            pass
        
        # Fallback to file
        log_dir = os.path.join(os.path.dirname(__file__), "..", "..", "logs")
        log_file = os.path.join(log_dir, "inference_logs.jsonl")
        
        if not os.path.exists(log_file):
            return []
        
        logs = []
        with open(log_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        logs.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
        
        return logs[-limit:] if len(logs) > limit else logs
        
    except Exception as e:
        logger.error(f"Error retrieving inference logs: {e}")
        return []


def export_dataset(format: str = "jsonl", limit: Optional[int] = None) -> str:
    """
    Export inference logs as ML-ready dataset.
    
    Args:
        format: Export format ("jsonl" or "csv")
        limit: Maximum number of records to export (None for all)
        
    Returns:
        str: Path to exported file
    """
    try:
        # Get all logs
        logs = get_inference_logs(limit=limit or 10000)
        
        if not logs:
            logger.warning("No logs to export")
            return ""
        
        # Create export directory
        export_dir = os.path.join(os.path.dirname(__file__), "..", "..", "exports")
        os.makedirs(export_dir, exist_ok=True)
        
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        
        if format == "csv":
            return _export_csv(logs, export_dir, timestamp)
        else:
            return _export_jsonl(logs, export_dir, timestamp)
            
    except Exception as e:
        logger.error(f"Dataset export failed: {e}")
        return ""


def _export_csv(logs: List[Dict], export_dir: str, timestamp: str) -> str:
    """
    Export logs to CSV format with flattened structure.
    
    Args:
        logs: List of log entries
        export_dir: Export directory path
        timestamp: Timestamp string for filename
        
    Returns:
        str: Path to exported file
    """
    try:
        import csv
        
        csv_file = os.path.join(export_dir, f"dataset_{timestamp}.csv")
        
        # Flatten logs for CSV
        flattened_logs = []
        for log in logs:
            voice_features = log.get("voice_features", {})
            flattened = {
                "timestamp": log.get("timestamp", ""),
                "transcription": log.get("transcription", ""),
                "pitch": voice_features.get("pitch", 0.0),
                "energy": voice_features.get("energy", 0.0),
                "speech_rate": voice_features.get("speech_rate", 0.0),
                "pause_ratio": voice_features.get("pause_ratio", 0.0),
                "text_score": log.get("text_score", 0.0),
                "voice_score": log.get("voice_score", 0.0),
                "text_confidence": log.get("text_confidence", 0.0),
                "voice_confidence": log.get("voice_confidence", 0.0),
                "risk_score": log.get("final_risk_score", 0.0),
                "label": log.get("label", "neutral"),
                "dataset_version": log.get("dataset_version", DATASET_VERSION)
            }
            flattened_logs.append(flattened)
        
        # Write CSV
        if flattened_logs:
            fieldnames = flattened_logs[0].keys()
            with open(csv_file, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(flattened_logs)
        
        logger.info(f"Exported {len(flattened_logs)} records to {csv_file}")
        return csv_file
        
    except Exception as e:
        logger.error(f"CSV export failed: {e}")
        return ""


def _export_jsonl(logs: List[Dict], export_dir: str, timestamp: str) -> str:
    """
    Export logs to JSONL format with flattened structure.
    
    Args:
        logs: List of log entries
        export_dir: Export directory path
        timestamp: Timestamp string for filename
        
    Returns:
        str: Path to exported file
    """
    try:
        jsonl_file = os.path.join(export_dir, f"dataset_{timestamp}.jsonl")
        
        # Flatten logs for JSONL
        with open(jsonl_file, "w", encoding="utf-8") as f:
            for log in logs:
                voice_features = log.get("voice_features", {})
                flattened = {
                    "timestamp": log.get("timestamp", ""),
                    "transcription": log.get("transcription", ""),
                    "pitch": voice_features.get("pitch", 0.0),
                    "energy": voice_features.get("energy", 0.0),
                    "speech_rate": voice_features.get("speech_rate", 0.0),
                    "pause_ratio": voice_features.get("pause_ratio", 0.0),
                    "text_score": log.get("text_score", 0.0),
                    "voice_score": log.get("voice_score", 0.0),
                    "text_confidence": log.get("text_confidence", 0.0),
                    "voice_confidence": log.get("voice_confidence", 0.0),
                    "risk_score": log.get("final_risk_score", 0.0),
                    "label": log.get("label", "neutral"),
                    "dataset_version": log.get("dataset_version", DATASET_VERSION)
                }
                f.write(json.dumps(flattened) + "\n")
        
        logger.info(f"Exported {len(logs)} records to {jsonl_file}")
        return jsonl_file
        
    except Exception as e:
        logger.error(f"JSONL export failed: {e}")
        return ""