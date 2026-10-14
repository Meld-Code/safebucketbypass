import { initializeApp, getApps, getApp } from
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getDatabase, ref, get, runTransaction
} from
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

const config = {
  apiKey: "AIzaSyCkJJcpdLfWH8XZBuT8tgOkOKuj6ZtEzcY",
  authDomain: "safebucketbypass.firebaseapp.com",
  databaseURL: "https://safebucketbypass-default-rtdb.firebaseio.com",
  projectId: "safebucketbypass",
  storageBucket: "safebucketbypass.firebasestorage.app",
  messagingSenderId: "659506734507",
  appId: "1:659506734507:web:1e4268f7746380b41bdeee"
};

// Use a separate named app to avoid conflicting with auth.html.
const appName = "SafeBucketTracker";
const app = getApps().some(a => a.name === appName)
  ? getApp(appName)
  : initializeApp(config, appName);

const auth = getAuth(app);
const db = getDatabase(app);

const SAVE_INTERVAL = 10000;
const MAX_TICK_SECONDS = 15;

let currentUid = null;
let lastTick = null;
let pendingSeconds = 0;
let saving = false;

function resetClock() {
  lastTick = document.visibilityState === "visible"
    ? Date.now()
    : null;
}

async function saveTime() {
  if (!currentUid || pendingSeconds <= 0 || saving) return;

  saving = true;
  const uid = currentUid;
  const seconds = pendingSeconds;
  pendingSeconds = 0;

  try {
    const userRef = ref(db, "users/" + uid);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) return;

    const result = await runTransaction(userRef, profile => {
      if (!profile || typeof profile !== "object") return;

      // Preserve existing profile fields.
      profile.totalTimeSeconds =
        Math.max(0, Number(profile.totalTimeSeconds) || 0) + seconds;

      return profile;
    });

    if (!result.committed) {
      pendingSeconds += seconds;
    }
  } catch (error) {
    console.error("Safe Bucket time save failed:", error);
    pendingSeconds += seconds;
  } finally {
    saving = false;
  }
}

function tick() {
  const now = Date.now();

  if (
    currentUid &&
    document.visibilityState === "visible" &&
    lastTick !== null
  ) {
    const elapsed = (now - lastTick) / 1000;

    // Avoid counting long pauses or a suspended browser as active time.
    if (elapsed > 0 && elapsed <= MAX_TICK_SECONDS) {
      pendingSeconds += elapsed;
    }

    if (pendingSeconds >= 1) {
      saveTime();
    }
  }

  resetClock();
}

onAuthStateChanged(auth, user => {
  if (currentUid !== user?.uid) {
    // Try to save any time accumulated for the previous account.
    if (currentUid && pendingSeconds > 0) {
      saveTime();
    }

    currentUid = user?.uid || null;
    pendingSeconds = 0;
  }

  resetClock();
});

document.addEventListener("visibilitychange", () => {
  tick();

  if (document.visibilityState === "hidden") {
    saveTime();
  }
});

window.addEventListener("pagehide", () => {
  tick();
  saveTime();
});

setInterval(tick, SAVE_INTERVAL);

console.log("Safe Bucket playtime tracker loaded.");

