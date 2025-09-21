import os
import pickle
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI

# Load API key
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Paths
DATA_DIR = Path("data")
PROCESSED_DIR = DATA_DIR / "processed"
EMBEDDINGS_DIR = DATA_DIR / "embeddings"

def get_embedding(text: str, model="text-embedding-3-small"):
    """Generate embedding for a single text string."""
    response = client.embeddings.create(
        model=model,
        input=text
    )
    return response.data[0].embedding

def embed_products(filename="cupshe_products.csv"):
    path = PROCESSED_DIR / filename
    df = pd.read_csv(path)

    # Ensure category column exists
    if "category" not in df.columns:
        df["category"] = ""

    # Combine relevant text fields
    df["text"] = df["name"].astype(str) + " " + df["category"].astype(str)

    # Generate embeddings
    df["embedding"] = df["text"].apply(lambda x: get_embedding(x))

    # Save embeddings
    EMBEDDINGS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = EMBEDDINGS_DIR / f"{filename.replace('.csv','')}_embeddings.pkl"
    with open(out_path, "wb") as f:
        pickle.dump(df, f)

    print(f"✅ Saved embeddings to {out_path}")
    return df

if __name__ == "__main__":
    embed_products()
