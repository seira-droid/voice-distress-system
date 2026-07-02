"""
Dataset Analysis Script
Analyzes the voice distress dataset and generates visualizations and reports.
"""

import os
import sys
import json
from datetime import datetime
from typing import Dict, List, Tuple

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

# Configuration
DATASET_PATH = os.path.join(os.path.dirname(__file__), "..", "datasets", "voice_distress_dataset.csv")
EXPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "exports")
REPORT_PATH = os.path.join(EXPORTS_DIR, "dataset_report.md")

# Numeric features for analysis
NUMERIC_FEATURES = ["pitch", "energy", "speech_rate", "pause_ratio", "risk_score"]

# Features for outlier detection
OUTLIER_FEATURES = ["pitch", "energy", "speech_rate", "pause_ratio", "risk_score"]


def load_dataset(path: str) -> pd.DataFrame:
    """Load dataset from CSV file."""
    try:
        df = pd.read_csv(path)
        print(f"✓ Loaded dataset: {len(df)} records")
        return df
    except Exception as e:
        print(f"✗ Failed to load dataset: {e}")
        sys.exit(1)


def analyze_missing_values(df: pd.DataFrame) -> Dict[str, int]:
    """Analyze missing values per column."""
    missing = df.isnull().sum()
    return {col: int(count) for col, count in missing.items() if count > 0}


def analyze_label_distribution(df: pd.DataFrame) -> Dict[str, int]:
    """Analyze label distribution."""
    if "label" not in df.columns:
        return {}
    
    distribution = df["label"].value_counts().to_dict()
    return {str(k): int(v) for k, v in distribution.items()}


def analyze_feature_statistics(df: pd.DataFrame) -> Dict[str, Dict[str, float]]:
    """Calculate statistics for numeric features."""
    stats_dict = {}
    
    for feature in NUMERIC_FEATURES:
        if feature in df.columns:
            feature_data = df[feature].dropna()
            if len(feature_data) > 0:
                stats_dict[feature] = {
                    "mean": float(feature_data.mean()),
                    "std": float(feature_data.std()),
                    "min": float(feature_data.min()),
                    "max": float(feature_data.max()),
                    "median": float(feature_data.median())
                }
    
    return stats_dict


