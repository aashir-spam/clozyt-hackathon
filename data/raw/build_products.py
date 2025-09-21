import pandas as pd
import json
import os
from pathlib import Path

print("Starting the data cleaning process...")

# --- Keyword dictionaries (unchanged) ---
TYPE_KEYWORDS = {
    'dress': ['dress', 'gown', 'romper', 'playsuit', 'jumpsuit'],
    'top': ['top', 'shirt', 'blouse', 'tee', 'tank', 'bodysuit', 'crop', 'cami', 'bralet', 'corset', 'bandeau'],
    'pants': ['pants', 'trousers', 'leggings', 'jeans', 'joggers'],
    'shorts': ['shorts', 'short'],
    'skirt': ['skirt', 'skort'],
    'jacket': ['jacket', 'coat', 'blazer', 'hoodie', 'sweatshirt', 'cardigan', 'vest', 'windbreaker'],
    'sweater': ['sweater', 'knit', 'jumper'],
    'shoes': ['shoes', 'heels', 'boots', 'sneakers', 'sandals', 'flats'],
    'bag': ['bag', 'handbag', 'tote', 'crossbody', 'backpack', 'clutch'],
    'accessory': ['accessory', 'accessories', 'hat', 'sunglasses', 'belt', 'scarf', 'jewelry', 'necklace', 'earrings'],
}
COLOR_KEYWORDS = {
    'black': ['black'], 'white': ['white', 'ivory', 'cream'], 'gray': ['gray', 'grey', 'charcoal', 'heather'],
    'red': ['red', 'burgundy', 'maroon', 'crimson'], 'blue': ['blue', 'navy', 'denim', 'light wash'],
    'green': ['green', 'olive', 'khaki', 'sage'], 'yellow': ['yellow', 'mustard', 'gold'],
    'purple': ['purple', 'lavender', 'mauve'], 'pink': ['pink', 'blush', 'fuchsia', 'rose'],
    'orange': ['orange', 'rust', 'coral'], 'brown': ['brown', 'tan', 'beige', 'taupe', 'chocolate', 'mocha'],
    'silver': ['silver', 'metallic'],
}

# --- Helper functions (updated) ---
def infer_attribute(name, keywords_dict):
    name_lower = f" {name.lower()} "
    for attr, keywords in keywords_dict.items():
        if any(f" {key} " in name_lower for key in keywords):
            return attr
    return None

def clean_price(price):
    if isinstance(price, (int, float)): return float(price)
    if isinstance(price, str):
        try: return float(price.replace('$', '').replace(',', '').strip())
        except (ValueError, AttributeError): return None
    return None

# ✅ --- NEW: Function to get brand from filename ---
def get_brand_from_filename(path):
    name = path.stem.lower()
    if "princess_polly" in name: return "Princess Polly"
    return name.replace('_products', '').replace('_', ' ').title()

def process_csv_files(file_paths):
    all_products, seen_urls = [], set()
    for file_path in file_paths:
        try:
            # ✅ NEW: Get the brand from the filename as a fallback
            brand_from_filename = get_brand_from_filename(file_path)
            
            df = pd.read_csv(file_path)
            print(f"Processing {file_path.name}... found {len(df)} rows.")

            col_map = {
                'name': next((c for c in ['name', 'product_name', 'title'] if c in df.columns), None),
                'brand': next((c for c in ['brand', 'brand_name', 'vendor'] if c in df.columns), None),
                'price': next((c for c in ['price', 'price_usd', 'current_price'] if c in df.columns), None),
                'url': next((c for c in ['url', 'product_url', 'link'] if c in df.columns), None),
                'image_url': next((c for c in ['image_url', 'img_url', 'image'] if c in df.columns), None),
                'color': next((c for c in ['color', 'colour'] if c in df.columns), None),
            }
            if not col_map['name'] or not col_map['url']:
                print(f"Skipping {file_path.name}: missing 'name' or 'url' column.")
                continue
            
            for _, row in df.iterrows():
                url = row.get(col_map['url'])
                if not isinstance(url, str) or url in seen_urls: continue
                seen_urls.add(url)
                
                name = row.get(col_map['name'])
                if not isinstance(name, str): continue

                # ✅ NEW: Smarter brand detection logic
                brand_col_name = col_map.get('brand')
                brand_from_column = row.get(brand_col_name) if brand_col_name else None
                
                final_brand = brand_from_filename # Default to brand from filename
                if isinstance(brand_from_column, str) and brand_from_column.strip():
                    final_brand = brand_from_column.strip() # But prefer brand from column if it exists

                original_color = row.get(col_map.get('color'))
                final_color = None
                if isinstance(original_color, str) and pd.notna(original_color) and original_color.lower() != 'nan':
                    final_color = original_color.strip().lower()
                if not final_color:
                    final_color = infer_attribute(name, COLOR_KEYWORDS)

                all_products.append({
                    "name": name.strip(),
                    "brand": final_brand,
                    "price": clean_price(row.get(col_map.get('price'))),
                    "url": url,
                    "image_url": row.get(col_map.get('image_url')),
                    "type": infer_attribute(name, TYPE_KEYWORDS),
                    "color": final_color,
                })
        except Exception as e:
            print(f"Could not process {file_path.name}. Error: {e}")
    return all_products

# --- Main Execution ---
data_directory = Path('data/raw')
csv_files = list(data_directory.glob('*.csv'))

if not csv_files:
    print(f"\nError: No CSV files found in the '{data_directory}' folder.")
else:
    cleaned_products = process_csv_files(csv_files)
    output_filename = 'products_cleaned.json'
    with open(output_filename, 'w', encoding='utf8') as f:
        json.dump(cleaned_products, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Success! Cleaned {len(cleaned_products)} unique products.")
    print(f"New data saved to '{output_filename}' in your main project folder.")