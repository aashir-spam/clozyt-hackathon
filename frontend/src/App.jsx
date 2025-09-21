import React, { useEffect, useRef, useState, useMemo } from "react";
import { fetchNext, sendFeedback, sendCalibration, fetchOutfit } from "./utils/api";

/* ========= Icons ========= */
const IconBase = ({ children, className = "h-5 w-5", strokeWidth = 2 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    {children}
  </svg>
);
const HeartIcon   = (p) => (<IconBase {...p}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.7l7.8-8.3 1-1a5.5 5.5 0 0 0 0-7.8Z" /></IconBase>);
const XIcon       = (p) => (<IconBase {...p}><path d="M18 6 6 18" /><path d="M6 6 18 18" /></IconBase>);
const BoltIcon    = (p) => (<IconBase {...p}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></IconBase>);
const SlidersIcon = (p) => (<IconBase {...p}><line x1="4" y1="21" x2="4" y2="8" /><line x1="4" y1="6" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="13" /><line x1="12" y1="11" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="14" x2="20" y2="3" /><line x1="2" y1="8" x2="6" y2="8" /><line x1="10" y1="13" x2="14" y2="13" /><line x1="18" y1="16" x2="22" y2="16" /></IconBase>);
const SearchIcon  = (p) => (<IconBase {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></IconBase>);
const HomeIcon    = (p) => (<IconBase {...p}><path d="M3 9 12 2l9 7" /><path d="M9 22V12h6v10" /></IconBase>);
const BanIcon     = (p) => (<IconBase {...p}><circle cx="12" cy="12" r="9" /><path d="M4.6 4.6 19.4 19.4" /></IconBase>);
const BagIcon     = (p) => (<IconBase {...p}><path d="M6 7h12l-1 13H7L6 7Z" /><path d="M9 7V5a3 3 0 0 1 6 0v2" /></IconBase>);
const UserIcon    = (p) => (<IconBase {...p}><circle cx="12" cy="7" r="4" /><path d="M5.5 21a7.5 7.5 0 0 1 13 0" /></IconBase>);
const ChartIcon   = (p) => (<IconBase {...p}><path d="M3 3v18h18" /><rect x="6" y="13" width="3" height="5" /><rect x="11" y="9" width="3" height="9" /><rect x="16" y="5" width="3" height="13" /></IconBase>);
const BookmarkIcon= (p) => (<IconBase {...p}><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" /></IconBase>);

/* ========= Helpers ========= */
function formatPrice(p) {
  if (p === undefined || p === null || p === "") return "";
  const s = String(p).trim();
  if (!s) return "";
  if (s.startsWith("$")) return s;
  const n = Number(s);
  if (Number.isFinite(n)) return `$${n.toFixed(2)}`;
  return s;
}
function detectPid(p) {
  return p?.pid ?? p?.id ?? p?.__pid ?? p?._id ?? null;
}
function toBucket(price) {
  const n = Number(String(price).replace(/^\$/, ""));
  if (!Number.isFinite(n)) return "unknown";
  if (n < 25) return "<$25";
  if (n < 50) return "$25–49";
  if (n < 100) return "$50–99";
  if (n < 200) return "$100–199";
  return "$200+";
}
function inc(map, key, by = 1) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + by);
}
function topK(map, k = 3) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, k);
}
function pct(n, d) { return d > 0 ? Math.round((n / d) * 100) : 0; }

/* ========= Calibration Modal ========= */
function CalibrationModal({ onSelect, onClose }) {
  const categories = ["dress", "top", "jacket", "pants", "shoes", "accessory"];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-center">What's your vibe today?</h2>
        <p className="text-center text-white/70 mt-1 mb-6">Calibrate your feed for this session.</p>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelect(cat)}
              className="p-4 rounded-lg bg-white/10 hover:bg-white/20 text-center font-semibold capitalize transition"
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ========= Toast ========= */
function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-gray-900 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
        <span>{message}</span>
        <button onClick={onClose} className="ml-1 text-white/70 hover:text-white text-sm">✕</button>
      </div>
    </div>
  );
}

