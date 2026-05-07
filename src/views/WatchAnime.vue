<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import Hls from 'hls.js'

const router = useRouter()
const route = useRoute()
const { currentUser, logout, loadCurrentUser, authenticatedFetch } = useAuth()

const animeId = ref(route.query.anime)
const episodeNumber = ref(parseInt(route.query.episode) || 1)

const anime = ref(null)
const episodes = ref([])
const currentEpisode = ref(null)
const isLoading = ref(true)
const showAllEpisodes = ref(false)
const showFullDescription = ref(false)

// HLS.js player
const videoPlayer = ref(null)
const hls = ref(null)
const isLoadingVideo = ref(false)
const videoError = ref(null)
const videoProgress = ref(0)
const videoDuration = ref(0)
const isYouTubeVideo = ref(false)
const youtubeEmbedUrl = ref('')

// Estado de interacciones
const liked = ref(false)
const disliked = ref(false)
const saved = ref(false)
const likeCount = ref(0)
const dislikeCount = ref(0) // Si quieres dislikes persistentes, deberás hacer lo mismo que con likes

// Fullscreen orientation control
function setupFullscreenOrientation() {
  if (!videoPlayer.value) return

  const handleFullscreenChange = async () => {
    const isFullscreen = document.fullscreenElement === videoPlayer.value

    if (isFullscreen) {
      // Entró en pantalla completa - forzar landscape en móviles
      try {
        if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock('landscape')
          console.log('✔ Orientación bloqueada en landscape')
        }
      } catch (error) {
        console.warn('No se pudo bloquear la orientación:', error)
      }
    } else {
      // Salió de pantalla completa - desbloquear orientación
      try {
        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock()
          console.log('✔ Orientación desbloqueada')
        }
      } catch (error) {
        console.warn('No se pudo desbloquear la orientación:', error)
      }
    }
  }

  videoPlayer.value.addEventListener('fullscreenchange', handleFullscreenChange)
  videoPlayer.value.addEventListener('webkitfullscreenchange', handleFullscreenChange)
  videoPlayer.value.addEventListener('mozfullscreenchange', handleFullscreenChange)
  videoPlayer.value.addEventListener('msfullscreenchange', handleFullscreenChange)
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
    return
  }
  
  await loadAnime()
  await loadEpisodeData()
  
  // Esperar a que el DOM esté completamente renderizado
  await nextTick()
  await loadEpisodeSources()
  
  // Configurar control de orientación en fullscreen
  setupFullscreenOrientation()
})

onBeforeUnmount(() => {
  // Desbloquear orientación si está bloqueada
  try {
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock()
    }
  } catch (error) {
    // Silenciar error si ya está desbloqueada
  }

  // Limpiar HLS.js
  if (hls.value) {
    hls.value.destroy()
    hls.value = null
  }
})

// Watch para detectar cambios de episodio
watch([animeId, episodeNumber], async () => {
  await loadEpisodeData()
  await nextTick()
  await loadEpisodeSources()
})

async function loadAnime() {
  if (!animeId.value) return
  
  try {
    const response = await fetch(`/api/backoffice/public/animes/${animeId.value}/`, {
      credentials: 'include'
    })
    if (response.ok) {
      anime.value = await response.json()
      likeCount.value = anime.value.likes || 0
      dislikeCount.value = anime.value.dislikes || 0
    }
  } catch (error) {
    console.error('Error loading anime:', error)
  }
}

