<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProfile } from '../composables/useProfile'
import { useWatchlist } from '../composables/useWatchlist'
import SaveToListModal from './SaveToListModal.vue'

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
  rating: Number,
  isDemoContent: {
    type: Boolean,
    default: true
  },
  contentType: {
    type: String,
    default: 'SERIE'
  }
})

const router = useRouter()
const { currentProfile } = useProfile()
const { loadWatchlist, isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist()
const emit = defineEmits(['show-info', 'watchlist-updated'])
const isHovered = ref(false)
const isSaved = ref(false)
const showSaveModal = ref(false)

function handleClick() {
  if (props.animeId) {
    router.push(`/anime/${props.animeId}`)
  }
}

function emitShowInfo() {
  const payload = {
    id: props.animeId,
    title: props.title,
    subtitle: props.subtitle,
    image: props.image,
    genre: props.genre,
    rating: props.rating,
    episodeCount: props.episodeCount,
    audioType: props.audioType,
    contentType: props.contentType
  }
  emit('show-info', payload)
}

async function toggleSave(event) {
  event.stopPropagation() // Evitar que se active el click del card

  // Verificar que hay un perfil seleccionado
  if (!currentProfile.value) {
    console.warn('No profile selected, cannot save to watchlist')
    return
  }

  if (isSaved.value) {
    const success = await removeFromWatchlist(props.animeId)
    if (success) {
      isSaved.value = false
      emit('watchlist-updated')
    }
  } else {
    // Open modal to choose list (Mi Lista or custom lists)
    showSaveModal.value = true
  }
}

function onModalClose() {
  showSaveModal.value = false
}

function onModalAdded(payload) {
  // If added to mi-lista, refresh watchlist status
  if (payload?.to === 'mi-lista') {
    isSaved.value = true
    emit('watchlist-updated')
  }
}

async function checkIfInWatchlist() {
  // Solo verificar si hay un perfil seleccionado
  if (!currentProfile.value) {
    isSaved.value = false
    return
  }
  
  try {
    await loadWatchlist()
    isSaved.value = isInWatchlist(props.animeId)
  } catch (error) {
    console.debug('Could not check watchlist status:', error)
    isSaved.value = false
  }
}

// Solo verificar en watchlist si realmente hay un perfil
onMounted(() => {
  if (currentProfile.value) {
    checkIfInWatchlist()
  }
})
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
        <!-- Tipo de contenido con icono -->
        <span v-if="contentType === 'PELÍCULA'" class="badge badge-type" title="Película">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/>
          </svg>
        </span>
        
        <!-- Licencia / Demo más sutil -->
        <span v-if="!isDemoContent" class="badge badge-licensed-icon" title="Contenido Licenciado">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
          </svg>
        </span>
        
        <!-- Audio solo si es especial -->
        <span v-if="!isDemoContent && audioType && audioType !== 'SUB'" class="badge badge-audio-compact">
          {{ audioType }}
        </span>
      </div>
      
      <!-- Botón de guardar -->
      <button 
        class="save-button" 
        :class="{ saved: isSaved }"
        @click="toggleSave"
        :title="isSaved ? 'Eliminar de Mi Lista' : 'Añadir a Mi Lista'"
      >
        <svg v-if="!isSaved" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
      
      <!-- Badge demo en esquina inferior si es contenido demo -->
      <div v-if="isDemoContent" class="demo-watermark">DEMO</div>
      
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
            <button class="btn-info" @click.stop="emitShowInfo">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
              </svg>
              Más info
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Información debajo de la imagen -->
    <div class="card-info">
      <h3 class="card-title">{{ title }}</h3>
      <p v-if="subtitle" class="card-subtitle">{{ subtitle }}</p>
    </div>
    <SaveToListModal
      :show="showSaveModal"
      :animeId="props.animeId"
      :title="props.title"
      :image="props.image"
      @close="onModalClose"
      @added="onModalAdded"
    />
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
  display: flex;
  align-items: center;
  gap: 4px;
}

.badge-type {
  background: rgba(59, 130, 246, 0.95);
  color: #fff;
  padding: 5px 6px;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-licensed-icon {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  padding: 5px 6px;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
  animation: pulse-licensed 2s ease-in-out infinite;
}

.badge-audio-compact {
  background: rgba(0, 0, 0, 0.9);
  color: #fff;
  border: 1px solid rgba(16, 185, 129, 0.6);
  padding: 3px 6px;
  font-size: 9px;
}

.demo-watermark {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  color: rgba(251, 191, 36, 0.9);
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
  border: 1px solid rgba(251, 191, 36, 0.3);
  z-index: 2;
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

.badge-licensed {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
  animation: pulse-licensed 2s ease-in-out infinite;
}

.badge-demo {
  background: rgba(251, 191, 36, 0.9);
  color: #000;
  border: 1px solid rgba(245, 158, 11, 0.8);
}

.badge-content-type {
  background: rgba(59, 130, 246, 0.9);
  color: #fff;
  border: 1px solid rgba(37, 99, 235, 0.8);
}

@keyframes pulse-licensed {
  0%, 100% {
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
  }
  50% {
    box-shadow: 0 2px 12px rgba(16, 185, 129, 0.6);
  }
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

.btn-info {
  margin-left: 8px;
  background: rgba(0,0,0,0.6);
  color: #fff;
  border: none;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-info svg { display: block; }

/* Botón de guardar */
.save-button {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 36px;
  height: 36px;
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  transition: all 0.3s ease;
  z-index: 5;
  backdrop-filter: blur(8px);
}

.save-button:hover {
  background: rgba(0, 0, 0, 0.85);
  border-color: #9333ea;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(147, 51, 234, 0.5);
}

.save-button.saved {
  background: linear-gradient(135deg, #9333ea 0%, #a855f7 100%);
  border-color: #9333ea;
}

.save-button.saved:hover {
  background: linear-gradient(135deg, #7e22ce 0%, #9333ea 100%);
  border-color: #7e22ce;
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
