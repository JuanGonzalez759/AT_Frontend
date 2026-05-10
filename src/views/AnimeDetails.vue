<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useProfile } from '../composables/useProfile'

const router = useRouter()
const route = useRoute()
const { currentUser, logout, loadCurrentUser, authenticatedFetch } = useAuth()
const { currentProfile, loadProfile } = useProfile()

const animeId = ref(route.params.id)
const anime = ref(null)
const episodes = ref([])
const isLoading = ref(true)
const isSaved = ref(false)
const mobileMenuOpen = ref(false)

onMounted(async () => {
  await loadCurrentUser()
  await loadProfile()
  await loadAnimeDetails()
  await loadEpisodes()
  await checkIfSaved()
})

async function loadAnimeDetails() {
  try {
    const response = await authenticatedFetch(`/api/backoffice/animes/${animeId.value}/public/`)
    if (response.ok) {
      anime.value = await response.json()
    }
  } catch (error) {
    console.error('Error loading anime:', error)
  }
}

async function loadEpisodes() {
  try {
    const response = await authenticatedFetch(`/api/backoffice/episodes/?anime=${animeId.value}`)
    if (response.ok) {
      const data = await response.json()
      episodes.value = data.sort((a, b) => a.episode_number - b.episode_number)
    }
  } catch (error) {
    console.error('Error loading episodes:', error)
  } finally {
    isLoading.value = false
  }
}

async function checkIfSaved() {
  try {
    const response = await authenticatedFetch('/api/manager/watchlist/')
    if (response.ok) {
      const data = await response.json()
      isSaved.value = data.some(item => item.anime.id === parseInt(animeId.value))
    }
  } catch (error) {
    console.error('Error checking watchlist:', error)
  }
}

async function toggleSave() {
  try {
    if (isSaved.value) {
      // Remove from watchlist
      const response = await authenticatedFetch('/api/manager/watchlist/', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anime_id: parseInt(animeId.value) })
      })
      if (response.ok) {
        isSaved.value = false
      }
    } else {
      // Add to watchlist
      const response = await authenticatedFetch('/api/manager/watchlist/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anime_id: parseInt(animeId.value) })
      })
      if (response.ok) {
        isSaved.value = true
      }
    }
  } catch (error) {
    console.error('Error toggling watchlist:', error)
  }
}

function playEpisode(episodeNumber) {
  router.push(`/watch?anime=${animeId.value}&episode=${episodeNumber}`)
}

function playNextEpisode() {
  if (episodes.value.length > 0) {
    playEpisode(episodes.value[0].episode_number)
  }
}

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

function handleLogout() {
  logout()
  router.push('/login')
}

const genresList = computed(() => {
  if (!anime.value?.genre) return []
  return anime.value.genre.split(',').map(g => g.trim())
})
</script>

