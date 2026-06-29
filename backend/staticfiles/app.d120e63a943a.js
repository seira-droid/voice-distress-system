// -------------------------
// CORE UTILITIES
// -------------------------
const apiBaseInput = document.querySelector("#apiBase");
const statusDot    = document.querySelector("#statusDot");
const statusTitle  = document.querySelector("#statusTitle");
const statusText   = document.querySelector("#statusText");
const output       = document.querySelector("#output");

function apiBase() { return apiBaseInput.value.replace(/\/$/, ""); }
function endpoint(path) { return `${apiBase()}${path}`; }

function setStatus(title, text, isError = false) {
  statusTitle.textContent = title;
  statusText.textContent  = text;
  statusDot.classList.toggle("error", isError);
}

function showOutput(data) {
  output.textContent = JSON.stringify(data, null, 2);
}

async function request(path, options = {}) {
  const response = await fetch(endpoint(path), {
    headers: {
      Accept: "application/json",
      ...(options.body instanceof FormData
        ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
    ...options,
  });
  const ct   = response.headers.get("content-type") || "";
  const data = ct.includes("application/json")
    ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(typeof data === "string" ? data : JSON.stringify(data));
  }
  return data;
}

// -------------------------
// RISK HELPERS
// -------------------------
function getRiskColor(score) {
  if (score >= 81) return "#ef4444";
  if (score >= 61) return "#f97316";
  if (score >= 31) return "#f59e0b";
  return "#22c55e";
}

function getRiskLabel(score) {
  if (score >= 81) return "CRITICAL";
  if (score >= 61) return "HIGH";
  if (score >= 31) return "MEDIUM";
  return "LOW";
}

function checkAlertBanner(data) {
  const banner = document.querySelector("#alertBanner");
  if (data.alert_triggered || data.send_alert || data.telegram_sent) {
    banner.classList.add("visible");
  } else {
    banner.classList.remove("visible");
  }
}

function showRiskCard(data) {
  const score = data.risk_score || 0;
  const color = getRiskColor(score);
  const level = getRiskLabel(score);
  const card  = document.querySelector("#riskCard");
  const wrap  = document.querySelector("#recordResult");

  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
      <div style="
        width:72px;height:72px;border-radius:50%;
        background:${color}22;border:3px solid ${color};
        display:flex;align-items:center;justify-content:center;
        font-size:1.5rem;font-weight:800;color:${color}
      ">${score}</div>
      <div>
        <div style="font-size:1.1rem;font-weight:700">${data.classification || level}</div>
        <div style="color:#94a3b8;font-size:0.85rem">${data.category || "Risk level: " + level}</div>
        ${data.wake_word_detected
          ? `<div style="color:#f59e0b;font-size:0.8rem;margin-top:4px">
               🎤 Wake word detected: <strong>${data.wake_word || ""}</strong></div>`
          : ""}
      </div>
      ${data.telegram_sent
        ? `<div style="margin-left:auto;padding:4px 12px;
             background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);
             border-radius:999px;color:#ef4444;font-size:0.8rem;font-weight:700">
             🚨 ALERT SENT</div>` : ""}
    </div>
    ${data.transcript
      ? `<div style="
           padding:10px 14px;background:#090c12;border-radius:8px;
           margin-bottom:12px;font-size:0.85rem;color:#7ee8a2;
           border:1px solid #2d3148">
           <strong style="color:#94a3b8">Transcript:</strong><br>
           ${data.transcript}
         </div>` : ""}
    <p style="color:#cbd5e1;margin:0 0 12px;font-size:0.9rem">
      ${data.summary || ""}
    </p>
    ${data.recommendations?.length ? `
      <div style="color:#94a3b8;font-size:0.82rem">
        <strong style="color:#f1f5f9">Recommendations:</strong>
        <ul style="margin:6px 0 0;padding-left:18px">
          ${data.recommendations.map(r => `<li style="margin-bottom:4px">${r}</li>`).join("")}
        </ul>
      </div>` : ""}
    ${data.telegram_sent
      ? `<div style="margin-top:14px;padding:10px 14px;
           background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.3);
           border-radius:8px;color:#22c55e;font-size:0.85rem">
           ✅ Telegram alert sent to emergency contacts
         </div>` : ""}
  `;
  wrap.style.display = "block";
  checkAlertBanner(data);
}

// -------------------------
// STEP INDICATOR
// -------------------------
const steps = {
  listening:  document.querySelector("#step-listening"),
  wakeword:   document.querySelector("#step-wakeword"),
  recording:  document.querySelector("#step-recording"),
  analyzing:  document.querySelector("#step-analyzing"),
  result:     document.querySelector("#step-result"),
};

function activateStep(name) {
  Object.entries(steps).forEach(([key, el]) => {
    el.classList.toggle("active", key === name);
    el.classList.toggle("done",
      ["listening","wakeword","recording","analyzing"].indexOf(key) 
      ["listening","wakeword","recording","analyzing","result"].indexOf(name)
    );
  });
}

function resetSteps() {
  Object.values(steps).forEach(el => {
    el.classList.remove("active", "done");
  });
}

// -------------------------
// WAKE WORD LISTENER
// -------------------------
let mediaRecorder   = null;
let audioChunks     = [];
let timerInterval   = null;
let secondsElapsed  = 0;
let isListening     = false;
let isRecording     = false;
let recognitionActive = false;
let recognition     = null;

const listenBtn    = document.querySelector("#listenBtn");
const listenStatus = document.querySelector("#listenStatus");
const listenBadge  = document.querySelector("#listenBadge");
const recordTimer  = document.querySelector("#recordTimer");

function formatTime(s) {
  return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
}

function startTimer() {
  secondsElapsed = 0;
  timerInterval = setInterval(() => {
    secondsElapsed++;
    recordTimer.textContent = formatTime(secondsElapsed);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  recordTimer.textContent = "";
}

async function startRecordingAfterWakeWord(stream, triggerWord) {
  audioChunks  = [];
  isRecording  = true;
  mediaRecorder = new MediaRecorder(stream);

  activateStep("recording");
  listenStatus.textContent = "🔴 Recording for 20 seconds...";
  listenBadge.className    = "badge badge-red";
  listenBadge.textContent  = "🔴 Recording";
  startTimer();

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) audioChunks.push(e.data);
  };

  mediaRecorder.onstop = async () => {
    stopTimer();
    activateStep("analyzing");
    listenStatus.textContent = "🧠 Analyzing with AI...";
    listenBadge.className    = "badge badge-amber";
    listenBadge.textContent  = "🧠 Analyzing";

    const blob = new Blob(audioChunks, { type: "audio/webm" });
    try {
      const result = await sendAudioForAnalysis(blob);
      activateStep("result");
      showRiskCard(result);
      showOutput(result);
      listenStatus.textContent = `✅ Done — Risk Score: ${result.risk_score}`;
      listenBadge.className    = "badge badge-green";
      listenBadge.textContent  = "🟢 Done";
      setStatus("Complete", `Risk score: ${result.risk_score} — ${result.classification}`);

      // Resume listening
      setTimeout(() => {
        if (isListening) startWakeWordDetection(stream);
      }, 3000);

    } catch (err) {
      listenStatus.textContent = "❌ Analysis failed: " + err.message;
      setStatus("Error", err.message, true);
    }

    isRecording = false;
  };

  mediaRecorder.start();

  // Auto-stop after 20 seconds
  setTimeout(() => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }
  }, 20000);
}

function startWakeWordDetection(stream) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    listenStatus.textContent =
      "⚠️ Browser speech recognition not supported. Use Chrome.";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous      = true;
  recognition.interimResults  = true;
  recognition.lang            = "en-US";
  recognitionActive           = true;

  const triggerWord = document.querySelector("#triggerWord").value.trim().toLowerCase();

  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript.toLowerCase();
      console.log("Heard:", transcript);

      if (!isRecording && transcript.includes(triggerWord)) {
        recognition.stop();
        recognitionActive = false;

        activateStep("wakeword");
        listenStatus.textContent = `🎤 Wake word "${triggerWord}" detected!`;
        listenBadge.className    = "badge badge-amber";
        listenBadge.textContent  = "🎤 Wake Word!";
        setStatus("Wake Word", `"${triggerWord}" detected — starting recording`);

        setTimeout(() => startRecordingAfterWakeWord(stream, triggerWord), 500);
        break;
      }
    }
  };

  recognition.onerror = (e) => {
    if (e.error !== "no-speech" && e.error !== "aborted") {
      console.warn("Speech recognition error:", e.error);
    }
  };

  recognition.onend = () => {
    // Auto-restart if still listening and not recording
    if (isListening && !isRecording && recognitionActive) {
      try { recognition.start(); } catch (_) {}
    }
  };

  try {
    recognition.start();
  } catch (e) {
    console.warn("Recognition start error:", e);
  }
}

listenBtn.addEventListener("click", async () => {
  if (!isListening) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      isListening = true;

      activateStep("listening");
      listenBtn.textContent    = "⏹ Stop Listening";
      listenBtn.style.background = "#374151";
      listenBadge.className    = "badge badge-green";
      listenBadge.textContent  = "🟢 Listening";
      listenStatus.textContent =
        `Listening for "${document.querySelector("#triggerWord").value || "help"}"...`;
      setStatus("Listening", "Wake word detection active");

      startWakeWordDetection(stream);

    } catch (err) {
      if (err.name === "NotAllowedError") {
        listenStatus.textContent = "❌ Microphone permission denied";
        setStatus("Error", "Microphone access denied", true);
      } else {
        listenStatus.textContent = "❌ Could not access microphone";
        setStatus("Error", err.message, true);
      }
    }

  } else {
    // Stop everything
    isListening = false;
    isRecording = false;
    recognitionActive = false;

    if (recognition) { try { recognition.stop(); } catch (_) {} }
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }

    stopTimer();
    resetSteps();
    listenBtn.textContent      = "🎙️ Start Listening";
    listenBtn.style.background = "";
    listenBadge.className      = "badge badge-green";
    listenBadge.textContent    = "🟢 Standby";
    listenStatus.textContent   = "Press button to begin";
    setStatus("Standby", "Listening stopped");
  }
});

