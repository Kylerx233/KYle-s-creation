import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const VISION_WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const HAND_MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

export class GestureInputAdapter {
  constructor() {
    this.listeners = new Set();
    this.enabled = false;
    this.usePointerFallback = true;
    this.videoElement = null;
    this.previewCanvas = null;
    this.previewContext = null;
    this.mediaStream = null;
    this.handLandmarker = null;
    this.animationFrameId = null;
    this.lastTimestamp = -1;
    this.initPromise = null;
    this.boundPointerMove = (event) => {
      if (!this.enabled || !this.usePointerFallback) {
        return;
      }
      this.emit({
        x: event.clientX,
        y: event.clientY,
        type: 'pointer',
        isDrawing: event.buttons === 1,
      });
    };
  }

  start() {
    if (this.enabled) {
      return;
    }
    this.enabled = true;
    this.lastTimestamp = -1;
    window.addEventListener('pointermove', this.boundPointerMove);
    this.ensureInitialized();
  }

  stop() {
    if (!this.enabled) {
      return;
    }
    this.enabled = false;
    window.removeEventListener('pointermove', this.boundPointerMove);
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.videoElement) {
      this.videoElement.remove();
      this.videoElement = null;
    }
    if (this.previewCanvas) {
      this.previewCanvas.remove();
      this.previewCanvas = null;
      this.previewContext = null;
    }
  }

  async ensureInitialized() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.initializeMediaPipe();
    try {
      await this.initPromise;
      this.usePointerFallback = false;
      this.trackLoop();
    } catch (_error) {
      this.usePointerFallback = true;
    }
  }

  async initializeMediaPipe() {
    const vision = await FilesetResolver.forVisionTasks(VISION_WASM_PATH);
    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: HAND_MODEL_PATH,
      },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: 0.55,
      minTrackingConfidence: 0.55,
    });

    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;
    this.videoElement.muted = true;
    this.videoElement.style.position = 'fixed';
    this.videoElement.style.width = '1px';
    this.videoElement.style.height = '1px';
    this.videoElement.style.opacity = '0';
    this.videoElement.style.pointerEvents = 'none';
    this.videoElement.style.left = '-10000px';
    this.videoElement.style.top = '-10000px';
    document.body.appendChild(this.videoElement);

    this.previewCanvas = document.createElement('canvas');
    this.previewCanvas.width = 260;
    this.previewCanvas.height = 146;
    this.previewCanvas.style.position = 'fixed';
    this.previewCanvas.style.left = '14px';
    this.previewCanvas.style.bottom = '14px';
    this.previewCanvas.style.zIndex = '20';
    this.previewCanvas.style.borderRadius = '10px';
    this.previewCanvas.style.border = '1px solid rgba(56, 214, 107, 0.45)';
    this.previewCanvas.style.background = 'rgba(0, 0, 0, 0.65)';
    this.previewCanvas.style.boxShadow = '0 10px 22px rgba(0,0,0,0.35)';
    this.previewCanvas.style.pointerEvents = 'none';
    document.body.appendChild(this.previewCanvas);
    this.previewContext = this.previewCanvas.getContext('2d', { alpha: true });

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 960 },
        height: { ideal: 540 },
      },
      audio: false,
    });
    this.videoElement.srcObject = this.mediaStream;
    await this.videoElement.play();
  }

  trackLoop() {
    if (!this.enabled || !this.videoElement || !this.handLandmarker) {
      return;
    }

    const nowMs = performance.now();
    const currentTimeMs = this.videoElement.currentTime * 1000;
    if (currentTimeMs !== this.lastTimestamp) {
      this.lastTimestamp = currentTimeMs;
      const result = this.handLandmarker.detectForVideo(this.videoElement, nowMs);
      this.handleResult(result);
    }

    this.animationFrameId = window.requestAnimationFrame(() => this.trackLoop());
  }

  handleResult(result) {
    const rightHand = this.pickRightHand(result);
    const landmarks = rightHand?.landmarks;
    this.renderPreview(landmarks);

    if (!landmarks || landmarks.length < 9) {
      return;
    }

    const indexTip = landmarks[8];
    const thumbTip = landmarks[4];
    const pinchDistance = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
    const isDrawing = pinchDistance < 0.06;

    this.emit({
      x: (1 - indexTip.x) * window.innerWidth,
      y: indexTip.y * window.innerHeight,
      type: 'hand',
      isDrawing,
      pinchDistance,
    });
  }

  pickRightHand(result) {
    const landmarksList = result?.landmarks;
    const handednessList = result?.handedness;
    if (!landmarksList || !handednessList) {
      return null;
    }

    for (let index = 0; index < landmarksList.length; index += 1) {
      const handedness = handednessList[index]?.[0]?.categoryName;
      if (handedness === 'Right') {
        return {
          landmarks: landmarksList[index],
          handedness,
        };
      }
    }
    return null;
  }

  renderPreview(landmarks) {
    if (!this.previewContext || !this.previewCanvas || !this.videoElement) {
      return;
    }

    const context = this.previewContext;
    const width = this.previewCanvas.width;
    const height = this.previewCanvas.height;
    context.clearRect(0, 0, width, height);

    if (this.videoElement.readyState >= 2) {
      context.save();
      context.scale(-1, 1);
      context.drawImage(this.videoElement, -width, 0, width, height);
      context.restore();
    }

    if (!landmarks || landmarks.length < 21) {
      return;
    }

    context.strokeStyle = 'rgba(56, 214, 107, 0.95)';
    context.lineWidth = 2.2;
    for (const [startIndex, endIndex] of HAND_CONNECTIONS) {
      const start = landmarks[startIndex];
      const end = landmarks[endIndex];
      if (!start || !end) {
        continue;
      }
      context.beginPath();
      context.moveTo((1 - start.x) * width, start.y * height);
      context.lineTo((1 - end.x) * width, end.y * height);
      context.stroke();
    }

    const indexTip = landmarks[8];
    if (indexTip) {
      context.fillStyle = 'rgba(255, 66, 66, 0.95)';
      context.beginPath();
      context.arc((1 - indexTip.x) * width, indexTip.y * height, 4.5, 0, Math.PI * 2);
      context.fill();
    }
  }

  emit(payload) {
    this.listeners.forEach((listener) => listener(payload));
  }

  onInput(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