async function loadEpisodeData() {
  if (!animeId.value) return
  
  isLoading.value = true
  try {
    const response = await fetch(`/api/backoffice/episodes/?anime_id=${animeId.value}`, {
      credentials: 'include'
    })
    if (response.ok) {
      const data = await response.json()
      episodes.value = data.results || data
      
      // Buscar el episodio actual por número
      const ep = episodes.value.find(e => e.episode_number === episodeNumber.value)
      if (ep) {
        currentEpisode.value = ep
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

async function loadEpisodeSources() {
  if (!currentEpisode.value) {
    console.error('No current episode available')
    videoError.value = 'No hay episodio seleccionado'
    return
  }

  isLoadingVideo.value = true
  videoError.value = null
  isYouTubeVideo.value = false
  
  try {
    // Verificar si el episodio tiene una URL directa de video
    if (currentEpisode.value.video_url) {
      const videoUrl = currentEpisode.value.video_url
      
      // Detectar si es un video de YouTube
      if (videoUrl.includes('youtube.com/embed') || videoUrl.includes('youtu.be') || videoUrl.includes('youtube.com/watch')) {
        console.log('✔ Video de YouTube detectado')
        isYouTubeVideo.value = true
        
        let videoId = ''
        
        // Extraer el ID del video según el formato
        if (videoUrl.includes('youtu.be')) {
          videoId = videoUrl.split('youtu.be/')[1].split('?')[0]
        } else if (videoUrl.includes('youtube.com/embed/')) {
          videoId = videoUrl.split('youtube.com/embed/')[1].split('?')[0]
        } else if (videoUrl.includes('youtube.com/watch')) {
          const urlParams = new URLSearchParams(videoUrl.split('?')[1])
          videoId = urlParams.get('v')
        }
        
        // Construir URL con parámetros para mejor experiencia
        const params = new URLSearchParams({
          autoplay: '1',
          rel: '0',
          modestbranding: '1',
          enablejsapi: '1',
          origin: window.location.origin
        })
        
        youtubeEmbedUrl.value = `https://www.youtube.com/embed/${videoId}?${params.toString()}`
        
        isLoadingVideo.value = false
        return
      }
      
      // Si no es YouTube, verificar si es M3U8 y cargar con HLS
      if (videoUrl.includes('.m3u8')) {
        console.log('✔ Video M3U8 detectado')
        await setupHlsPlayer(videoUrl, {})
        isLoadingVideo.value = false
        return
      }
    }
    
    // Si no hay video_url directo, usar Consumet API (flujo original)
    if (!anime.value || !anime.value.anime_slug) {
      console.error('No anime slug available')
      videoError.value = 'anime_slug no configurado en la base de datos'
      return
    }

    const animeSlug = anime.value.anime_slug
    const response = await authenticatedFetch(
      `/api/backoffice/consumet/sources/${animeSlug}/${episodeNumber.value}/`
    )
    
    const data = await response.json()
    
    // Verificar si es un video de respaldo (fallback)
    if (data.fallback) {
      console.warn('⚠️ Usando video de demostración:', data.message)
      console.warn('Errores de APIs:', data.errors)
      // No mostrar error, solo log - el video se cargará normalmente
    }
    
    if (!data.sources || data.sources.length === 0) {
      throw new Error('No hay fuentes de video disponibles')
    }
    
    // Buscar fuente M3U8 de mejor calidad
    const m3u8Source = data.sources.find(s => s.isM3U8 && s.quality === 'default') || data.sources[0]
    
    if (!m3u8Source || !m3u8Source.url) {
      throw new Error('No se encontró URL de video válida')
    }
    
    // Configurar HLS.js
    await setupHlsPlayer(m3u8Source.url, data.headers)
    
  } catch (error) {
    console.error('Error loading episode sources:', error)
    videoError.value = error.message || 'Error desconocido al cargar el video'
  } finally {
    isLoadingVideo.value = false
  }
}

async function setupHlsPlayer(videoUrl, headers = {}) {
  // Limpiar player anterior si existe
  if (hls.value) {
    hls.value.destroy()
    hls.value = null
  }
  
  // Esperar a que el elemento esté disponible (con reintentos)
  if (!videoPlayer.value) {
    console.warn('Video player not ready, waiting...')
    await nextTick()
    
    if (!videoPlayer.value) {
      console.error('Video player element not found after waiting')
      videoError.value = 'Error: El reproductor de video no está disponible'
      return
    }
  }
  
  if (Hls.isSupported()) {
    // Usar HLS.js para navegadores que no soportan HLS nativamente
    hls.value = new Hls({
      // Configuración optimizada para streaming
      enableWorker: true,
      lowLatencyMode: false,
    })
    
    hls.value.loadSource(videoUrl)
    hls.value.attachMedia(videoPlayer.value)
    
    hls.value.on(Hls.Events.MANIFEST_PARSED, () => {
      console.log('✔ Video cargado correctamente')
      // Mutear temporalmente para permitir autoplay
      videoPlayer.value.muted = true
      videoPlayer.value.play().then(() => {
        // Unmute después de que comience a reproducir
        videoPlayer.value.muted = false
      }).catch(e => {
        console.log('Autoplay bloqueado por el navegador')
        videoPlayer.value.muted = false
      })
    })
    
    hls.value.on(Hls.Events.ERROR, (event, data) => {
      console.error('HLS Error:', data)
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            videoError.value = 'Error de red al cargar el video'
            hls.value.startLoad()
            break
          case Hls.ErrorTypes.MEDIA_ERROR:
            videoError.value = 'Error de reproducción'
            hls.value.recoverMediaError()
            break
          default:
            videoError.value = 'Error fatal al reproducir el video'
            hls.value.destroy()
            break
        }
      }
    })
    
  } else if (videoPlayer.value.canPlayType('application/vnd.apple.mpegurl')) {
    // Safari soporta HLS nativamente
    videoPlayer.value.src = videoUrl
    videoPlayer.value.addEventListener('loadedmetadata', () => {
      videoPlayer.value.play().catch(e => {
        console.log('Autoplay prevented:', e)
      })
    })
  } else {
    videoError.value = 'Tu navegador no soporta reproducción de video HLS'
  }
}

// Event listeners para el video player
function onVideoTimeUpdate() {
  if (videoPlayer.value) {
    videoProgress.value = videoPlayer.value.currentTime
    videoDuration.value = videoPlayer.value.duration
    
    // Actualizar progreso cada 10 segundos
    if (Math.floor(videoProgress.value) % 10 === 0) {
      updateWatchProgress(false)
    }
  }
}

function onVideoEnded() {
  // Marcar episodio como completado
  updateWatchProgress(true)
  
  // Auto-avanzar al siguiente episodio si existe
  if (nextEpisode.value) {
    setTimeout(() => {
      goToNextEpisode()
    }, 2000)
  }
}

async function updateWatchProgress(episodeCompleted = false) {
  if (!animeId.value) return
  
  try {
    const currentEp = episodeCompleted ? episodeNumber.value : episodeNumber.value - 1
    
    await authenticatedFetch(`/api/backoffice/progress/${animeId.value}/`, {
      method: 'POST',
      body: JSON.stringify({
        current_episode: currentEp,
        watched: false
      })
    })
  } catch (error) {
    console.error('Error updating watch progress:', error)
  }
}

function selectEpisode(episode) {
  currentEpisode.value = episode
  episodeNumber.value = episode.episode_number
  router.replace({ 
    query: { 
      anime: animeId.value, 
      episode: episode.episode_number
    } 
  })
}

const nextEpisode = computed(() => {
  if (!currentEpisode.value || episodes.value.length === 0) return null
  const currentIndex = episodes.value.findIndex(ep => ep.episode_number === episodeNumber.value)
  if (currentIndex >= 0 && currentIndex < episodes.value.length - 1) {
    return episodes.value[currentIndex + 1]
  }
  return null
})

const previousEpisode = computed(() => {
  if (!currentEpisode.value || episodes.value.length === 0) return null
  const currentIndex = episodes.value.findIndex(ep => ep.episode_number === episodeNumber.value)
  if (currentIndex > 0) {
    return episodes.value[currentIndex - 1]
  }
  return null
})

function goToNextEpisode() {
  if (nextEpisode.value) {
    selectEpisode(nextEpisode.value)
    showAllEpisodes.value = false
  }
}

function goToPreviousEpisode() {
  if (previousEpisode.value) {
    selectEpisode(previousEpisode.value)
    showAllEpisodes.value = false
  }
}

function retryVideo() {
  videoError.value = null
  loadEpisodeSources()
}

function toggleLike() {
  if (liked.value) {
    liked.value = false
    likeCount.value--
    updateLikesBackend(likeCount.value)
  } else {
    liked.value = true
    likeCount.value++
    updateLikesBackend(likeCount.value)
    if (disliked.value) {
      disliked.value = false
      dislikeCount.value--
      updateDislikesBackend(dislikeCount.value)
    }
  }
}

async function updateLikesBackend(newLikes) {
  try {
    await fetch(`/api/backoffice/public/animes/${animeId.value}/likes/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ likes: newLikes })
    })
  } catch (error) {
    console.error('Error actualizando likes:', error)
  }
}

function toggleDislike() {
  if (disliked.value) {
    disliked.value = false
    dislikeCount.value--
    updateDislikesBackend(dislikeCount.value)
  } else {
    disliked.value = true
    dislikeCount.value++
    updateDislikesBackend(dislikeCount.value)
    if (liked.value) {
      liked.value = false
      likeCount.value--
      updateLikesBackend(likeCount.value)
    }
  }
async function updateDislikesBackend(newDislikes) {
  try {
    await fetch(`/api/backoffice/public/animes/${animeId.value}/dislikes/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ dislikes: newDislikes })
    })
  } catch (error) {
    console.error('Error actualizando dislikes:', error)
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
    <!-- Header Navigation -->
    <header class="watch-header">
      <div class="watch-header-content">
        <div class="header-left">
          <img src="/Logo_AniToki.png" alt="AniToki" class="logo" @click="goHome" style="cursor: pointer;" />
          <nav class="nav-links">
            <a @click="goHome" class="nav-link">Inicio</a>
            <a @click="router.push('/categories')" class="nav-link">Explorar</a>
          </nav>
        </div>
        <div class="header-right">
          <button class="btn-search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </button>
          <button class="btn-watchlist" @click="router.push('/home')">Mi Lista</button>
          <div v-if="currentUser" class="user-controls">
            <button @click="router.push('/manager/profiles')" class="btn-profile">
              <span>{{ currentUser.username.charAt(0).toUpperCase() }}</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Video Player -->
    <div class="player-section">
      <div class="player-wrapper">
        <!-- Loading Spinner -->
        <div v-if="isLoadingVideo" class="video-loading">
          <div class="spinner"></div>
          <p>Cargando video...</p>
        </div>
        
        <!-- YouTube Iframe -->
        <iframe 
          v-if="!isLoadingVideo && !videoError && isYouTubeVideo && youtubeEmbedUrl"
          :src="youtubeEmbedUrl"
          class="youtube-player"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
        
        <!-- Video Element HLS -->
        <video 
          ref="videoPlayer"
          class="video-player"
          v-show="!isLoadingVideo && !videoError && !isYouTubeVideo"
          controls
          preload="metadata"
          @timeupdate="onVideoTimeUpdate"
          @ended="onVideoEnded"
        ></video>
        
        <!-- Error Message -->
        <div v-if="videoError" class="player-error">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p class="error-message">{{ videoError }}</p>
          <button class="btn-retry" @click="retryVideo">Reintentar</button>
        </div>
        
        <!-- Placeholder -->
        <div v-else-if="!currentEpisode" class="player-placeholder">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <p>Selecciona un episodio para reproducir</p>
        </div>
      </div>
    </div>

    <!-- Content Section -->
    <div class="content-container">
      <div class="content-inner">
        <!-- Main Content -->
        <div class="main-content">
          <!-- Anime Title Link -->
          <div class="anime-title-link" v-if="anime">
            <a @click="goHome" style="cursor: pointer;">{{ anime.title }}</a>
          </div>

          <!-- Episode Title -->
          <h1 class="episode-title" v-if="currentEpisode">
            E{{ currentEpisode.episode_number }} - {{ currentEpisode.title || `Episodio ${currentEpisode.episode_number}` }}
          </h1>

          <!-- Episode Meta -->
          <div class="episode-meta" v-if="currentEpisode">
            <span>{{ anime?.audio_type || 'Sub' }} | Dob</span>
            <span class="release-date" v-if="anime?.year">Lanzado el {{ anime.year }}</span>
          </div>

          <!-- Interaction Buttons -->
          <div class="interaction-buttons" v-if="currentEpisode">
            <button class="btn-like" :class="{ active: liked }" @click="toggleLike">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
              </svg>
              <span>{{ likeCount }}</span>
            </button>
            
            <button class="btn-dislike" :class="{ active: disliked }" @click="toggleDislike">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transform: rotate(180deg)">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
              </svg>
              <span>{{ dislikeCount }}</span>
            </button>

            <button class="btn-share" @click="shareEpisode">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
            </button>
          </div>

          <!-- Description -->
          <div class="description-section" v-if="currentEpisode || anime">
            <p :class="{ expanded: showFullDescription }">
              {{ currentEpisode?.description || anime?.description || 'Sin descripción disponible.' }}
            </p>
            <button 
              class="btn-show-more" 
              @click="showFullDescription = !showFullDescription"
              v-if="(currentEpisode?.description || anime?.description)?.length > 150"
            >
              {{ showFullDescription ? 'VER MENOS' : 'VER MÁS' }}
            </button>
          </div>
        </div>

        <!-- Sidebar -->
        <aside class="sidebar">
          <!-- Next Episode Card -->
          <div class="next-episode-card" v-if="nextEpisode && anime">
            <div class="next-episode-label">SIGUIENTE EPISODIO</div>
            <div class="next-episode-content" @click="goToNextEpisode">
              <div class="next-episode-thumbnail">
                <img 
                  :src="nextEpisode.thumbnail || anime.cover_image" 
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
                  E{{ nextEpisode.episode_number }} - {{ nextEpisode.title || `Episodio ${nextEpisode.episode_number}` }}
                </div>
                <div class="next-episode-meta">
                  {{ anime.audio_type || 'Sub' }}
                </div>
                <div class="next-episode-duration">
                  {{ nextEpisode.duration || '24' }}m
                </div>
              </div>
            </div>
          </div>

          <!-- Previous Episode Card -->
          <div class="prev-episode-card" v-if="previousEpisode && anime">
            <div class="prev-episode-label">EPISODIO ANTERIOR</div>
            <div class="prev-episode-content" @click="goToPreviousEpisode">
              <div class="prev-episode-thumbnail">
                <img 
                  :src="previousEpisode.thumbnail || anime.cover_image" 
                  :alt="previousEpisode.title"
                />
                <div class="play-overlay">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </div>
              </div>
              <div class="prev-episode-info">
                <div class="prev-episode-title">
                  E{{ previousEpisode.episode_number }} - {{ previousEpisode.title || `Episodio ${previousEpisode.episode_number}` }}
                </div>
                <div class="prev-episode-meta">
                  {{ anime.audio_type || 'Sub' }}
                </div>
              </div>
            </div>
          </div>

          <!-- View More Episodes Button -->
          <button class="btn-all-episodes" @click="showAllEpisodes = true" v-if="episodes.length > 0">
            VER MÁS EPISODIOS
          </button>
        </aside>
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
/* ===== GLOBAL ===== */
.watch-page {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
}

/* ===== HEADER ===== */
.watch-header {
  background: var(--bg);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid var(--line);
}

.watch-header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 2.5rem;
}

