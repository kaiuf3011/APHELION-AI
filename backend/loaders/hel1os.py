import pandas as pd
import zipfile
import tempfile
from pathlib import Path
import logging
from typing import Optional
from .fits_parser import extract_fits_table

logger = logging.getLogger(__name__)

class Hel1osLoader:
    def __init__(self, zip_path: str):
        self.zip_path = Path(zip_path)
        
    def load_lightcurve(self, sensor: str = 'czt1') -> Optional[pd.DataFrame]:
        """
        Extracts the HEL1OS lightcurve for a specific sensor (e.g., czt1).
        Sums counts across energy bands to create a single flux column, or returns bands.
        Returns a DataFrame with ['timestamp', 'hel1os_flux'].
        """
        try:
            with zipfile.ZipFile(self.zip_path, 'r') as z:
                # Find the specific lightcurve file
                lc_files = [f for f in z.namelist() if f.endswith(f'lightcurve_{sensor}.fits')]
                if not lc_files:
                    logger.warning(f"No lightcurve_{sensor}.fits found in {self.zip_path}")
                    return None
                    
                target = lc_files[0]
                
                with tempfile.TemporaryDirectory() as tmpdir:
                    z.extract(target, tmpdir)
                    extracted = Path(tmpdir) / target
                    
                    # Extension 1 is usually the first energy band (e.g., 20-40 keV)
                    # We will extract extension 1 for now to align timestamps
                    df = extract_fits_table(str(extracted), ext=1)
                    if df.empty:
                        return None
                        
                    df_clean = pd.DataFrame()
                    # ISOT format: '2026-06-23T00:00:07.999'
                    # Convert ISOT string to datetime, then to unix timestamp for robust merging
                    df_clean['datetime'] = pd.to_datetime(df['ISOT'])
                    df_clean['timestamp'] = df_clean['datetime'].astype('int64') / 10**9 # seconds since epoch
                    
                    # In a real scientific pipeline, we might sum CTR across extensions 1-4.
                    # For now, we take extension 1 CTR as hard flux.
                    df_clean['hel1os_flux'] = df['CTR']
                    
                    df_clean = df_clean.dropna(subset=['hel1os_flux'])
                    df_clean = df_clean[df_clean['hel1os_flux'] >= 0]
                    
                    # Sort by timestamp
                    df_clean = df_clean.sort_values('timestamp')
                    
                    return df_clean
                    
        except Exception as e:
            logger.error(f"Failed to load HEL1OS data from {self.zip_path}: {e}")
            return None
