class WakeWordService {
  constructor() {
    this.recognition = null;
    this.isRunning = false;
    this.wakeWord = "";
    this.onWakeWordDetected = null;
  }

  initialize(wakeWord, callback) {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      throw new Error("Speech Recognition is not supported in this browser.");
    }

    this.wakeWord = wakeWord.toLowerCase().trim();
    this.onWakeWordDetected = callback;

    this.recognition = new SpeechRecognition();

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";

    this.recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join(" ")
        .toLowerCase()
        .trim();

      console.log("Heard:", transcript);

      if (transcript.includes(this.wakeWord)) {
        console.log("✅ Wake word detected!");

        if (this.onWakeWordDetected) {
          this.onWakeWordDetected();
        }
      }
    };

    this.recognition.onerror = (event) => {
      console.error("Speech Recognition Error:", event.error);
    };
  }

  start() {
    if (!this.recognition || this.isRunning) return;

    this.recognition.start();
    this.isRunning = true;
  }

  stop() {
    if (!this.recognition || !this.isRunning) return;

    this.recognition.stop();
    this.isRunning = false;
  }
}

const wakeWordService = new WakeWordService();

export default wakeWordService;