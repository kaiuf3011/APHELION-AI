import pandas as pd
import logging

logger = logging.getLogger(__name__)

class TelemetrySynchronizer:
    def __init__(self, tolerance_seconds: float = 1.0):
        self.tolerance = tolerance_seconds
        
    def synchronize(self, solexs_df: pd.DataFrame, hel1os_df: pd.DataFrame) -> pd.DataFrame:
        """
        Synchronizes SoLEXS and HEL1OS dataframes using pandas.merge_asof.
        Both dataframes must have a 'timestamp' column of type float (seconds).
        """
        try:
            # Ensure sorting
            solexs_df = solexs_df.sort_values('timestamp')
            hel1os_df = hel1os_df.sort_values('timestamp')
            
            logger.info(f"Merging datasets: SoLEXS ({len(solexs_df)} rows) and HEL1OS ({len(hel1os_df)} rows)")
            
            # Since SoLEXS is typically higher cadence or lower cadence, we merge asof
            # We use HEL1OS as the left frame if we want to retain its timestamps, or SoLEXS.
            # Let's use SoLEXS as the primary timeline (left) since it's the primary payload.
            
            unified_df = pd.merge_asof(
                solexs_df,
                hel1os_df,
                on='timestamp',
                direction='nearest',
                tolerance=self.tolerance
            )
            
            # Drop rows where we couldn't match within tolerance (optional, depending on cleaning reqs)
            # For now, we keep them but they'll have NaNs in hel1os_flux which we can interpolate or flag
            
            matched = len(unified_df.dropna(subset=['hel1os_flux']))
            logger.info(f"Synchronization complete. {matched}/{len(unified_df)} rows matched within {self.tolerance}s tolerance.")
            
            return unified_df
            
        except Exception as e:
            logger.error(f"Failed to synchronize telemetry: {e}")
            return pd.DataFrame()
