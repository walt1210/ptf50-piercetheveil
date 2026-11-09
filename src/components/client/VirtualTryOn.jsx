import { useCallback, useEffect, useRef, useState } from "react";

const MEDIAPIPE_VERSION = "0.10.21";
const WASM_ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_PATH = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const faceLandmarkerPromises = {};

async function loadFaceLandmarker(runningMode = "IMAGE") {
  if (!faceLandmarkerPromises[runningMode]) {
    faceLandmarkerPromises[runningMode] = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
      return FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_PATH, delegate: "CPU" },
        runningMode,
        numFaces: 1,
        minFaceDetectionConfidence: 0.55,
        minFacePresenceConfidence: 0.55,
      });
    })().catch((error) => {
      faceLandmarkerPromises[runningMode] = null;
      throw error;
    });
  }
  return faceLandmarkerPromises[runningMode];
}

function drawStud(context, x, y, radius, finish) {
  const light = finish === "gold" ? "#ffe2a4" : "#ffffff";
  const dark = finish === "gold" ? "#9d5d14" : "#666a70";
  const gradient = context.createRadialGradient(x - radius * 0.35, y - radius * 0.4, radius * 0.1, x, y, radius);
  gradient.addColorStop(0, light);
  gradient.addColorStop(0.5, finish === "gold" ? "#e8b952" : "#cdd3d9");
  gradient.addColorStop(1, dark);
  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.55)";
  context.shadowBlur = radius * 0.8;
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawHoop(context, x, y, radius, finish) {
  context.save();
  context.strokeStyle = finish === "gold" ? "#e9b94e" : "#e6ebef";
  context.lineWidth = Math.max(2, radius * 0.3);
  context.shadowColor = "rgba(0, 0, 0, 0.55)";
  context.shadowBlur = radius * 0.55;
  context.beginPath();
  context.ellipse(x, y + radius * 0.7, radius * 0.82, radius * 1.3, 0, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawDrop(context, x, y, radius, finish) {
  const color = finish === "gold" ? "#e9b94e" : "#e6ebef";
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = Math.max(2, radius * 0.22);
  context.shadowColor = "rgba(0, 0, 0, 0.5)";
  context.shadowBlur = radius * 0.55;
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x, y + radius * 1.55);
  context.stroke();
  context.beginPath();
  context.moveTo(x, y + radius * 1.45);
  context.lineTo(x + radius * 0.62, y + radius * 2.15);
  context.lineTo(x, y + radius * 2.8);
  context.lineTo(x - radius * 0.62, y + radius * 2.15);
  context.closePath();
  context.fill();
  context.restore();
}

function drawJewelry(context, style, x, y, radius, finish) {
  if (style === "hoop") drawHoop(context, x, y, radius, finish);
  else if (style === "drop") drawDrop(context, x, y, radius, finish);
  else drawStud(context, x, y, radius, finish);
}

function anchorsFromLandmarks(landmarks, mirror = false) {
  const transform = (point) => ({ ...point, x: mirror ? 1 - point.x : point.x });
  const points = landmarks.map(transform);
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const sides = [points[234], points[454]].sort((a, b) => a.x - b.x);
  return {
    left: sides[0],
    right: sides[1],
    faceWidth: Math.max(...xs) - Math.min(...xs),
    faceHeight: Math.max(...ys) - Math.min(...ys),
  };
}

function paintPreview(canvas, source, anchors, settings, mirror = false) {
  if (!canvas || !source) return;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  if (mirror) {
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
  }
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  context.restore();
  if (!anchors) return;

  const offsetY = (settings.vertical / 100) * anchors.faceHeight;
  const offsetX = (settings.spread / 100) * anchors.faceWidth;
  const radius = Math.max(5, anchors.faceWidth * 0.035 * Number(settings.size));
  const left = {
    x: (anchors.left.x - offsetX) * canvas.width,
    y: (anchors.left.y + offsetY) * canvas.height,
  };
  const right = {
    x: (anchors.right.x + offsetX) * canvas.width,
    y: (anchors.right.y + offsetY) * canvas.height,
  };

  if (settings.side === "both" || settings.side === "left") {
    drawJewelry(context, settings.style, left.x, left.y, radius, settings.finish);
  }
  if (settings.side === "both" || settings.side === "right") {
    drawJewelry(context, settings.style, right.x, right.y, radius, settings.finish);
  }
}

function presetStyle(name = "") {
  const value = name.toLowerCase();
  if (value.includes("snake bites") || value.includes("eyebrow")) return "stud";
  if (value.includes("rook") || value.includes("conch") || value.includes("lobe")) return "hoop";
  return "stud";
}

export default function VirtualTryOn({ preset }) {
  const imageRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const cameraActiveRef = useRef(false);
  const liveAnchorsRef = useRef(null);
  const lastDetectionRef = useRef(0);
  const settingsRef = useRef(null);
  const [imageUrl, setImageUrl] = useState("");
  const [anchors, setAnchors] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [finish, setFinish] = useState("silver");
  const [style, setStyle] = useState("stud");
  const [side, setSide] = useState("both");
  const [size, setSize] = useState(1);
  const [vertical, setVertical] = useState(7);
  const [spread, setSpread] = useState(5);

  settingsRef.current = { finish, style, side, size, vertical, spread };

  useEffect(() => {
    if (preset?.title) setStyle(presetStyle(preset.title));
  }, [preset]);

  useEffect(() => () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  useEffect(() => () => {
    cameraActiveRef.current = false;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const renderPreview = useCallback(() => {
    if (cameraActiveRef.current) return;
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image?.complete || !image.naturalWidth || !canvas) return;
    paintPreview(canvas, image, anchors, { finish, style, side, size, vertical, spread });
  }, [anchors, finish, side, size, spread, style, vertical]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  const onImageLoad = () => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    const scale = Math.min(1, 1200 / image.naturalWidth);
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    setAnchors(null);
    setStatus("Photo ready. Run face detection to place the preview.");
    requestAnimationFrame(renderPreview);
  };

  const stopCamera = ({ keepStatus = false } = {}) => {
    cameraActiveRef.current = false;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    liveAnchorsRef.current = null;
    setCameraActive(false);
    setCameraLoading(false);
    if (imageUrl) requestAnimationFrame(renderPreview);
    if (!keepStatus) setStatus(imageUrl ? "Camera stopped. Your uploaded photo is still available." : "Camera stopped.");
  };

  const startCamera = async () => {
    if (cameraActive || cameraLoading) {
      stopCamera();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Live camera access needs a modern browser on HTTPS or localhost. You can still upload a photo.");
      return;
    }

    setCameraLoading(true);
    setError("");
    setStatus("Waiting for camera permission…");
    setAnchors(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
      });
      streamRef.current = stream;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const video = videoRef.current;
      if (!video) throw new Error("The live preview could not start.");
      video.srcObject = stream;
      await video.play();
      cameraActiveRef.current = true;

      const canvas = canvasRef.current;
      const scale = Math.min(1, 1200 / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      paintPreview(canvas, video, null, settingsRef.current, true);

      setStatus("Loading the live face-landmark model…");
      const landmarker = await loadFaceLandmarker("VIDEO");
      cameraActiveRef.current = true;
      setCameraActive(true);
      setCameraLoading(false);
      setStatus("Live preview is running. Keep your face centered and adjust the controls as needed.");

      let faceSeen = false;
      const renderLiveFrame = () => {
        if (!cameraActiveRef.current || !videoRef.current || !canvasRef.current) return;
        const now = performance.now();
        if (videoRef.current.readyState >= 2 && now - lastDetectionRef.current > 80) {
          lastDetectionRef.current = now;
          try {
            const result = landmarker.detectForVideo(videoRef.current, now);
            const landmarks = result.faceLandmarks?.[0];
            liveAnchorsRef.current = landmarks?.length ? anchorsFromLandmarks(landmarks, true) : null;
            if (landmarks?.length && !faceSeen) {
              faceSeen = true;
              setStatus("Face found — the live jewelry preview is tracking your movement.");
            }
          } catch (cause) {
            console.warn("A live face-landmark frame was skipped:", cause);
          }
        }
        paintPreview(canvasRef.current, videoRef.current, liveAnchorsRef.current, settingsRef.current, true);
        animationFrameRef.current = requestAnimationFrame(renderLiveFrame);
      };
      renderLiveFrame();
    } catch (cause) {
      stopCamera({ keepStatus: true });
      setStatus("");
      if (cause?.name === "NotAllowedError") {
        setError("Camera permission was not granted. Allow camera access in your browser, or upload a photo instead.");
      } else if (cause?.name === "NotFoundError") {
        setError("No camera was found on this device. You can upload a photo instead.");
      } else {
        setError(cause?.message || "The live camera could not start. You can upload a photo instead.");
      }
    }
  };

  const choosePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (cameraActive || cameraLoading) stopCamera({ keepStatus: true });
    setError("");
    setStatus("");
    setAnchors(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("Please choose a photo smaller than 12 MB.");
      return;
    }
    setImageUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  };

  const detectFace = async () => {
    if (!imageRef.current) return;
    setDetecting(true);
    setError("");
    setStatus("Loading the on-device face model…");
    try {
      const landmarker = await loadFaceLandmarker("IMAGE");
      const result = landmarker.detect(imageRef.current);
      const landmarks = result.faceLandmarks?.[0];
      if (!landmarks?.length) {
        throw new Error("No face was found. Try a clear, front-facing photo with both sides of the face visible.");
      }

      setAnchors(anchorsFromLandmarks(landmarks));
      setStatus("Face landmarks found. Adjust the preview controls until the jewelry sits where you want it.");
    } catch (cause) {
      setAnchors(null);
      setStatus("");
      setError(cause?.message || "The face model could not load. Check your connection and try again.");
    } finally {
      setDetecting(false);
    }
  };

  return (
    <section className="try-on" id="virtual-try-on" aria-labelledby="try-on-title">
      <div className="try-on__intro">
        <div>
          <p className="eyebrow eyebrow--dark"><span /> On-device preview</p>
          <h2 id="try-on-title">See the mood <em>on you.</em></h2>
        </div>
        <p>
          Use the front camera for a live mirror or upload a clear photo. Face landmarks are detected in your browser, then a movable jewelry sketch is layered onto the preview.
        </p>
      </div>

      <div className="try-on__layout">
        <div className="try-on__stage">
          {!imageUrl && !cameraActive && !cameraLoading && (
            <div className="try-on__empty">
              <span aria-hidden="true">◇</span>
              <strong>Your preview stays private.</strong>
              <p>Photos and camera frames stay on this device. Nothing is uploaded or saved.</p>
            </div>
          )}
          {imageUrl && <img ref={imageRef} src={imageUrl} alt="Uploaded preview source" onLoad={onImageLoad} hidden />}
          <video ref={videoRef} muted playsInline hidden aria-label="Live front camera source" />
          {(imageUrl || cameraActive || cameraLoading) && (
            <canvas ref={canvasRef} aria-label={cameraActive ? "Live camera with a visual earring preview" : "Customer photo with a visual earring preview"} />
          )}
        </div>

        <div className="try-on__controls">
          {preset?.title && <p className="try-on__preset">Inspired by your <strong>{preset.title}</strong> result</p>}
          <div className="try-on__source-actions">
            <button
              className={`try-on__camera${cameraActive ? " try-on__camera--active" : ""}`}
              type="button"
              onClick={startCamera}
              disabled={cameraLoading}
              aria-pressed={cameraActive}
            >
              {cameraLoading ? "Starting camera…" : cameraActive ? "Stop live camera" : "Use live camera"}
            </button>
            <label className="try-on__upload">
              <span>{imageUrl ? "Choose another photo" : "Upload a photo"}</span>
              <input type="file" accept="image/*" onChange={choosePhoto} />
            </label>
          </div>

          <div className="try-on__control-grid">
            <label className="field"><span>Jewelry shape</span>
              <select value={style} onChange={(event) => setStyle(event.target.value)}>
                <option value="stud">Stud</option>
                <option value="hoop">Hoop</option>
                <option value="drop">Drop</option>
              </select>
            </label>
            <label className="field"><span>Finish</span>
              <select value={finish} onChange={(event) => setFinish(event.target.value)}>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
              </select>
            </label>
            <label className="field"><span>Photo side</span>
              <select value={side} onChange={(event) => setSide(event.target.value)}>
                <option value="both">Both sides</option>
                <option value="left">Photo left</option>
                <option value="right">Photo right</option>
              </select>
            </label>
          </div>

          <label className="try-on__range"><span>Jewelry size</span>
            <input type="range" min="0.55" max="2" step="0.05" value={size} onChange={(event) => setSize(event.target.value)} />
          </label>
          <label className="try-on__range"><span>Move up / down</span>
            <input type="range" min="-15" max="30" step="1" value={vertical} onChange={(event) => setVertical(Number(event.target.value))} />
          </label>
          <label className="try-on__range"><span>Move outward / inward</span>
            <input type="range" min="-12" max="25" step="1" value={spread} onChange={(event) => setSpread(Number(event.target.value))} />
          </label>

          <button className="button button--dark" type="button" onClick={detectFace} disabled={!imageUrl || detecting || cameraActive || cameraLoading}>
            {detecting ? "Detecting face…" : anchors ? "Detect again" : "Detect & preview"}
          </button>
          {status && <p className="try-on__status" role="status">{status}</p>}
          {error && <p className="try-on__error" role="alert">{error}</p>}
          <p className="try-on__notice">
            Camera permission is requested only when you tap “Use live camera.” Photos and frames stay on this device. Visual styling preview only: landmarks approximate position and do not assess anatomy, healing, or whether a piercing is safe. Your piercer makes the final placement decision.
          </p>
        </div>
      </div>
    </section>
  );
}

