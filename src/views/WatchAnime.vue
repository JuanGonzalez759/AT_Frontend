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
const showAllEpisodes = ref(false)
const showFullDescription = ref(false)

// Estado de interacciones
const liked = ref(false)
const disliked = ref(false)
const saved = ref(false)
const likeCount = ref(23)
const dislikeCount = ref(8)

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
      
      // Si hay episodio en URL, seleccionarlo, sino el primero
      if (episodeId.value) {
        const ep = episodes.value.find(e => e.id === parseInt(episodeId.value))
        if (ep) currentEpisode.value = ep
      } else if (episodes.value.length > 0) {
        currentEpisode.value = episodes.value[0]
      }
    }
  } catch (error) {
    console.error('Error loading episodes:', error)
  } finally {
    isLoading.value = false
  }
}

function selectEpisode(episode) {
  currentEpisode.value = episode
  router.replace({ 
    query: { 
      anime: animeId.value, 
      episode: episode.id 
    } 
  })
}

const nextEpisode = computed(() => {
  if (!currentEpisode.value || episodes.value.length === 0) return null
  const currentIndex = episodes.value.findIndex(ep => ep.id === currentEpisode.value.id)
  if (currentIndex < episodes.value.length - 1) {
    return episodes.value[currentIndex + 1]
  }
  return null
})

function goToNextEpisode() {
  if (nextEpisode.value) {
    selectEpisode(nextEpisode.value)
  }
}

function toggleLike() {
  if (liked.value) {
    liked.value = false
    likeCount.value--
  } else {
    liked.value = true
    likeCount.value++
    if (disliked.value) {
      disliked.value = false
      dislikeCount.value--
    }
  }
}

function toggleDislike() {
  if (disliked.value) {
    disliked.value = false
    dislikeCount.value--
  } else {
    disliked.value = true
    dislikeCount.value++
    if (liked.value) {
      liked.value = false
      likeCount.value--
    }
  }
}

function toggleSave() {
  saved.value = !saved.value
}

function shareEpisode() {
  // Copiar URL al portapapeles
  const url = window.location.href
  navigator.clipboard.writeText(url)
  alert('Enlace copiado al portapapeles')
}

function goHome() {
  router.push('/home')
}
</script>