.logo {
  height: 35px;
  width: auto;
  object-fit: contain;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
}

.nav-link {
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s;
}

.nav-link:hover {
  color: #fff;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.btn-search {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  transition: color 0.2s;
}

.btn-search:hover {
  color: #fff;
}

.btn-watchlist {
  background: transparent;
  border: 1px solid var(--line-light);
  color: var(--text-primary);
  padding: 0.5rem 1.25rem;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-watchlist:hover {
  background: rgba(168, 85, 247, 0.15);
  border-color: var(--purple-light);
  color: var(--purple-light);
}

.user-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-profile {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--purple-light), var(--purple-dark));
  border: 2px solid rgba(168, 85, 247, 0.3);
  color: #fff;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-profile:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4);
}

/* ===== VIDEO PLAYER ===== */
.player-section {
  width: 100%;
  background: var(--bg);
}

.player-wrapper {
  position: relative;
  width: 100%;
  max-width: 1920px;
  margin: 0 auto;
  aspect-ratio: 16 / 9;
  background: var(--bg);
}

.youtube-player,
.video-player {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: var(--bg);
}

.video-loading,
.player-error,
.player-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
}

.spinner {
  width: 50px;
  height: 50px;
  border: 3px solid rgba(147, 51, 234, 0.2);
  border-top-color: var(--purple-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  margin: 1rem 0;
  font-size: 0.95rem;
}

.btn-retry {
  background: var(--purple-primary);
  border: none;
  color: #fff;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-retry:hover {
  background: var(--purple-dark);
}

/* ===== CONTENT SECTION ===== */
.content-container {
  background: var(--bg-secondary);
  flex: 1;
}

.content-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 3rem;
  align-items: start;
}

