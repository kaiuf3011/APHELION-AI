import os
import zipfile
import tempfile
from pathlib import Path
from astropy.io import fits
import json
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

class DatasetDiscoverer:
    def __init__(self, raw_dir: str):
        self.raw_dir = Path(raw_dir)
        self.summary = {
            "solexs": {"zips": [], "fits_found": [], "metadata": []},
            "hel1os": {"zips": [], "fits_found": [], "metadata": []}
        }
    
    def _scan_zip(self, zip_path: Path, source: str):
        logger.info(f"Scanning {zip_path.name}")
        self.summary[source]["zips"].append(zip_path.name)
        
        with zipfile.ZipFile(zip_path, 'r') as z:
            file_list = z.namelist()
            fits_files = [f for f in file_list if f.endswith('.fits') or f.endswith('.lc.gz') or f.endswith('.pi.gz')]
            self.summary[source]["fits_found"].extend(fits_files)
            
            # Extract header of the first relevant file to get metadata
            if fits_files:
                target_file = fits_files[0]
                # We can extract to memory or tempfile
                with tempfile.TemporaryDirectory() as tmpdir:
                    z.extract(target_file, tmpdir)
                    extracted_path = Path(tmpdir) / target_file
                    
                    try:
                        with fits.open(extracted_path) as hdul:
                            header = hdul[0].header
                            meta = {
                                "file": target_file,
                                "telescop": header.get("TELESCOP", "UNKNOWN"),
                                "instrume": header.get("INSTRUME", "UNKNOWN"),
                                "date_obs": header.get("DATE-OBS", "UNKNOWN"),
                                "date_end": header.get("DATE-END", "UNKNOWN"),
                                "num_extensions": len(hdul)
                            }
                            self.summary[source]["metadata"].append(meta)
                    except Exception as e:
                        logger.warning(f"Could not read FITS {target_file}: {e}")

    def run_discovery(self):
        solexs_dirs = list(self.raw_dir.glob("solexs_*"))
        hel1os_dirs = list(self.raw_dir.glob("hel1os_*"))
        
        for s_dir in solexs_dirs:
            for z in s_dir.glob("*.zip"):
                self._scan_zip(z, "solexs")
                
        for h_dir in hel1os_dirs:
            for z in h_dir.glob("*.zip"):
                self._scan_zip(z, "hel1os")
                
        return self.summary

    def generate_report(self, output_path: str):
        report = []
        report.append("# Dataset Summary Report")
        report.append("## SoLEXS")
        report.append(f"- **Total Archives**: {len(self.summary['solexs']['zips'])}")
        report.append(f"- **Data Files Found**: {len(self.summary['solexs']['fits_found'])}")
        
        if self.summary['solexs']['metadata']:
            meta = self.summary['solexs']['metadata'][0]
            report.append("### Sample Metadata")
            report.append(f"- **Telescope**: {meta['telescop']}")
            report.append(f"- **Instrument**: {meta['instrume']}")
            report.append(f"- **Observation Start**: {meta['date_obs']}")

        report.append("\n## HEL1OS")
        report.append(f"- **Total Archives**: {len(self.summary['hel1os']['zips'])}")
        report.append(f"- **Data Files Found**: {len(self.summary['hel1os']['fits_found'])}")
        
        if self.summary['hel1os']['metadata']:
            meta = self.summary['hel1os']['metadata'][0]
            report.append("### Sample Metadata")
            report.append(f"- **Telescope**: {meta['telescop']}")
            report.append(f"- **Instrument**: {meta['instrume']}")
            report.append(f"- **Observation Start**: {meta['date_obs']}")

        with open(output_path, "w") as f:
            f.write("\n".join(report))
        logger.info(f"Report written to {output_path}")

if __name__ == "__main__":
    import sys
    # Expect raw_dir to be passed as argument or default to current workspace
    base_path = sys.argv[1] if len(sys.argv) > 1 else "."
    discoverer = DatasetDiscoverer(base_path)
    summary = discoverer.run_discovery()
    discoverer.generate_report("backend/outputs/reports/Dataset_Summary.md")
    print(json.dumps(summary, indent=2))
