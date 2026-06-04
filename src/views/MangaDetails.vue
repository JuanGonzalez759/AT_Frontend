<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useProfile } from '../composables/useProfile'

const router = useRouter()
const route = useRoute()
const { currentUser, logout, loadCurrentUser, authenticatedFetch } = useAuth()
const { currentProfile, loadProfile } = useProfile()

const mangaId = ref(route.params.id)
const manga = ref(null)
const isLoading = ref(true)
const isSaved = ref(false)
const mobileMenuOpen = ref(false)

const descriptionExpanded = ref(false)

function toggleMobileMenu() { mobileMenuOpen.value = !mobileMenuOpen.value }

function goToAnime(animeId) { router.push(`/anime/${animeId}`) }

watch(() => currentProfile.value?.id, async (newVal, oldVal) => {
  if (newVal && oldVal && newVal !== oldVal) {
    await checkIfSaved()
  }
})

watch(() => route.params.id, async (newId) => {
  if (newId) {
    mangaId.value = newId
    isLoading.value = true
    await loadCurrentUser()
    await loadProfile()
    await loadMangaDetails()
    await checkIfSaved()
  }
})

onMounted(async () => {
  await loadCurrentUser()
  await loadProfile()
  await loadMangaDetails()
  await checkIfSaved()
})

async function loadMangaDetails() {
  try {
    const response = await authenticatedFetch(`/api/backoffice/public/mangas/${mangaId.value}/`)
    const text = await response.text()
    let data = null
    try { data = JSON.parse(text) } catch(e) { data = null }
    console.log('public/mangas response', response.status, data || text)
    if (response.ok && data) {
      manga.value = data
    } else if (data) {
      // still set for debugging
      manga.value = data
    }
  } catch (e) { console.error('Error loading manga:', e) }
  finally { isLoading.value = false }
}

async function checkIfSaved() {
  try {
    const profileId = currentProfile.value?.id
    if (!profileId) { isSaved.value = false; return }
    const response = await authenticatedFetch(`/api/manager/watchlist/?profile_id=${profileId}`)
    if (response.ok) {
      const data = await response.json()
      isSaved.value = data.some(item => item.manga?.id === parseInt(mangaId.value))
    }
  } catch (e) { console.error('Error checking watchlist:', e) }
}

async function toggleSave() {
  try {
    const profileId = currentProfile.value?.id
    if (!profileId) return
    if (isSaved.value) {
      const response = await authenticatedFetch(`/api/manager/watchlist/remove/${parseInt(mangaId.value)}/?profile_id=${profileId}&type=manga`, { method: 'DELETE' })
      if (response.ok) isSaved.value = false
    } else {
      const response = await authenticatedFetch('/api/manager/watchlist/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manga_id: parseInt(mangaId.value), profile_id: profileId })
      })
      if (response.ok) isSaved.value = true
    }
  } catch (e) { console.error('Error toggling save:', e) }
}

function handleLogout() { logout(); router.push('/login') }

const genresList = computed(() => {
  if (!manga.value?.genre) return []
  return manga.value.genre.split(',').map(g => g.trim())
})

const displayedDescription = computed(() => manga.value ? (descriptionExpanded.value ? manga.value.description : (manga.value.description?.slice(0, 280) + (manga.value.description && manga.value.description.length > 280 ? '...' : ''))) : '')

const showSeeMore = computed(() => manga.value?.description && manga.value.description.length > 280)

const heroBackgroundImage = computed(() => manga.value?.background_image || manga.value?.cover_image)

// Determine if the site actually has uploaded chapters for this manga.
// We rely on `uploaded_chapters` returned by the API (empty array if none).
const hasChapters = computed(() => {
  if (!manga.value) return false
  if (Array.isArray(manga.value.uploaded_chapters)) return manga.value.uploaded_chapters.length > 0
  // fallback: treat chapter_count as metadata only; do not assume chapters uploaded
  return false
})

const availableChaptersCount = computed(() => {
  if (!manga.value) return 0
  if (Array.isArray(manga.value.uploaded_chapters)) return manga.value.uploaded_chapters.length
  return manga.value.chapter_count || 0
})
</script>