/* ===== MAIN CONTENT ===== */
.main-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.anime-title-link a {
  color: var(--purple-light);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s;
}

.anime-title-link a:hover {
  color: var(--purple-primary);
}

.episode-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.3;
  color: #fff;
}

.episode-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  flex-wrap: wrap;
}

.release-date {
  margin-left: 0.5rem;
}

.interaction-buttons {
  display: flex;
  gap: 0.75rem;
  margin: 0.5rem 0;
}

.btn-like,
.btn-dislike,
.btn-share {
  background: var(--bg-tertiary);
  border: 1px solid var(--line);
  color: var(--text-primary);
  padding: 0.6rem 1rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-like:hover,
.btn-dislike:hover,
.btn-share:hover {
  background: rgba(168, 85, 247, 0.15);
  border-color: var(--purple-light);
}

.btn-like.active {
  background: var(--purple-primary);
  border-color: var(--purple-primary);
}

.btn-dislike.active {
  background: var(--purple-primary);
  border-color: var(--purple-primary);
}

.description-section {
  margin-top: 0.5rem;
}

.description-section p {
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.65;
  margin: 0;
  font-size: 0.95rem;
}

.description-section p:not(.expanded) {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.btn-show-more {
  background: none;
  border: none;
  color: var(--purple-light);
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0.5rem 0;
  margin-top: 0.5rem;
  transition: color 0.2s;
}

.btn-show-more:hover {
  color: var(--purple-primary);
}

/* ===== SIDEBAR ===== */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.next-episode-card,
.prev-episode-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--line);
  border-radius: 6px;
  overflow: hidden;
}

