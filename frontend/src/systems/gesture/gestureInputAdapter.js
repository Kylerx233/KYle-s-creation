import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

// 优先使用本地资源（国内网络环境 CDN 可能不可用）
const LOCAL_WASM_PATH = '/wasm';
const CDN_WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const LOCAL_MODEL_PATH = '/hand_landmarker.task';
const CDN_MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
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
    this.stateListeners = new Set();
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
    this.currentState = 'idle'; // idle | starting | camera | fallback | error
    // 手动 x 轴偏移修正（正值=右移）
    this.xOffset = -0.15;
    this.yOffset = -0.1;
    this.boundPointerMove = (event) => {
      if (!this.enabled || !this.usePointerFallback) {
        return;
      }
      // 回退模式下发射 pointer 类型，让 DrawingBoard 的普通鼠标流程接管
      // 不要重复发送 draw 事件
      this.emit({
        x: event.clientX,
        y: event.clientY,
        type: 'pointer',
        isDrawing: event.buttons === 1,
      });
    };
  }

  setState(state) {
    if (this.currentState === state) return;
    this.currentState = state;
    this.stateListeners.forEach((fn) => fn(state));
  }

  onStateChange(fn) {
    this.stateListeners.add(fn);
    return () => this.stateListeners.delete(fn);
  }

  start() {
    if (this.enabled) {
      return;
    }
    this.enabled = true;
    this.lastTimestamp = -1;
    this.setState('starting');
    window.addEventListener('pointermove', this.boundPointerMove);
    this.ensureInitialized();
  }

  stop() {
    if (!this.enabled) {
      return;
    }
    this.enabled = false;
    this.setState('idle');
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
    this.initPromise = null;
    this.usePointerFallback = true;
  }

  async ensureInitialized() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.initializeMediaPipe();
    try {
      await this.initPromise;
      this.usePointerFallback = false;
      this.setState('camera');
      this.trackLoop();
    } catch (err) {
      console.warn('[GestureInputAdapter] MediaPipe 初始化失败，使用鼠标回退:', err.message || err);
      this.usePointerFallback = true;
      // 区分摄像头权限错误和加载错误
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
        this.setState('error');
      } else {
        this.setState('fallback');
      }
    }
  }

  async initializeMediaPipe() {
    // 尝试本地 WASM，失败则用 CDN
    let vision;
    try {
      vision = await FilesetResolver.forVisionTasks(LOCAL_WASM_PATH);
    } catch (_localErr) {
      console.warn('[GestureInputAdapter] 本地 WASM 加载失败，尝试 CDN...');
      vision = await FilesetResolver.forVisionTasks(CDN_WASM_PATH);
    }

    // 尝试本地模型，失败则用 CDN
    let modelPath = LOCAL_MODEL_PATH;
    try {
      await fetch(LOCAL_MODEL_PATH, { method: 'HEAD' });
    } catch (_headErr) {
      console.warn('[GestureInputAdapter] 本地模型不可用，使用 CDN 模型');
      modelPath = CDN_MODEL_PATH;
    }

    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: modelPath,
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
    this.previewCanvas.style.position = 'fixed';
    this.previewCanvas.style.left = '14px';
    this.previewCanvas.style.bottom = '14px';
    this.previewCanvas.style.zIndex = '20';
    this.previewCanvas.style.borderRadius = '10px';
    this.previewCanvas.style.border = '1px solid rgba(56, 214, 107, 0.45)';
    this.previewCanvas.style.background = 'rgba(0, 0, 0, 0.65)';
    this.previewCanvas.style.boxShadow = '0 10px 22px rgba(0,0,0,0.35)';
    this.previewCanvas.style.pointerEvents = 'none';
    // CSS 整体镜像翻转，画布内不做变换，保证视频与骨架天然对齐
    this.previewCanvas.style.transform = 'scaleX(-1)';
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

    // 等视频元数据就绪，内部分辨率设为视频原生尺寸(1:1 像素映射，零误差)
    await new Promise((resolve) => {
      if (this.videoElement.videoWidth > 0) { resolve(); return; }
      this.videoElement.addEventListener('loadedmetadata', resolve, { once: true });
    });
    this._vw = this.videoElement.videoWidth || 960;
    this._vh = this.videoElement.videoHeight || 540;
    this.previewCanvas.width = this._vw;
    this.previewCanvas.height = this._vh;
    // CSS 缩小显示
    const displayW = 260;
    const displayH = Math.round(displayW * this._vh / this._vw);
    this.previewCanvas.style.width = displayW + 'px';
    this.previewCanvas.style.height = displayH + 'px';
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

    // 手指伸直/蜷曲判定（指尖在上=伸直，指尖在下=蜷曲）
    const indexExt = landmarks[8].y < landmarks[6].y;     // 食指伸直
    const midCurl = landmarks[12].y > landmarks[9].y;     // 中指蜷曲
    const ringCurl = landmarks[16].y > landmarks[13].y;   // 无名指蜷曲
    const pinkyCurl = landmarks[20].y > landmarks[17].y;  // 小指蜷曲

    // 绘画：伸出食指，其余蜷曲
    const isPointing = indexExt && midCurl && ringCurl && pinkyCurl;

    // OK 手势：拇指+食指捏合 + 其余三指伸直
    const isPinching = pinchDistance < 0.06;
    const midExt = !midCurl;
    const ringExt = !ringCurl;
    const pinkyExt = !pinkyCurl;
    const isOK = isPinching && midExt && ringExt && pinkyExt;

    // 画线：伸食指（非 OK）
    const isDrawing = isPointing && !isOK;

    // x/y 坐标做镜像并加手动偏移修正
    const correctedX = Math.max(0, Math.min(1, indexTip.x + this.xOffset));
    const correctedY = Math.max(0, Math.min(1, indexTip.y + (this.yOffset || 0)));
    this.emit({
      x: (1 - correctedX) * window.innerWidth,
      y: correctedY * window.innerHeight,
      type: 'hand',
      isDrawing,
      isOK,
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
    const width = this.previewCanvas.width;   // = 视频原生宽度
    const height = this.previewCanvas.height; // = 视频原生高度
    context.clearRect(0, 0, width, height);

    if (this.videoElement.readyState >= 2 && this.videoElement.videoWidth > 0) {
      // 1:1 像素映射，video 原生分辨率 = canvas 内部分辨率，零缩放误差
      context.drawImage(this.videoElement, 0, 0);
    }

    if (!landmarks || landmarks.length < 21) {
      return;
    }

    const lw = Math.max(2.5, width * 0.004);
    context.strokeStyle = 'rgba(56, 214, 107, 0.95)';
    context.lineWidth = lw;
    for (const [startIndex, endIndex] of HAND_CONNECTIONS) {
      const start = landmarks[startIndex];
      const end = landmarks[endIndex];
      if (!start || !end) {
        continue;
      }
      context.beginPath();
      // 加手动偏移修正 MediaPipe 系统偏差
      const yo = this.yOffset || 0;
      const sx = Math.max(0, Math.min(1, start.x + this.xOffset)) * width;
      const sy = Math.max(0, Math.min(1, start.y + yo)) * height;
      const ex = Math.max(0, Math.min(1, end.x + this.xOffset)) * width;
      const ey = Math.max(0, Math.min(1, end.y + yo)) * height;
      context.moveTo(sx, sy);
      context.lineTo(ex, ey);
      context.stroke();
    }

    const indexTip = landmarks[8];
    if (indexTip) {
      const r = Math.max(5, width * 0.008);
      const yo = this.yOffset || 0;
      const ix = Math.max(0, Math.min(1, indexTip.x + this.xOffset)) * width;
      const iy = Math.max(0, Math.min(1, indexTip.y + yo)) * height;
      context.fillStyle = 'rgba(255, 66, 66, 0.95)';
      context.beginPath();
      context.arc(ix, iy, r, 0, Math.PI * 2);
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
