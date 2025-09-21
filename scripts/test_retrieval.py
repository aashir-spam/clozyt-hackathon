import pickle
import numpy as np
from openai import OpenAI
from dotenv import load_dotenv
import os

# Load API key
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Cosine similarity function
def cosine_similarity(a, b):
    a, b = np.array(a), np.array(b)
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def get_embedding(text, model="text-embedding-3-small"):
    """Get embedding for a query text."""
    response = client.embeddings.create(
        model=model,
        input=text
    )
    return response.data[0].embedding

def search_products(query, filepath="data/embeddings/cupshe_products_embeddings.pkl", top_k=5):
    """Find top-k similar products for a given query string."""
    with open(filepath, "rb") as f:
        df = pickle.load(f)

    # Get embedding for the query
    query_emb = get_embedding(query)

    # Compute similarity scores
    df["similarity"] = df["embedding"].apply(lambda emb: cosine_similarity(query_emb, emb))

    # Sort by similarity
    results = df.sort_values("similarity", ascending=False).head(top_k)

    # Pick safe subset of columns (only those that exist)
    cols = [c for c in ["name", "price", "url", "image_url", "similarity"] if c in results.columns]

    return results[cols]

if __name__ == "__main__":
    query = "red bikini"
    results = search_products(query)

    print(f"🔎 Top results for query: '{query}'\n")
    for _, row in results.iterrows():
        display = " | ".join([f"{col}: {row[col]}" for col in results.columns])
        print(display)
