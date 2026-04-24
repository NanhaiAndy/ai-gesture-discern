<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col pt-12 items-center p-4">
    <!-- Background decoration -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px]" />
      <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-[100px]" />
    </div>

    <div class="relative z-10 w-full max-w-5xl flex flex-col items-center">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-pink-500 flex items-center justify-center gap-3">
          <Hand class="text-cyan-400 w-8 h-8" />
          Vue 3 Gesture Control
        </h1>
        <p class="text-slate-400 mt-2">
          Recognizes gestures like "OK" to trigger specific functions.
        </p>
      </div>

      <div v-if="permissionError" class="bg-red-950/50 border border-red-500/50 text-red-200 p-6 rounded-2xl flex items-center gap-4 max-w-md text-center">
        <Camera class="w-8 h-8 text-red-500" />
        <p>Please grant camera permissions to use this demo.</p>
      </div>
      
      <div v-else class="flex flex-col lg:flex-row gap-8 w-full items-start justify-center">
        <!-- Main Canvas Area -->
        <div 
          class="relative rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl bg-slate-900/60 backdrop-blur-md flex-shrink-0 flex items-center justify-center bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"
          :style="{ width: '100%', maxWidth: `${width}px`, aspectRatio: `${width}/${height}` }"
        >
          <!-- Invisible dedicated tracking video element -->
          <video
            ref="videoRef"
            autoplay
            playsinline
            muted
            :width="width"
            :height="height"
            class="absolute pointer-events-none"
            :style="{ width: `${width}px`, height: `${height}px`, opacity: 0.01, zIndex: -1 }"
          />

          <div v-if="!isLoaded" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-20">
            <Scaling class="w-10 h-10 text-cyan-400 mb-4 animate-spin-slow" />
            <p class="text-cyan-400 font-medium tracking-wide animate-pulse">
              Loading AI Model...
            </p>
          </div>

          <!-- Hand Canvas rendering the neon skeleton -->
          <div class="absolute inset-0 z-10 pointer-events-none">
            <HandCanvas :handData="handData" :width="width" :height="height" />
          </div>
        </div>

        <!-- Side Panel -->
        <div class="flex flex-col gap-6 w-full max-w-sm">
          <div class="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 class="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
              <Compass class="w-4 h-4" /> Telemetry
            </h3>
            
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-slate-300">Status</span>
                <span v-if="handData" class="text-emerald-400 font-medium flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Tracking ({{ debugInfo.handsCount }} hand)
                </span>
                <span v-else class="text-amber-500 font-medium text-xs">Waiting... (Time: {{ debugInfo.time.toFixed(1) }}s, Hands: {{ debugInfo.handsCount }})</span>
              </div>
              
              <div class="flex items-center justify-between">
                <span class="text-slate-300">Gesture</span>
                <span class="font-semibold text-white">
                  {{ handData ? handData.gesture : "--" }}
                </span>
              </div>

              <!-- Functional Action State based on OK Gesture -->
              <div class="mt-4 pt-4 border-t border-slate-800">
                <div class="flex items-center justify-between">
                  <span class="text-slate-300 font-medium">Action Trigger:</span>
                  <span :class="{'text-emerald-400 font-bold': handData?.gesture === 'OK Gesture', 'text-slate-500': handData?.gesture !== 'OK Gesture'}">
                    {{ handData?.gesture === 'OK Gesture' ? 'CONFIRMED ✓' : 'Awaiting OK...' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Reactive UI Element -->
          <div class="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl flex-1 flex flex-col items-center justify-center min-h-[200px] overflow-hidden relative">
            <p class="text-slate-500 text-sm absolute top-4 left-4 z-20">Reactive Object</p>
            
            <div
              class="w-24 h-24 rounded-2xl bg-gradient-to-tr shadow-lg flex flex-col items-center justify-center p-2 text-center transition-all duration-300 ease-out"
              :class="{
                'from-emerald-500 to-teal-400 shadow-emerald-500/40 scale-110 rounded-full': handData?.gesture === 'OK Gesture',
                'from-cyan-500 to-blue-500 shadow-cyan-500/20': handData?.gesture === 'Open Palm',
                'from-red-500 to-pink-500 shadow-red-500/20 scale-90': handData?.gesture === 'Closed Fist',
                'from-amber-500 to-orange-500 shadow-amber-500/20': handData?.gesture === 'Peace',
                'from-purple-500 to-indigo-500 shadow-purple-500/20': handData?.gesture === 'Thumbs Up',
                'from-slate-700 to-slate-600': !handData || handData.gesture === 'Unknown'
              }"
            >
              <CheckCircle v-if="handData?.gesture === 'OK Gesture'" class="w-8 h-8 text-white mb-1" />
              <Hand v-else class="w-8 h-8 text-white mb-1" />
              <span class="text-white text-xs font-bold leading-tight">
                {{ handData?.gesture === 'OK Gesture' ? 'CONFIRMED' : 'ACTION' }}
              </span>
            </div>
            
            <div v-if="!handData" class="absolute inset-0 bg-slate-900/50 flex items-center justify-center backdrop-blur-sm z-10 rounded-2xl">
              <p class="text-slate-400 text-sm">Show your hand</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating Video Preview - Bottom Right -->
    <div class="fixed bottom-6 right-6 w-48 sm:w-64 rounded-xl overflow-hidden shadow-[0_0_40px_-10px_rgba(0,255,255,0.2)] border border-slate-700 z-50 bg-black aspect-[4/3] flex items-center justify-center">
      <video
        ref="previewVideoRef"
        autoplay
        playsinline
        muted
        class="w-full h-full object-cover"
        style="transform: scaleX(-1);"
      />
      <div v-if="!isLoaded" class="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2">
        <Scaling class="w-5 h-5 text-cyan-400 animate-spin" />
        <span class="text-[10px] text-cyan-400 font-medium tracking-wider">WAITING</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { Camera, Hand, Scaling, Compass, CheckCircle } from 'lucide-vue-next';
import { useHandTracking } from './composables/useHandTracking';
import HandCanvas from './components/HandCanvas.vue';

const videoRef = ref<HTMLVideoElement | null>(null);
const previewVideoRef = ref<HTMLVideoElement | null>(null);
const streamMedia = ref<MediaStream | null>(null);
const permissionError = ref(false);

const width = 640;
const height = 480;

const { isLoaded, handData } = useHandTracking(videoRef);

const debugInfo = ref({ time: 0, handsCount: 0 });
let debugTimer: number;

// Sync stream to preview video once template refs are resolved and stream is active
watch([previewVideoRef, streamMedia], ([previewVideo, stream]) => {
  if (previewVideo && stream) {
    previewVideo.srcObject = stream;
  }
});

watch([videoRef, streamMedia], ([video, stream]) => {
  if (video && stream) {
    video.srcObject = stream;
    video.play().catch(e => console.error(e));
  }
});

onMounted(async () => {
  debugTimer = window.setInterval(() => {
    if ((window as any)._handTrackingDebug) {
      debugInfo.value = (window as any)._handTrackingDebug;
    }
  }, 200);
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: false,
    });
    streamMedia.value = stream;
    if (videoRef.value) {
      videoRef.value.srcObject = stream;
      videoRef.value.play().catch(e => console.error(e));
    }
  } catch (err) {
    console.error("Camera access denied or error:", err);
    permissionError.value = true;
  }
});

onUnmounted(() => {
  if (streamMedia.value) {
    streamMedia.value.getTracks().forEach(track => track.stop());
  }
});
</script>

<style>
.animate-spin-slow {
  animation: spin 3s linear infinite;
}
</style>