<template>
  <div class="watch-page">
    <!-- Video Player -->
    <div class="player-container">
      <div class="player-wrapper" v-if="currentEpisode">
        <iframe 
          :src="currentEpisode.video_url" 
          frameborder="0" 
          allowfullscreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        ></iframe>
      </div>
      <div v-else class="player-placeholder">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <p>Selecciona un episodio para reproducir</p>
      </div>
    </div>

    <!-- Content Section -->
    <div class="content-wrapper">
      <!-- Main Content -->
      <div class="main-content">
        <!-- Episode Info -->
        <div class="episode-header" v-if="currentEpisode">
          <div class="black-diver">
            <span>Black Diver</span>
          </div>
          <h1 class="episode-title">
            E{{ currentEpisode.episode_number }} - {{ currentEpisode.title || 'Asta y Yuno' }}
          </h1>
          <div class="episode-meta">
            <span>T1 E{{ currentEpisode.episode_number }}</span>
            <span class="divider">|</span>
            <span>Sub</span>
            <span class="divider">|</span>
            <span>Vdo</span>
          </div>
          <div class="release-date">
            Lanzado el 3 mar 2026
          </div>
        </div>

        <!-- Interaction Buttons -->
        <div class="interaction-buttons">
          <button 
            class="btn-interaction" 
            :class="{ active: liked }"
            @click="toggleLike"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
            </svg>
            <span>{{ likeCount }}</span>
          </button>
          
          <button 
            class="btn-interaction" 
            :class="{ active: disliked }"
            @click="toggleDislike"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transform: rotate(180deg)">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
            </svg>
            <span>{{ dislikeCount }}</span>
          </button>

          <button class="btn-interaction" @click="shareEpisode">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
          </button>

          <button 
            class="btn-interaction" 
            :class="{ active: saved }"
            @click="toggleSave"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>
        </div>

        <!-- Description -->
        <div class="description-section" v-if="currentEpisode">
          <p :class="{ expanded: showFullDescription }">
            {{ currentEpisode.description || 'Dos huérfanos son abandonados en la parroquia una iglesia, y tras varios años, ambos son jóvenes seguridores, Yuno es un joven de mago natural talento que aspira a ser Rey Mago. Asta es lo supera carece de aptitud mágica alguna y depende solo de su fuerza, pero tiene el mismo objetivo que su amigo ser Rey Mago. Asta confía en que le entrega de su grimorio mágico le permitirá...' }}
          </p>
          <button class="btn-show-more" @click="showFullDescription = !showFullDescription">
            {{ showFullDescription ? 'VER MENOS -' : 'VER MÁS +' }}
          </button>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="sidebar">
        <!-- Next Episode Card -->
        <div class="next-episode-card" v-if="nextEpisode">
          <div class="next-episode-label">SIGUIENTE EPISODIO</div>
          <div class="next-episode-thumbnail" @click="goToNextEpisode">
            <img 
              :src="nextEpisode.thumbnail || anime?.cover_image" 
              :alt="nextEpisode.title"
            />
            <div class="play-overlay">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
          </div>
          <div class="next-episode-info">
            <div class="next-episode-title">
              E{{ nextEpisode.episode_number }} - {{ nextEpisode.title || 'El juramento del muchacho' }}
            </div>
            <div class="next-episode-meta">
              Dob | Sub
            </div>
            <div class="next-episode-duration">
              12m
            </div>
          </div>
        </div>

        <!-- View More Episodes Button -->
        <button class="btn-view-episodes" @click="showAllEpisodes = true">
          VER MÁS EPISODIOS
        </button>
      </div>
    </div>

    <!-- Episodes Modal -->
    <div class="episodes-modal" v-if="showAllEpisodes">
      <div class="modal-overlay" @click="showAllEpisodes = false"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>Episodios - {{ anime?.title }}</h2>
          <button class="btn-close" @click="showAllEpisodes = false">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-episodes-list">
          <div 
            v-for="episode in episodes" 
            :key="episode.id"
            class="episode-item"
            :class="{ active: currentEpisode?.id === episode.id }"
            @click="selectEpisode(episode); showAllEpisodes = false"
          >
            <div class="episode-item-thumbnail">
              <img :src="episode.thumbnail || anime?.cover_image" :alt="episode.title" />
              <div class="episode-item-number">{{ episode.episode_number }}</div>
            </div>
            <div class="episode-item-info">
              <div class="episode-item-title">{{ episode.title || `Episodio ${episode.episode_number}` }}</div>
              <div class="episode-item-meta">{{ episode.duration || '24' }}m</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-logo" @click="goHome">
          <img src="/Logo_AniToki.png" alt="AniToki" class="logo-image" />
        </div>

        <div class="footer-section">
          <h3>Explorar</h3>
          <ul>
            <li @click="goHome">Explorar la más popular</li>
            <li>Novedades</li>
          </ul>
        </div>

        <div class="footer-section">
          <h3>Recursos</h3>
          <ul>
            <li>Socios</li>
            <li>Centro de ayuda</li>
          </ul>
        </div>

        <div class="footer-section">
          <h3>Cuenta</h3>
          <ul>
            <li>Nueva Premium</li>
            <li @click="router.push('/choose-profile')">Cambiar perfil</li>
            <li>Favoritos</li>
            <li>Tareas</li>
            <li>Historial</li>
            <li>Mi Cuenta</li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <button class="language-selector">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          Español (España)
        </button>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.watch-page {
  min-height: 100vh;
  background: #000;
  color: #fff;
}

/* Video Player */
.player-container {
  position: relative;
  width: 100%;
  background: #000;
}

