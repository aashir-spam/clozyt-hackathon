Clozyt.flo — A Smart Fashion Recommender

An intelligent, swipe-first fashion discovery platform that learns your style in real time and helps you build complete outfits on the fly. Forget endless scrolling—just swipe. ✨

Table of Contents

Inspiration

What It Does

How It Works

Tech Stack

Challenges

Accomplishments

What We Learned

Roadmap

Getting Started

Prerequisites

Installation

Backend Setup

Frontend Setup

Project Structure

Development Notes

Contributing

License

Acknowledgements

🧠 Inspiration

We set out to build something more engaging than the standard “scroll and filter” e-commerce flow. Many recommenders feel static or overwhelming. Clozyt.flo emphasizes a transparent feedback loop that learns your style in real time and helps you complete outfits on demand.

✨ What It Does

Tinder-style swipes on top of a multi-signal, adaptive recommendation engine:

⚡ Real-Time Learning: Swipe right and the feed adapts on the very next card.

🎛️ User Calibration: Tap Calibrate to set the session’s vibe (e.g., “dresses”, “jackets”) and instantly retune the feed.

🧩 On-Demand Outfit Completion: Love an item? Tap Outfit and we’ll fetch a complementary match from the catalog.

🛰️ Multi-Signal Input: Beyond swipes—Super Likes, Saves, and even dwell time (Soft Like) shape recommendations.

🧠 Balanced Diversity: Maximal Marginal Relevance (MMR) keeps the feed fresh—mixing exploitation (what you love) with exploration (new styles).

🛠 How It Works

Backend: Python + FastAPI. Product metadata is vectorized via scikit-learn TF-IDF. We use Faiss for lightning-fast vector similarity search.

Frontend: React (Vite) + Tailwind CSS for a responsive, swipe-friendly UI.

Data Pipeline: A Python + Pandas script ingests multiple raw CSVs, cleans/categorizes them, and emits a unified products.json.

Algorithmically, we:

Embed product metadata (titles, tags, categories) with TF-IDF.

Maintain a lightweight user preference vector updated in real time from swipes & signals (with tuned learning rate alpha and weights per signal).

Retrieve candidates via Faiss nearest neighbors.

Apply MMR with lambda_ to trade off relevance and diversity.

(On Outfit): query conditional candidates constrained by category/style complementarity.

🧰 Tech Stack

Layer

Tech

Backend

FastAPI, Python, Uvicorn

ML / Retrieval

scikit-learn (TF-IDF), Faiss

Frontend

React, Vite, Tailwind CSS

Data

Pandas, CSV → products.json

🧱 Challenges We Ran Into

Bridging “theoretically correct” and feels great. Early versions learned too slowly and repeated items. We tuned:

Learning rate (alpha) for snappier adaptation.

MMR diversity (lambda_) to avoid repetitive feeds.

Signal weights so Super Likes / Saves / Dwell have real impact.

🏆 Accomplishments That We’re Proud Of

A responsive, “alive” recommender that reacts within a swipe.

On-Demand Outfit Completion that moves beyond discovery to styling.

User-controlled Calibration for fast intent shifts (e.g., shopping just jackets).

🧠 What We Learned

Great recommenders aren’t just math—they’re interaction design. The “learning feel” is the product. Iterative tuning of learning/diversity/signal weights made the system intuitive and a little bit magical.

🚀 What’s Next for Clozyt.flo

Smarter Algorithm & Signals



Richer User Experience



🧪 Getting Started

Prerequisites

Node.js & npm

Python 3.8+ & pip

Installation

# Clone the repo
git clone https://github.com/your_username/clozyt-hackathon.git
cd clozyt-hackathon

Backend Setup

cd backend
pip install -r ../requirements.txt
uvicorn main:app --reload

Defaults to http://127.0.0.1:8000

Adjust host/port as needed: uvicorn main:app --host 0.0.0.0 --port 8000

🖥 Frontend Setup

cd ../frontend
npm install
npm run dev

Vite dev server typically runs at http://localhost:5173

Ensure the frontend points to your backend base URL (e.g., .env, config file, or fetch client)

🗂 Project Structure

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

🧩 Development Notes

Data Pipeline: run python data_pipeline/build_products.py to regenerate products.json after adding/updating CSVs.

Signals & Weights: tune alpha, lambda_, and per-signal weights (e.g., super_like=3x, save=2x, dwell=1.2x) in the recommender config to match desired responsiveness.

MMR: start with lambda_ ≈ 0.7–0.8 for a good balance, then adjust to reduce repetition.

🤝 Contributing

