class WakeWordService {
  constructor() {
    this.recognition = null;
    this.isRunning = false;
    this.wakeWords = [];
    this.onWakeWordDetected = null;
    this.isRestarting = false;
    this.pendingRestartWords = null;
  }

  initialize(wakeWords, callback) {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      throw new Error("Speech Recognition is not supported in this browser.");
    }

    // Support both string and array of wake words
    this.wakeWords = Array.isArray(wakeWords) 
      ? wakeWords.map(w => w.toLowerCase().trim()) 
      : [wakeWords.toLowerCase().trim()];
    this.onWakeWordDetected = callback;
    console.log("Wake-word listener using:", this.wakeWords);

    this.recognition = new SpeechRecognition();

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";

    this.recognition.onstart = () => {
      console.log('✅ SpeechRecognition started');
    };

    this.recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join(" ")
        .toLowerCase()
        .trim();

      console.log('🎤 Recognized:', transcript);
      console.log('🎯 Trigger words:', this.wakeWords);

      // Check if any wake word is in the transcript
      const detectedWord = this.wakeWords.find(word => 
        transcript.includes(word)
      );

      if (detectedWord) {
        console.log('✅ Wake word detected:', detectedWord);

        if (this.onWakeWordDetected) {
          console.log('🚀 Calling onWakeWordDetected callback');
          this.onWakeWordDetected();
        } else {
          console.warn('⚠️ onWakeWordDetected callback is null');
        }
      }
    };

    this.recognition.onerror = (event) => {
      console.error("Speech Recognition Error:", event.error);
    };

    this.recognition.onend = () => {
      console.log('🛑 SpeechRecognition ended, isRunning:', this.isRunning);
      // If we were restarting, complete the restart process
      if (this.isRestarting) {
        this._completeRestart();
      }
    };
  }

  start() {
    if (!this.recognition) {
      console.warn('⚠️ Cannot start - recognition not initialized');
      return;
    }
    if (this.isRunning) {
      console.log('⚠️ Wake word service already running');
      return;
    }

    this.recognition.start();
    this.isRunning = true;
    console.log('✅ Wake word service started');
  }

  stop() {
    if (!this.recognition || !this.isRunning) {
      console.log('⚠️ Cannot stop - service not running');
      return;
    }

    try {
      // Try abort first for immediate cessation
      if (typeof this.recognition.abort === 'function') {
        this.recognition.abort();
      }
      this.recognition.stop();
    } catch (err) {
      console.warn('Error stopping wake word recognition:', err);
    }
    this.isRunning = false;
    console.log('✅ Wake word service stopped');
  }

  // Abort immediately without waiting for final results
  abort() {
    if (!this.recognition) return;

    try {
      if (typeof this.recognition.abort === 'function') {
        this.recognition.abort();
      }
    } catch (err) {
      console.warn('Error aborting wake word recognition:', err);
    }
    this.isRunning = false;
    console.log('✅ Wake word service aborted');
  }

  // Update wake words without reinitializing
  updateWakeWords(newWakeWords) {
    this.wakeWords = Array.isArray(newWakeWords) 
      ? newWakeWords.map(w => w.toLowerCase().trim()) 
      : [newWakeWords.toLowerCase().trim()];
    console.log('🔄 Wake words updated:', this.wakeWords);
  }

  // Internal method to complete restart after onend fires
  _completeRestart() {
    console.log('Recognition ended.');
    if (this.pendingRestartWords) {
      console.log('Updating wake words...');
      this.updateWakeWords(this.pendingRestartWords);
      this.pendingRestartWords = null;
    }
    console.log('Restarting recognition...');
    this.start();
    this.isRestarting = false;
    console.log('Recognition restarted successfully.');
  }

  restartWithWakeWords(newWakeWords) {
    // Ignore duplicate restart requests while one is in progress
    if (this.isRestarting) {
      console.log('Restart already in progress, queuing new words');
      this.pendingRestartWords = newWakeWords;
      return;
    }

    if (!this.recognition) {
      // Not initialized yet, just store the words
      this.wakeWords = Array.isArray(newWakeWords) 
        ? newWakeWords.map(w => w.toLowerCase().trim()) 
        : [newWakeWords.toLowerCase().trim()];
      return;
    }

    this.isRestarting = true;
    this.pendingRestartWords = newWakeWords;

    if (this.isRunning) {
      console.log('Stopping recognition...');
      this.stop();
      // onend will fire and call _completeRestart
    } else {
      // Not running, just update and start
      this._completeRestart();
    }
  }

  getWakeWords() {
    return this.wakeWords;
  }
}

const wakeWordService = new WakeWordService();

export default wakeWordService;