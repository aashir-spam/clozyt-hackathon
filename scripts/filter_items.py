import json, pathlib, re, random, hashlib

SRC = pathlib.Path("data/processed/items.jsonl")
DST = pathlib.Path("data/processed/items_clean.jsonl")

IMG_RE = re.compile(r"\.(jpg|jpeg|png|webp)(\?|$)", re.I)
seen = set(); out = []
for line in SRC.read_text(encoding="utf-8").splitlines():
    it = json.loads(line)
    img = next((u for u in it["image_urls"] if IMG_RE.search(u)), None)
    if not img: continue
    uid = hashlib.md5((it["brand"]+it["title"]).encode()).hexdigest()
    if uid in seen: continue
    seen.add(uid)
    it["image_url"] = img          # primary image
    del it["image_urls"]
    out.append(it)

random.shuffle(out)
DST.write_text("\n".join(json.dumps(x, ensure_ascii=False) for x in out), "utf-8")
print(f"kept {len(out)} rows -> {DST}")
