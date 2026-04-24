import { ref, onMounted, onUnmounted, Ref, markRaw } from 'vue';
import { HandLandmarker, FilesetResolver, NormalizedLandmark } from "@mediapipe/tasks-vision";

export type GestureType = "OK Gesture" | "Open Palm" | "Closed Fist" | "Peace" | "Thumbs Up" | "Unknown";

export interface HandData {
  landmarks: NormalizedLandmark[];
  gesture: GestureType;
  scale: number;
}

export function useHandTracking(videoRef: Ref<HTMLVideoElement | null>) {
  const isLoaded = ref(false);
  const handData = ref<HandData | null>(null);
  let landmarkerInstance: HandLandmarker | null = null;
  let reqFrameId = 0;

  // calculate distance between two points
  const dist = (p1: NormalizedLandmark, p2: NormalizedLandmark) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  };

  const processLandmarks = (landmarks: NormalizedLandmark[]): HandData => {
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const middleMcp = landmarks[9];
    
    // Reference distance (wrist to middle finger base) to make it depth independent
    const refDist = dist(wrist, middleMcp) || 0.001; 

    // Distances to wrist
    const dThumb = dist(wrist, thumbTip);
    const dIndex = dist(wrist, indexTip);
    const dMiddle = dist(wrist, middleTip);
    const dRing = dist(wrist, ringTip);
    const dPinky = dist(wrist, pinkyTip);

    // extended thresholds relative to hand scale
    const thumbExt = dThumb / refDist > 1.3;
    const indexExt = dIndex / refDist > 1.8;
    const middleExt = dMiddle / refDist > 1.8;
    const ringExt = dRing / refDist > 1.7;
    const pinkyExt = dPinky / refDist > 1.5;

    // Check OK Gesture: Thumb and Index tips are close, others extended
    const thumbIndexDist = dist(thumbTip, indexTip);
    let gesture: GestureType = "Unknown";

    if (thumbIndexDist < (0.8 * refDist) && middleExt && ringExt && pinkyExt) {
      gesture = "OK Gesture";
    } else if (indexExt && middleExt && !ringExt && !pinkyExt) {
      gesture = "Peace";
    } else if (thumbExt && !indexExt && !middleExt && !ringExt && !pinkyExt) {
      gesture = "Thumbs Up";
    } else if (thumbExt && indexExt && middleExt && ringExt && pinkyExt) {
      gesture = "Open Palm";
    } else if (!thumbExt && !indexExt && !middleExt && !ringExt && !pinkyExt) {
      gesture = "Closed Fist";
    }

    const avgTipDist = (dIndex + dMiddle + dRing + dPinky) / 4;
    // Scale 0 to 1 based on average tip distance relative to reference
    const scale = Math.min(Math.max(((avgTipDist / refDist) - 1.2) / 1.0, 0), 1); 

    return {
      landmarks,
      gesture,
      scale
    };
  };

  onMounted(async () => {
    let active = true;
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
      );
      const lm = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
      });
      await lm.setOptions({ runningMode: "VIDEO" });
      if (!active) return;
      landmarkerInstance = markRaw(lm);
      isLoaded.value = true;
      startTracking();
    } catch (err) {
      console.error(err);
    }
  });

  onUnmounted(() => {
    if (landmarkerInstance) {
      landmarkerInstance.close();
    }
    cancelAnimationFrame(reqFrameId);
  });

  let lastVideoTime = -1;
  const renderLoop = () => {
    const video = videoRef.value;
    if (video && video.readyState >= 2 && landmarkerInstance) {
      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        try {
          const result = landmarkerInstance.detectForVideo(video, performance.now());
          
          // Debug hook (attach to window for UI visibility if needed)
          (window as any)._handTrackingDebug = {
            time: lastVideoTime,
            handsCount: result.landmarks?.length || 0,
            readyState: video.readyState,
          };
          
          if (result.landmarks && result.landmarks.length > 0) {
            handData.value = processLandmarks(result.landmarks[0]);
          } else {
            handData.value = null;
          }
        } catch(e) {
          console.error("Tracking Error:", e);
        }
      }
    }
    reqFrameId = requestAnimationFrame(renderLoop);
  };

  const startTracking = () => {
    reqFrameId = requestAnimationFrame(renderLoop);
  };

  return {
    isLoaded,
    handData
  };
}
