const state = {
    peopleCount: 0,
    motionScore: 0,
    energyScore: 0,
    cameraReady: false,
    logs: [],
    outputs: {
      lighting: 0,
      heating: 0,
      water: 0,
      wind: 0,
      storage: 0,
    },
  };
  
  const subscribers = new Set();
  
  export function getState() {
    return state;
  }
  
  export function subscribe(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  }
  
  function emit() {
    subscribers.forEach((fn) => fn(state));
  }
  
  export function setMetrics(patch) {
    Object.assign(state, patch);
    emit();
  }
  
  export function setOutputs(outputs) {
    state.outputs = outputs;
    emit();
  }
  
  export function addLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    state.logs = [`[${timestamp}] ${message}`, ...state.logs].slice(0, 10);
    emit();
  }
