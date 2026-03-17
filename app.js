import { addLog, getState, setMetrics, subscribe } from "./state.js";
import { MarkerDetector } from "./marker.js";
import { SpinnerUI } from "./spinner.js";

const els = {
  startCameraBtn: document.getElementById("startCameraBtn"),
  systemStatus: document.getElementById("systemStatus"),

  peopleCountValue: document.getElementById("peopleCountValue"),
  energyScoreValue: document.getElementById("energyScoreValue"),

  spinnerWheel: document.getElementById("spinnerWheel"),
  spinnerSpeedValue: document.getElementById("spinnerSpeedValue"),
  rotationResponseValue: document.getElementById("rotationResponseValue"),
  calorieValue: document.getElementById("calorieValue"),

  goalValue: document.getElementById("goalValue"),
  goalFill: document.getElementById("goalFill"),

  logBox: document.getElementById("logBox"),
  cameraFeed: document.getElementById("cameraFeed"),
  motionSampler: document.getElementById("motionSampler"),
};

let detector = null;
let starting = false;
let goalReached = false;
let caloriesConverted = 0;
let previousMotionScore = 0;
let frozenGoalProgress = 0;

const spinner = new SpinnerUI(els.spinnerWheel);

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function formatPercent(value) {
  return `${Math.round(clamp(value) * 100)}%`;
}

function setMeter(element, value) {
  element.style.width = `${clamp(value) * 100}%`;
}

function updateStatus(state) {
  const live = Boolean(state.cameraReady);
  els.systemStatus.textContent = live ? "Camera live" : "Idle";
  els.systemStatus.className = `status-pill ${live ? "live" : "offline"}`;
}

function updateCalories(state) {
  if (goalReached) return;

  const motion = clamp(state.motionScore);
  const energy = clamp(state.energyScore);

  const intensity = motion * 0.72 + energy * 0.28;
  const deltaMotion = Math.max(0, motion - previousMotionScore);

  caloriesConverted += intensity * 2.0 + deltaMotion * 7.5;
  previousMotionScore = motion;

  caloriesConverted = Math.max(0, caloriesConverted);
}

function render(state) {
  const rawMotionOutput = clamp(state.energyScore);

  if (!goalReached) {
    frozenGoalProgress = Math.max(frozenGoalProgress, rawMotionOutput);
  }

  updateCalories(state);

  if (!goalReached && frozenGoalProgress >= 0.999) {
    goalReached = true;
    frozenGoalProgress = 1;
    spinner.stopAtFinalPosition();
    addLog("Goal reached. Spinner settling to final stop.");
  }

  if (!goalReached) {
    spinner.updateFromEnergy(rawMotionOutput);
  } else {
    spinner.updateFromEnergy(0);
  }

  els.peopleCountValue.textContent = `${state.peopleCount}`;
  els.energyScoreValue.textContent = frozenGoalProgress.toFixed(2);

  els.spinnerSpeedValue.textContent = spinner.getVelocity().toFixed(2);
  els.calorieValue.textContent = `${Math.round(caloriesConverted)}`;

  const motion = clamp(state.motionScore);
  els.rotationResponseValue.textContent = goalReached
    ? "complete"
    : motion < 0.03
      ? "idle"
      : motion < 0.1
        ? "gentle"
        : motion < 0.2
          ? "active"
          : "intense";

  els.goalValue.textContent = formatPercent(frozenGoalProgress);
  setMeter(els.goalFill, frozenGoalProgress);

  els.logBox.textContent = state.logs.join("\n");
  updateStatus(state);
}

async function startCamera() {
  if (starting) return;

  starting = true;
  els.startCameraBtn.disabled = true;

  try {
    if (!detector) {
      detector = new MarkerDetector({
        video: els.cameraFeed,
        canvas: els.motionSampler,
        onMetrics: (metrics) => {
          setMetrics(metrics);
        },
        onStatus: (message) => {
          addLog(message);
        },
      });
    }

    await detector.start();

    goalReached = false;
    caloriesConverted = 0;
    previousMotionScore = 0;
    frozenGoalProgress = 0;

    setMetrics({
      cameraReady: true,
      peopleCount: 0,
      motionScore: 0,
      energyScore: 0,
    });

    spinner.reset();
    addLog("Camera started successfully.");
  } catch (error) {
    console.error(error);

    setMetrics({
      cameraReady: false,
      peopleCount: 0,
      motionScore: 0,
      energyScore: 0,
    });

    addLog(`Camera failed: ${error.message}`);
  } finally {
    starting = false;
    els.startCameraBtn.disabled = false;
  }
}

els.startCameraBtn.addEventListener("click", startCamera);

subscribe((state) => {
  render(state);
});

render(getState());
addLog("Spinner UI ready.");