.next-episode-label,
.prev-episode-label {
  background: var(--bg-secondary);
  padding: 0.75rem 1rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--purple-light);
  border-bottom: 1px solid var(--line);
}

.next-episode-content,
.prev-episode-content {
  cursor: pointer;
  transition: background 0.2s;
}

.next-episode-content:hover,
.prev-episode-content:hover {
  background: rgba(255, 255, 255, 0.03);
}

.next-episode-thumbnail,
.prev-episode-thumbnail {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.next-episode-thumbnail img,
.prev-episode-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.next-episode-content:hover .play-overlay,
.prev-episode-content:hover .play-overlay {
  opacity: 1;
}

.next-episode-info,
.prev-episode-info {
  padding: 1rem;
}

.next-episode-title,
.prev-episode-title {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  line-height: 1.4;
  color: #fff;
}

.next-episode-meta,
.prev-episode-meta {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.25rem;
}

.next-episode-duration {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
}

.btn-all-episodes {
  width: 100%;
  background: rgba(147, 51, 234, 0.15);
  border: 1px solid var(--purple-dark);
  color: var(--purple-light);
  padding: 0.9rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-all-episodes:hover {
  background: rgba(147, 51, 234, 0.25);
  border-color: var(--purple-light);
  transform: translateY(-2px);
}

/* ===== EPISODES MODAL ===== */
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
  background: var(--bg-secondary);
  border: 1px solid var(--line);
  border-radius: 8px;
  width: 90%;
  max-width: 900px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
}

.modal-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.btn-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  transition: color 0.2s;
}

