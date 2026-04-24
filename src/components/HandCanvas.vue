<template>
  <canvas
    ref="canvasRef"
    :width="width"
    :height="height"
    class="w-full h-full"
    style="transform: scaleX(-1);"
  />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import type { HandData } from '../composables/useHandTracking';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

const props = defineProps<{
  handData: HandData | null;
  width: number;
  height: number;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index
  [9, 10], [10, 11], [11, 12],    // Middle
  [13, 14], [14, 15], [15, 16],   // Ring
  [17, 18], [18, 19], [19, 20],   // Pinky
  [5, 9], [9, 13], [13, 17], [0, 17] // Palm base
];

let targetLandmarks: NormalizedLandmark[] | null = null;
let currentLandmarks: NormalizedLandmark[] | null = null;
let animFrameId = 0;

watch(() => props.handData, (newData) => {
  targetLandmarks = newData?.landmarks || null;
}, { immediate: true });

onMounted(() => {
  const draw = () => {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, props.width, props.height);

    const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

    if (targetLandmarks) {
      if (!currentLandmarks) {
        currentLandmarks = targetLandmarks.map(p => ({ ...p }));
      } else {
        currentLandmarks = currentLandmarks.map((curr, i) => {
          const target = targetLandmarks![i];
          return {
            x: lerp(curr.x, target.x, 0.3),
            y: lerp(curr.y, target.y, 0.3),
            z: lerp(curr.z || 0, target.z || 0, 0.3),
          };
        });
      }
    } else {
      currentLandmarks = null;
    }

    if (currentLandmarks) {
      ctx.strokeStyle = "rgba(100, 255, 255, 0.8)";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const p1 = currentLandmarks![startIdx];
        const p2 = currentLandmarks![endIdx];
        ctx.moveTo(p1.x * props.width, p1.y * props.height);
        ctx.lineTo(p2.x * props.width, p2.y * props.height);
      });
      ctx.stroke();

      currentLandmarks.forEach((point, i) => {
        ctx.beginPath();
        ctx.arc(point.x * props.width, point.y * props.height, i === 0 ? 8 : 5, 0, 2 * Math.PI);
        ctx.fillStyle = i === 0 ? "#ff007f" : "#00ffcc";
        ctx.fill();
      });

      const scaleVal = props.handData ? props.handData.scale : 0.5;
      const wrist = currentLandmarks[0];
      
      ctx.beginPath();
      const glowRadius = 20 + scaleVal * 40;
      ctx.arc(wrist.x * props.width, wrist.y * props.height, glowRadius, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(255, 0, 127, ${0.1 + scaleVal * 0.2})`;
      ctx.fill();
    }

    animFrameId = requestAnimationFrame(draw);
  };
  draw();
});

onUnmounted(() => {
  cancelAnimationFrame(animFrameId);
});
</script>
