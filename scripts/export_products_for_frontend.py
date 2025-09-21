# scripts/export_products_for_frontend.py
import pandas as pd, json, re, random, pathlib

SRC = pathlib.Path("data/processed/cupshe_products.csv")
OUT = pathlib.Path("frontend/public/products.json")

def looks_like_image(u: str) -> bool:
    if not isinstance(u, str): return False
    if u.startswith("data:image"): return False
    return u.startswith("http") and re.search(r"\.(jpg|jpeg|png|webp)(\?|$)", u, re.I)

df = pd.read_csv(SRC)
keep = []
for _, r in df.iterrows():
    name = str(r.get("name") or r.get("title") or "").strip()
    brand = str(r.get("brand") or "Cupshe").strip()
    url = str(r.get("url") or r.get("product_url") or "").strip()
    img = str(r.get("image_url") or r.get("image") or "").strip()
    price = r.get("price")
    try: price = float(str(price).replace("$","").replace(",",""))
    except: price = None
    if name and url and looks_like_image(img):
        keep.append({"name": name, "brand": brand, "price": price or "", "url": url, "image_url": img})

random.shuffle(keep)
keep = keep[:60]

OUT.parent.mkdir(parents=True, exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(keep, f, ensure_ascii=False, indent=2)
print(f"wrote {len(keep)} items to {OUT}")