.btn-close:hover {
  color: #fff;
}

.modal-episodes-list {
  padding: 1.5rem 2rem;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
}

.episode-item {
  background: var(--bg-tertiary);
  border: 1px solid var(--line);
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.episode-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  border-color: var(--line-light);
}

.episode-item.active {
  border: 2px solid var(--purple-primary);
}

.episode-item-thumbnail {
  position: relative;
  aspect-ratio: 16 / 9;
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
  border-radius: 3px;
  font-size: 0.75 rem;
  font-weight: 700;
}

.episode-item-info {
  padding: 0.75rem;
}

.episode-item-title {
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.episode-item-meta {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

/* ===== FOOTER ===== */
.footer {
  background: var(--bg-tertiary);
  border-top: 1px solid var(--line);
  padding: 3rem 2rem 2rem;
  margin-top: auto;
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
  align-items: flex-start;
  cursor: pointer;
}

.footer-logo .logo-image {
  height: 45px;
  width: auto;
  object-fit: contain;
}

.footer-section h3 {
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #fff;
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
  color: #fff;
}

.footer-bottom {
  max-width: 1400px;
  margin: 0 auto;
  padding-top: 2rem;
  border-top: 1px solid var(--line);
}

.language-selector {
  background: transparent;
  border: 1px solid var(--line-light);
  color: var(--text-secondary);
  padding: 0.7rem 1.25rem;
  border-radius: 4px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.language-selector:hover {
  border-color: var(--purple-light);
  color: var(--text-primary);
}

/* ===== RESPONSIVE ===== */
@media (max-width: 1200px) {
  .player-wrapper {
    max-width: 100%;
  }
}

@media (max-width: 1024px) {
  .content-inner {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .sidebar {
    grid-row: 1;
  }

  .main-content {
    grid-row: 2;
  }

  .nav-bar {
    padding: 1rem 1.5rem;
  }

  .anime-info h1 {
    font-size: 1.5rem;
  }
}

@media (max-width: 768px) {
  .nav-bar {
    padding: 0.75rem 1rem;
    flex-wrap: wrap;
  }

  .logo {
    height: 32px;
  }

  .nav-center {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .episode-nav-btn {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
  }

  .anime-info {
    padding: 1rem;
  }

  .anime-info h1 {
    font-size: 1.25rem;
  }

  .anime-meta {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .meta-badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
  }

  .anime-description {
    font-size: 0.875rem;
  }

  .episodes-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }

  .episode-card {
    padding: 0.5rem;
  }

  .episode-number {
    font-size: 0.875rem;
  }

  .episode-title {
    font-size: 0.75rem;
  }

  .language-selector {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
  }
}

@media (max-width: 480px) {
  .nav-bar {
    padding: 0.5rem 0.75rem;
  }

  .logo {
    height: 28px;
  }

  .episode-nav-btn {
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
  }

  .anime-info h1 {
    font-size: 1.1rem;
  }

  .episodes-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 0.5rem;
  }

  .content-inner {
    gap: 1rem;
  }
}

</style>