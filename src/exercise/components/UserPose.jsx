import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pose, POSE_LANDMARKS } from "@mediapipe/pose";
import {
  DEFAULT_MASK_OPTIONS,
  MASK_HEIGHT,
  MASK_WIDTH,
  createMaskProcessor,
  getContainRect,
  measureSilhouette,
  renderPlainFrame,
  resetMaskProcessor,
} from "../utils/segmentationRenderer";
import {
  DEFAULT_ALIGNMENT,
  MAX_AUTO_SCALE,
  MIN_AUTO_SCALE,
  calculateAutoAlignment,
  clamp,
  measurePose,
} from "../utils/poseAlignment";
import {
  INITIAL_FULL_BODY_TRACKER,
  evaluateFullBodyFrame,
  updateFullBodyTracker,
} from "../utils/fullBodyReadiness";

const UI_UPDATE_INTERVAL_MS = 250;
const MEDIAPIPE_VERSION = "0.5.1675469404";
const PROCESSING_PROFILES = Object.freeze({
  balanced: Object.freeze({ width: 640, height: 360, targetFps: 20 }),
  quality: Object.freeze({ width: 960, height: 540, targetFps: 15 }),
});

function getProcessingProfile(key) {
  return PROCESSING_PROFILES[key] || PROCESSING_PROFILES.balanced;
}

const PRODUCT_OVERLAY_OPTIONS = Object.freeze({
  edgeCleanup: DEFAULT_MASK_OPTIONS.edgeCleanup,
  maskThreshold: DEFAULT_MASK_OPTIONS.threshold,
  maskSmoothing: DEFAULT_MASK_OPTIONS.temporalSmoothing,
  edgeFeather: DEFAULT_MASK_OPTIONS.feather,
  processingMode: "balanced",
  maxAutoScale: MAX_AUTO_SCALE,
  autoScaleEnabled: true,
  autoPositionEnabled: true,
  alignmentSmoothing: 0.18,
  guideOpacity: 0.5,
  guideScale: 1,
  guideX: 0,
  guideY: 0,
  userScale: 1,
  userX: 0,
  userY: 0,
});

function mirrorLandmarks(landmarks) {
  if (!Array.isArray(landmarks)) return landmarks;
  return landmarks.map((point) => ({ ...point, x: 1 - point.x }));
}

function poseToNormalizedVector(landmarks) {
  if (!Array.isArray(landmarks) || landmarks.length < 33) return null;

  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const referenceDistance =
    Math.hypot(leftShoulder.x - rightShoulder.x, leftShoulder.y - rightShoulder.y) ||
    Math.hypot(leftShoulder.x - leftHip.x, leftShoulder.y - leftHip.y) ||
    1;

  return landmarks.flatMap((point) => [
    (point.x - leftShoulder.x) / referenceDistance,
    (point.y - leftShoulder.y) / referenceDistance,
    point.z / referenceDistance,
  ]);
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let lengthA = 0;
  let lengthB = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    lengthA += a[index] ** 2;
    lengthB += b[index] ** 2;
  }
  if (!lengthA || !lengthB) return 0;
  return dot / (Math.sqrt(lengthA) * Math.sqrt(lengthB));
}

function getMockCameraConfig() {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const value = params.get("mockCamera");
  if (!value) return null;
  return {
    source: value === "1" ? "/exercise/videos/TestExercise.mp4" : value,
    zoom: clamp(Number(params.get("mockCameraZoom")) || 1, 0.5, 2),
    x: clamp(Number(params.get("mockCameraX")) || 0, -300, 300),
    y: clamp(Number(params.get("mockCameraY")) || 0, -300, 300),
  };
}

function getMaskOptions(controls, mirror) {
  return {
    mirror,
    threshold: controls.maskThreshold,
    edgeCleanup: controls.edgeCleanup,
    temporalSmoothing: controls.maskSmoothing,
    feather: controls.edgeFeather,
  };
}