.player-wrapper {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 */
  height: 0;
  overflow: hidden;
}

.player-wrapper iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.player-placeholder {
  padding-bottom: 56.25%;
  background: #0a0a0a;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.4);
}

/* Content Wrapper */
.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem 2.5rem;
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 3rem;
}

/* Main Content */
.main-content {
  color: #fff;
}

.episode-header {
  margin-bottom: 1.5rem;
}

.black-diver {
  margin-bottom: 0.5rem;
}

.black-diver span {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  font-weight: 500;
}

.episode-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 0.75rem 0;
  color: #fff;
}

.episode-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 0.5rem;
}

.episode-meta .divider {
  color: rgba(255, 255, 255, 0.3);
}

.release-date {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.5);
}

/* Interaction Buttons */
.interaction-buttons {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-interaction {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  padding: 0.65rem 1.25rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.95rem;
}

.btn-interaction:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
}

.btn-interaction.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.btn-interaction svg {
  flex-shrink: 0;
}

/* Description */
.description-section {
  margin-bottom: 2rem;
}

.description-section p {
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.65;
  margin: 0 0 0.75rem 0;
  font-size: 0.95rem;
}

.description-section p:not(.expanded) {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.btn-show-more {
  background: none;
  border: none;
  color: var(--color-primary-light);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;
}

.btn-show-more:hover {
  color: var(--color-primary);
}

/* Sidebar */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.next-episode-card {
  background: rgba(20, 20, 20, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1.25rem;
}

.next-episode-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 1rem;
}

.next-episode-thumbnail {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 1rem;
  cursor: pointer;
}

.next-episode-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.next-episode-thumbnail:hover img {
  transform: scale(1.05);
}

.play-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.next-episode-thumbnail:hover .play-overlay {
  opacity: 1;
}

.next-episode-info {
  color: #fff;
}

.next-episode-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.next-episode-meta {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.25rem;
}

.next-episode-duration {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
}

.btn-view-episodes {
  width: 100%;
  background: transparent;
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 0.875rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-view-episodes:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.3);
}

/* Episodes Modal */
.episodes-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
}

.modal-content {
  position: relative;
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  width: 90%;
  max-width: 900px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.btn-close {
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background 0.2s;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.1);
}

.modal-episodes-list {
  padding: 1.5rem 2rem;
  overflow-y: auto;
  display: grid;
  gap: 1rem;
}

.episode-item {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.episode-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.15);
}

.episode-item.active {
  background: rgba(147, 51, 234, 0.15);
  border-color: var(--color-primary);
}

.episode-item-thumbnail {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: 6px;
  overflow: hidden;
}

.episode-item-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.episode-item-number {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.episode-item-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.episode-item-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.episode-item-meta {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
}

/* Footer */
.footer {
  background: #0a0a0a;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 3rem 2.5rem 2rem;
  margin-top: 4rem;
}

.footer-content {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.5fr repeat(3, 1fr);
  gap: 3rem;
  margin-bottom: 2rem;
}

.footer-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

.footer-logo .logo-image {
  height: 50px;
  width: auto;
  object-fit: contain;
}

.footer-section h3 {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: rgba(255, 255, 255, 0.9);
}

.footer-section ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-section li {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: color 0.2s;
}

.footer-section li:hover {
  color: rgba(255, 255, 255, 0.9);
}

.footer-bottom {
  max-width: 1400px;
  margin: 0 auto;
  padding-top: 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.language-selector {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  padding: 0.65rem 1.25rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.language-selector:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

/* Responsive */
@media (max-width: 1024px) {
  .content-wrapper {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .sidebar {
    order: -1;
  }

  .footer-content {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .content-wrapper {
    padding: 1.5rem;
  }

  .episode-title {
    font-size: 1.25rem;
  }

  .interaction-buttons {
    flex-wrap: wrap;
  }

  .footer-content {
    grid-template-columns: 1fr;
  }
}
</style>
