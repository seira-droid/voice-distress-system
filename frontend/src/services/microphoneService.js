class MicrophoneService {
  constructor() {
    this.stream = null;
    this.isActive = false;
  }

  async initialize() {
    if (this.stream) {
      return this.stream;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone access is not supported in this browser.");
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.isActive = true;
      return this.stream;
    } catch (error) {
      this.stream = null;
      this.isActive = false;

      if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
        throw new Error("Microphone permission was denied.");
      }

      if (error?.name === "NotFoundError") {
        throw new Error("No microphone device is available.");
      }

      throw new Error("Unable to access the microphone.");
    }
  }

  async startListening() {
    if (this.isActive && this.stream) {
      return this.stream;
    }

    return this.initialize();
  }

  stopListening() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }

    this.stream = null;
    this.isActive = false;
  }

  isListening() {
    return this.isActive;
  }

  getStream() {
    return this.stream;
  }
}

const microphoneService = new MicrophoneService();

export { MicrophoneService };
export default microphoneService;
