<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  animeId: Number,
  title: String,
  subtitle: String,
  image: String,
  genre: String,
  episodeCount: {
    type: Number,
    default: 0
  },
  progress: {
    type: Number,
    default: 0
  },
  audioType: {
    type: String,
    default: 'SUB'
  },
  ageRating: String,
  isSimulcast: Boolean,
  rating: Number
})

const router = useRouter()
const isHovered = ref(false)

function handleClick() {
  if (props.animeId) {
    router.push(`/watch?anime=${props.animeId}`)
  }
}
</script>

<template>
  <div 
    class="anime-card" 
    @click="handleClick"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <div class="card-poster">
      <!-- Imagen vertical 2:3 ratio -->
      <img :src="image" :alt="title" class="poster-image" />
      
      <!-- Barra de progreso (Continue Watching) -->
      <div v-if="progress > 0" class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
      
      <!-- Badges superiores -->
      <div class="badges-top">
        <span v-if="isSimulcast" class="badge badge-simulcast">SIMULCAST</span>
        <span v-if="audioType" class="badge badge-audio">{{ audioType }}</span>
      </div>
      
      <!-- Overlay con información al hover -->
      <div class="card-overlay" :class="{ visible: isHovered }">
        <div class="overlay-content">
          <h4 class="overlay-title">{{ title }}</h4>
          <p v-if="subtitle" class="overlay-subtitle">{{ subtitle }}</p>
          <div class="overlay-meta">
            <span v-if="genre" class="meta-item">{{ genre }}</span>
            <span v-if="episodeCount" class="meta-item">{{ episodeCount }} Eps</span>
            <span v-if="rating" class="meta-item">⭐ {{ rating }}</span>
          </div>
          <div class="overlay-actions">
            <button class="btn-play">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Ver Ahora
            </button>
          </div>
        </div>
      </div>
      
      <!-- Badge de rating en la esquina -->
      <div v-if="ageRating" class="age-rating">{{ ageRating }}</div>
    </div>
    
    <!-- Información debajo de la imagen -->
    <div class="card-info">
      <h3 class="card-title">{{ title }}</h3>
      <p v-if="subtitle" class="card-subtitle">{{ subtitle }}</p>
    </div>
  </div>
</template>

<style scoped>
.anime-card {
  position: relative;
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  width: 100%;
}

@media (min-width: 1024px) {
  .anime-card {
    min-width: 160px;
    max-width: 220px;
  }
}

@media (max-width: 1023px) and (min-width: 768px) {
  .anime-card {
    min-width: 140px;
    max-width: 180px;
  }
}

@media (max-width: 767px) {
  .anime-card {
    min-width: 120px;
    max-width: 140px;
  }
}

.anime-card:hover {
  transform: scale(1.08);
  z-index: 10;
}

.card-poster {
  position: relative;
  width: 100%;
  aspect-ratio: 2/3; /* Vertical como Crunchyroll */
  border-radius: 8px;
  overflow: hidden;
  background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  transition: box-shadow 0.3s ease;
}

.anime-card:hover .card-poster {
  box-shadow: 0 8px 24px rgba(147, 51, 234, 0.4);
}

.poster-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.anime-card:hover .poster-image {
  transform: scale(1.05);
}

/* Progress bar para Continue Watching */
.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  z-index: 2;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #9333ea 0%, #a855f7 100%);
  transition: width 0.3s ease;
}

/* Badges superiores */
.badges-top {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  gap: 6px;
  z-index: 3;
}

.badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  backdrop-filter: blur(8px);
}

.badge-simulcast {
  background: rgba(147, 51, 234, 0.9);
  color: #fff;
}

.badge-audio {
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  border: 1px solid rgba(147, 51, 234, 0.5);
}

/* Age rating badge */
.age-rating {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.9);
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid rgba(255, 255, 255, 0.3);
  z-index: 3;
}

/* Overlay al hacer hover */
.card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.95) 0%,
    rgba(0, 0, 0, 0.7) 50%,
    rgba(0, 0, 0, 0.3) 100%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
  display: flex;
  align-items: flex-end;
  padding: 16px;
  z-index: 4;
}

.card-overlay.visible {
  opacity: 1;
}

.overlay-content {
  width: 100%;
}

.overlay-title {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 6px;
  line-height: 1.2;
}

.overlay-subtitle {
  font-size: 13px;
  color: #a0a0a0;
  margin-bottom: 8px;
}

.overlay-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.meta-item {
  font-size: 12px;
  color: #b0b0b0;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.overlay-actions {
  display: flex;
  gap: 8px;
}

.btn-play {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #9333ea 0%, #a855f7 100%);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-play:hover {
  background: linear-gradient(135deg, #7e22ce 0%, #9333ea 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(147, 51, 234, 0.5);
}

/* Información debajo de la imagen */
.card-info {
  margin-top: 10px;
  padding: 0 4px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-subtitle {
  font-size: 13px;
  color: #888;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