/* ========= Outfit Modal (on-demand) ========= */
function OutfitModal({ outfit, onClose, onLike, onNope }) {
  if (!outfit) return null;
  const { original_item, suggested_item } = outfit;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl p-4 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <p className="font-semibold">Because you're viewing...</p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <img src={original_item.image_url} alt={original_item.name || "original"} className="h-8 w-8 rounded-full object-cover"/>
            <p className="text-sm text-white/80 truncate">{original_item.name}</p>
          </div>
        </div>

        <div className="mt-4 relative">
          <img src={suggested_item.image_url} alt={suggested_item.name || "suggested"} className="w-full h-96 object-cover rounded-xl"/>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"/>
          <div className="absolute bottom-0 left-0 p-4">
            <p className="font-bold text-lg">How about this to complete the look?</p>
            <p className="text-xl font-black">{suggested_item.name}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            onClick={() => { onNope({ product: suggested_item }); onClose(); }}
            className="grid h-16 w-16 place-items-center rounded-full bg-white/10 hover:bg-white/20 transition"
            aria-label="Nope suggestion"
          >
            <XIcon className="h-8 w-8"/>
          </button>
          <button
            onClick={() => { onLike({ product: suggested_item, super_like: true }); onClose(); }}
            className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 hover:opacity-90 transition"
            aria-label="Accept suggestion"
          >
            <HeartIcon className="h-10 w-10"/>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========= Outfit Suggestion Card ========= */
function OutfitSuggestionCard({ suggestion, onLike, onNope }) {
  const { original_item, suggested_item } = suggestion;

  const handleLike = () => onLike({ product: suggested_item });
  const handleNope = () => onNope({ product: suggested_item });

  return (
    <div className="w-full rounded-[28px] p-1 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-2xl">
      <div className="w-full h-full bg-gray-800 rounded-[27px] p-4 text-white">
        <div className="text-center">
          <p className="font-semibold">Because you liked...</p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <img src={original_item.image_url} alt={original_item.name || "original"} className="h-8 w-8 rounded-full object-cover" />
            <p className="text-sm text-white/80">{original_item.name}</p>
          </div>
        </div>

        <div className="mt-4 relative">
          <img src={suggested_item.image_url} alt={suggested_item.name || "suggested"} className="w-full h-96 object-cover rounded-xl" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-0 left-0 p-4">
            <p className="font-bold text-lg">Try it with these!</p>
            <p className="text-xl font-black">{suggested_item.name}</p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="font-semibold mb-3">What do you think of this suggestion?</p>
          <div className="flex items-center justify-center gap-4">
            <button onClick={handleNope} className="grid h-16 w-16 place-items-center rounded-full bg-white/10 hover:bg-white/20 transition">
              <XIcon className="h-8 w-8" />
            </button>
            <button onClick={handleLike} className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 hover:opacity-90 transition">
              <HeartIcon className="h-10 w-10" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========= App (with Analytics + Calibration + Outfit + Save) ========= */
export default function App() {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");

  // analytics state
  const [events, setEvents] = useState([]); // {ts, action, pid, dwell, soft, brand,type,color,priceBucket, matchScore}
  const [likeHistory, setLikeHistory] = useState([]); // 1/0 over time for sparkline
  const [prefs, setPrefs] = useState({ brand: new Map(), type: new Map(), color: new Map(), price: new Map() });

  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const current = items[cursor];
  const DWELL_MS = 5000;

  // calibration + outfit modal state
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [outfitResult, setOutfitResult] = useState(null);
  const [isFetchingOutfit, setIsFetchingOutfit] = useState(false);

  // toast state
  const [toastMsg, setToastMsg] = useState("");

  // load first deck
  useEffect(() => {
    setLoading(true);
    fetchNext("demo")
      .then((list) => setItems(Array.isArray(list) ? list : []))
      .catch((e) => setLoadErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // auto-refill when deck running low
  useEffect(() => {
    if (items.length - cursor < 10) {
      fetchNext("demo").then((batch) => setItems((prev) => [...prev, ...(Array.isArray(batch) ? batch : [])]));
    }
  }, [cursor, items.length]);

  // learned preference score for a product, derived from feedback
  const computeMatchScore = useMemo(() => {
    const weights = { brand: 1.0, type: 1.2, color: 0.8, price: 0.6 };
    return (p) => {
      if (!p) return 0;
      let s = 0;
      const priceB = toBucket(p.price);
      s += (prefs.brand.get(p.brand) || 0) * weights.brand;
      s += (prefs.type.get(p.type || p.category) || 0) * weights.type;
      s += (prefs.color.get(p.color) || 0) * weights.color;
      s += (prefs.price.get(priceB) || 0) * weights.price;
      return s;
    };
  }, [prefs]);

  const currentScore = useMemo(() => computeMatchScore(current), [computeMatchScore, current]);
  const advance = () => setCursor((i) => Math.min(i + 1, items.length));

  // update analytics + backend
  const recordAndSend = (product, action, payload) => {
    const pid = detectPid(product);
    const dwell = payload?.dwell_ms ?? 0;
    const soft = !!payload?.soft;
    const isSuper = !!payload?.super_like;

    const matchScore = computeMatchScore(product);

    const priceBucket = toBucket(product?.price);
    const evt = {
      ts: Date.now(),
      action: isSuper ? "super_like" : action,
      pid,
      dwell,
      soft,
      brand: product?.brand || "",
      type: product?.type || product?.category || "",
      color: product?.color || "",
      priceBucket,
      matchScore,
      name: product?.name || ""
    };
    setEvents((prev) => [evt, ...prev].slice(0, 200));
    setLikeHistory((prev) => [action === "like" || isSuper ? 1 : 0, ...prev].slice(0, 60));

    const w =
      action === "nope" ? -0.7 :
      isSuper ? 2.0 :
      soft ? 1.25 :
      1.0;

    setPrefs((prev) => {
      const next = {
        brand: new Map(prev.brand),
        type:  new Map(prev.type),
        color: new Map(prev.color),
        price: new Map(prev.price),
      };
      inc(next.brand, product?.brand, w);
      inc(next.type,  product?.type || product?.category, w);
      inc(next.color, product?.color, w * 0.8);
      inc(next.price, priceBucket, w * 0.6);
      return next;
    });

    sendFeedback({
      user: "demo",
      pid,
      like: action === "nope" ? -1 : 1,
      dwell_ms: dwell,
      soft_like: soft,
      super_like: isSuper
    }).catch((e) => console.warn("sendFeedback failed", e));
  };

  // Handlers accept optional product (used by suggestion & modal)
  const handleLike = (opts = {}) => {
    const product = opts.product || current;
    if (!product) return;
    recordAndSend(product, "like", opts);
    setTimeout(advance, 150);
  };
  const handleSuper = (opts = {}) => {
    const product = opts.product || current;
    if (!product) return;
    recordAndSend(product, "like", { ...opts, super_like: true });
    setTimeout(advance, 150);
  };
  const handleNope = (opts = {}) => {
    const product = opts.product || current;
    if (!product) return;
    recordAndSend(product, "nope", opts);
    setTimeout(advance, 150);
  };

  // Save / Wishlist handler
  const handleSave = (opts = {}) => {
    const product = opts.product || current;
    if (!product) return;
    const pid = detectPid(product);
    sendFeedback({
      user: "demo",
      pid,
      saved: true,
      like: 1,
      dwell_ms: 0,
      soft_like: false,
      super_like: false
    }).catch((e) => console.warn("sendFeedback (saved) failed", e));
    setToastMsg(`${product.name || "Item"} saved to wishlist`);
    setTimeout(() => setToastMsg(""), 1500);
  };

  // aggregate analytics
  const stats = useMemo(() => {
    const total = events.length;
    let likes = 0, nopes = 0, supers = 0, softs = 0;
    let dwellLike = 0, cLike = 0, dwellNope = 0, cNope = 0;

    events.forEach((e) => {
      if (e.action === "like") likes++;
      if (e.action === "super_like") { likes++; supers++; }
      if (e.action === "nope") nopes++;
      if (e.soft) softs++;
      if (e.action === "like" || e.action === "super_like") { dwellLike += e.dwell; cLike++; }
      if (e.action === "nope") { dwellNope += e.dwell; cNope++; }
    });

    const likeRate = pct(likes, total);
    const avgDwellLike = cLike ? Math.round(dwellLike / cLike) : 0;
    const avgDwellNope = cNope ? Math.round(dwellNope / cNope) : 0;

    const first10 = events.slice(-10);
    const last10  = events.slice(0, 10);
    const lr = (arr) => {
      const c = arr.length;
      if (!c) return 0;
      const l = arr.filter((e) => e.action === "like" || e.action === "super_like").length;
      return Math.round((l / c) * 100);
    };
    const first10LR = lr(first10);
    const last10LR  = lr(last10);
    const lift = last10LR - first10LR;

    return {
      total, likes, supers, nopes, softs,
      likeRate, avgDwellLike, avgDwellNope,
      first10LR, last10LR, lift
    };
  }, [events]);

  const spark = useMemo(() => likeHistory.slice().reverse(), [likeHistory]);

  // calibration handler
  const handleCalibration = async (category) => {
    setIsCalibrating(false);
    setLoading(true);
    setCursor(0);
    await sendCalibration(category);
    const newItems = await fetchNext("demo");
    setItems(Array.isArray(newItems) ? newItems : []);
    setLoading(false);
  };

  // Outfit fetch handler
  const handleGetOutfit = async (product) => {
    if (isFetchingOutfit) return;
    const pid = detectPid(product);
    if (!pid) {
      setToastMsg("Can't determine product id for outfit suggestion.");
      setTimeout(() => setToastMsg(""), 1500);
      return;
    }
    setIsFetchingOutfit(true);
    try {
      const result = await fetchOutfit(pid);
      if (result && result.suggested_item) {
        setOutfitResult(result);
      } else {
        setToastMsg("No complementary item found.");
        setTimeout(() => setToastMsg(""), 1500);
      }
    } catch (e) {
      console.error("Outfit fetch failed:", e);
      setToastMsg("Could not fetch outfit suggestion.");
      setTimeout(() => setToastMsg(""), 1500);
    } finally {
      setIsFetchingOutfit(false);
    }
  };

  return (
    <div className="min-h-screen w-full text-white antialiased bg-[radial-gradient(1200px_600px_at_20%_0%,#1b2559_0%,#0b122b_45%,#070e20_75%,#050a14_100%)] relative">
      {/* subtle glows */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_500px_at_80%_20%,rgba(17,123,150,0.25)_0%,transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.25)_100%)]" />

      <div className="mx-auto max-w-[1100px] px-4 pb-8 pt-5">
        {/* top bar */}
        <div className="flex items-center justify-between">
          <div className="text-3xl font-black tracking-tight">clozyt•flo</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAnalyticsOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 h-9 backdrop-blur ring-1 ring-white/15 hover:bg-white/15"
              title="Toggle analytics"
            >
              <ChartIcon className="h-4 w-4" />
              <span className="text-sm">{analyticsOpen ? "Hide" : "Analytics"}</span>
            </button>

            {/* Calibrate */}
            <button
              onClick={() => setIsCalibrating(true)}
              className="rounded-full bg-white/10 px-4 h-9 backdrop-blur ring-1 ring-white/15 hover:bg-white/20 text-sm font-medium"
            >
              Calibrate Feed
            </button>

            <GlassIcon><SlidersIcon className="h-4 w-4" /></GlassIcon>
            <GlassIcon><SearchIcon className="h-4 w-4" /></GlassIcon>
          </div>
        </div>

        {/* main: card + analytics side */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Card column */}
          <div>
            {loading ? (
              <CardShell>
                <div className="text-lg font-semibold">Loading…</div>
                <div className="mt-2 text-white/70 text-sm">Fetching products</div>
              </CardShell>
            ) : loadErr ? (
              <CardShell danger>
                <div className="text-lg font-semibold">Failed to load</div>
                <div className="mt-2 text-white/80 text-sm">{loadErr}</div>
              </CardShell>
            ) : current ? (
              current.is_outfit_suggestion ? (
                <OutfitSuggestionCard
                  suggestion={current}
                  onLike={handleLike}
                  onNope={handleNope}
                />
              ) : (
                <SwipeableCard
                  key={detectPid(current) || cursor}
                  product={current}
                  onLike={handleLike}
                  onNope={handleNope}
                  onSuper={handleSuper}
                  onSave={handleSave}
                  onGetOutfit={handleGetOutfit}
                  isFetchingOutfit={isFetchingOutfit}   
                  DWELL_MS={DWELL_MS}
                  matchScore={currentScore}
                />
              )
            ) : (
              <CardShell>
                <div className="text-lg font-semibold">You’re all caught up ✨</div>
                <div className="mt-2 text-white/70 text-sm">
                  Add more items to <code className="text-white/90">public/products.json</code> (or <code className="text-white/90">public/product.json</code>) to continue.
                </div>
              </CardShell>
            )}
          </div>

          {/* Analytics column */}
          <div className={`${analyticsOpen ? "opacity-100" : "opacity-0 pointer-events-none"} transition-opacity duration-200`}>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold">Live Analytics</div>
                <div className="text-xs text-white/70">proving the recsys is adapting</div>
              </div>

              {/* KPI row */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                <KPI label="Swipes" value={stats.total} />
                <KPI label="Likes" value={stats.likes} />
                <KPI label="Super-likes" value={stats.supers} />
                <KPI label="Nopes" value={stats.nopes} />
                <KPI label="Dwell ≥5s" value={stats.softs} />
                <KPI label="Like rate" value={`${stats.likeRate}%`} />
              </div>

              {/* Rolling like rate + lift */}
              <div className="mt-4 rounded-2xl border border-white/10 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm">Rolling like hits (last 60)</div>
                  <div className="text-xs text-white/70">1 = like / super-like, 0 = nope</div>
                </div>
                <Sparkline data={spark} />
                <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                  <KPI label="First 10 like rate" value={`${stats.first10LR}%`} small />
                  <KPI label="Last 10 like rate" value={`${stats.last10LR}%`} small />
                  <KPI label="Lift" value={`${stats.lift >= 0 ? "+" : ""}${stats.lift}%`} small />
                </div>
              </div>

              {/* Dwell comparison */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <KPI label="Avg dwell (liked)" value={`${Math.round(stats.avgDwellLike / 100) / 10}s`} />
                <KPI label="Avg dwell (noped)" value={`${Math.round(stats.avgDwellNope / 100) / 10}s`} />
              </div>

              {/* Learned preferences */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <FacetCard title="Type preferences" items={topK(prefs.type, 5)} />
                <FacetCard title="Color preferences" items={topK(prefs.color, 5)} />
                <FacetCard title="Brand preferences" items={topK(prefs.brand, 5)} />
                <FacetCard title="Price preferences" items={topK(prefs.price, 5)} />
              </div>

              {/* Recent activity */}
              <div className="mt-4">
                <div className="font-semibold text-sm mb-2">Recent user actions</div>
                <div className="space-y-1 max-h-48 overflow-auto pr-1">
                  {events.slice(0, 12).map((e, i) => (
                    <div key={i} className="text-xs rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${
                          e.action === "nope" ? "bg-rose-400" : e.action === "super_like" ? "bg-yellow-300" : "bg-emerald-400"
                        }`} />
                        <span className="font-semibold">{e.action}</span>
                        <span className="text-white/75">· {e.name || e.pid}</span>
                      </div>
                      <div className="text-white/70">
                        dwell {Math.round(e.dwell/100)/10}s · match {Math.round(e.matchScore*10)/10}
                      </div>
                    </div>
                  ))}
                  {events.length === 0 && (
                    <div className="text-xs text-white/60">No actions yet — start swiping.</div>
                  )}
                </div>
              </div>

              <div className="mt-4 text-[11px] leading-snug text-white/65">
                The right panel is computed client-side from your actions. Likes/soft-likes/super-likes
                push up the weights for the item’s brand/type/color/price bucket; nopes push them down.
                The badge on the card shows the current item’s <b>match score</b> vs learned preferences.
                As you interact, the <b>last-10 like rate</b> rising over the <b>first-10 like rate</b> demonstrates lift.
              </div>
            </div>
          </div>
        </div>

        {/* bottom nav */}
        <div className="sticky bottom-5 mt-6 flex justify-center">
          <div className="flex items-center gap-3 rounded-full bg-white/10 p-2 pl-2.5 pr-2.5 backdrop-blur-md ring-1 ring-white/15 shadow-[0_10px_30px_rgba(0,0,0,.35)]">
            <NavButton active><HomeIcon className="h-5 w-5" /></NavButton>
            <NavButton><HeartIcon className="h-5 w-5" /></NavButton>
            <NavButton><BanIcon className="h-5 w-5" /></NavButton>
            <NavButton><BagIcon className="h-5 w-5" /></NavButton>
            <NavButton><UserIcon className="h-5 w-5" /></NavButton>
          </div>
        </div>

        {/* iOS home indicator */}
        <div className="mx-auto h-1.5 w-36 rounded-full bg-white/70" />
      </div>

      {/* Calibration modal */}
      {isCalibrating && (
        <CalibrationModal
          onSelect={handleCalibration}
          onClose={() => setIsCalibrating(false)}
        />
      )}

      {/* Outfit modal (on-demand suggestion) */}
      {outfitResult && (
        <OutfitModal
          outfit={outfitResult}
          onClose={() => setOutfitResult(null)}
          onLike={handleLike}
          onNope={handleNope}
        />
      )}

      {/* Toast */}
      <Toast message={toastMsg} onClose={() => setToastMsg("")} />
    </div>
  );
}

/* ========= Swipeable Card ========= */
function SwipeableCard({
  product,
  onLike,
  onNope,
  onSuper,
  onSave,
  onGetOutfit,
  isFetchingOutfit = false,   // NEW
  DWELL_MS = 5000,
  matchScore = 0
}) {
  const wrapRef = useRef(null);
  const start = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });
  const impressionStart = useRef(Date.now());
  const lastClick = useRef(0);

  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [showSuperSplash, setShowSuperSplash] = useState(false);

  const THRESH = 100;

  useEffect(() => {
    setX(0); setY(0); setDragging(false);
    impressionStart.current = Date.now();
    const el = wrapRef.current;
    if (el) { el.style.transition = "none"; el.style.transform = "translate3d(0,0,0) rotate(0deg)"; }
  }, [product?.url || product?.name]);

  const setTx = (nx, ny, smooth=false) => {
    setX(nx); setY(ny);
    const el = wrapRef.current;
    if (!el) return;
    el.style.transition = smooth ? "transform 220ms cubic-bezier(.2,.8,.2,1)" : "none";
    el.style.transform = `translate3d(${nx}px, ${ny}px, 0) rotate(${nx/22}deg)`;
  };

  const down = (e) => {
    if (e.target && e.target.closest?.('[data-role="super-like"]')) return;
    setDragging(true);
    const cx = e.clientX ?? e.touches?.[0]?.clientX;
    const cy = e.clientY ?? e.touches?.[0]?.clientY;
    start.current = { x: cx, y: cy };
    pos.current = { x, y };
    const pid = e.nativeEvent?.pointerId;
    if (pid != null && wrapRef.current?.setPointerCapture) { try { wrapRef.current.setPointerCapture(pid); } catch {} }
  };
  const move = (e) => {
    if (!dragging) return;
    const cx = e.clientX ?? e.touches?.[0]?.clientX;
    const cy = e.clientY ?? e.touches?.[0]?.clientY;
    setTx(cx - start.current.x + pos.current.x, cy - start.current.y + pos.current.y);
  };
  const up = () => {
    setDragging(false);
    const dwell = Date.now() - impressionStart.current;
    const soft = dwell >= DWELL_MS;
    if (x > THRESH) { setTx(x + 380, y, true); setTimeout(() => onLike({ dwell_ms: dwell, soft }), 200); }
    else if (x < -THRESH) { setTx(x - 380, y, true); setTimeout(() => onNope({ dwell_ms: dwell }), 200); }
    else setTx(0, 0, true);
  };

  const superLike = () => {
    const d = Date.now() - impressionStart.current;
    const soft = d >= DWELL_MS;
    setShowSuperSplash(true);
    setTimeout(() => setShowSuperSplash(false), 650);
    onSuper({ dwell_ms: d, soft, super_like: true });
  };

  const likeO = Math.max(0, Math.min(1, x / THRESH));
  const nopeO = Math.max(0, Math.min(1, -x / THRESH));

  const handleImageClick = (e) => {
    const t = Date.now();
    if (t - lastClick.current < 300) { e.preventDefault(); superLike(); }
    else { e.preventDefault(); }
    lastClick.current = t;
  };

  return (
    <div className="relative">
      <div
        ref={wrapRef}
        className="cardWrap w-full rounded-[28px] p-[1px] bg-[linear-gradient(140deg,rgba(255,255,255,.22),rgba(255,255,255,.06)_30%,rgba(0,0,0,.2)_70%)] shadow-[0_20px_60px_rgba(0,0,0,.45)] will-change-transform select-none"
        style={{ touchAction: "pan-y" }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onTouchStart={down} onTouchMove={move} onTouchEnd={up}
        onDragStart={(e)=>e.preventDefault()}
      >
        <div className="overflow-hidden rounded-[27px] ring-1 ring-white/10 relative">
          {/* SUPER splash overlay */}
          {showSuperSplash && (
            <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center">
              <div className="scale-95 rounded-2xl bg-gradient-to-br from-yellow-300/80 to-rose-400/80 px-6 py-3 text-black font-extrabold text-2xl shadow-xl">
                SUPER!
              </div>
            </div>
          )}

          {/* match badge */}
          <div className="absolute left-3 top-3 z-20">
            <div className="rounded-full bg-emerald-400/20 ring-1 ring-emerald-300/40 text-emerald-200 text-xs px-3 py-1 backdrop-blur">
              Match {Math.round(matchScore*10)/10}
            </div>
          </div>

          {/* top-right buttons: Save + Super-like */}
          <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); onSave?.({ product }); }}
              onPointerDown={(e)=>{ e.preventDefault(); e.stopPropagation(); }}   
              onTouchStart={(e)=>{ e.preventDefault(); e.stopPropagation(); }}     
              className="rounded-full bg-white/10 px-3 py-2 backdrop-blur hover:bg-white/15"
              aria-label="Save for later" title="Save to wishlist"
            >
              <BookmarkIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              data-role="super-like"
              onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); superLike(); }}
              onPointerDown={(e)=>{ e.preventDefault(); e.stopPropagation(); }}
              onTouchStart={(e)=>{ e.preventDefault(); e.stopPropagation(); }}
              className="rounded-full bg-white/10 px-3 py-2 backdrop-blur hover:bg-white/15"
              aria-label="Super like" title="Super like (double-click image or press this)"
            >
              <BoltIcon className="h-5 w-5" />
            </button>
          </div>

          <a href={product.url} target="_blank" rel="noreferrer" onClick={handleImageClick}>
            <img src={product.image_url} alt={product.name || "product"} className="h-[520px] w-full object-cover" />
          </a>

          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_60%,rgba(0,0,0,.68)_100%)]" />

          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-150"
            style={{ background:
              likeO>0 ? `rgba(34,197,94,${likeO*0.35})` : (nopeO>0 ? `rgba(239,68,68,${nopeO*0.35})` : "transparent")
            }}
          />

          {/* meta */}
          <div className="absolute bottom-0 left-0 right-0 p-5 z-10 pointer-events-auto">
            <div className="text-[22px] font-black tracking-tight">{product.name}</div>
            <div className="mt-0.5 text-white/75">{product.brand}</div>
            <div className="mt-2 flex items-center justify-between">
              <div className="text-[17px] font-semibold">{formatPrice(product.price)}</div>

              {/* Actions: Outfit + View */}
              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onGetOutfit?.(product); }}
                  onPointerDown={(e)=>{ e.preventDefault(); e.stopPropagation(); }}  
                  onTouchStart={(e)=>{ e.preventDefault(); e.stopPropagation(); }}    
                  disabled={isFetchingOutfit}
                  aria-busy={isFetchingOutfit}
                  className={`rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-sm backdrop-blur hover:bg-white/15 ${isFetchingOutfit ? "opacity-60 cursor-not-allowed" : ""}`}
                  aria-label="Get outfit suggestion"
                  title="Suggest a complementary item"
                >
                  {isFetchingOutfit ? "Outfit…" : "Outfit"}
                </button>
                <a
                  href={product.url} target="_blank" rel="noreferrer"
                  onClick={(e)=>e.stopPropagation()}
                  onPointerDown={(e)=>e.stopPropagation()}
                  onTouchStart={(e)=>e.stopPropagation()}
                  className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-sm backdrop-blur hover:bg-white/15"
                >
                  View →
                </a>
              </div>
            </div>
          </div>

          {/* tap-zones */}
          <button onClick={(e)=>{ e.stopPropagation(); const d=Date.now()-impressionStart.current; onNope({dwell_ms:d}); }}
                  className="absolute left-0 top-0 bottom-24 w-1/4 cursor-pointer z-0" aria-label="Nope" />
          <button onClick={(e)=>{ e.stopPropagation(); const d=Date.now()-impressionStart.current; const soft=d>=DWELL_MS; onLike({dwell_ms:d, soft}); }}
                  className="absolute right-0 top-0 bottom-24 w-1/4 cursor-pointer z-0" aria-label="Like" />
        </div>
      </div>
    </div>
  );
}

/* ========= Small UI / Analytics components ========= */
function CardShell({ children, danger=false }) {
  return (
    <div className={`rounded-3xl ${danger ? "border-rose-500/30 bg-rose-500/10" : "border-white/10 bg-white/5"} border p-8 text-center shadow-xl`}>
      {children}
    </div>
  );
}
function GlassIcon({ children }) {
  return <div className="grid h-9 w-9 place-content-center rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/15 shadow-[0_8px_24px_rgba(0,0,0,.35)]">{children}</div>;
}
function Tab({ children, active=false }) {
  return (
    <button className={`relative pb-2 transition ${active ? "text-white" : "text-white/60 hover:text-white/80"}`}>
      <span className="text-[15px] font-medium">{children}</span>
      {active && <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white" />}
    </button>
  );
}
function NavButton({ children, active=false }) {
  return <button className={`grid h-10 w-10 place-content-center rounded-full transition ${active ? "bg-white text-black" : "text-white/85 hover:bg-white/10"} `}>{children}</button>;
}
function KPI({ label, value, small=false }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 ${small ? "p-2" : "p-3"} text-center`}>
      <div className={`text-white/70 ${small ? "text-[10px]" : "text-xs"}`}>{label}</div>
      <div className={`${small ? "text-sm" : "text-lg"} font-bold mt-0.5`}>{value}</div>
    </div>
  );
}
function FacetCard({ title, items }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="text-sm font-semibold mb-2">{title}</div>
      {items.length === 0 ? (
        <div className="text-xs text-white/60">No signal yet</div>
      ) : (
        <div className="space-y-1">
          {items.map(([k, v], i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="truncate">{k || <span className="text-white/50 italic">unknown</span>}</div>
              <div className="ml-2 text-white/80 font-mono">{(Math.round(v*10)/10).toString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function Sparkline({ data = [], width = 520, height = 60, pad = 4 }) {
  const w = width, h = height, n = Math.max(1, data.length);
  const step = (w - pad * 2) / (n - 1 || 1);
  const yFor = (v) => pad + (1 - v) * (h - pad * 2);
  const points = data.map((v, i) => `${pad + i * step},${yFor(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[60px]">
      <polyline fill="none" stroke="currentColor" strokeOpacity="0.85" strokeWidth="2" points={points} />
      {data.length > 0 && (
        <circle cx={pad + (data.length - 1) * step} cy={yFor(data[data.length - 1])} r="3" />
      )}
      <line x1={pad} x2={w - pad} y1={yFor(0.5)} y2={yFor(0.5)} stroke="currentColor" strokeOpacity="0.25" strokeDasharray="4 4" />
    </svg>
  );
}
