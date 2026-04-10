<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import AnimeCard from '../components/AnimeCard.vue'

const router = useRouter()
const { currentUser, logout, loadCurrentUser } = useAuth()

// Hero carousel data - cargado desde el backend
const featuredAnimes = ref([])
const currentSlide = ref(0)
let autoplayInterval = null

function nextSlide() {
  currentSlide.value = (currentSlide.value + 1) % featuredAnimes.value.length
}

function prevSlide() {
  currentSlide.value = (currentSlide.value - 1 + featuredAnimes.value.length) % featuredAnimes.value.length
}

function goToSlide(index) {
  currentSlide.value = index
}

function startAutoplay() {
  autoplayInterval = setInterval(nextSlide, 5000)
}

function stopAutoplay() {
  if (autoplayInterval) {
    clearInterval(autoplayInterval)
    autoplayInterval = null
  }
}

// Datos de animes desde la API
const continueWatching = ref([])
const popularNow = ref([])
const newReleases = ref([])

async function loadAnimes() {
  try {
    const response = await fetch('/api/backoffice/public/animes/', {
      credentials: 'include'
    })
    if (response.ok) {
      const data = await response.json()
      const animes = data.results || data
      
      // Cargar animes en el carrusel (máximo 5)
      featuredAnimes.value = animes.slice(0, 5).map(anime => ({
        id: anime.id,
        title: anime.title,
        year: anime.year,
        genre: anime.genre,
        description: anime.description,
        background: anime.background_image
      }))
      
      // Transformar datos para las secciones
      popularNow.value = animes.map(anime => ({
        id: anime.id,
        title: anime.title,
        subtitle: `${anime.year} • ${anime.genre}`,
        duration: `${anime.rating}/10`,
        image: anime.cover_image
      }))
      
      newReleases.value = popularNow.value.slice(0, 5)
    }
  } catch (error) {
    console.error('Error loading animes:', error)
  }
}

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
  await loadAnimes()
  startAutoplay()
})
</script>

<template>
  <div class="min-h-screen bg-black text-white">
    <!-- Header -->
    <header class="header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="logo">AniToki</h1>
          <nav class="nav-links">
            <a href="#popular" class="nav-link">Popular</a>
            <a href="#categorias" class="nav-link">Categorías</a>
            <a href="#tienda" class="nav-link">Tienda</a>
          </nav>
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
          <button class="btn-mi-lista">Mi Lista</button>
          <div v-if="currentUser" class="user-menu">
            <button @click="router.push('/manager/profiles')" class="btn-profile">
              <span>{{ currentUser.username.charAt(0).toUpperCase() }}</span>
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
        </div>
      </div>
    </header>

    <!-- Hero Banner Carousel -->
    <section class="hero" @mouseenter="stopAutoplay" @mouseleave="startAutoplay">
      <div class="hero-carousel">
        <div 
          v-for="(anime, index) in featuredAnimes" 
          :key="anime.id"
          class="hero-slide"
          :class="{ active: index === currentSlide }"
          :style="{ backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.6), rgba(10, 10, 10, 0.95)), url('${anime.background}')` }"
        >
          <div class="hero-content">
            <div class="hero-text">
              <h1 class="hero-logo-text">{{ anime.title }}</h1>
              <h2 class="hero-title">{{ anime.year }} | {{ anime.genre }}</h2>
              <p class="hero-description">{{ anime.description }}</p>
              <div class="hero-buttons">
                <button class="btn-watch">
                  <span class="play-icon">▶</span>
                  COMENZAR A VER!!!
                </button>
                <button class="btn-add">+</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Controls -->
      <button class="carousel-btn prev" @click="prevSlide">‹</button>
      <button class="carousel-btn next" @click="nextSlide">›</button>

      <!-- Indicators -->
      <div class="carousel-indicators">
        <button
          v-for="(anime, index) in featuredAnimes"
          :key="anime.id"
          class="indicator"
          :class="{ active: index === currentSlide }"
          @click="goToSlide(index)"
        ></button>
      </div>
    </section>

    <!-- Continue Watching -->
    <section class="content-section">
      <h2 class="section-title">Continue Watching</h2>
      <div class="cards-grid">
        <AnimeCard
          v-for="item in continueWatching"
          :key="item.id"
          :title="item.title"
          :subtitle="item.subtitle"
          :duration="item.duration"
          :image="item.image"
        />
      </div>
    </section>

    <!-- Popular Now -->
    <section class="content-section">
      <h2 class="section-title">Popular Now</h2>
      <div class="cards-grid">
        <AnimeCard
          v-for="item in popularNow"
          :key="item.id"
          :anime-id="item.id"
          :title="item.title"
          :subtitle="item.subtitle"
          :duration="item.duration"
          :image="item.image"
        />
      </div>
    </section>

    <!-- New Releases -->
    <section class="content-section">
      <h2 class="section-title">New Releases</h2>
      <div class="cards-grid">
        <AnimeCard
          v-for="item in newReleases"
          :key="item.id"
          :anime-id="item.id"
          :title="item.title"
          :subtitle="item.subtitle"
          :duration="item.duration"
          :image="item.image"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Header */
