# Clozyt.flo — A Smart Fashion Recommender

An intelligent, swipe-first fashion discovery platform that learns your style in real time and helps you build complete outfits on the fly. Forget endless scrolling—just swipe. ✨

---

## Table of Contents

* [Inspiration](#-inspiration)
* [What It Does](#-what-it-does)
* [How It Works](#-how-it-works)
* [Tech Stack](#-tech-stack)
* [Challenges](#-challenges-we-ran-into)
* [Accomplishments](#-accomplishments-that-were-proud-of)
* [What We Learned](#-what-we-learned)
* [Roadmap](#-whats-next-for-clozytflo)
* [Getting Started](#-getting-started)

  * [Prerequisites](#prerequisites)
  * [Installation](#installation)
  * [Backend Setup](#backend-setup)
  * [Frontend Setup](#-frontend-setup)
* [Project Structure](#-project-structure)
* [Development Notes](#-development-notes)
* [Contributing](#-contributing)
* [License](#-license)
* [Acknowledgements](#-acknowledgements)

---

## 🧠 Inspiration

We set out to build something more engaging than the standard “scroll and filter” e-commerce flow. Many recommenders feel static or overwhelming. Clozyt.flo emphasizes a transparent feedback loop that learns your style in real time and helps you complete outfits on demand.

---

## ✨ What It Does

Tinder-style swipes on top of a multi-signal, adaptive recommendation engine:

* **⚡ Real-Time Learning:** Swipe right and the feed adapts on the very next card.
* **🎛️ User Calibration:** Tap **Calibrate** to set the session’s vibe (e.g., “dresses”, “jackets”) and instantly retune the feed.
* **🧩 On-Demand Outfit Completion:** Love an item? Tap **Outfit** and we’ll fetch a complementary match from the catalog.
* **🛰️ Multi-Signal Input:** Beyond swipes—**Super Likes**, **Saves**, and even **dwell time** (Soft Like) shape recommendations.
* **🧠 Balanced Diversity:** Maximal Marginal Relevance (MMR) keeps the feed fresh—mixing **exploitation** (what you love) with **exploration** (new styles).

---

## 🛠 How It Works

* **Backend:** Python + **FastAPI**. Product metadata is vectorized via **scikit-learn** TF-IDF. We use **Faiss** for lightning-fast vector similarity search.
* **Frontend:** **React** (Vite) + **Tailwind CSS** for a responsive, swipe-friendly UI.
* **Data Pipeline:** A Python + **Pandas** script ingests multiple raw CSVs, cleans/categorizes them, and emits a unified `products.json`.

Algorithmically, we:

1. Embed product metadata (titles, tags, categories) with TF-IDF.
2. Maintain a lightweight user preference vector updated in real time from swipes & signals (with tuned learning rate `alpha` and weights per signal).
3. Retrieve candidates via Faiss nearest neighbors.
4. Apply MMR with `lambda_` to trade off relevance and diversity.
5. (On Outfit): query conditional candidates constrained by category/style complementarity.

---

## 🧰 Tech Stack

| Layer          | Tech                          |
| -------------- | ----------------------------- |
| Backend        | FastAPI, Python, Uvicorn      |
| ML / Retrieval | scikit-learn (TF-IDF), Faiss  |
| Frontend       | React, Vite, Tailwind CSS     |
| Data           | Pandas, CSV → `products.json` |

---

## 🧱 Challenges We Ran Into

Bridging “theoretically correct” and **feels great**. Early versions learned too slowly and repeated items. We tuned:

* **Learning rate (`alpha`)** for snappier adaptation.
* **MMR diversity (`lambda_`)** to avoid repetitive feeds.
* **Signal weights** so Super Likes / Saves / Dwell have real impact.

---

## 🏆 Accomplishments That We’re Proud Of

* A **responsive, “alive”** recommender that reacts within a swipe.
* **On-Demand Outfit Completion** that moves beyond discovery to styling.
* **User-controlled Calibration** for fast intent shifts (e.g., shopping just jackets).

---

## 🧠 What We Learned

Great recommenders aren’t just math—they’re **interaction design**. The “learning feel” is the product. Iterative tuning of learning/diversity/signal weights made the system intuitive and a little bit magical.

---

## 🚀 What’s Next for Clozyt.flo

**Smarter Algorithm & Signals**

* [ ] **Implicit Fashion Graph:** Understand stylistic connections for true outfit discovery.
* [ ] **Trend Sensitivity:** Incorporate network-level signals to boost trending items.

**Richer User Experience**

* [ ] **Fashion Personality Profile:** A fun, shareable style persona from long-term history.
* [ ] **“Surprise Me” Button:** One-tap exploration into a fresh style zone.

---

## 🧪 Getting Started

### Prerequisites

* **Node.js** & **npm**
* **Python 3.8+** & **pip**

### Installation

```bash
# Clone the repo
git clone https://github.com/your_username/clozyt-hackathon.git
cd clozyt-hackathon
```

### Backend Setup

```bash
cd backend
pip install -r ../requirements.txt
uvicorn main:app --reload
```

* Defaults to `http://127.0.0.1:8000`
* Adjust host/port as needed: `uvicorn main:app --host 0.0.0.0 --port 8000`

### 🖥 Frontend Setup

```bash
cd ../frontend
npm install
npm run dev
```

* Vite dev server typically runs at `http://localhost:5173`
* Ensure the frontend points to your backend base URL (e.g., `.env`, config file, or fetch client)

---

## 🗂 Project Structure

```
clozyt-hackathon/
├─ backend/
│  ├─ main.py              # FastAPI app
│  ├─ recommender/         # TF-IDF, Faiss index, MMR, signal weights
│  ├─ data/                # products.json lives here
│  └─ ...
├─ frontend/
│  ├─ src/
│  │  ├─ components/       # Swipe card, Outfit button, Calibrate UI
│  │  ├─ pages/
│  │  └─ lib/              # API client, config
│  └─ ...
├─ data_pipeline/
│  ├─ build_products.py    # CSV → cleaned → products.json
│  └─ raw/                 # Raw CSV sources
└─ README.md
```

---

## 🧩 Development Notes

* **Data Pipeline:** run `python data_pipeline/build_products.py` to regenerate `products.json` after adding/updating CSVs.
* **Signals & Weights:** tune `alpha`, `lambda_`, and per-signal weights (e.g., `super_like=3x`, `save=2x`, `dwell=1.2x`) in the recommender config to match desired responsiveness.
* **MMR:** start with `lambda_ ≈ 0.7–0.8` for a good balance, then adjust to reduce repetition.

---

## 🤝 Contributing

PRs welcome! If you’re proposing big changes, open an issue to discuss your plan first. Please include:

* Clear description & motivation
* Before/after behavior (especially if tuning algorithmic parameters)
* Any new environment/config requirements

---

## 📄 License

TBD — add your preferred license (e.g., MIT) here.

---

## 🙌 Acknowledgements

* **Faiss** (Facebook AI) for fast vector similarity search
* **scikit-learn** for TF-IDF and classic ML utilities
* **FastAPI**, **React**, **Vite**, **Tailwind CSS** for a smooth developer experience

---

> If you build something cool with Clozyt.flo—screenshots, demos, or a theme pack—share it! We’d love to see your take on swipe-native fashion discovery.
