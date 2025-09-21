export async function fetchNext(user = "demo") {
  // ✅ FIX: Add a unique timestamp to prevent the browser from caching results
  const cacheBust = `&_cb=${Date.now()}`;
  const r = await fetch(`/api/next?user=${encodeURIComponent(user)}&n=30${cacheBust}`);
  
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function sendFeedback({ user = "demo", pid, like }) {
  try {
    await fetch(`/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, pid, like }),
    });
  } catch (_) {} // Errors are ignored for feedback
}

// In frontend/src/utils/api.js

export async function sendCalibration(category, user = "demo") {
  return fetch(`/api/calibrate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, category }),
  });
}

// In frontend/src/utils/api.js

export async function fetchOutfit(pid) {
  const r = await fetch(`/api/outfit?pid=${pid}`);
  if (!r.ok) {
    // It's okay if no outfit is found, so we don't throw an error for 404
    if (r.status === 404) return null;
    throw new Error(`HTTP ${r.status}`);
  }
  return r.json();
}