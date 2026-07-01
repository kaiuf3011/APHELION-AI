import pandas as pd
import numpy as np
from astropy.io import fits
import logging

logger = logging.getLogger(__name__)

def extract_fits_table(fits_path: str, ext: int = 1) -> pd.DataFrame:
    """
    Extracts a FITS BinTableHDU to a pandas DataFrame while preserving float64 precision.
    """
    try:
        with fits.open(fits_path) as hdul:
            if ext >= len(hdul):
                logger.error(f"Extension {ext} not found in {fits_path}")
                return pd.DataFrame()
                
            hdu = hdul[ext]
            if not isinstance(hdu, (fits.BinTableHDU, fits.TableHDU)):
                logger.error(f"Extension {ext} is not a TableHDU")
                return pd.DataFrame()
            
            data = hdu.data
            columns = hdu.columns.names
            
            # Create dict directly from data, converting byte strings if necessary
            df_dict = {}
            for col in columns:
                # Convert to standard numpy array to avoid FITS_rec issues
                series = np.array(data[col])
                
                # Fix big-endian buffer error
                if series.dtype.byteorder == '>':
                    series = series.byteswap().view(series.dtype.newbyteorder('<'))
                    
                # Convert byte strings to regular strings (like HEL1OS ISOT)
                if series.dtype.kind == 'S':
                    series = series.astype(str)
                df_dict[col] = series
                
            df = pd.DataFrame(df_dict)
            return df
            
    except Exception as e:
        logger.error(f"Failed to extract FITS table from {fits_path}: {e}")
        return pd.DataFrame()
