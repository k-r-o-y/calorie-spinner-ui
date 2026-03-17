function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }
  
  export class MarkerDetector {
    constructor({ video, canvas, onMetrics, onStatus }) {
      this.video = video;
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { willReadFrequently: true });
  
      this.onMetrics = onMetrics;
      this.onStatus = onStatus;
  
      this.running = false;
      this.stream = null;
      this.timer = null;
  
      this.prevFrame = null;
      this.smoothedMotion = 0;
      this.smoothedEnergy = 0;
  
      this.processWidth = 320;
      this.processHeight = 240;
    }
  
    async start() {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 960 },
          height: { ideal: 540 },
        },
        audio: false,
      });
  
      this.video.srcObject = this.stream;
      await this.video.play();
  
      this.canvas.width = this.processWidth;
      this.canvas.height = this.processHeight;
  
      this.running = true;
      this.onStatus("Human motion tracking ready.");
      this.loop();
    }
  
    stop() {
      this.running = false;
  
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
  
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }
  
      this.prevFrame = null;
      this.smoothedMotion = 0;
      this.smoothedEnergy = 0;
    }
  
    emitMetrics(motionScore, energyScore) {
      this.onMetrics({
        peopleCount: motionScore > 0.01 ? 1 : 0,
        motionScore,
        energyScore,
      });
    }
  
    detectHumanMotion() {
      this.ctx.drawImage(
        this.video,
        0,
        0,
        this.processWidth,
        this.processHeight,
      );
  
      const imageData = this.ctx.getImageData(
        0,
        0,
        this.processWidth,
        this.processHeight,
      );
  
      const data = imageData.data;
      let rawMotion = 0;
  
      if (this.prevFrame) {
        let changedPixels = 0;
        let totalDiff = 0;
  
        for (let i = 0; i < data.length; i += 16) {
          const dr = Math.abs(data[i] - this.prevFrame[i]);
          const dg = Math.abs(data[i + 1] - this.prevFrame[i + 1]);
          const db = Math.abs(data[i + 2] - this.prevFrame[i + 2]);
  
          const diff = (dr + dg + db) / 3;
  
          if (diff > 18) {
            changedPixels += 1;
            totalDiff += diff;
          }
        }
  
        const sampleCount = data.length / 16;
        const coverage = changedPixels / sampleCount;
        const averageDiff = changedPixels > 0 ? totalDiff / changedPixels : 0;
  
        rawMotion = clamp(coverage * 3.2 + averageDiff / 120);
      }
  
      this.prevFrame = new Uint8ClampedArray(data);
      return rawMotion;
    }
  
    loop() {
      if (!this.running) return;
  
      try {
        const rawMotion = this.detectHumanMotion();
  
        const deadZone = 0.045;
        const adjusted = Math.max(0, rawMotion - deadZone);
        const targetMotion = clamp(Math.pow(adjusted * 2.2, 1.18));
  
        this.smoothedMotion =
          this.smoothedMotion * 0.72 + targetMotion * 0.28;
  
        this.smoothedEnergy += this.smoothedMotion * 0.02;
  
        if (targetMotion < 0.02) {
          this.smoothedEnergy *= 0.93;
        }
  
        this.smoothedEnergy = clamp(this.smoothedEnergy);
  
        this.emitMetrics(
          clamp(this.smoothedMotion),
          clamp(this.smoothedEnergy),
        );
      } catch (error) {
        console.error("Human motion loop failed:", error);
        this.onStatus(`Motion error: ${error.message}`);
        this.emitMetrics(0, 0);
      }
  
      this.timer = setTimeout(() => this.loop(), 80);
    }
  }
