function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }
  
  export class SpinnerUI {
    constructor(wheelElement) {
      this.wheelElement = wheelElement;
      this.rotation = 0;
      this.velocity = 0;
      this.targetVelocity = 0;
      this.lastTime = performance.now();
  
      this.goalStopping = false;
      this.goalTargetRotation = 0;
  
      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
    }
  
    updateFromEnergy(energyScore) {
      if (this.goalStopping) return;
  
      const energy = clamp(energyScore);
      this.targetVelocity = energy < 0.04 ? 0 : energy * 0.6;
    }
  
    stopAtFinalPosition() {
      this.goalStopping = true;
      this.targetVelocity = 0;
  
      const segmentSize = 360 / 6;
      const randomSegment = Math.floor(Math.random() * 6);
      const segmentCenter = randomSegment * segmentSize + segmentSize / 2;
  
      const currentNormalized = ((this.rotation % 360) + 360) % 360;
      const desiredNormalized = (360 - segmentCenter) % 360;
  
      let delta = desiredNormalized - currentNormalized;
      if (delta < 0) delta += 360;
  
      const extraTurns = 720 + Math.random() * 360;
      this.goalTargetRotation = this.rotation + extraTurns + delta;
    }
  
    reset() {
      this.rotation = 0;
      this.velocity = 0;
      this.targetVelocity = 0;
      this.goalStopping = false;
      this.goalTargetRotation = 0;
      this.wheelElement.style.transform = `rotate(0deg)`;
    }
  
    animate(now) {
      const dt = Math.min((now - this.lastTime) / 16.6667, 2);
      this.lastTime = now;
  
      if (this.goalStopping) {
        const remaining = this.goalTargetRotation - this.rotation;
  
        if (remaining <= 0.35) {
          this.rotation = this.goalTargetRotation;
          this.velocity = 0;
          this.goalStopping = false;
        } else {
          const easedStep = Math.max(Math.min(remaining * 0.045, 18), 0.18);
          this.rotation += easedStep * dt;
          this.velocity = easedStep / 180;
        }
      } else {
        this.velocity += (this.targetVelocity - this.velocity) * 0.08 * dt;
  
        if (this.targetVelocity <= 0.001) {
          this.velocity *= 0.94;
        } else {
          this.velocity *= 0.985;
        }
  
        if (Math.abs(this.velocity) < 0.0008 && this.targetVelocity <= 0.001) {
          this.velocity = 0;
        }
  
        this.rotation += this.velocity * 180 * dt;
      }
  
      this.wheelElement.style.transform = `rotate(${this.rotation}deg)`;
      requestAnimationFrame(this.animate);
    }
  
    getVelocity() {
      return this.velocity;
    }
  }