def calculate_correlation_matrix(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate correlation matrix for numeric features."""
    available_features = [f for f in NUMERIC_FEATURES if f in df.columns]
    if not available_features:
        return pd.DataFrame()
    
    return df[available_features].corr()


def detect_outliers_iqr(df: pd.DataFrame, feature: str) -> Tuple[int, List[float]]:
    """
    Detect outliers using IQR method.
    
    Returns:
        Tuple of (outlier_count, outlier_values)
    """
    if feature not in df.columns:
        return 0, []
    
    data = df[feature].dropna()
    if len(data) == 0:
        return 0, []
    
    Q1 = data.quantile(0.25)
    Q3 = data.quantile(0.75)
    IQR = Q3 - Q1
    
    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR
    
    outliers = data[(data < lower_bound) | (data > upper_bound)]
    
    return len(outliers), outliers.tolist()


def plot_label_distribution(df: pd.DataFrame, output_path: str) -> bool:
    """Plot label distribution bar chart."""
    try:
        if "label" not in df.columns:
            return False
        
        plt.figure(figsize=(8, 6))
        label_counts = df["label"].value_counts()
        colors = ["#2ecc71", "#f39c12", "#e74c3c"]
        
        bars = plt.bar(label_counts.index, label_counts.values, color=colors[:len(label_counts)])
        plt.title("Label Distribution", fontsize=14, fontweight="bold")
        plt.xlabel("Label", fontsize=12)
        plt.ylabel("Count", fontsize=12)
        plt.xticks(rotation=45)
        
        # Add count labels on bars
        for bar in bars:
            height = bar.get_height()
            plt.text(bar.get_x() + bar.get_width()/2., height,
                    f"{int(height)}", ha="center", va="bottom")
        
        plt.tight_layout()
        plt.savefig(output_path, dpi=300, bbox_inches="tight")
        plt.close()
        return True
    except Exception as e:
        print(f"Failed to plot label distribution: {e}")
        return False


def plot_histogram(df: pd.DataFrame, feature: str, output_path: str, 
                   title: str, color: str = "#3498db") -> bool:
    """Plot histogram for a feature."""
    try:
        if feature not in df.columns:
            return False
        
        plt.figure(figsize=(8, 6))
        data = df[feature].dropna()
        
        plt.hist(data, bins=50, color=color, edgecolor="black", alpha=0.7)
        plt.title(title, fontsize=14, fontweight="bold")
        plt.xlabel(feature, fontsize=12)
        plt.ylabel("Frequency", fontsize=12)
        plt.grid(axis="y", alpha=0.3)
        
        # Add statistics text
        mean_val = data.mean()
        std_val = data.std()
        plt.axvline(mean_val, color="red", linestyle="--", linewidth=2, label=f"Mean: {mean_val:.2f}")
        plt.legend()
        
        plt.tight_layout()
        plt.savefig(output_path, dpi=300, bbox_inches="tight")
        plt.close()
        return True
    except Exception as e:
        print(f"Failed to plot {feature} histogram: {e}")
        return False


def plot_correlation_heatmap(correlation_matrix: pd.DataFrame, output_path: str) -> bool:
    """Plot correlation heatmap."""
    try:
        if correlation_matrix.empty:
            return False
        
        plt.figure(figsize=(10, 8))
        sns.heatmap(correlation_matrix, annot=True, cmap="coolwarm", center=0,
                   square=True, linewidths=0.5, cbar_kws={"shrink": 0.8}, fmt=".2f")
        plt.title("Feature Correlation Heatmap", fontsize=14, fontweight="bold")
        plt.tight_layout()
        plt.savefig(output_path, dpi=300, bbox_inches="tight")
        plt.close()
        return True
    except Exception as e:
        print(f"Failed to plot correlation heatmap: {e}")
        return False


def generate_report(df: pd.DataFrame, missing_values: Dict, label_dist: Dict,
                   feature_stats: Dict, correlation_matrix: pd.DataFrame,
                   outliers: Dict[str, Tuple[int, List[float]]], output_path: str) -> bool:
    """Generate markdown report."""
    try:
        report = []
        report.append("# Dataset Analysis Report")
        report.append(f"\n**Generated:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")
        report.append("\n---\n")
        
        # Dataset Size
        report.append("## Dataset Overview")
        report.append(f"\n**Total Samples:** {len(df)}")
        report.append(f"\n**Total Features:** {len(df.columns)}")
        report.append(f"\n**Features:** {', '.join(df.columns.tolist())}")
        report.append("\n---\n")
        
        # Class Balance
        report.append("## Class Balance")
        if label_dist:
            total = sum(label_dist.values())
            report.append(f"\nTotal labeled samples: {total}\n")
            for label, count in sorted(label_dist.items()):
                percentage = (count / total) * 100 if total > 0 else 0
                report.append(f"- **{label}**: {count} ({percentage:.1f}%)")
        else:
            report.append("\nNo label information available.")
        report.append("\n---\n")
        
        # Missing Values
        report.append("## Missing Values")
        if missing_values:
            report.append(f"\nTotal columns with missing values: {len(missing_values)}\n")
            for col, count in sorted(missing_values.items()):
                percentage = (count / len(df)) * 100
                report.append(f"- **{col}**: {count} ({percentage:.1f}%)")
        else:
            report.append("\n✓ No missing values detected.")
        report.append("\n---\n")
        
        # Feature Statistics
        report.append("## Feature Statistics")
        if feature_stats:
            report.append("\n| Feature | Mean | Std | Min | Max | Median |")
            report.append("|---------|------|-----|-----|-----|--------|")
            for feature, stats in feature_stats.items():
                report.append(f"| {feature} | {stats['mean']:.2f} | {stats['std']:.2f} | "
                            f"{stats['min']:.2f} | {stats['max']:.2f} | {stats['median']:.2f} |")
        report.append("\n---\n")
        
        # Outliers
        report.append("## Outlier Detection (IQR Method)")
        report.append("\n| Feature | Outlier Count | Percentage |")
        report.append("|---------|---------------|------------|")
        for feature, (count, values) in sorted(outliers.items()):
            percentage = (count / len(df)) * 100 if len(df) > 0 else 0
            report.append(f"| {feature} | {count} | {percentage:.1f}% |")
        report.append("\n---\n")
        
        # Recommendations
        report.append("## Recommendations Before Model Training")
        recommendations = []
        
        # Check class balance
        if label_dist:
            total = sum(label_dist.values())
            max_count = max(label_dist.values()) if label_dist else 0
            min_count = min(label_dist.values()) if label_dist else 0
            if max_count > 0 and (max_count / min_count) > 3:
                recommendations.append("- **Class Imbalance Detected**: Consider using SMOTE or class weights during training")
        
        # Check missing values
        if missing_values:
            recommendations.append("- **Missing Values**: Consider imputation strategies (mean, median, or model-based)")
        
        # Check outliers
        total_outliers = sum(count for count, _ in outliers.values())
        if total_outliers > 0:
            outlier_percentage = (total_outliers / (len(df) * len(OUTLIER_FEATURES))) * 100
            if outlier_percentage > 5:
                recommendations.append("- **Outliers Detected**: Consider outlier removal or robust scaling")
        
        # Check sample size
        if len(df) < 100:
            recommendations.append("- **Small Dataset**: Consider collecting more data or using data augmentation")
        
        # Check feature correlation
        if not correlation_matrix.empty:
            high_corr = []
            for i in range(len(correlation_matrix.columns)):
                for j in range(i+1, len(correlation_matrix.columns)):
                    corr_val = correlation_matrix.iloc[i, j]
                    if abs(corr_val) > 0.8:
                        feat1 = correlation_matrix.columns[i]
                        feat2 = correlation_matrix.columns[j]
                        high_corr.append(f"{feat1} - {feat2}")
            
            if high_corr:
                recommendations.append(f"- **High Correlation**: Consider feature selection for: {', '.join(high_corr)}")
        
        if recommendations:
            report.extend(recommendations)
        else:
            report.append("- ✓ Dataset looks good for model training!")
        
        report.append("\n---\n")
        report.append("## Generated Plots")
        report.append("\nThe following plots have been generated in `ml/exports/`:")
        report.append("\n1. `label_distribution.png` - Class distribution")
        report.append("2. `risk_score_histogram.png` - Risk score distribution")
        report.append("3. `pitch_histogram.png` - Pitch distribution")
        report.append("4. `energy_histogram.png` - Energy distribution")
        report.append("5. `speech_rate_histogram.png` - Speech rate distribution")
        report.append("6. `pause_ratio_histogram.png` - Pause ratio distribution")
        report.append("7. `correlation_heatmap.png` - Feature correlations")
        
        # Write report
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\n".join(report))
        
        return True
    except Exception as e:
        print(f"Failed to generate report: {e}")
        return False


def main():
    """Main analysis function."""
    print("="*60)
    print("DATASET ANALYSIS")
    print("="*60)
    print(f"\nDataset: {DATASET_PATH}")
    print(f"Exports: {EXPORTS_DIR}\n")
    
    # Create exports directory
    os.makedirs(EXPORTS_DIR, exist_ok=True)
    
    # Load dataset
    df = load_dataset(DATASET_PATH)
    
    if len(df) == 0:
        print("✗ Dataset is empty")
        sys.exit(1)
    
    # Analysis
    print("\nPerforming analysis...")
    
    # Missing values
    missing_values = analyze_missing_values(df)
    print(f"✓ Missing values analyzed: {len(missing_values)} columns affected")
    
    # Label distribution
    label_dist = analyze_label_distribution(df)
    print(f"✓ Label distribution analyzed: {len(label_dist)} classes")
    
    # Feature statistics
    feature_stats = analyze_feature_statistics(df)
    print(f"✓ Feature statistics calculated: {len(feature_stats)} features")
    
    # Correlation matrix
    correlation_matrix = calculate_correlation_matrix(df)
    print(f"✓ Correlation matrix calculated")
    
    # Outlier detection
    outliers = {}
    for feature in OUTLIER_FEATURES:
        count, values = detect_outliers_iqr(df, feature)
        outliers[feature] = (count, values)
    total_outliers = sum(count for count, _ in outliers.values())
    print(f"✓ Outlier detection completed: {total_outliers} total outliers")
    
    # Generate plots
    print("\nGenerating plots...")
    plots_generated = 0
    
    # Label distribution
    if plot_label_distribution(df, os.path.join(EXPORTS_DIR, "label_distribution.png")):
        plots_generated += 1
    
    # Risk score histogram
    if plot_histogram(df, "risk_score", os.path.join(EXPORTS_DIR, "risk_score_histogram.png"),
                     "Risk Score Distribution", "#e74c3c"):
        plots_generated += 1
    
    # Pitch histogram
    if plot_histogram(df, "pitch", os.path.join(EXPORTS_DIR, "pitch_histogram.png"),
                     "Pitch Distribution", "#3498db"):
        plots_generated += 1
    
    # Energy histogram
    if plot_histogram(df, "energy", os.path.join(EXPORTS_DIR, "energy_histogram.png"),
                     "Energy Distribution", "#2ecc71"):
        plots_generated += 1
    
    # Speech rate histogram
    if plot_histogram(df, "speech_rate", os.path.join(EXPORTS_DIR, "speech_rate_histogram.png"),
                     "Speech Rate Distribution", "#9b59b6"):
        plots_generated += 1
    
    # Pause ratio histogram
    if plot_histogram(df, "pause_ratio", os.path.join(EXPORTS_DIR, "pause_ratio_histogram.png"),
                     "Pause Ratio Distribution", "#f39c12"):
        plots_generated += 1
    
    # Correlation heatmap
    if plot_correlation_heatmap(correlation_matrix, os.path.join(EXPORTS_DIR, "correlation_heatmap.png")):
        plots_generated += 1
    
    print(f"✓ Generated {plots_generated} plots")
    
    # Generate report
    print("\nGenerating report...")
    if generate_report(df, missing_values, label_dist, feature_stats, 
                      correlation_matrix, outliers, REPORT_PATH):
        print(f"✓ Report generated: {REPORT_PATH}")
    
    # Print summary
    print("\n" + "="*60)
    print("ANALYSIS SUMMARY")
    print("="*60)
    print(f"Total Samples: {len(df)}")
    print(f"Label Distribution: {label_dist}")
    print(f"Missing Values: {len(missing_values)} columns affected")
    print(f"Total Outliers: {total_outliers}")
    print(f"Plots Generated: {plots_generated}")
    print("="*60)
    
    print(f"\n✓ Analysis completed successfully!")
    print(f"  Report: {REPORT_PATH}")
    print(f"  Plots: {EXPORTS_DIR}/")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())