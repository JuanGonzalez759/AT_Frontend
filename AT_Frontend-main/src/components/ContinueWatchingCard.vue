<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  animeId: Number,
  title: String,
  episodeNumber: {
    type: Number,
    default: 1
  },
  episodeTitle: String,
  thumbnail: String, // Miniatura del episodio (16:9)
  progress: {
    type: Number,
    default: 0 // 0-100
  },
  duration: {
    type: String,
    default: '24m'
  },
  audioType: {
    type: String,
    default: 'SUB'
  }
})

const router = useRouter()
const isHovered = ref(false)

// Calcular tiempo restante
const timeRemaining = ref(`${props.duration} restantes`)

function handleClick() {
  if (props.animeId) {
    router.push(`/watch?anime=${props.animeId}`)
  }
}
</script>

<template>
  <div 
    class="continue-watching-card" 
    @click="handleClick"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <div class="card-thumbnail">
      <!-- Imagen horizontal 16:9 -->
      <img :src="thumbnail" :alt="title" class="thumbnail-image" />
      
      <!-- Overlay oscuro en hover -->
      <div class="thumbnail-overlay" :class="{ show: isHovered }"></div>
      
      <!-- Play button en hover -->
      <div class="play-button" :class="{ show: isHovered }">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </div>
      
      <!-- Barra de progreso en la parte inferior -->
      <div class="progress-container">
        <div class="progress-bar" :style="{ width: `${progress}%` }"></div>
      </div>
      
      <!-- Badge de audio (SUB/DUB) -->
      <div class="audio-badge">{{ audioType }}</div>
      
      <!-- Duración restante -->
      <div class="time-remaining">{{ timeRemaining }}</div>
    </div>
    
    <!-- Info del episodio -->
    <div class="card-info">
      <h3 class="anime-title">{{ title }}</h3>
      <p class="episode-info">
        <span v-if="episodeTitle">E{{ episodeNumber }} - {{ episodeTitle }}</span>
        <span v-else>Episodio {{ episodeNumber }}</span>
        <span class="separator">|</span>
        <span class="audio-text">{{ audioType === 'DUB' ? 'Doblado' : 'Subtitulado' }}</span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.continue-watching-card {
  position: relative;
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.continue-watching-card:hover {
  transform: scale(1.05);
}

.card-thumbnail {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9; /* Formato horizontal */
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-bg-tertiary);
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.continue-watching-card:hover .thumbnail-image {
  transform: scale(1.1);
}

.thumbnail-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 1;
}

.thumbnail-overlay.show {
  opacity: 1;
}

.play-button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.8);
  color: #fff;
  opacity: 0;
  transition: all 0.3s ease;
  z-index: 2;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
}

.play-button.show {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

.progress-container {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  z-index: 3;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary) 0%, #c084fc 100%);
  transition: width 0.3s ease;
  box-shadow: 0 0 8px rgba(147, 51, 234, 0.5);
}

.audio-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  z-index: 3;
}

.time-remaining {
  position: absolute;
  bottom: 10px;
  right: 8px;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
  color: #fff;
  padding: 3px 6px;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 500;
  z-index: 3;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.anime-title {
  color: var(--color-text);
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
}

.continue-watching-card:hover .anime-title {
  color: var(--color-primary);
}

.episode-info {
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.separator {
  color: var(--color-text-tertiary);
}

.audio-text {
  color: var(--color-text-tertiary);
}

/* Responsive */
@media (max-width: 768px) {
  .anime-title {
    font-size: 0.85rem;
  }
  
  .episode-info {
    font-size: 0.75rem;
  }
}
</style>