// -------------------------
// SEND AUDIO TO BACKEND
// -------------------------
async function sendAudioForAnalysis(blob) {
  const file = new File([blob], `recording-${Date.now()}.webm`, {
    type: "audio/webm",
  });
  const formData = new FormData();
  formData.append("audio", file);

  const response = await fetch(endpoint("/voice/record-analyze/"), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${response.status}`);
  }

  return response.json();
}

// -------------------------
// TRIGGER WORD
// -------------------------
const triggerWordInput = document.querySelector("#triggerWord");

async function loadTriggerWord() {
  try {
    setStatus("Loading", "Fetching trigger word.");
    const data = await request("/trigger-word/");
    triggerWordInput.value = data.word || "";
    showOutput(data);
    setStatus("Ready", "Trigger word loaded.");
  } catch (e) {
    showOutput({ error: e.message });
    setStatus("Error", "Could not load trigger word.", true);
  }
}

document.querySelector("#triggerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    setStatus("Saving", "Updating trigger word.");
    const data = await request("/trigger-word/", {
      method: "PUT",
      body: JSON.stringify({ word: triggerWordInput.value }),
    });
    triggerWordInput.value = data.word || triggerWordInput.value;
    showOutput(data);
    setStatus("Saved", "Trigger word updated.");
  } catch (e) {
    showOutput({ error: e.message });
    setStatus("Error", "Trigger word update failed.", true);
  }
});

// -------------------------
// RISK THRESHOLD
// -------------------------
async function loadThreshold() {
  try {
    const data = await request("/risk-threshold/");
    document.querySelector("#thresholdInput").value = data.threshold || 80;
  } catch (_) {}
}

document.querySelector("#thresholdForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const val = document.querySelector("#thresholdInput").value;
    const data = await request("/risk-threshold/", {
      method: "PUT",
      body: JSON.stringify({ threshold: parseInt(val) }),
    });
    showOutput(data);
    setStatus("Saved", `Alert threshold set to ${data.threshold}`);
  } catch (e) {
    showOutput({ error: e.message });
    setStatus("Error", "Threshold update failed.", true);
  }
});

// -------------------------
// CONTACTS
// -------------------------
const contactsList = document.querySelector("#contactsList");

async function loadContacts() {
  try {
    setStatus("Loading", "Fetching emergency contacts.");
    const data = await request("/emergency-contacts/");
    const contacts = Array.isArray(data) ? data : data.results || [];

    if (!contacts.length) {
      contactsList.className   = "list empty";
      contactsList.textContent = "No contacts saved yet.";
    } else {
      contactsList.className = "list";
      contactsList.innerHTML = contacts.map(c => `
        <div class="contact-item">
          <strong>${c.name}</strong>
          <span>${c.relationship} · ${c.phone_number}</span>
          ${c.telegram_chat_id
            ? `<span style="color:#22c55e;font-size:0.8rem">✅ Telegram connected</span>`
            : `<span style="color:#94a3b8;font-size:0.8rem">⚠️ No Telegram ID</span>`}
        </div>
      `).join("");
    }

    showOutput(data);
    setStatus("Ready", "Contacts loaded.");
  } catch (e) {
    showOutput({ error: e.message });
    setStatus("Error", "Could not load contacts.", true);
  }
}

document.querySelector("#contactForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
  try {
    setStatus("Saving", "Adding emergency contact.");
    const data = await request("/emergency-contacts/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    e.currentTarget.reset();
    showOutput(data);
    setStatus("Saved", "Contact added.");
    await loadContacts();
  } catch (e) {
    showOutput({ error: e.message });
    setStatus("Error", "Contact save failed.", true);
  }
});

// -------------------------
// EVENT LOG
// -------------------------
async function loadEvents() {
  try {
    const data = await request("/events/");
    const list = document.querySelector("#eventsList");
    if (!data.length) {
      list.className   = "list empty";
      list.textContent = "No events yet.";
      return;
    }
    list.className = "list";
    list.innerHTML  = data.map(e => {
      const color = getRiskColor(e.risk_score);
      return `
        <div class="contact-item">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>${e.classification || "Unknown"}</strong>
            <span style="color:${color};font-weight:700">${e.risk_score}</span>
          </div>
          <span>${e.transcript}</span>
          <div style="display:flex;gap:8px;margin-top:4px">
            <span style="font-size:0.75rem;color:#94a3b8">${e.created_at}</span>
            ${e.telegram_sent
              ? `<span style="font-size:0.75rem;color:#22c55e">📨 Alert sent</span>`
              : ""}
          </div>
        </div>
      `;
    }).join("");
  } catch (_) {}
}

// -------------------------
// MANUAL ANALYSIS
// -------------------------
document.querySelector("#analysisForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  const payload  = {
    trigger_phrase_detected: formData.get("trigger_phrase_detected") === "on",
    transcript:     formData.get("transcript"),
    intensity_score: Number(formData.get("intensity_score")),
    base_risk_score: Number(formData.get("base_risk_score")),
  };
  try {
    setStatus("Analyzing", "Submitting voice event.");
    const data = await request("/voice/analyze/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    showOutput(data);
    showRiskCard(data);
    checkAlertBanner(data);
    setStatus("Ready", "Voice event analyzed.");
    await loadEvents();
  } catch (e) {
    showOutput({ error: e.message });
    setStatus("Error", "Voice analysis failed.", true);
  }
});

// -------------------------
// REFRESH BUTTONS
// -------------------------
document.querySelector("#refreshTrigger").addEventListener("click", loadTriggerWord);
document.querySelector("#refreshContacts").addEventListener("click", loadContacts);
document.querySelector("#refreshEvents").addEventListener("click", loadEvents);

// -------------------------
// INIT
// -------------------------
loadTriggerWord();
loadContacts();
loadThreshold();
loadEvents();