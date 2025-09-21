# scripts/embed_all.py -----------------------------------------------
import argparse, json, numpy as np, pathlib, pickle, time, os
from tqdm import tqdm
from openai import OpenAI, RateLimitError

# init client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

ap = argparse.ArgumentParser()
ap.add_argument("--src", default="data/processed/items_clean.jsonl")
ap.add_argument("--dst", default="data/embeddings/all_embeddings.pkl")
ap.add_argument("--model", default="text-embedding-3-small")
args = ap.parse_args()

# load data
rows  = [json.loads(l) for l in pathlib.Path(args.src).read_text("utf-8").splitlines()]
texts = [f"{r['title']} {r.get('brand','')} {r.get('category','')}" for r in rows]

emb = []
for i in tqdm(range(0, len(texts), 100)):
    chunk = texts[i:i+100]
    while True:
        try:
            resp = client.embeddings.create(model=args.model, input=chunk)
            emb.extend([d.embedding for d in resp.data])
            break
        except RateLimitError:
            print("⚠️ Rate limit hit, retrying in 5s...")
            time.sleep(5)

emb = np.asarray(emb, dtype="float32")
pathlib.Path(args.dst).parent.mkdir(parents=True, exist_ok=True)
pickle.dump(emb, open(args.dst, "wb"))
print(f"✅ wrote {emb.shape} embeddings → {args.dst}")
# --------------------------------------------------------------------
