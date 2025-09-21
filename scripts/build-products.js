// scripts/build-products.js
// Usage:
//   node scripts/build-products.js [input_jsonl] [output_json] [--blank-price]
//
// Examples:
//   node scripts/build-products.js
//   node scripts/build-products.js data/processed/items_clean.jsonl frontend/src/public/product.json --blank-price

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const args = process.argv.slice(2);
const blankIdx = args.indexOf("--blank-price");
const BLANK_PRICE = blankIdx > -1;
if (blankIdx > -1) args.splice(blankIdx, 1);

const inputPath = args[0] || "data/processed/items_clean.jsonl";
const outputPath = args[1] || "frontend/src/public/product.json";

const CURRENCY_SYMBOL = { USD: "$", EUR: "€", GBP: "£", JPY: "¥", INR: "₹" };

function formatPrice(price, currency) {
  if (BLANK_PRICE) return "";
  if (price === null || price === undefined || isNaN(Number(price))) return "";
  const num = Number(price);
  const sym = CURRENCY_SYMBOL[currency] || (currency ? `${currency} ` : "");
  return CURRENCY_SYMBOL[currency] ? `${sym}${num.toFixed(2)}` : `${sym}${num.toFixed(2)}`;
}

async function run() {
  if (!fs.existsSync(inputPath)) {
    console.error(`Input not found: ${inputPath}`);
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(inputPath, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  const products = [];
  let lineNum = 0, bad = 0;

  for await (const line of rl) {
    lineNum++;
    const s = line.trim();
    if (!s) continue;
    try {
      const item = JSON.parse(s);

      const out = {
        name: item.title || "",
        brand: item.brand || "",
        price: formatPrice(item.price, item.currency),
        url: item.product_url || "",
        image_url: item.image_url || "",
      };

      products.push(out);
    } catch (e) {
      bad++;
      console.warn(`Skipping bad JSON at line ${lineNum}: ${e.message}`);
    }
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(products, null, 2), "utf-8");

  console.log(`✅ Wrote ${products.length} items to ${outputPath}${BLANK_PRICE ? " (price blanked)" : ""}`);
  if (bad) console.log(`ℹ️ Skipped ${bad} malformed line(s).`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
