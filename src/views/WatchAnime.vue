<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const route = useRoute()
const { currentUser, logout, loadCurrentUser } = useAuth()

const animeId = ref(route.query.anime)
const episodeId = ref(route.query.episode)

const anime = ref(null)
const episodes = ref([])
const currentEpisode = ref(null)
const isLoading = ref(true)

async function handleLogout() {
  try {
    await logout()
    router.push('/login')
  } catch (error) {
    console.error('Error al cerrar sesión:', error)
  }
}

onMounted(async () => {
  const user = await loadCurrentUser()
  if (!user) {
    router.push('/login')
  }
  await loadAnime()
  await loadEpisodes()
  if (episodeId.value) {
    selectEpisode(parseInt(episodeId.value))
  }
})

async function loadAnime() {
  if (!animeId.value) return
  
  try {
    const response = await fetch(`/api/backoffice/public/animes/${animeId.value}/`, {
      credentials: 'include'
    })
    if (response.ok) {
      anime.value = await response.json()
    }
  } catch (error) {
    console.error('Error loading anime:', error)
  }
}

async function loadEpisodes() {
  if (!animeId.value) return
  
  isLoading.value = true
  try {
    const response = await fetch(`/api/backoffice/episodes/?anime_id=${animeId.value}`, {
      credentials: 'include'
    })
    if (response.ok) {
      const data = await response.json()
      episodes.value = data.results || data
      
      // Si no hay episodio seleccionado, seleccionar el primero
      if (!currentEpisode.value && episodes.value.length > 0) {
        selectEpisode(episodes.value[0].id)
      }
    }
  } catch (error) {
    console.error('Error loading episodes:', error)
  } finally {
    isLoading.value = false
  }
}

function selectEpisode(id) {
  const episode = episodes.value.find(ep => ep.id === id)
  if (episode) {
    currentEpisode.value = episode
    // Actualizar URL sin recargar la página
    router.replace({ 
      query: { 
        anime: animeId.value, 
        episode: id 
      } 
    })
  }
}

function nextEpisode() {
  const currentIndex = episodes.value.findIndex(ep => ep.id === currentEpisode.value.id)
  if (currentIndex < episodes.value.length - 1) {
    selectEpisode(episodes.value[currentIndex + 1].id)
  }
}

function previousEpisode() {
  const currentIndex = episodes.value.findIndex(ep => ep.id === currentEpisode.value.id)
  if (currentIndex > 0) {
    selectEpisode(episodes.value[currentIndex - 1].id)
  }
}

const hasNextEpisode = computed(() => {
  if (!currentEpisode.value || episodes.value.length === 0) return false
  const currentIndex = episodes.value.findIndex(ep => ep.id === currentEpisode.value.id)
  return currentIndex < episodes.value.length - 1
})

const hasPreviousEpisode = computed(() => {
  if (!currentEpisode.value || episodes.value.length === 0) return false
  const currentIndex = episodes.value.findIndex(ep => ep.id === currentEpisode.value.id)
  return currentIndex > 0
})

function goBack() {
  router.push('/home')
}
</script>

<template>
  <div class="watch-container">
    <!-- Header -->
    <header class="header">
      <div class="header-left">
        <button class="btn-back" @click="goBack">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"></path>
          </svg>
          Volver
        </button>
        <h1 class="title" v-if="anime">{{ anime.title }}</h1>
      </div>
      <div class="header-right">
        <button 
          v-if="currentUser?.username === 'admin'" 
          @click="router.push('/backoffice')" 
          class="btn-admin"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          Gestión
        </button>
        <button class="btn-logout" @click="handleLogout">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </header>

    <!-- Video Player -->
    <div class="player-section" v-if="currentEpisode">
      <div class="player-wrapper">
        <iframe 
          :src="currentEpisode.video_url" 
          frameborder="0" 
          allowfullscreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        ></iframe>
      </div>
      
      <div class="episode-info-bar">
        <div class="episode-details">
          <h2>Episodio {{ currentEpisode.episode_number }}: {{ currentEpisode.title }}</h2>
          <p v-if="currentEpisode.description">{{ currentEpisode.description }}</p>
        </div>
        <div class="episode-controls">
          <button 
            class="btn-nav" 
            @click="previousEpisode" 
            :disabled="!hasPreviousEpisode"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="19 20 9 12 19 4 19 20"></polygon>
              <line x1="5" y1="19" x2="5" y2="5"></line>
            </svg>
            Anterior
          </button>
          <button 
            class="btn-nav" 
            @click="nextEpisode" 
            :disabled="!hasNextEpisode"
          >
            Siguiente
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 4 15 12 5 20 5 4"></polygon>
              <line x1="19" y1="5" x2="19" y2="19"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Episodes List -->
    <div class="episodes-section">
      <h3>Episodios</h3>
      
      <div v-if="isLoading" class="loading">Cargando episodios...</div>
      
      <div v-else-if="episodes.length === 0" class="empty-state">
        <p>No hay episodios disponibles</p>
      </div>

      <div v-else class="episodes-grid">
        <div 
          v-for="episode in episodes" 
          :key="episode.id" 
          class="episode-card"
          :class="{ active: currentEpisode && currentEpisode.id === episode.id }"
          @click="selectEpisode(episode.id)"
        >
          <div class="episode-thumbnail">
            <img 
              v-if="episode.thumbnail" 
              :src="episode.thumbnail" 
              :alt="episode.title"
            />
            <div v-else class="placeholder">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
            <div class="episode-number">{{ episode.episode_number }}</div>
            <div v-if="currentEpisode && currentEpisode.id === episode.id" class="playing-indicator">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Reproduciendo
            </div>
          </div>
          <div class="episode-details">
            <h4>{{ episode.title }}</h4>
            <p class="duration">{{ episode.duration }} min</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.watch-container {
  min-height: 100vh;
  background: linear-gradient(to bottom, #0a0a0a, #1a1a1a);
  color: #fff;
}

.header {
  background: rgba(20, 20, 20, 0.95);
  padding: 1rem 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn-back {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.15);
}

.btn-admin {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: none;
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.btn-admin:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.btn-logout {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.btn-logout:hover {
  background: rgba(255, 77, 77, 0.2);
  border-color: #ff4d4d;
}

.btn-logout span {
  display: inline;
}

.title {
  font-size: 1.5rem;
  margin: 0;
}

.player-section {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.player-wrapper {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  height: 0;
  overflow: hidden;
  border-radius: 12px;
  background: #000;
  margin-bottom: 1.5rem;
}

.player-wrapper iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.episode-info-bar {
  background: rgba(30, 30, 30, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.episode-details h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
}

.episode-details p {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
}

.episode-controls {
  display: flex;
  gap: 1rem;
}

.btn-nav {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-nav:hover:not(:disabled) {
  transform: translateY(-2px);
}

.btn-nav:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.episodes-section {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.episodes-section h3 {
  font-size: 1.5rem;
  margin: 0 0 1.5rem 0;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.6);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: rgba(255, 255, 255, 0.6);
}

.episodes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.episode-card {
  background: rgba(30, 30, 30, 0.6);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
}

.episode-card:hover {
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-4px);
}

.episode-card.active {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

.episode-thumbnail {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%;
  background: rgba(255, 255, 255, 0.05);
}

.episode-thumbnail img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.3);
}

.episode-number {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  background: rgba(0, 0, 0, 0.8);
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 600;
}

.playing-indicator {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  background: #667eea;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.episode-card .episode-details {
  padding: 1rem;
}

.episode-card .episode-details h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.duration {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.875rem;
}
</style>