export default function UserPose({
  guideSrc,
  guideVideoRef,
  isInferencePaused = false,
  isScoringEnabled = false,
  readinessResetKey = 0,
  onReadinessChange = () => {},
  onGuideEnded = () => {},
}) {
  const [similarity, setSimilarity] = useState(null);
  const [status, setStatus] = useState({
    type: "loading",
    message: "신체 아웃라인 인식 모델을 준비하고 있습니다.",
  });

  const userSourceRef = useRef(null);
  const mockInputCanvasRef = useRef(null);
  const userCanvasRef = useRef(null);
  const guideCanvasRef = useRef(null);
  const userContextRef = useRef(null);
  const guideContextRef = useRef(null);
  const userMaskProcessorRef = useRef(null);
  const guideMaskProcessorRef = useRef(null);
  const userPoseRef = useRef(null);
  const guidePoseRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const activeRef = useRef(false);
  const pausedRef = useRef(isInferencePaused);
  const scoringEnabledRef = useRef(isScoringEnabled);
  const onReadinessChangeRef = useRef(onReadinessChange);
  const processingRef = useRef(false);
  const controlsRef = useRef(PRODUCT_OVERLAY_OPTIONS);
  const alignmentRef = useRef({ ...DEFAULT_ALIGNMENT });
  const guideMetricsRef = useRef(null);
  const userMetricsRef = useRef(null);
  const guideFrameReadinessRef = useRef({ ready: false });
  const readinessTrackerRef = useRef({ ...INITIAL_FULL_BODY_TRACKER });
  const lastReadinessReportRef = useRef(null);
  const readinessGenerationRef = useRef(readinessResetKey);
  const processingGenerationRef = useRef(readinessResetKey);
  const guideLandmarksRef = useRef(null);
  const scoreHistoryRef = useRef([]);
  const latestSimilarityRef = useRef(null);
  const lastInferenceRef = useRef(0);
  const lastFeedbackUpdateRef = useRef(0);
  const lastStatusUpdateRef = useRef(0);
  const mockCameraRef = useRef(getMockCameraConfig());
  // Update during render so a MediaPipe callback from the previous run is rejected even before
  // the reset effect below has a chance to run.
  readinessGenerationRef.current = readinessResetKey;

  // The demonstration video is the fixed reference. Automatic alignment may only transform the
  // webcam layer, otherwise the reference appears to chase the user's movement.
  const getAutoAlignment = useCallback((layer) => {
    return layer === "user" ? alignmentRef.current : DEFAULT_ALIGNMENT;
  }, []);

  // The one place a layer's final transform is decided, keeping the rendered canvases aligned
  // with the measurements used for scoring.
  const getLayerTransform = useCallback((layer) => {
    const current = controlsRef.current;
    const automatic = getAutoAlignment(layer);
    const isGuide = layer === "guide";
    const automaticScale = current.autoScaleEnabled ? automatic.scale : 1;
    return {
      scale: clamp(
        automaticScale * (isGuide ? current.guideScale : current.userScale),
        MIN_AUTO_SCALE,
        current.maxAutoScale,
      ),
      x: (current.autoPositionEnabled ? automatic.x : 0) + (isGuide ? current.guideX : current.userX),
      y: (current.autoPositionEnabled ? automatic.y : 0) + (isGuide ? current.guideY : current.userY),
    };
  }, [getAutoAlignment]);

  const applyLayerTransform = useCallback((layer, canvas) => {
    if (!canvas) return;
    const { scale, x, y } = getLayerTransform(layer);
    if (![scale, x, y].every(Number.isFinite)) return;
    canvas.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  }, [getLayerTransform]);

  const applyUserTransform = useCallback(
    () => applyLayerTransform("user", userCanvasRef.current),
    [applyLayerTransform],
  );
  const applyGuideTransform = useCallback(
    () => applyLayerTransform("guide", guideCanvasRef.current),
    [applyLayerTransform],
  );

  useEffect(() => {
    pausedRef.current = isInferencePaused;
  }, [isInferencePaused]);

  useEffect(() => {
    scoringEnabledRef.current = isScoringEnabled;
  }, [isScoringEnabled]);

  useEffect(() => {
    onReadinessChangeRef.current = onReadinessChange;
  }, [onReadinessChange]);

  useEffect(() => {
    readinessTrackerRef.current = { ...INITIAL_FULL_BODY_TRACKER };
    guideFrameReadinessRef.current = { ready: false };
    lastReadinessReportRef.current = null;
    guideMetricsRef.current = null;
    userMetricsRef.current = null;
    alignmentRef.current = { ...DEFAULT_ALIGNMENT };
    scoreHistoryRef.current = [];
    latestSimilarityRef.current = null;
    setSimilarity(null);
    onReadinessChangeRef.current({ ready: false, userReady: false, guideReady: false });
  }, [readinessResetKey]);

  useEffect(() => {
    window.getExerciseScore = () => {
      const scores = scoreHistoryRef.current;
      if (!scores.length) return 0;
      return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100);
    };
    return () => {
      delete window.getExerciseScore;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const userSourceNode = userSourceRef.current;
    const guideVideoNode = guideVideoRef.current;

    const updateStatus = (nextStatus) => {
      const now = performance.now();
      if (
        nextStatus.type !== "error" &&
        now - lastStatusUpdateRef.current < UI_UPDATE_INTERVAL_MS
      ) return;

      lastStatusUpdateRef.current = now;
      setStatus((currentStatus) =>
        currentStatus.type === nextStatus.type && currentStatus.message === nextStatus.message
          ? currentStatus
          : nextStatus,
      );
    };

    const getViewport = () => ({
      width: userCanvasRef.current?.clientWidth || MASK_WIDTH,
      height: userCanvasRef.current?.clientHeight || MASK_HEIGHT,
    });

    const updateProductFeedback = (now) => {
      if (now - lastFeedbackUpdateRef.current < UI_UPDATE_INTERVAL_MS) return;
      lastFeedbackUpdateRef.current = now;
      setSimilarity(latestSimilarityRef.current);
    };

    const onGuideResults = (results) => {
      if (processingGenerationRef.current !== readinessGenerationRef.current) return;
      const current = controlsRef.current;
      // Background removal is off: the whole frame is drawn and segmentation is used only to
      // measure the performer's outline.
      renderPlainFrame(guideContextRef.current, results, { mirror: false });
      const silhouette = measureSilhouette(
        results,
        guideMaskProcessorRef.current,
        getMaskOptions(current, false),
      );

      const viewport = getViewport();
      guideLandmarksRef.current = results.poseLandmarks || null;
      guideMetricsRef.current = measurePose(
        results.poseLandmarks,
        results.image,
        viewport.width,
        viewport.height,
        false,
        silhouette,
      );
      guideFrameReadinessRef.current = evaluateFullBodyFrame(results.poseLandmarks, silhouette);
    };

    const onUserResults = (results) => {
      if (processingGenerationRef.current !== readinessGenerationRef.current) return;
      const now = performance.now();
      const current = controlsRef.current;
      renderPlainFrame(userContextRef.current, results, { mirror: true });
      const silhouette = measureSilhouette(
        results,
        userMaskProcessorRef.current,
        getMaskOptions(current, true),
      );
      const viewport = getViewport();
      userMetricsRef.current = measurePose(
        results.poseLandmarks,
        results.image,
        viewport.width,
        viewport.height,
        true,
        silhouette,
      );
      const userMetrics = userMetricsRef.current;
      const guideMetrics = guideMetricsRef.current;
      const userFrameReadiness = evaluateFullBodyFrame(results.poseLandmarks, silhouette);
      const guideFrameReadiness = guideFrameReadinessRef.current;
      const bothFramesReady = userFrameReadiness.ready && guideFrameReadiness.ready;
      readinessTrackerRef.current = updateFullBodyTracker(
        readinessTrackerRef.current,
        userFrameReadiness.ready,
      );
      const readinessReport = {
        ready: readinessTrackerRef.current.ready,
        userReady: userFrameReadiness.ready,
        guideReady: guideFrameReadiness.ready,
      };
      const previousReadinessReport = lastReadinessReportRef.current;
      if (
        !previousReadinessReport ||
        previousReadinessReport.ready !== readinessReport.ready ||
        previousReadinessReport.userReady !== readinessReport.userReady ||
        previousReadinessReport.guideReady !== readinessReport.guideReady
      ) {
        lastReadinessReportRef.current = readinessReport;
        onReadinessChangeRef.current(readinessReport);
      }

      if (!userMetrics || !guideMetrics) {
        updateStatus({
          type: "info",
          message: !userMetrics
            ? "머리부터 발끝까지 보이도록 카메라 앞에 서 주세요."
            : "시범 영상에서 머리부터 발끝까지의 높이를 확인하고 있습니다.",
        });
        updateProductFeedback(now);
        return;
      }

      const sharedAlignmentOptions = {
        autoScaleEnabled: current.autoScaleEnabled,
        autoPositionEnabled: current.autoPositionEnabled,
        smoothingFactor: current.alignmentSmoothing,
        maxScale: current.maxAutoScale,
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
      };

      alignmentRef.current = calculateAutoAlignment({
        ...sharedAlignmentOptions,
        guide: guideMetrics,
        user: userMetrics,
        previous: alignmentRef.current,
        guideTransform: getLayerTransform("guide"),
        manualUserScale: current.userScale,
      });
      applyUserTransform();
      applyGuideTransform();

      // Scoring keeps comparing a mirrored user against the unmirrored guide, exactly as it did
      // while selfieMode produced those coordinates. Only the alignment path changed.
      const score = Math.max(
        0,
        cosineSimilarity(
          poseToNormalizedVector(mirrorLandmarks(results.poseLandmarks)),
          poseToNormalizedVector(guideLandmarksRef.current),
        ),
      );
      if (scoringEnabledRef.current && bothFramesReady) {
        scoreHistoryRef.current.push(score);
        if (scoreHistoryRef.current.length > 3600) scoreHistoryRef.current.shift();
        latestSimilarityRef.current =
          typeof latestSimilarityRef.current === "number"
            ? latestSimilarityRef.current * 0.8 + score * 0.2
            : score;
      }

      // A clipped silhouette is not the whole body, so the size it reports is too small to match
      // against. Ask for full-body framing before blaming the scale ceiling.
      const clipped = silhouette?.clipped;
      const verticallyClipped = Boolean(clipped?.top || clipped?.bottom);
      const activeAlignment = alignmentRef.current;

      if (!userFrameReadiness.ready || verticallyClipped) {
        updateStatus({
          type: "info",
          message: "머리부터 발끝까지 화면에 들어오도록 카메라에서 한두 걸음 뒤로 물러나 주세요.",
        });
      } else if (!guideFrameReadiness.ready) {
        updateStatus({
          type: "info",
          message: "시범 영상에서 머리부터 발끝까지의 자세를 확인하고 있습니다.",
        });
      } else if (activeAlignment.scaleCapped) {
        updateStatus({
          type: "info",
          message: `크기 차이가 너무 커서 최대 ${current.maxAutoScale.toFixed(1)}배까지만 맞췄습니다. 뒤로 물러나면 더 정확해집니다.`,
        });
      } else if (activeAlignment.scaleFloored) {
        updateStatus({
          type: "info",
          message: `사용자가 너무 가까워 최소 ${MIN_AUTO_SCALE.toFixed(1)}배까지만 줄였습니다. 카메라에서 뒤로 물러나 주세요.`,
        });
      } else {
        updateStatus({
          type: "ready",
          message: "아웃라인 측정과 자동 맞춤이 정상적으로 작동하고 있습니다.",
        });
      }
      updateProductFeedback(now);
    };

    const prepareMockInput = () => {
      const video = userSourceRef.current;
      const config = mockCameraRef.current;
      if (!config || !video || video.readyState < 2) return video;

      if (!mockInputCanvasRef.current) {
        const canvas = document.createElement("canvas");
        const profile = getProcessingProfile(controlsRef.current.processingMode);
        canvas.width = profile.width;
        canvas.height = profile.height;
        mockInputCanvasRef.current = canvas;
      }
      const canvas = mockInputCanvasRef.current;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) return video;

      context.fillStyle = "#dce5df";
      context.fillRect(0, 0, canvas.width, canvas.height);
      const rect = getContainRect(video, canvas.width, canvas.height);
      const width = rect.width * config.zoom;
      const height = rect.height * config.zoom;
      context.drawImage(
        video,
        rect.x + (rect.width - width) / 2 + config.x,
        rect.y + (rect.height - height) / 2 + config.y,
        width,
        height,
      );
      return canvas;
    };

    const initialize = async () => {
      userContextRef.current = userCanvasRef.current?.getContext("2d", { alpha: true }) || null;
      guideContextRef.current = guideCanvasRef.current?.getContext("2d", { alpha: true }) || null;
      const initialProfile = getProcessingProfile(controlsRef.current.processingMode);
      userMaskProcessorRef.current = createMaskProcessor(initialProfile.width, initialProfile.height);
      guideMaskProcessorRef.current = createMaskProcessor(initialProfile.width, initialProfile.height);
      if (
        !userContextRef.current ||
        !guideContextRef.current ||
        !userMaskProcessorRef.current ||
        !guideMaskProcessorRef.current
      ) {
        setStatus({ type: "error", message: "이 브라우저에서는 영상 합성 화면을 만들 수 없습니다." });
        return;
      }

      try {
        const createPose = (selfieMode, callback) => {
          const pose = new Pose({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${MEDIAPIPE_VERSION}/${file}`,
          });
          pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: true,
            smoothSegmentation: true,
            selfieMode,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
          pose.onResults(callback);
          return pose;
        };

        // selfieMode is off on purpose. With it on, MediaPipe returns landmarks in already-flipped
        // coordinates and this component flips them a second time when drawing and measuring, so
        // the measured body and the drawn body end up on opposite sides of the stage. Mirroring is
        // now done in exactly one place: our own `mirror` flag.
        userPoseRef.current = createPose(false, onUserResults);
        guidePoseRef.current = createPose(false, onGuideResults);

        const userVideo = userSourceRef.current;
        if (mockCameraRef.current) {
          await userVideo?.play();
        } else {
          if (!navigator.mediaDevices?.getUserMedia) throw new Error("MEDIA_DEVICES_UNAVAILABLE");
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
            audio: false,
          });
          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          streamRef.current = stream;
          if (userVideo) {
            userVideo.srcObject = stream;
            await userVideo.play();
          }
        }

        activeRef.current = true;
        setStatus({
          type: "ready",
          message: mockCameraRef.current
            ? "테스트용 카메라 영상과 자동 맞춤이 준비되었습니다."
            : "아웃라인 측정과 자동 맞춤이 준비되었습니다.",
        });

        const processFrames = async (timestamp) => {
          if (!activeRef.current) return;
          animationFrameRef.current = requestAnimationFrame(processFrames);
          if (
            pausedRef.current ||
            document.hidden ||
            processingRef.current ||
            timestamp - lastInferenceRef.current <
              1000 / getProcessingProfile(controlsRef.current.processingMode).targetFps
          ) {
            return;
          }

          const userVideoElement = userSourceRef.current;
          const guideVideo = guideVideoRef.current;
          if (userVideoElement?.readyState < 2 || guideVideo?.readyState < 2) return;

          processingRef.current = true;
          lastInferenceRef.current = timestamp;
          try {
            const userInput = prepareMockInput();
            const processingGeneration = readinessGenerationRef.current;
            processingGenerationRef.current = processingGeneration;
            // MediaPipe Pose 0.5 shares a global WASM asset loader, so first-use calls must stay sequential.
            await guidePoseRef.current?.send({ image: guideVideo });
            if (processingGeneration !== readinessGenerationRef.current) return;
            await userPoseRef.current?.send({ image: userInput });
          } catch (error) {
            console.error("MediaPipe frame processing failed", error);
            updateStatus({ type: "error", message: "영상 인식 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." });
          } finally {
            processingRef.current = false;
          }
        };
        animationFrameRef.current = requestAnimationFrame(processFrames);
      } catch (error) {
        if (cancelled || error?.name === "AbortError") return;
        console.error("Video overlay initialization failed", error);
        const cameraDenied = error?.name === "NotAllowedError" || error?.name === "SecurityError";
        const noCamera = error?.name === "NotFoundError" || error?.message === "MEDIA_DEVICES_UNAVAILABLE";
        setStatus({
          type: "error",
          message: cameraDenied
            ? "웹캠을 사용할 수 없습니다. 브라우저의 카메라 권한을 확인해 주세요."
            : noCamera
              ? "사용 가능한 웹캠을 찾을 수 없습니다. 카메라 연결을 확인해 주세요."
              : "신체 아웃라인 인식 모델을 불러오지 못했습니다. 네트워크 연결을 확인해 주세요.",
        });
      }
    };

    initialize();
    return () => {
      cancelled = true;
      activeRef.current = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      processingRef.current = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      userSourceNode?.pause();
      guideVideoNode?.pause();
      resetMaskProcessor(userMaskProcessorRef.current);
      resetMaskProcessor(guideMaskProcessorRef.current);
      Promise.allSettled([userPoseRef.current?.close(), guidePoseRef.current?.close()]);
      userPoseRef.current = null;
      guidePoseRef.current = null;
    };
  }, [applyGuideTransform, applyUserTransform, getLayerTransform, guideVideoRef]);

  const mockCamera = mockCameraRef.current;

  return (
    <div className="video-overlay-shell">
      <div className="video-overlay-stage" aria-label="사용자와 시범 영상 겹쳐 보기">
        <video
          ref={userSourceRef}
          src={mockCamera?.source}
          loop={Boolean(mockCamera)}
          muted
          playsInline
          className="video-overlay-source"
        />
        <video
          ref={guideVideoRef}
          src={guideSrc}
          className="video-overlay-source"
          muted
          playsInline
          preload="auto"
          loop={Boolean(mockCamera)}
          onEnded={mockCamera ? undefined : onGuideEnded}
          onError={() => setStatus({ type: "error", message: "시범 영상을 불러오지 못했습니다. 영상 파일을 확인해 주세요." })}
        />
        {/*
          No width/height here on purpose. The display buffers are resized to each source's native
          resolution on the first drawn frame; tying them to the inference profile threw away most
          of the guide video's detail before it was ever enlarged.
        */}
        <canvas
          ref={userCanvasRef}
          className="video-overlay-layer video-overlay-layer--user"
        />
        <canvas
          ref={guideCanvasRef}
          className="video-overlay-layer video-overlay-layer--guide"
          // The transform is applied imperatively in applyGuideTransform so per-frame automatic
          // alignment does not have to re-render React on every processed frame.
          style={{ opacity: PRODUCT_OVERLAY_OPTIONS.guideOpacity }}
        />
      </div>
      <div
        className={`video-overlay-feedback video-overlay-feedback--${status.type}`}
        role="status"
        aria-live="polite"
      >
        <span>{status.message}</span>
        <strong>
          동작 유사도: {similarity === null ? "측정 중" : `${(similarity * 100).toFixed(1)}%`}
        </strong>
      </div>
    </div>
  );
}
