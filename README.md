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