<template>
  <div class="anime-details-page">
    <!-- Header (copied from AnimeDetails) -->
    <header class="header">
      <div class="header-content">
        <div class="header-left">
          <img src="/Logo_AniToki.png" alt="AniToki" class="logo" @click="router.push('/home')" />
          <nav class="nav-links">
            <a @click="router.push('/home')" class="nav-link" style="cursor: pointer;">Inicio</a>
            <a @click="router.push('/categories')" class="nav-link" style="cursor: pointer;">Explorar</a>
            <a @click="router.push('/analytics')" class="nav-link" style="cursor: pointer;">Analytics</a>
          </nav>
        </div>
        <div class="header-right">
          <button class="btn-hamburger" @click="toggleMobileMenu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <button v-if="currentUser?.username === 'admin'" @click="router.push('/backoffice')" class="btn-admin">Gestión</button>
          <button class="btn-watchlist" @click="router.push('/my-list')">Mi Lista</button>
          <div v-if="currentUser" class="user-controls">
            <button @click="router.push('/manager/profiles')" class="btn-profile">
              <img v-if="currentProfile?.avatar" :src="currentProfile.avatar" :alt="currentProfile.name" class="profile-avatar" />
              <span v-else>{{ currentUser.username.charAt(0).toUpperCase() }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="mobile-menu" :class="{ open: mobileMenuOpen }">
        <div class="mobile-menu-header">
          <img src="/Logo_AniToki.png" alt="AniToki" class="logo" />
          <button class="btn-close" @click="toggleMobileMenu">✕</button>
        </div>
        <nav class="mobile-nav-links">
          <a @click="router.push('/home'); toggleMobileMenu()" class="mobile-nav-link">Inicio</a>
          <a @click="router.push('/categories'); toggleMobileMenu()" class="mobile-nav-link">Explorar</a>
          <a @click="router.push('/analytics'); toggleMobileMenu()" class="mobile-nav-link">Analytics</a>
          <a @click="router.push('/my-list'); toggleMobileMenu()" class="mobile-nav-link">Mi Lista</a>
          <a v-if="currentUser?.username === 'admin'" @click="router.push('/backoffice'); toggleMobileMenu()" class="mobile-nav-link">Gestión</a>
        </nav>
        <div class="mobile-menu-footer">
          <button v-if="currentUser" @click="handleLogout(); toggleMobileMenu()" class="btn-logout-mobile">Cerrar Sesión</button>
        </div>
      </div>
      <div v-if="mobileMenuOpen" class="mobile-menu-overlay" @click="toggleMobileMenu"></div>
    </header>

    <!-- search removed -->

    <!-- Loading -->
    <div v-if="isLoading" class="loading-container"><div class="spinner"></div></div>

    <!-- Manga Content (hero copied from AnimeDetails) -->
    <main v-else-if="manga" class="main-content">
      <div class="hero-section" :style="{ backgroundImage: `url(${heroBackgroundImage})` }">
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <div class="hero-info">
            <img :src="manga.cover_image" :alt="manga.title" class="hero-poster" />
            <div class="hero-details">
              <h1 class="hero-title">{{ manga.title }}</h1>
              <div class="hero-meta">
                <span class="meta-item">{{ manga.year }}</span>
                <span class="meta-divider">•</span>
                <span class="meta-item">⭐ {{ manga.rating || 0 }}/10</span>
                <span class="meta-divider">•</span>
                <span class="meta-item">{{ availableChaptersCount }} capítulos</span>
              </div>
              <div class="hero-genres"><span v-for="genre in genresList" :key="genre" class="genre-tag">{{ genre }}</span></div>
              <p :class="['hero-description', { 'expanded': descriptionExpanded }]">{{ displayedDescription }}</p>
              <button v-if="showSeeMore" class="btn-see-more" @click="descriptionExpanded = !descriptionExpanded">{{ descriptionExpanded ? 'Ver menos' : 'Ver más' }}</button>
              <div class="hero-actions">
                <button class="btn-save" @click="toggleSave">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path v-if="!isSaved" d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    <path v-else d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" fill="currentColor"></path>
                  </svg>
                  {{ isSaved ? 'GUARDADO' : 'GUARDAR' }}
                </button>
                <button v-if="hasChapters" class="btn-read" @click="() => router.push(`/manga/${mangaId}/read/1`)" style="margin-left:12px;padding:0.9rem 1.2rem;border-radius:8px;background:var(--color-primary);border:none;color:#fff">LEER</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- description section removed per request -->
      <!-- Chapters -->
      <section class="chapters-section" style="padding:2rem">
        <div v-if="!hasChapters" class="no-chapters">
          <h3>Todavía no hay capítulos disponibles</h3>
          <p>Estamos trabajando para subir los capítulos de este manga. Vuelve más tarde.</p>
        </div>
          <div v-else>
          <!-- Aquí iría la lista de capítulos cuando existan -->
          <p>Capítulos disponibles: {{ availableChaptersCount }}</p>
        </div>
      </section>
    </main>

    <footer class="footer"><div class="footer-content"><p>&copy; 2026 AniToki. Todos los derechos reservados.</p></div></footer>
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

.anime-details-page { background-color: var(--bg-primary); color: #fff; min-height: 100vh; display: flex; flex-direction: column; }

/* Header (copied from AnimeDetails) */
.header { position: fixed; top: 0; left: 0; right: 0; background: rgba(10,10,10,0.98); backdrop-filter: blur(12px); z-index:1000; border-bottom:1px solid rgba(255,255,255,0.08); }
.header-content { max-width:1400px; margin:0 auto; padding:1rem 2.5rem; display:flex; justify-content:space-between; align-items:center }
.header-left { display:flex; align-items:center; gap:3rem }
.logo { height:45px; cursor:pointer }
.nav-links { display:flex; gap:2rem }
.nav-link { color: rgba(255,255,255,0.7); text-decoration:none; font-size:0.95rem }
.header-right { display:flex; align-items:center; gap:1rem }
.btn-search, .btn-admin, .btn-watchlist { background: rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:0.6rem 1rem; border-radius:8px }
.user-controls { display:flex; align-items:center; gap:0.75rem }
.btn-profile { background: linear-gradient(135deg,var(--color-primary),var(--color-primary-dark)); color:#fff; width:40px; height:40px; border-radius:50%; }
.btn-logout { background:transparent; border:1px solid rgba(255,255,255,0.2); color:var(--color-text-primary); padding:0.6rem; border-radius:6px }

/* Mobile menu */
.mobile-menu { position: fixed; top: 0; right: -100%; width: 300px; height: 100vh; background: var(--bg-primary); transition: right 0.25s ease; z-index:1100 }
.mobile-menu.open { right: 0 }
.mobile-menu-header { display:flex; justify-content:space-between; align-items:center; padding:1rem }
.mobile-nav-links { display:flex; flex-direction:column; padding:1rem }
.mobile-nav-link { padding:0.75rem 0 }
.mobile-menu-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index:1050 }

/* Search removed */
/* Hero (copied) */
.main-content { padding-top: 72px; flex: 1 0 auto; }
.footer { flex-shrink: 0 }
.hero-section { position: relative; min-height: 420px; background-size: cover; background-position: center; display:flex; align-items:flex-end }
.hero-overlay { position:absolute; inset:0; background: linear-gradient(to bottom, rgba(10,10,10,0.2) 0%, rgba(10,10,10,0.6) 60%, rgba(10,10,10,0.9) 100%) }
.hero-content { position:relative; z-index:1; width:100%; max-width:1400px; margin:0 auto; padding:3rem 2.5rem }
.hero-info { display:flex; gap:3rem; align-items:center }
.hero-poster { width:220px; height:320px; object-fit:cover; border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.6); flex-shrink:0 }
.hero-details { flex:1 }
.hero-title { font-size:3rem; font-weight:800; margin-bottom:1rem; color:#fff }
.hero-meta { display:flex; align-items:center; gap:0.75rem; margin-bottom:1rem }
.genre-tag { background: rgba(147,51,234,0.2); border:1px solid var(--color-primary); color:var(--color-primary-light); padding:0.4rem 1rem; border-radius:20px }
.hero-description { font-size:1rem; line-height:1.6; color:var(--color-text-secondary); margin-bottom:1.5rem; max-width:750px }
.btn-see-more { background:transparent; border:none; color:var(--color-primary); cursor:pointer }
.hero-actions { display:flex; gap:1rem }
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
  background: rgba(255, 255, 255, 0.15);
  border: 1.5px solid rgba(255, 255, 255, 0.4);
  color: #fff;
}
.btn-save:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.6);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.15);
}

.description-section { padding:2.5rem }
.btn-back { background: transparent; border:1px solid rgba(255,255,255,0.08); padding:8px 12px; border-radius:8px; color:#fff }
.chapters-section { max-width:1400px; margin: 0 auto; color: var(--color-text-secondary) }
.no-chapters { background: rgba(255,255,255,0.03); border:1px dashed rgba(255,255,255,0.06); padding:18px; border-radius:8px; color: #fff }
.no-chapters h3 { margin:0 0 6px 0 }
/* Footer (match AnimeDetails) */
.footer { background: #0a0a0a; border-top: 1px solid rgba(255, 255, 255, 0.1); padding: 2rem 0; }
.footer-content { max-width: 1400px; margin: 0 auto; padding: 0 2.5rem; display: flex; justify-content: space-between; align-items: center; color: rgba(255,255,255,0.5); }
</style>
