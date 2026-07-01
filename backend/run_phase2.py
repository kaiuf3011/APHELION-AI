import logging
from loaders.solexs import SolexsLoader
from loaders.hel1os import Hel1osLoader
from preprocessing.synchronizer import TelemetrySynchronizer
import os

logging.basicConfig(level=logging.INFO, format="%(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def run():
    solexs_path = "solexs_2026Jun30T061512507/AL1_SLX_L1_20260623_v1.0.zip"
    hel1os_path = "hel1os_2026Jun30T061549022/HLS_20260623_000007_43181sec_lev1_V111.zip"
    
    logger.info("Loading SoLEXS...")
    s_loader = SolexsLoader(solexs_path)
    s_df = s_loader.load_lightcurve()
    
    logger.info("Loading HEL1OS...")
    h_loader = Hel1osLoader(hel1os_path)
    h_df = h_loader.load_lightcurve()
    
    if s_df is not None and h_df is not None:
        # Check for epoch offset
        s_min = s_df['timestamp'].min()
        h_min = h_df['timestamp'].min()
        
        offset = h_min - s_min
        logger.info(f"Detected timestamp offset of {offset} seconds. Aligning epochs...")
        # Align SoLEXS epoch to HEL1OS UNIX epoch for demonstration
        s_df['timestamp'] = s_df['timestamp'] + offset
        
        sync = TelemetrySynchronizer(tolerance_seconds=2.0)
        unified = sync.synchronize(s_df, h_df)
        
        out_path = "backend/data/processed/unified_20260623.csv"
        unified.to_csv(out_path, index=False)
        logger.info(f"Unified dataset saved to {out_path}")
        print("\nSample of unified dataset:")
        print(unified.head())

if __name__ == "__main__":
    run()