PRs welcome! If you’re proposing big changes, open an issue to discuss your plan first. Please include:

Clear description & motivation

Before/after behavior (especially if tuning algorithmic parameters)

Any new environment/config requirements

📄 License

TBD — add your preferred license (e.g., MIT) here.

🙌 Acknowledgements

Faiss (Facebook AI) for fast vector similarity search

scikit-learn for TF-IDF and classic ML utilities

FastAPI, React, Vite, Tailwind CSS for a smooth developer experience

If you build something cool with Clozyt.flo—screenshots, demos, or a theme pack—share it! We’d love to see your take on swipe-native fashion discovery.

Clozyt.flo - A Smart Fashion Recommender
Welcome to Clozyt.flo, an intelligent fashion discovery platform designed to make online shopping a playful, personalized, and interactive experience. Forget endless scrolling; with Clozyt.flo, you'll find clothes you love with a simple swipe.

🧠 Inspiration
We set out to build something more engaging than the standard "scroll and filter" e-commerce experience. Many recommender apps feel static and overwhelming. Our inspiration was to create a system with a transparent feedback loop that learns your style in real-time and even helps you build complete outfits on the fly.

✨ What It Does
Clozyt.flo is a smart fashion recommender with a Tinder-style swipe interface. Behind the simple UI is a powerful, multi-signal algorithm that adapts with every action you take:

⚡️ Real-Time Learning: Swipe right on a product, and the algorithm instantly learns your preference. The feed adapts on the very next swipe.

✨ User Calibration: Set the "vibe" for your shopping session. Use the Calibrate button to select a category like "dresses" or "jackets" to instantly tailor your entire feed.

👕 On-Demand Outfit Completion: See an item you like? Click the Outfit button, and the algorithm will search the entire catalog to find the perfect matching item.

🚀 Multi-Signal Input: The algorithm learns from more than just swipes. It gives extra weight to items you Super Like, items you Save, and even items you simply pause on for a few seconds (Soft Like).

🧠 Balanced Recommendations: To keep the feed interesting, the system uses a diversity algorithm (MMR) to balance showing you what you love (Exploitation) with introducing you to new styles you might like (Exploration).

🛠️ How We Built It
Backend: A robust Python backend powered by the FastAPI framework. We used scikit-learn to generate TF-IDF embeddings from product metadata and integrated Faiss (from Facebook AI) for high-speed vector similarity search.

Frontend: A responsive single-page application built with React and Vite, and styled with Tailwind CSS.

Data Pipeline: A custom Python script using Pandas to ingest, clean, and categorize multiple raw CSV data sources into a single, unified products.json file.

🧱 Challenges We Ran Into
Our biggest challenge was bridging the gap between a theoretically "correct" algorithm and one that felt right to a user. We initially struggled with a slow learning rate and a repetitive feed. This pushed us to implement a more sophisticated, multi-signal approach and fine-tune our learning rate (alpha) and diversity (lambda_) parameters to achieve the perfect balance.

🏆 Accomplishments That We're Proud Of
We're incredibly proud of building a recommendation engine that feels truly alive and responsive. The On-Demand Outfit Completion and user-controlled Feed Calibration are features that make the app genuinely useful and interactive, moving beyond simple discovery to actual styling and shopping intent.

🧠 What We Learned
This project was a deep dive into the practical realities of building a recommendation system. We learned that the user experience of a "learning" algorithm requires careful, iterative tuning. You can't just implement the math; you have to shape it to feel intuitive and magical.

🚀 What's Next for Clozyt.flo
The current version of Clozyt.flo is a robust proof-of-concept. The architecture is designed to be highly extensible, and we have a clear roadmap for future enhancements:

Smarter Algorithm & Signals:

Implicit Fashion Graph: Build a true 'outfit discovery' engine that understands how different items stylistically connect.

Trend Sensitivity: Incorporate network-level data to boost items that are currently trending.

Richer User Experience:

Fashion Personality Profile: Create a fun, shareable 'style persona' for users based on their long-term swipe history.

"Surprise Me" Button: Add an on-demand discovery feature that pushes users into a completely new style zone.

Getting Started
To get a local copy up and running, follow these simple steps.

Prerequisites
Node.js and npm

Python 3.8+ and pip

Installation
Clone the repo

Bash

git clone https://github.com/your_username/clozyt-hackathon.git
cd clozyt-hackathon
Backend Setup

Bash

cd backend
pip install -r ../requirements.txt
uvicorn main:app --reload
Frontend Setup

Bash

cd ../frontend
npm install
npm run dev

