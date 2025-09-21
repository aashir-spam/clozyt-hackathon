
#!/usr/bin/env python3
import argparse, json, hashlib, re, os, random
from pathlib import Path
import pandas as pd

PRICE_RE = re.compile(r"[\$£€,\s]")

def clean_price(v):
    if pd.isna(v): return None
    if isinstance(v, (int, float)): return float(v)
    s = PRICE_RE.sub("", str(v))
    try: return float(s)
    except: return None

def hash_id(*fields):
    s = "||".join([str(f) for f in fields if pd.notna(f)])
    return hashlib.md5(s.encode("utf-8")).hexdigest()[:16]

def normalize_row(row: dict, brand_hint: str):
    title = row.get("title") or row.get("name") or row.get("product_name") or ""
    brand = (row.get("brand") or brand_hint or "").strip()

    price = clean_price(row.get("price") or row.get("sale_price") or row.get("current_price"))
    currency = "USD"
    product_url = (row.get("product_url") or row.get("url") or row.get("link") or "").strip()

    # collect image urls from any columns that look like images
    image_urls = []
    for k, v in row.items():
        if isinstance(v, str) and v.startswith("http") and any(ext in v.lower() for ext in [".jpg",".jpeg",".png",".webp"]):
            image_urls.append(v.strip())
    # common fields
    for key in ["image","image_url","img","thumbnail","thumbnail_url","image1","image2","images"]:
        v = row.get(key)
        if isinstance(v, str) and v.startswith("http"):
            image_urls.append(v.strip())
    image_urls = list(dict.fromkeys(image_urls))[:5]  # dedupe + cap

    category = (row.get("category") or row.get("type") or row.get("product_type") or "").strip() or "unknown"
    subcat   = (row.get("sub_category") or row.get("subcategory") or row.get("collection") or "").strip()

    # raw attributes: try a handful of likely columns
    attrs = []
    for k in ["attributes","attrs","tags","features","fit","style","material","color","pattern","details"]:
        v = row.get(k)
        if not v: continue
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    arr = json.loads(v)
                    if isinstance(arr, list): attrs += [str(x).strip() for x in arr]
                except:
                    attrs += re.split(r"[;,\|]+", v)
            else:
                attrs += re.split(r"[;,\|]+", v)
        elif isinstance(v, (list, tuple, set)):
            attrs += [str(x).strip() for x in v]
    attrs = [a for a in dict.fromkeys([a for a in attrs if a])]

    stock = (row.get("availability") or row.get("stock") or row.get("inventory") or "In Stock")

    pid_src = row.get("sku") or row.get("id") or product_url or title
    uid = hash_id(brand, pid_src)

    return {
        "id": uid,
        "brand": brand,
        "title": title,
        "price": price,
        "currency": currency,
        "category": category,
        "subcat": subcat,
        "attrs_raw": attrs,
        "product_url": product_url,
        "image_urls": image_urls,
        "stock": stock,
    }

def ingest_csv(path: Path, brand_hint: str):
    df = pd.read_csv(path, dtype=str, keep_default_na=False)
    recs = df.to_dict(orient="records")
    return [normalize_row(r, brand_hint) for r in recs]

def stratified_sample(items, frac=0.30, seed=42):
    random.seed(seed)
    if frac >= 0.999: return items

    def bin_price(p):
        if p is None: return "unknown"
        try:
            p = float(p)
        except: return "unknown"
        if p < 30: return "<30"
        if p < 60: return "30-60"
        if p < 120: return "60-120"
        return "120+"

    buckets = {}
    for it in items:
        key = (it.get("brand",""), it.get("category","unknown"), bin_price(it.get("price")))
        buckets.setdefault(key, []).append(it)

    out = []
    for key, arr in buckets.items():
        k = max(1, int(len(arr) * frac))
        out.extend(random.sample(arr, k))
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--glob", default="data/raw/*.csv", help="glob of brand CSVs")
    ap.add_argument("--brand_from_filename", action="store_true", help="infer brand from filename prefix (e.g., cupshe_products.csv → cupshe)")
    ap.add_argument("--sample_frac", type=float, default=0.30)
    ap.add_argument("--out", default="data/processed/items.jsonl")
    args = ap.parse_args()

    # PowerShell globbing is automatic; Path.glob helps in both shells
    paths = list(Path("data/raw").glob("*.csv")) if args.glob == "data/raw/*.csv" else list(Path().glob(args.glob))
    all_items = []
    for p in sorted(paths):
        brand_hint = ""
        if args.brand_from_filename:
            brand_hint = p.stem.split("_")[0]
        print(f"[ingest] {p.name} (brand_hint={brand_hint})")
        all_items += ingest_csv(p, brand_hint)

    print(f"[ingest] parsed: {len(all_items)} items")
    sampled = stratified_sample(all_items, frac=args.sample_frac)
    print(f"[ingest] sampled: {len(sampled)} items")

    outp = Path(args.out)
    outp.parent.mkdir(parents=True, exist_ok=True)
    with outp.open("w", encoding="utf-8") as f:
        for it in sampled:
            f.write(json.dumps(it, ensure_ascii=False) + "\n")
    print(f"[ingest] wrote {outp}")

if __name__ == "__main__":
    main()
