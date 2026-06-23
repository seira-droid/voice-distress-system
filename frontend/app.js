const apiBaseInput = document.querySelector("#apiBase");
const statusDot = document.querySelector("#statusDot");
const statusTitle = document.querySelector("#statusTitle");
const statusText = document.querySelector("#statusText");
const output = document.querySelector("#output");
const triggerWordInput = document.querySelector("#triggerWord");
const contactsList = document.querySelector("#contactsList");

function apiBase() {
  return apiBaseInput.value.replace(/\/$/, "");
}

function endpoint(path) {
  return `${apiBase()}${path}`;
}

function setStatus(title, text, isError = false) {
  statusTitle.textContent = title;
  statusText.textContent = text;
  statusDot.classList.toggle("error", isError);
}

function showOutput(data) {
  output.textContent = JSON.stringify(data, null, 2);
}

async function request(path, options = {}) {
  const response = await fetch(endpoint(path), {
    headers: {
      Accept: "application/json",
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return data;
}

async function loadTriggerWord() {
  try {
    setStatus("Loading", "Fetching the current trigger word.");
    const data = await request("/trigger-word/");
    triggerWordInput.value = data.word || "";
    showOutput(data);
    setStatus("Ready", "Trigger word loaded successfully.");
  } catch (error) {
    showOutput({ error: error.message });
    setStatus("Error", "Could not load trigger word.", true);
  }
}

async function loadContacts() {
  try {
    setStatus("Loading", "Fetching emergency contacts.");
    const data = await request("/emergency-contacts/");
    const contacts = Array.isArray(data) ? data : data.results || [];

    if (!contacts.length) {
      contactsList.className = "list empty";
      contactsList.textContent = "No contacts saved yet.";
    } else {
      contactsList.className = "list";
      contactsList.innerHTML = contacts
        .map(
          (contact) => `
            <div class="contact-item">
              <strong>${contact.name}</strong>
              <span>${contact.relationship} - ${contact.phone_number}</span>
            </div>
          `,
        )
        .join("");
    }

    showOutput(data);
    setStatus("Ready", "Emergency contacts loaded.");
  } catch (error) {
    showOutput({ error: error.message });
    setStatus("Error", "Could not load emergency contacts.", true);
  }
}

document.querySelector("#triggerForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    setStatus("Saving", "Updating trigger word.");
    const data = await request("/trigger-word/", {
      method: "PUT",
      body: JSON.stringify({ word: triggerWordInput.value }),
    });

    triggerWordInput.value = data.word || triggerWordInput.value;
    showOutput(data);
    setStatus("Saved", "Trigger word updated.");
  } catch (error) {
    showOutput({ error: error.message });
    setStatus("Error", "Trigger word update failed.", true);
  }
});

document.querySelector("#contactForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const payload = Object.fromEntries(formData.entries());

  try {
    setStatus("Saving", "Adding emergency contact.");
    const data = await request("/emergency-contacts/", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    event.currentTarget.reset();
    showOutput(data);
    setStatus("Saved", "Emergency contact added.");
    await loadContacts();
  } catch (error) {
    showOutput({ error: error.message });
    setStatus("Error", "Contact save failed.", true);
  }
});

document.querySelector("#analysisForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const payload = {
    trigger_phrase_detected: formData.get("trigger_phrase_detected") === "on",
    transcript: formData.get("transcript"),
    intensity_score: Number(formData.get("intensity_score")),
    base_risk_score: Number(formData.get("base_risk_score")),
  };

  try {
    setStatus("Analyzing", "Submitting voice event to the API.");
    const data = await request("/voice/analyze/", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    showOutput(data);
    setStatus("Ready", "Voice event analyzed.");
  } catch (error) {
    showOutput({ error: error.message });
    setStatus("Error", "Voice analysis failed.", true);
  }
});

document.querySelector("#refreshTrigger").addEventListener("click", loadTriggerWord);
document.querySelector("#refreshContacts").addEventListener("click", loadContacts);

loadTriggerWord();
loadContacts();
