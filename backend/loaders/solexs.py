import pandas as pd
import zipfile
import tempfile
from pathlib import Path
import logging
from typing import Optional
from .fits_parser import extract_fits_table

logger = logging.getLogger(__name__)

class SolexsLoader:
    def __init__(self, zip_path: str):
        self.zip_path = Path(zip_path)
        
    def load_lightcurve(self) -> Optional[pd.DataFrame]:
        """
        Extracts the SoLEXS lightcurve and normalizes the output.
        Returns a DataFrame with ['timestamp', 'solexs_flux'].
        """
        try:
            with zipfile.ZipFile(self.zip_path, 'r') as z:
                # Find the .lc.gz file
                lc_files = [f for f in z.namelist() if f.endswith('.lc.gz')]
                if not lc_files:
                    logger.warning(f"No .lc.gz found in {self.zip_path}")
                    return None
                    
                target = lc_files[0]
                
                with tempfile.TemporaryDirectory() as tmpdir:
                    z.extract(target, tmpdir)
                    extracted = Path(tmpdir) / target
                    
                    # Extract extension 1 (RATE)
                    df = extract_fits_table(str(extracted), ext=1)
                    if df.empty:
                        return None
                        
                    # Normalize columns
                    # The TIME column is typically seconds since a reference epoch (e.g., J2000 or mission start)
                    # For synchronization, we will keep it as an float 'timestamp' but we need to ensure it's comparable
                    # to HEL1OS. HEL1OS provides 'ISOT' strings. Let's inspect timestamp mapping later.
                    
                    df_clean = pd.DataFrame()
                    df_clean['timestamp'] = df['TIME']
                    df_clean['solexs_flux'] = df['COUNTS']
                    
                    # Drop rows where flux is NaN (as per Phase 4 cleaning requirement)
                    df_clean = df_clean.dropna(subset=['solexs_flux'])
                    # Drop negative flux
                    df_clean = df_clean[df_clean['solexs_flux'] >= 0]
                    
                    return df_clean
                    
        except Exception as e:
            logger.error(f"Failed to load SoLEXS data from {self.zip_path}: {e}")
            return None
