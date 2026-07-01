import zipfile
import tempfile
from pathlib import Path
from astropy.io import fits

def inspect_fits_in_zip(zip_path, file_suffix):
    print(f"\n--- Inspecting {file_suffix} in {zip_path} ---")
    with zipfile.ZipFile(zip_path, 'r') as z:
        targets = [f for f in z.namelist() if f.endswith(file_suffix)]
        if not targets:
            print(f"No {file_suffix} found.")
            return
        
        target = targets[0]
        print(f"Found target: {target}")
        
        with tempfile.TemporaryDirectory() as tmpdir:
            z.extract(target, tmpdir)
            extracted = Path(tmpdir) / target
            
            with fits.open(extracted) as hdul:
                hdul.info()
                for i, hdu in enumerate(hdul):
                    print(f"\nExtension {i} - {hdu.name}:")
                    if isinstance(hdu, (fits.BinTableHDU, fits.TableHDU)):
                        print("Columns:", hdu.columns.names)
                        print("Data Types:", hdu.columns.formats)
                        print("Sample Data (first row):", hdu.data[0] if len(hdu.data) > 0 else "Empty")
                    else:
                        print("Header keys (first 10):", list(hdu.header.keys())[:10])

if __name__ == "__main__":
    solexs_zip = "solexs_2026Jun30T061512507/AL1_SLX_L1_20260623_v1.0.zip"
    hel1os_zip = "hel1os_2026Jun30T061549022/HLS_20260623_000007_43181sec_lev1_V111.zip"
    
    inspect_fits_in_zip(solexs_zip, ".lc.gz")
    inspect_fits_in_zip(hel1os_zip, "lightcurve_czt1.fits")
