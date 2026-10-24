import { initializeApp, getApps, getApp } from
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import { getAuth, onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  getDatabase,
  ref,
  runTransaction
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

// Reuse the existing default Firebase app and login session.
const app = getApps().some(a => a.name === "[DEFAULT]")
  ? getApp()
  : initializeApp(config);

const auth = getAuth(app);
const db = getDatabase(app);

const SAVE_INTERVAL = 10000;
const MAX_TICK_SECONDS = 15;

let currentUid = null;
let lastTick = null;
let pendingSeconds = 0;
let saving = false;

function resetClock() {
  lastTick =
    document.visibilityState === "visible"
      ? Date.now()
      : null;
}

async function saveTime() {
  if (!currentUid || pendingSeconds < 1 || saving) return;

  saving = true;

  const uid = currentUid;
  const seconds = Math.floor(pendingSeconds);

  pendingSeconds -= seconds;

  try {
    const userRef = ref(db, `users/${uid}`);

    const result = await runTransaction(userRef, profile => {
      if (!profile || typeof profile !== "object") {
        return;
      }

      const currentTotal =
        Math.max(0, Number(profile.totalTimeSeconds) || 0);

      return {
        ...profile,
        totalTimeSeconds: currentTotal + seconds
      };
    });

    if (!result.committed) {
      console.warn(
        "Safe Bucket: time update was not committed."
      );
      pendingSeconds += seconds;
    } else {
      console.log(
        `Safe Bucket: saved ${seconds} seconds. Total:`,
        result.snapshot.val()?.totalTimeSeconds
      );
    }
  } catch (error) {
    console.error(
      "Safe Bucket time save failed:",
      error.code || "",
      error.message || error
    );

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

    // Ignore long pauses, such as a suspended browser tab.
    if (elapsed > 0 && elapsed <= MAX_TICK_SECONDS) {
      pendingSeconds += elapsed;
    }

    if (pendingSeconds >= 1) {
      void saveTime();
    }
  }

  resetClock();
}

onAuthStateChanged(auth, user => {
  const newUid = user?.uid || null;

  if (currentUid !== newUid) {
    currentUid = newUid;
    pendingSeconds = 0;

    console.log(
      currentUid
        ? "Safe Bucket tracker signed in as UID: " + currentUid
        : "Safe Bucket tracker: no signed-in user."
    );
  }

  resetClock();
});

document.addEventListener("visibilitychange", () => {
  tick();

  if (document.visibilityState === "hidden") {
    void saveTime();
  }
});

window.addEventListener("pagehide", () => {
  tick();
  void saveTime();
});

setInterval(tick, SAVE_INTERVAL);

console.log("Safe Bucket playtime tracker loaded.");
