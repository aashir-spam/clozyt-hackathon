import pandas as pd
from pathlib import Path

RAW_DIR = Path("data/raw")
PROCESSED_DIR = Path("data/processed")

def load_and_clean(filename: str):
    """Load one raw CSV and clean it up."""
    path = RAW_DIR / filename
    df = pd.read_csv(path)

    # Basic cleaning
    df = df.dropna(how="all")  # drop empty rows
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]  # normalize column names
    
    # Fill NAs with placeholders
    df = df.fillna("N/A")

    # Save processed
    PROCESSED_DIR.mkdir(exist_ok=True, parents=True)
    out_path = PROCESSED_DIR / filename
    df.to_csv(out_path, index=False)
    print(f"✅ Processed {filename}, saved to {out_path}")
    return df

if __name__ == "__main__":
    # Start with just one brand
    df = load_and_clean("cupshe_products.csv")
    print(df.head(10))
