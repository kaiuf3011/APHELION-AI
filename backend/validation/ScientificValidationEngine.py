import logging
from dataclasses import dataclass
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

@dataclass
class QualityReport:
    file_name: str
    is_valid: bool
    quality_score: float
    flags: List[str]
    metadata: Dict[str, Any]

class ScientificValidationEngine:
    def __init__(self):
        self.reports: List[QualityReport] = []

    def validate_metadata(self, metadata: Dict[str, Any]) -> QualityReport:
        """
        Validates the extracted FITS metadata against known expected physics/mission parameters.
        """
        flags = []
        score = 100.0
        
        file_name = metadata.get("file", "UNKNOWN")
        telescop = metadata.get("telescop", "UNKNOWN")
        instrume = metadata.get("instrume", "UNKNOWN")
        
        # 1. Validate Telescope
        # Real SoLEXS L1 products report TELESCOP="AL1" (a mission shorthand,
        # confirmed against actual AL1_SLX_L1_*.zip headers) while HEL1OS
        # reports the full "Aditya-L1" - both are legitimate for this mission.
        if telescop not in ["Aditya-L1", "ADITYA-L1", "AL1"]:
            flags.append(f"Invalid TELESCOP: {telescop}")
            score -= 40
            
        # 2. Validate Instrument
        if instrume not in ["SoLEXS", "HEL1OS", "SOLEXS"]:
            flags.append(f"Unknown INSTRUME: {instrume}")
            score -= 40
            
        # 3. Timestamp Verification
        date_obs = metadata.get("date_obs", "UNKNOWN")
        date_end = metadata.get("date_end", "UNKNOWN")
        if date_obs == "UNKNOWN" or date_end == "UNKNOWN":
            flags.append("Missing Observation Timestamps (DATE-OBS/DATE-END)")
            score -= 50
            
        # 4. Corruption Check (Num Extensions)
        exts = metadata.get("num_extensions", 0)
        if exts < 1:
            flags.append("Corrupt or Empty FITS File (0 Extensions)")
            score -= 100
            
        is_valid = score >= 50.0
        
        report = QualityReport(
            file_name=file_name,
            is_valid=is_valid,
            quality_score=max(0.0, score),
            flags=flags,
            metadata=metadata
        )
        
        self.reports.append(report)
        return report

    def generate_quality_summary(self, output_path: str):
        summary_lines = ["# Scientific Validation Quality Report\n"]
        
        total_files = len(self.reports)
        valid_files = sum(1 for r in self.reports if r.is_valid)
        
        summary_lines.append(f"**Total Files Checked**: {total_files}")
        summary_lines.append(f"**Valid Files**: {valid_files}")
        summary_lines.append(f"**Corrupted/Invalid Files**: {total_files - valid_files}\n")
        
        for report in self.reports:
            status = "PASS" if report.is_valid else "FAIL"
            summary_lines.append(f"### {report.file_name} [{status}]")
            summary_lines.append(f"- **Quality Score**: {report.quality_score}/100")
            if report.flags:
                summary_lines.append("- **Flags**:")
                for flag in report.flags:
                    summary_lines.append(f"  - ⚠️ {flag}")
            summary_lines.append("")
            
        with open(output_path, "w") as f:
            f.write("\n".join(summary_lines))
        logger.info(f"Scientific Quality Report generated at {output_path}")
