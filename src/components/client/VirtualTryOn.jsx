import { useCallback, useEffect, useRef, useState } from "react";
import { drawPiece } from "../../features/tryon/drawJewelry";
import {
  DEFAULT_PLACEMENT_ID,
  SHAPES,
  buildPieces,
  getPlacement,
  groupedPlacements,
  makeFace,
  placementFromName,
  placementNote,
} from "../../features/tryon/placements";

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

// Landmarks are mirrored for the live (selfie) view so "left/right" always matches what the person sees.
function mirrorLandmarks(landmarks, mirror) {
  return mirror ? landmarks.map((point) => ({ ...point, x: 1 - point.x })) : landmarks;
}

// Draws the frame, then the jewelry. Returns a hint (e.g. "open your mouth") or "".
function paintPreview(canvas, source, landmarks, settings, mirror = false) {
  if (!canvas || !source) return "";
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  if (mirror) {
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
  }
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  context.restore();
  if (!landmarks) return "";

  const face = makeFace(landmarks, canvas.width, canvas.height);
  const { pieces, hint } = buildPieces(getPlacement(settings.placement), face, settings);
  pieces.forEach((piece) => drawPiece(context, piece, settings.finish));
  return hint;
}

// preset = a portfolio sample picked in the stylist results; typeName = the placement chosen in the stylist form.
export default function VirtualTryOn({ preset, typeName }) {
  const imageRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const cameraActiveRef = useRef(false);
  const liveLandmarksRef = useRef(null);
  const hintRef = useRef("");
  const lastDetectionRef = useRef(0);
  const settingsRef = useRef(null);
  const [imageUrl, setImageUrl] = useState("");
  const [landmarks, setLandmarks] = useState(null);
  const [hint, setHint] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [finish, setFinish] = useState("silver");
  const [placementId, setPlacementId] = useState(DEFAULT_PLACEMENT_ID);
  const [style, setStyle] = useState(getPlacement(DEFAULT_PLACEMENT_ID).defaultShape);
  const [side, setSide] = useState("both");
  const [size, setSize] = useState(1);
  const [vertical, setVertical] = useState(0);
  const [spread, setSpread] = useState(0);

  const placement = getPlacement(placementId);
  settingsRef.current = { placement: placementId, finish, style, side, size, vertical, spread };

  // Switching placement resets the shape and nudges, so the new piercing starts from its natural spot.
  const choosePlacement = useCallback((id) => {
    const next = getPlacement(id);
    if (next.unsupported) {
      setError(next.unsupported);
      return;
    }
    setError("");
    setPlacementId(next.id);
    setStyle(next.defaultShape);
    setSide(next.sideMode === "single" ? "right" : "both");
    setVertical(0);
    setSpread(0);
  }, []);

  useEffect(() => {
    const match = placementFromName(preset?.title);
    if (match) choosePlacement(match.id);
  }, [preset, choosePlacement]);

  useEffect(() => {
    const match = placementFromName(typeName);
    if (match) choosePlacement(match.id);
  }, [typeName, choosePlacement]);

  const showHint = useCallback((next) => {
    if (hintRef.current === next) return;
    hintRef.current = next;
    setHint(next);
  }, []);

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
    showHint(paintPreview(canvas, image, landmarks, { placement: placementId, finish, style, side, size, vertical, spread }));
  }, [landmarks, placementId, finish, side, size, spread, style, vertical, showHint]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  const onImageLoad = () => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    const scale = Math.min(1, 1200 / image.naturalWidth);
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    setLandmarks(null);
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
    liveLandmarksRef.current = null;
    showHint("");
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
    setLandmarks(null);
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
            liveLandmarksRef.current = landmarks?.length ? mirrorLandmarks(landmarks, true) : null;
            if (landmarks?.length && !faceSeen) {
              faceSeen = true;
              setStatus("Face found — the live jewelry preview is tracking your movement.");
            }
          } catch (cause) {
            console.warn("A live face-landmark frame was skipped:", cause);
          }
        }
        showHint(paintPreview(canvasRef.current, videoRef.current, liveLandmarksRef.current, settingsRef.current, true));
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
    setLandmarks(null);
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

      setLandmarks(mirrorLandmarks(landmarks, false));
      setStatus("Face landmarks found. Adjust the preview controls until the jewelry sits where you want it.");
    } catch (cause) {
      setLandmarks(null);
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
          Pick a placement, then use the front camera for a live mirror or upload a clear, front-facing photo. Face landmarks are detected in your browser, then a movable jewelry sketch is layered onto the preview: ear, brow, nose, lip and tongue placements.
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
            <canvas ref={canvasRef} aria-label={cameraActive ? "Live camera with a visual jewelry preview" : "Customer photo with a visual jewelry preview"} />
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
            <label className="field try-on__placement"><span>Piercing placement</span>
              <select value={placementId} onChange={(event) => choosePlacement(event.target.value)}>
                {groupedPlacements().map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.items.map((item) => (
                      <option key={item.id} value={item.id} disabled={Boolean(item.unsupported)}>
                        {item.label}{item.unsupported ? " (can't preview on a face)" : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="field"><span>Jewelry shape</span>
              <select value={style} onChange={(event) => setStyle(event.target.value)}>
                {placement.shapes.map((shape) => <option key={shape} value={shape}>{SHAPES[shape]}</option>)}
              </select>
            </label>
            <label className="field"><span>Finish</span>
              <select value={finish} onChange={(event) => setFinish(event.target.value)}>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
              </select>
            </label>
            {placement.sideMode !== "none" && (
              <label className="field"><span>Photo side</span>
                <select value={side} onChange={(event) => setSide(event.target.value)}>
                  {placement.sideMode === "pair" && <option value="both">Both sides</option>}
                  <option value="left">Photo left</option>
                  <option value="right">Photo right</option>
                </select>
              </label>
            )}
          </div>

          <label className="try-on__range"><span>Jewelry size</span>
            <input type="range" min="0.55" max="2" step="0.05" value={size} onChange={(event) => setSize(Number(event.target.value))} />
          </label>
          <label className="try-on__range"><span>Move down / up</span>
            <input type="range" min="-15" max="30" step="1" value={vertical} onChange={(event) => setVertical(Number(event.target.value))} />
          </label>
          {!placement.midline && (
            <label className="try-on__range"><span>Move outward / inward</span>
              <input type="range" min="-12" max="25" step="1" value={spread} onChange={(event) => setSpread(Number(event.target.value))} />
            </label>
          )}

          <button className="button button--dark" type="button" onClick={detectFace} disabled={!imageUrl || detecting || cameraActive || cameraLoading}>
            {detecting ? "Detecting face…" : landmarks ? "Detect again" : "Detect & preview"}
          </button>
          {status && <p className="try-on__status" role="status">{status}</p>}
          {hint && <p className="try-on__status" role="status">{hint}</p>}
          {placementNote(placement) && <p className="try-on__status">{placementNote(placement)}</p>}
          {error && <p className="try-on__error" role="alert">{error}</p>}
          <p className="try-on__notice">
            Camera permission is requested only when you tap “Use live camera.” Photos and frames stay on this device. Visual styling preview only: landmarks approximate position and do not assess anatomy, healing, or whether a piercing is safe. Your piercer makes the final placement decision.
          </p>
        </div>
      </div>
    </section>
  );
}