.header {
  background: rgba(10, 10, 10, 0.95);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem 2rem;
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
  font-size: 1.5rem;
  font-weight: 700;
  color: #a855f7;
  margin: 0;
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-link {
  color: #fff;
  text-decoration: none;
  font-size: 0.95rem;
  transition: color 0.2s;
}

.nav-link:hover {
  color: #a855f7;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn-mi-lista {
  background: transparent;
  border: 1px solid #a855f7;
  color: #a855f7;
  padding: 0.5rem 1.5rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-mi-lista:hover {
  background: #a855f7;
  color: #fff;
}

.btn-admin {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: none;
  color: #fff;
  padding: 0.5rem 1.5rem;
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

.btn-profile {
  background: #a855f7;
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  width: 45px;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
  transition: all 0.3s;
}

.btn-profile:hover {
  background: #9333ea;
  transform: scale(1.1);
  border-color: rgba(255, 255, 255, 0.4);
}

.btn-profile span {
  display: block;
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

.btn-logout span {
  display: inline;
}

.btn-logout:hover {
  background: rgba(255, 77, 77, 0.2);
  border-color: #ff4d4d;
}

/* Hero Banner Carousel */
.hero {
  position: relative;
  height: 500px;
  overflow: hidden;
}

.hero-carousel {
  width: 100%;
  height: 100%;
  position: relative;
}

.hero-slide {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity 0.8s ease-in-out;
  pointer-events: none;
}

.hero-slide.active {
  opacity: 1;
  pointer-events: auto;
}

.carousel-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.5);
  border: none;
  color: #fff;
  width: 50px;
  height: 50px;
  font-size: 2rem;
  cursor: pointer;
  z-index: 10;
  transition: background 0.3s;
  border-radius: 4px;
}

.carousel-btn:hover {
  background: rgba(0, 0, 0, 0.8);
}

.carousel-btn.prev {
  left: 2rem;
}

.carousel-btn.next {
  right: 2rem;
}

.carousel-indicators {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.5rem;
  z-index: 10;
}

.indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  border: none;
  cursor: pointer;
  transition: all 0.3s;
}

.indicator.active {
  background: #a855f7;
  width: 30px;
  border-radius: 6px;
}

.indicator:hover {
  background: rgba(255, 255, 255, 0.6);
}

.hero-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
  width: 100%;
}

.hero-text {
  max-width: 600px;
}

.hero-logo-text {
  font-size: 4rem;
  font-weight: 700;
  color: #a855f7;
  margin: 0 0 1rem 0;
  text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.8);
}

.hero-title {
  font-size: 1rem;
  color: #999;
  margin-bottom: 1rem;
  font-weight: 400;
}

.hero-description {
  font-size: 1.1rem;
  line-height: 1.6;
  color: #ddd;
  margin-bottom: 2rem;
}

.hero-buttons {
  display: flex;
  align-items: center;
}

.btn-watch {
  background: #a855f7;
  color: #fff;
  border: none;
  padding: 0.8rem 2rem;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.2s;
}

.btn-watch:hover {
  background: #9333ea;
}

.play-icon {
  font-size: 0.8rem;
}

.btn-add {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 1.5rem;
  cursor: pointer;
  margin-left: 1rem;
  transition: all 0.2s;
}

.btn-add:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Content Sections */
.content-section {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem 2rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 300;
  margin-bottom: 1.5rem;
  color: #fff;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .header-content {
    padding: 1rem;
  }

  .nav-links {
    display: none;
  }

  .hero {
    height: 400px;
  }

  .cards-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
  }

  .content-section {
    padding: 1.5rem 1rem;
  }
}
</style>