<template>
  <div class="anime-details-page">
    <!-- Header -->
    <header class="header">
      <div class="header-content">
        <div class="header-left">
          <img src="/Logo_AniToki.png" alt="AniToki" class="logo" @click="router.push('/home')" />
          <nav class="nav-links">
            <a @click="router.push('/categories')" class="nav-link" style="cursor: pointer;">Explorar</a>
            <a @click="router.push('/analytics')" class="nav-link" style="cursor: pointer;">Analytics</a>
          </nav>
        </div>
        <div class="header-right">
          <!-- Hamburger menu button (mobile) -->
          <button class="btn-hamburger" @click="toggleMobileMenu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <button class="btn-search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </button>
          
          <button 
            v-if="currentUser?.username === 'admin'" 
            @click="router.push('/backoffice')" 
            class="btn-admin"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            Gestión
          </button>
          
          <button class="btn-watchlist" @click="router.push('/my-list')">Mi Lista</button>
          
          <div v-if="currentUser" class="user-controls">
            <button @click="router.push('/manager/profiles')" class="btn-profile">
              <span>{{ currentUser.username.charAt(0).toUpperCase() }}</span>
            </button>
            <button class="btn-logout" @click="handleLogout">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile Navigation Menu -->
      <div class="mobile-menu" :class="{ open: mobileMenuOpen }">
        <div class="mobile-menu-header">
          <img src="/Logo_AniToki.png" alt="AniToki" class="logo" />
          <button class="btn-close" @click="toggleMobileMenu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <nav class="mobile-nav-links">
          <a @click="router.push('/categories'); toggleMobileMenu()" class="mobile-nav-link">Explorar</a>
          <a @click="router.push('/analytics'); toggleMobileMenu()" class="mobile-nav-link">Analytics</a>
          <a @click="router.push('/my-list'); toggleMobileMenu()" class="mobile-nav-link">Mi Lista</a>
          <a v-if="currentUser?.username === 'admin'" @click="router.push('/backoffice'); toggleMobileMenu()" class="mobile-nav-link">Gestión</a>
        </nav>
        <div class="mobile-menu-footer">
          <button v-if="currentUser" @click="handleLogout; toggleMobileMenu()" class="btn-logout-mobile">
            Cerrar Sesión
          </button>
        </div>
      </div>
      <div v-if="mobileMenuOpen" class="mobile-menu-overlay" @click="toggleMobileMenu"></div>
    </header>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
    </div>

    <!-- Anime Content -->
    <main v-else-if="anime" class="main-content">
      <!-- Hero Section -->
      <div class="hero-section" :style="{ backgroundImage: `url(${anime.background_image || anime.cover_image})` }">
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <div class="hero-info">
            <img :src="anime.cover_image" :alt="anime.title" class="hero-poster" />
            <div class="hero-details">
              <h1 class="hero-title">{{ anime.title }}</h1>
              <div class="hero-meta">
                <span class="meta-item">{{ anime.year }}</span>
                <span class="meta-divider">•</span>
                <span class="meta-item">⭐ {{ anime.rating }}/10</span>
                <span class="meta-divider">•</span>
                <span class="meta-item">{{ anime.audio_type || 'SUB' }}</span>
                <span class="meta-divider">•</span>
                <span class="meta-item">{{ episodes.length }} episodios</span>
              </div>
              <div class="hero-genres">
                <span v-for="genre in genresList" :key="genre" class="genre-tag">{{ genre }}</span>
              </div>
              <p class="hero-description">{{ anime.description }}</p>
              <div class="hero-actions">
                <button class="btn-play" @click="playNextEpisode" v-if="episodes.length > 0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  SIGUIENTE E{{ episodes[0]?.episode_number }}
                </button>
                <button class="btn-save" @click="toggleSave">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path v-if="!isSaved" d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    <path v-else d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" fill="currentColor"></path>
                  </svg>
                  {{ isSaved ? 'GUARDADO' : 'GUARDAR' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Episodes Section -->
      <section class="episodes-section">
        <div class="container">
          <h2 class="section-title">Episodios ({{ episodes.length }})</h2>
          
          <div v-if="episodes.length === 0" class="no-episodes">
            <p>No hay episodios disponibles para este anime.</p>
          </div>

          <div v-else class="episodes-grid">
            <div 
              v-for="episode in episodes" 
              :key="episode.id"
              class="episode-card"
              @click="playEpisode(episode.episode_number)"
            >
              <div class="episode-thumbnail">
                <img :src="episode.thumbnail || anime.cover_image" :alt="episode.title" />
                <div class="play-overlay">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </div>
                <div class="episode-number-badge">{{ episode.episode_number }}</div>
              </div>
              <div class="episode-info">
                <h3 class="episode-title">E{{ episode.episode_number }} - {{ episode.title || `Episodio ${episode.episode_number}` }}</h3>
                <p class="episode-meta">{{ anime.audio_type || 'SUB' }} • {{ episode.duration || '24' }}m</p>
                <p class="episode-description" v-if="episode.description">{{ episode.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-content">
        <p>&copy; 2026 AniToki. Todos los derechos reservados.</p>
        <div class="footer-links">
          <a href="#">Términos</a>
          <a href="#">Privacidad</a>
          <a href="#">Contacto</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
:root {
  --color-primary: #9333ea;
  --color-primary-dark: #7c3aed;
  --color-primary-light: #a855f7;
  --color-text-primary: rgba(255, 255, 255, 0.9);
  --color-text-secondary: rgba(255, 255, 255, 0.6);
  --bg-primary: #0a0a0a;
  --bg-secondary: #1a1a1a;
}

.anime-details-page {
  background-color: var(--bg-primary);
  color: #fff;
  min-height: 100vh;
}

/* ===== HEADER ===== */
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(10, 10, 10, 0.98);
  backdrop-filter: blur(12px);
  z-index: 1000;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem 2.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 3rem;
}

.logo {
  height: 45px;
  width: auto;
  object-fit: contain;
  cursor: pointer;
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-link {
  color: var(--color-text-primary);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  transition: color 0.2s ease;
  position: relative;
}

.nav-link:hover {
  color: var(--color-primary-light);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn-search {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--color-text-primary);
  padding: 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-search:hover {
  background: rgba(147, 51, 234, 0.1);
  border-color: var(--color-primary);
}

.btn-watchlist {
  background: transparent;
  border: 1.5px solid var(--color-primary);
  color: var(--color-primary);
  padding: 0.6rem 1.5rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-watchlist:hover {
  background: var(--color-primary);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(147, 51, 234, 0.3);
}

.btn-admin {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: none;
  color: #fff;
  padding: 0.6rem 1.5rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.btn-admin:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
}

.user-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-profile {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: #fff;
  padding: 0;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.btn-profile:hover {
  transform: scale(1.1);
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 4px 12px rgba(147, 51, 234, 0.5);
}

.btn-logout {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--color-text-primary);
  padding: 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
}

.btn-logout:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: #ef4444;
  color: #ef4444;
}

.btn-hamburger {
  display: none;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  transition: all 0.2s ease;
}

.btn-hamburger:hover {
  color: var(--color-primary-light);
}

/* Mobile Menu */
.mobile-menu {
  position: fixed;
  top: 0;
  right: -100%;
  width: 300px;
  height: 100vh;
  background: rgba(10, 10, 10, 0.98);
  backdrop-filter: blur(20px);
  z-index: 1001;
  transition: right 0.4s ease;
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.mobile-menu.open {
  right: 0;
}

.mobile-menu-header {
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.mobile-menu-header .logo {
  height: 35px;
}

.btn-close {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  transition: all 0.2s ease;
}

.btn-close:hover {
  color: #ef4444;
}

.mobile-nav-links {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1rem 0;
}

.mobile-nav-link {
  color: var(--color-text-primary);
  text-decoration: none;
  padding: 1rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
  cursor: pointer;
}

.mobile-nav-link:hover {
  background: rgba(255, 255, 255, 0.05);
  border-left-color: var(--color-primary);
  color: var(--color-primary-light);
}

.mobile-menu-footer {
  padding: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-logout-mobile {
  width: 100%;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid #ef4444;
  color: #ef4444;
  padding: 0.8rem 1.5rem;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-logout-mobile:hover {
  background: #ef4444;
  color: #fff;
}

.mobile-menu-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  cursor: pointer;
}

/* Loading */
.loading-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 72px;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(147, 51, 234, 0.2);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Main Content */
.main-content {
  padding-top: 72px;
}

/* Hero Section */
.hero-section {
  position: relative;
  min-height: 600px;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-end;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, 
    rgba(10, 10, 10, 0.4) 0%,
    rgba(10, 10, 10, 0.8) 60%,
    rgba(10, 10, 10, 1) 100%
  );
}

.hero-content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 3rem 2.5rem;
}

.hero-info {
  display: flex;
  gap: 2.5rem;
  align-items: flex-start;
}

.hero-poster {
  width: 250px;
  height: 350px;
  object-fit: cover;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
}

.hero-details {
  flex: 1;
}

.hero-title {
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 1rem;
  line-height: 1.1;
  color: #fff;
}

.hero-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  font-size: 1rem;
}

.meta-item {
  color: var(--color-text-primary);
  font-weight: 600;
}

.meta-divider {
  color: rgba(255, 255, 255, 0.3);
}

.hero-genres {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.genre-tag {
  background: rgba(147, 51, 234, 0.2);
  border: 1px solid var(--color-primary);
  color: var(--color-primary-light);
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}

.hero-description {
  font-size: 1.05rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
  margin-bottom: 2rem;
  max-width: 800px;
}

.hero-actions {
  display: flex;
  gap: 1rem;
}

.btn-play,
.btn-save {
  padding: 0.9rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.2s ease;
  border: none;
}

.btn-play {
  background: var(--color-primary);
  color: #fff;
}

.btn-play:hover {
  background: var(--color-primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(147, 51, 234, 0.4);
}

.btn-save {
  background: rgba(255, 255, 255, 0.1);
  border: 1.5px solid rgba(255, 255, 255, 0.3);
  color: #fff;
}

.btn-save:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
}

/* Episodes Section */
.episodes-section {
  padding: 3rem 0 5rem;
  background: var(--bg-primary);
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2.5rem;
}

.section-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 2rem;
  color: #fff;
}

.no-episodes {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-secondary);
}

.episodes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.episode-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.episode-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: var(--color-primary);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(147, 51, 234, 0.2);
}

.episode-thumbnail {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 Aspect Ratio */
  overflow: hidden;
}

.episode-thumbnail img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.play-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.episode-card:hover .play-overlay {
  opacity: 1;
}

.episode-number-badge {
  position: absolute;
  bottom: 0.75rem;
  right: 0.75rem;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 700;
}

.episode-info {
  padding: 1.25rem;
}

.episode-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.episode-meta {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.75rem;
}

.episode-description {
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.5);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* Footer */
.footer {
  background: #0a0a0a;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 2rem 0;
}

.footer-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: rgba(255, 255, 255, 0.5);
}

.footer-links {
  display: flex;
  gap: 2rem;
}

.footer-links a {
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  transition: color 0.2s;
}

.footer-links a:hover {
  color: var(--color-primary);
}

/* Responsive */
@media (max-width: 768px) {
  .nav-links {
    display: none;
  }

  .btn-hamburger {
    display: block;
  }

  .btn-watchlist,
  .btn-admin {
    display: none;
  }

  .header-content {
    padding: 1rem 1.5rem;
  }

  .hero-info {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .hero-poster {
    width: 200px;
    height: 280px;
  }

  .hero-title {
    font-size: 2rem;
  }

  .hero-actions {
    justify-content: center;
  }

  .episodes-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }

  .footer-content {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
