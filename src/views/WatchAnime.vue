<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useProfile } from '../composables/useProfile'
import Hls from 'hls.js'

const router = useRouter()
const route = useRoute()
const { currentUser, logout, loadCurrentUser, authenticatedFetch, API_BASE_URL } = useAuth()
const { currentProfile, loadProfile } = useProfile()

const animeId = ref(route.query.anime)
const episodeNumber = ref(parseInt(route.query.episode) || 1)

const anime = ref(null)
const episodes = ref([])
const currentEpisode = ref(null)
const isLoading = ref(true)
const showAllEpisodes = ref(false)
// Seasons for One Piece (10 seasons) - use provided canonical names
const seasons = [
  'East Blue',
  'Entrada a Grand Line',
  'Drum Island',
  'Arabasta',
  'Sueños',
  'Skypiea',
  'Fortaleza Naval G-8',
  'Water 7',
  'Enies Lobby',
  'Thriller Bark'
]
const seasonSelected = ref(seasons[0])
const showSeasonDropdown = ref(false)
const showFullDescription = ref(false)

const filteredEpisodes = computed(() => {
  if (!episodes.value || episodes.value.length === 0) return []

  // Sort episodes by episode_number
  const sorted = [...episodes.value].sort((a, b) => a.episode_number - b.episode_number)
  const total = sorted.length
  const groups = seasons.length

  if (groups <= 0) return sorted

  const base = Math.floor(total / groups)
  const remainder = total % groups

  // Find selected season index
  const idx = Math.max(0, seasons.indexOf(seasonSelected.value))

  // Calculate start index: each of the first `remainder` groups gets (base+1) items
  let start = 0
  for (let i = 0; i < idx; i++) {
    start += base + (i < remainder ? 1 : 0)
  }
  const size = base + (idx < remainder ? 1 : 0)
  const end = start + size

  return sorted.slice(start, end)
})

const showSeasons = computed(() => {
  const slug = anime.value?.anime_slug?.toLowerCase() || ''
  const title = (anime.value?.title || '').toLowerCase()
  return slug === 'one-piece' || title.includes('one piece') || anime.value?.id === 6
})

// Calculate season details with episode ranges and counts
const seasonDetails = computed(() => {
  if (!episodes.value || episodes.value.length === 0) return []
  
  const sorted = [...episodes.value].sort((a, b) => a.episode_number - b.episode_number)
  const total = sorted.length
  const groups = seasons.length
  
  if (groups <= 0) return []
  
  const base = Math.floor(total / groups)
  const remainder = total % groups
  
  const details = []
  let start = 0
  
  for (let i = 0; i < groups; i++) {
    const size = base + (i < remainder ? 1 : 0)
    const end = start + size
    const seasonEpisodes = sorted.slice(start, end)
    
    if (seasonEpisodes.length > 0) {
      const firstEp = seasonEpisodes[0].episode_number
      const lastEp = seasonEpisodes[seasonEpisodes.length - 1].episode_number
      
      details.push({
        name: seasons[i],
        range: `${firstEp}-${lastEp}`,
        count: seasonEpisodes.length,
        episodeCount: `${seasonEpisodes.length} Episodio${seasonEpisodes.length > 1 ? 's' : ''}`
      })
    }
    
    start = end
  }
  
  return details
})

// HLS.js player
const videoPlayer = ref(null)
const playerWrapper = ref(null)
const hls = ref(null)
const isLoadingVideo = ref(false)
const videoError = ref(null)
const videoProgress = ref(0)
const videoDuration = ref(0)
const isYouTubeVideo = ref(false)
const youtubeEmbedUrl = ref('')

// Controles personalizados del reproductor
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(1)
const isMuted = ref(false)
const showControls = ref(true)
const controlsTimeout = ref(null)

// Menú de configuración
const showSettingsMenu = ref(false)
const showQualitySubmenu = ref(false)
const selectedAudio = ref('Japones')
const selectedSubtitle = ref('Español (España)')
const selectedQuality = ref('Auto')
const qualityOptions = ['Auto', '1080p HD', '720p', '480p', '360p']

// Estado de interacciones
const liked = ref(false)
const disliked = ref(false)
const saved = ref(false)
const likeCount = ref(23)
const dislikeCount = ref(8)

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
        }
      } catch (error) {
        // Silenciar error de orientación
      }
    } else {
      // Salió de pantalla completa - desbloquear orientación
      try {
        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock()
        }
      } catch (error) {
        // Silenciar error de orientación
      }
    }
  }

  videoPlayer.value.addEventListener('fullscreenchange', handleFullscreenChange)
  videoPlayer.value.addEventListener('webkitfullscreenchange', handleFullscreenChange)
  videoPlayer.value.addEventListener('mozfullscreenchange', handleFullscreenChange)
  videoPlayer.value.addEventListener('msfullscreenchange', handleFullscreenChange)
}

// Funciones de control del reproductor personalizado
function togglePlay() {
  if (!videoPlayer.value) return
  
  if (isPlaying.value) {
    videoPlayer.value.pause()
  } else {
    videoPlayer.value.play()
  }
}

function seek(event) {
  if (!videoPlayer.value) return
  const progressBar = event.currentTarget
  const rect = progressBar.getBoundingClientRect()
  const pos = (event.clientX - rect.left) / rect.width
  videoPlayer.value.currentTime = pos * duration.value
}

function toggleMute() {
  if (!videoPlayer.value) return
  isMuted.value = !isMuted.value
  videoPlayer.value.muted = isMuted.value
}

function changeVolume(event) {
  if (!videoPlayer.value) return
  volume.value = parseFloat(event.target.value)
  videoPlayer.value.volume = volume.value
  isMuted.value = volume.value === 0
}

function toggleFullscreen() {
  if (!playerWrapper.value) return
  
  if (!document.fullscreenElement) {
    playerWrapper.value.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function handleMouseMove() {
  showControls.value = true
  if (controlsTimeout.value) clearTimeout(controlsTimeout.value)
  
  controlsTimeout.value = setTimeout(() => {
    if (isPlaying.value) {
      showControls.value = false
    }
  }, 3000)
}

function toggleSettings() {
  showSettingsMenu.value = !showSettingsMenu.value
  showQualitySubmenu.value = false
}

function toggleQualitySubmenu() {
  showQualitySubmenu.value = !showQualitySubmenu.value
}

function selectQuality(quality) {
  selectedQuality.value = quality
  showQualitySubmenu.value = false
  // Aquí podrías agregar lógica para cambiar la calidad del video
}

async function handleLogout() {
  try {
    await logout()
    router.push('/login')
  } catch (error) {
    console.error('Error al cerrar sesión:', error)
  }
}

// Recargar progreso cuando cambia el perfil
watch(() => currentProfile.value?.id, async (newProfileId, oldProfileId) => {
  if (newProfileId && oldProfileId && newProfileId !== oldProfileId) {
    // El perfil cambió, recargar progreso
    await loadAnimeProgress()
  }
})

onMounted(async () => {
  const user = await loadCurrentUser()
  if (!user) {
    router.push('/login')
    return
  }
  
  await loadProfile()
  await loadAnime()
  await loadAnimeProgress()
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

// Watch for animeId changes to refresh progress
watch(animeId, async () => {
  await loadAnimeProgress()
})

async function loadAnime() {
  if (!animeId.value) return
  
  try {
    const response = await authenticatedFetch(`/api/backoffice/public/animes/${animeId.value}/`)
    if (response.ok) {
      anime.value = await response.json()
      // Verificar si está en la watchlist
      await checkIfInWatchlist()
        // Inicializar estados de like/dislike desde la API
        likeCount.value = anime.value.likes ?? likeCount.value
        dislikeCount.value = anime.value.dislikes ?? dislikeCount.value
        if (anime.value.user_reaction === 'like') {
          liked.value = true
          disliked.value = false
        } else if (anime.value.user_reaction === 'dislike') {
          disliked.value = true
          liked.value = false
        } else {
          liked.value = false
          disliked.value = false
        }
    }
  } catch (error) {
    console.error('Error loading anime:', error)
  }
}

async function loadEpisodeData() {
  if (!animeId.value) return
  
  isLoading.value = true
  try {
    const response = await authenticatedFetch(`/api/backoffice/episodes/?anime_id=${animeId.value}`)
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
    // Verificar si el episodio tiene una URL directa de video (SOLO MP4, M3U8, no YouTube)
    if (currentEpisode.value.video_url) {
      const videoUrl = currentEpisode.value.video_url
      
      // IGNORAR videos de YouTube - solo usar archivos de video reales
      const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')
      
      if (!isYouTube) {
        // Si es M3U8, cargar con HLS
        if (videoUrl.includes('.m3u8')) {
          await setupHlsPlayer(videoUrl, {})
          isLoadingVideo.value = false
          return
        }
        
        // Si es MP4 u otro formato, usar reproductor HTML5 nativo
        if (videoUrl.includes('.mp4') || videoUrl.includes('.webm') || videoUrl.includes('.ogg')) {
          await setupNativePlayer(videoUrl)
          isLoadingVideo.value = false
          return
        }
        
        // Si no coincide con ningún formato conocido, intentar como video nativo
        await setupNativePlayer(videoUrl)
        isLoadingVideo.value = false
        return
      }
    }
    
    // Si no hay video_url directo O es YouTube, usar Consumet API (flujo principal)
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

async function setupNativePlayer(videoUrl) {
  // Limpiar HLS si existe
  if (hls.value) {
    hls.value.destroy()
    hls.value = null
  }
  
  // Esperar a que el elemento esté disponible
  if (!videoPlayer.value) {
    await nextTick()
    
    if (!videoPlayer.value) {
      videoError.value = 'Error: El reproductor de video no está disponible'
      return
    }
  }
  
  // Configurar reproductor nativo HTML5
  videoPlayer.value.src = videoUrl
  
  // Intentar autoplay con mute
  videoPlayer.value.muted = true
  videoPlayer.value.play().then(() => {
    // Unmute después de que comience
    videoPlayer.value.muted = false
  }).catch(() => {
    videoPlayer.value.muted = false
  })
}

async function setupHlsPlayer(videoUrl, headers = {}) {
  // Limpiar player anterior si existe
  if (hls.value) {
    hls.value.destroy()
    hls.value = null
  }
  
  // Esperar a que el elemento esté disponible (con reintentos)
  if (!videoPlayer.value) {
    await nextTick()
    
    if (!videoPlayer.value) {
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
      // Mutear temporalmente para permitir autoplay
      videoPlayer.value.muted = true
      videoPlayer.value.play().then(() => {
        // Unmute después de que comience a reproducir
        videoPlayer.value.muted = false
      }).catch(() => {
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
  if (!animeId.value || !currentProfile.value) return
  
  try {
    const currentEp = episodeNumber.value || 1
    await authenticatedFetch(`/api/backoffice/progress/${animeId.value}/`, {
      method: 'POST',
      body: JSON.stringify({
        profile_id: currentProfile.value.id,
        current_episode: currentEp,
        watched: !!episodeCompleted
      })
    })
    // refresh local progress after update
    await loadAnimeProgress()
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

async function toggleLike() {
  if (!anime.value) return
  const pk = anime.value.id
  const action = liked.value ? 'remove' : 'like'

  try {
    const response = await authenticatedFetch(`/api/backoffice/public/animes/${pk}/react/`, {
      method: 'POST',
      body: JSON.stringify({ action })
    })

    if (!response.ok) {
      console.error('Error reacting to anime (like):', await response.text())
      return
    }

    const data = await response.json()
    likeCount.value = data.likes
    dislikeCount.value = data.dislikes
    liked.value = data.user_reaction === 'like'
    disliked.value = data.user_reaction === 'dislike'
  } catch (error) {
    console.error('Error toggling like:', error)
  }
}

async function toggleDislike() {
  if (!anime.value) return
  const pk = anime.value.id
  const action = disliked.value ? 'remove' : 'dislike'

  try {
    const response = await authenticatedFetch(`/api/backoffice/public/animes/${pk}/react/`, {
      method: 'POST',
      body: JSON.stringify({ action })
    })

    if (!response.ok) {
      console.error('Error reacting to anime (dislike):', await response.text())
      return
    }

    const data = await response.json()
    likeCount.value = data.likes
    dislikeCount.value = data.dislikes
    liked.value = data.user_reaction === 'like'
    disliked.value = data.user_reaction === 'dislike'
  } catch (error) {
    console.error('Error toggling dislike:', error)
  }
}

function toggleSave() {
  if (!anime.value) return
  
  if (saved.value) {
    // Eliminar de la lista
    removeFromWatchlist()
  } else {
    // Agregar a la lista
    addToWatchlist()
  }
}

async function addToWatchlist() {
  if (!currentProfile.value) return
  
  try {
    const response = await authenticatedFetch('/api/manager/watchlist/', {
      method: 'POST',
      body: JSON.stringify({
        anime_id: anime.value.id,
        profile_id: currentProfile.value.id
      })
    })
    
    if (response.ok) {
      saved.value = true
      const data = await response.json()
      console.log(data.message)
    }
  } catch (error) {
    console.error('Error adding to watchlist:', error)
  }
}

async function removeFromWatchlist() {
  if (!currentProfile.value) return
  
  try {
    const response = await authenticatedFetch(`/api/manager/watchlist/remove/${anime.value.id}/?profile_id=${currentProfile.value.id}`, {
      method: 'DELETE'
    })
    
    if (response.ok) {
      saved.value = false
      const data = await response.json()
      console.log(data.message)
    }
  } catch (error) {
    console.error('Error removing from watchlist:', error)
  }
}

async function checkIfInWatchlist() {
  if (!anime.value || !currentProfile.value) return
  
  try {
    const response = await authenticatedFetch(`/api/manager/watchlist/?profile_id=${currentProfile.value.id}`)
    if (response.ok) {
      const data = await response.json()
      saved.value = data.some(item => item.anime.id === anime.value.id)
    }
  } catch (error) {
    console.error('Error checking watchlist:', error)
  }
}

function shareEpisode() {
  // Copiar URL al portapapeles
  const url = window.location.href
  navigator.clipboard.writeText(url)
  alert('Enlace copiado al portapapeles')
}

// Hardcoded descriptions for One Piece (episodes 1-10)
const onePieceDescriptions = {
  1: `Romance Dawn — Se muestra la infancia de Monkey D. Luffy y su relación con Shanks. Luffy come accidentalmente la Fruta Gomu Gomu y obtiene poderes elásticos. Después de que Shanks le salva la vida, Luffy decide convertirse en Rey de los Piratas.`,
  2: `Ellos lo llaman ‘Sombrero de Paja Luffy’ — Luffy llega a una isla dominada por la pirata Alvida y conoce a Koby, un joven obligado a trabajar para ella.`,
  3: `Morgan contra Luffy — Luffy llega a la base de la Marina controlada por Axe-Hand Morgan y conoce al espadachín capturado Roronoa Zoro.`,
  4: `El pasado del capitán Morgan — Se explica cómo Morgan ganó fama en la Marina y cómo su poder lo volvió tiránico. Luffy intenta convencer a Zoro de unirse a él.`,
  5: `El Rey de los Piratas y el Maestro Espadachín — Zoro acepta convertirse en compañero de Luffy tras ser liberado. Ambos derrotan a Morgan y abandonan la isla.`,
  6: `El primer compañero — Zoro se une oficialmente a la tripulación. Koby decide entrar en la Marina para perseguir su sueño.`,
  7: `Amigos — Luffy y Zoro llegan a una nueva ciudad donde conocen a la ladrona Nami, especializada en robar a piratas.`,
  8: `Nami — Aparece el pirata Buggy el Payaso, usuario de una fruta del diablo. Nami intenta aprovecharse tanto de Luffy como de Buggy.`,
  9: `La mujer demonio — Buggy demuestra sus poderes de separación corporal mientras captura a Luffy. Nami empieza a cuestionar sus prejuicios contra los piratas.`,
 10: `Incidente en la taberna — Se desarrolla el conflicto contra Buggy y se profundiza en la personalidad despreocupada y valiente de Luffy.`
}

const displayedDescription = computed(() => {
  // Priorizar descripción del episodio o del anime si existe
  const desc = currentEpisode.value?.description || anime.value?.description || ''
  if (desc && desc.trim().length > 0) return desc

  // Si es One Piece (slug o título o id conocido), usar hardcoded
  const slug = anime.value?.anime_slug?.toLowerCase()
  const title = (anime.value?.title || '').toLowerCase()
  if (slug === 'one-piece' || title.includes('one piece') || anime.value?.id === 6) {
    const num = currentEpisode.value?.episode_number
    if (num && onePieceDescriptions[num]) return onePieceDescriptions[num]
  }

  return 'Sin descripción disponible.'
})

// Watch progress state
const animeProgress = ref({ current_episode: 0, watched: false })

async function loadAnimeProgress() {
  if (!animeId.value || !currentProfile.value) return
  try {
    const resp = await authenticatedFetch(`/api/backoffice/progress/${animeId.value}/?profile_id=${currentProfile.value.id}`)
    if (resp.ok) {
      const data = await resp.json()
      animeProgress.value = {
        current_episode: data.current_episode || 0,
        watched: !!data.watched
      }
    }
  } catch (e) {
    console.error('Error loading anime progress:', e)
  }
}

function goToContinueWatching() {
  const prog = animeProgress.value || { current_episode: 0, watched: false }
  let target = 1
  if (prog.current_episode && prog.current_episode > 0) {
    // If last episode was fully watched, go to next ep, else resume that ep
    if (prog.watched) {
      target = Math.min((prog.current_episode || 0) + 1, anime.value?.episode_count || (prog.current_episode || 1))
    } else {
      target = prog.current_episode
    }
  }

  const ep = episodes.value.find(e => e.episode_number === target)
  if (ep) selectEpisode(ep)
  else if (episodes.value.length > 0) selectEpisode(episodes.value[0])
}

const continueEpisode = computed(() => {
  const prog = animeProgress.value || { current_episode: 0, watched: false }
  const total = anime.value?.episode_count || episodes.value.length || 0
  if (!prog.current_episode || prog.current_episode === 0) return 1
  if (prog.watched) return Math.min(prog.current_episode + 1, total || prog.current_episode + 1)
  return prog.current_episode
})

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
          <button class="btn-watchlist" @click="router.push('/my-list')">Mi Lista</button>
          <div v-if="currentUser" class="user-controls">
            <button @click="router.push('/manager/profiles')" class="btn-profile">
              <img v-if="currentProfile?.avatar" :src="currentProfile.avatar" :alt="currentProfile.name" class="profile-avatar" />
              <span v-else>{{ currentUser.username.charAt(0).toUpperCase() }}</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Video Player -->
    <div class="player-section">
      <div class="player-wrapper" ref="playerWrapper">
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
          preload="metadata"
          :poster="anime?.cover_image || ''"
          @play="isPlaying = true"
          @pause="isPlaying = false"
          @timeupdate="e => { currentTime = e.target.currentTime; onVideoTimeUpdate(e) }"
          @loadedmetadata="e => duration = e.target.duration"
          @ended="onVideoEnded"
          @click="togglePlay"
        ></video>
        
        <!-- Controles personalizados -->
        <div 
          v-if="!isLoadingVideo && !videoError && !isYouTubeVideo" 
          class="custom-controls"
          :class="{ 'show': showControls }"
          @mousemove="handleMouseMove"
          @click.self="togglePlay"
        >
          <!-- Botón de play/pause central -->
          <button class="play-pause-center" @click="togglePlay" v-show="!isPlaying">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
          
          <!-- Barra de controles inferior -->
          <div class="controls-bar">
            <!-- Barra de progreso -->
            <div class="progress-bar" @click="seek">
              <div class="progress-filled" :style="{ width: (currentTime / duration * 100) + '%' }"></div>
            </div>
            
            <!-- Controles de reproducción -->
            <div class="controls-bottom">
              <div class="controls-left">
                <button class="control-btn" @click="togglePlay">
                  <svg v-if="!isPlaying" width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                </button>
                
                <div class="time-display">
                  <span>{{ formatTime(currentTime) }}</span>
                  <span> / </span>
                  <span>{{ formatTime(duration) }}</span>
                </div>
              </div>
              
              <div class="controls-right">
                <div class="volume-control">
                  <button class="control-btn" @click="toggleMute">
                    <svg v-if="!isMuted && volume > 0.5" width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                    <svg v-else-if="!isMuted && volume > 0" width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <path d="M7 9v6h4l5 5V4l-5 5H7z"/>
                    </svg>
                    <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                    </svg>
                  </button>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.1" 
                    :value="volume" 
                    @input="changeVolume"
                    class="volume-slider"
                  />
                </div>
                
                <div class="settings-container">
                  <button class="control-btn" @click="toggleSettings">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
                    </svg>
                  </button>
                  
                  <!-- Menú desplegable de configuración -->
                  <div v-if="showSettingsMenu" class="settings-menu">
                    <div class="settings-item clickable">
                      <span>Audio</span>
                      <span class="settings-value">{{ selectedAudio }} 
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                        </svg>
                      </span>
                    </div>
                    
                    <div class="settings-item clickable">
                      <span>Subtítulos</span>
                      <span class="settings-value">{{ selectedSubtitle }} 
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                        </svg>
                      </span>
                    </div>
                    
                    <div class="settings-item clickable" @click="toggleQualitySubmenu">
                      <span>Calidad</span>
                      <span class="settings-value">{{ selectedQuality }} 
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                        </svg>
                      </span>
                    </div>
                  </div>
                  
                  <!-- Submenú de calidad -->
                  <div v-if="showQualitySubmenu" class="quality-submenu">
                    <div class="submenu-header" @click="showQualitySubmenu = false">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                      </svg>
                      <span>Calidad</span>
                    </div>
                    <div 
                      v-for="quality in qualityOptions" 
                      :key="quality"
                      class="quality-option"
                      :class="{ active: selectedQuality === quality }"
                      @click="selectQuality(quality)"
                    >
                      <span>{{ quality }}</span>
                      <svg v-if="selectedQuality === quality" width="20" height="20" viewBox="0 0 24 24" fill="#a855f7">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    </div>
                  </div>
                </div>
                
                <button class="control-btn" @click="toggleFullscreen">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
        
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
            <button class="btn-continue" v-if="animeProgress.current_episode > 0" @click="goToContinueWatching">
              SEGUIR VIENDO E{{ continueEpisode }}
            </button>
          </div>

          <!-- Description -->
          <div class="description-section" v-if="currentEpisode || anime">
            <p :class="{ expanded: showFullDescription }">
              {{ displayedDescription }}
            </p>
            <button 
              class="btn-show-more" 
              @click="showFullDescription = !showFullDescription"
              v-if="displayedDescription && displayedDescription.length > 150"
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
          <div v-if="showSeasons" style="position:relative">
            <label style="color:rgba(255,255,255,0.8);font-weight:600;margin-bottom:0.5rem;display:block">Temporada:</label>
            
            <!-- Custom Season Dropdown -->
            <div class="custom-season-dropdown">
              <button 
                class="season-dropdown-trigger" 
                @click="showSeasonDropdown = !showSeasonDropdown"
                @blur="setTimeout(() => showSeasonDropdown = false, 200)"
              >
                <span>{{ seasonSelected }}</span>
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 16 16" 
                  fill="currentColor"
                  :style="{ transform: showSeasonDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }"
                >
                  <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
                </svg>
              </button>
              
              <div v-if="showSeasonDropdown" class="season-dropdown-menu">
                <div 
                  v-for="season in seasonDetails" 
                  :key="season.name"
                  class="season-dropdown-item"
                  :class="{ active: seasonSelected === season.name }"
                  @click="seasonSelected = season.name; showSeasonDropdown = false"
                >
                  <div class="season-item-left">
                    <span class="season-name">{{ season.name }} ({{ season.range }})</span>
                  </div>
                  <div class="season-item-right">
                    <span class="season-count">{{ season.episodeCount }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <button class="btn-close" @click="showAllEpisodes = false">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-episodes-list">
          <div v-if="filteredEpisodes.length === 0" style="color:rgba(255,255,255,0.7);padding:1rem">
            No hay episodios para la temporada seleccionada.
          </div>
          <div 
            v-for="episode in filteredEpisodes" 
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
  background: rgba(10, 10, 10, 0.95);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
  gap: 2rem;
}

.logo {
  height: 50px;
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
  font-weight: 600;
  font-size: 0.95rem;
  transition: color 0.3s;
  cursor: pointer;
  position: relative;
  padding: 0.5rem 0;
}

.nav-link:hover {
  color: #fff;
}

.nav-link.active {
  color: #a855f7;
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #a855f7, #9333ea);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn-search {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 0.6rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
}

.btn-search:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(168, 85, 247, 0.5);
}

.btn-watchlist {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.9rem;
}

.btn-watchlist:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(168, 85, 247, 0.5);
}

.user-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-profile {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a855f7, #9333ea);
  border: 2px solid rgba(168, 85, 247, 0.3);
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 0;
}

.btn-profile .profile-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.btn-profile:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(168, 85, 247, 0.5);
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
  overflow: hidden;
}

.youtube-player,
.video-player {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
  cursor: pointer;
}

/* Controles personalizados */
.custom-controls {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom, transparent 0%, transparent 70%, rgba(0,0,0,0.8) 100%);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}

.custom-controls.show {
  opacity: 1;
  pointer-events: all;
}

.play-pause-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.7);
  border: none;
  border-radius: 50%;
  width: 100px;
  height: 100px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: all;
}

.play-pause-center:hover {
  background: rgba(168, 85, 247, 0.8);
  transform: translate(-50%, -50%) scale(1.1);
}

.controls-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1rem;
  pointer-events: all;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  cursor: pointer;
  margin-bottom: 1rem;
  overflow: hidden;
}

.progress-bar:hover {
  height: 8px;
}

.progress-filled {
  height: 100%;
  background: #a855f7;
  transition: width 0.1s;
}

.controls-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.controls-left,
.controls-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.control-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  border-radius: 4px;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.time-display {
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.volume-slider {
  width: 80px;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
}

.volume-slider::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: #a855f7;
  border-radius: 50%;
  cursor: pointer;
}

.volume-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: #a855f7;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

/* Menú de configuración */
.settings-container {
  position: relative;
}

.settings-menu {
  position: absolute;
  bottom: 50px;
  right: 0;
  background: rgba(20, 20, 20, 0.98);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.5rem 0;
  min-width: 280px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  z-index: 1000;
}

.settings-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 1.2rem;
  color: white;
  font-size: 0.95rem;
  transition: background 0.2s;
}

.settings-item.clickable {
  cursor: pointer;
}

.settings-item.clickable:hover {
  background: rgba(255, 255, 255, 0.1);
}

.settings-value {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.3);
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: #a855f7;
}

input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

/* Submenú de calidad */
.quality-submenu {
  position: absolute;
  bottom: 50px;
  right: 0;
  background: rgba(20, 20, 20, 0.98);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.5rem 0;
  min-width: 280px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  z-index: 1001;
}

.submenu-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1.2rem;
  color: white;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transition: background 0.2s;
}

.submenu-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.quality-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 1.2rem;
  color: white;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.2s;
}

.quality-option:hover {
  background: rgba(255, 255, 255, 0.1);
}

.quality-option.active {
  color: #a855f7;
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
.btn-save,
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

.btn-continue {
  background: linear-gradient(90deg, #a855f7, #9333ea);
  border: none;
  color: #fff;
  padding: 0.6rem 1rem;
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.btn-continue:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(168,85,247,0.18);
}

.btn-like:hover,
.btn-dislike:hover,
.btn-save:hover,
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

.btn-save.active {
  background: var(--purple-primary);
  border-color: var(--purple-primary);
}

.btn-save.active svg {
  fill: currentColor;
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

/* Custom Season Dropdown Styles */
.custom-season-dropdown {
  position: relative;
  min-width: 280px;
}

.season-dropdown-trigger {
  width: 100%;
  background: rgba(30, 30, 30, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s ease;
}

.season-dropdown-trigger:hover {
  background: rgba(40, 40, 40, 0.95);
  border-color: rgba(255, 255, 255, 0.2);
}

.season-dropdown-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  background: rgba(20, 20, 20, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.season-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.season-dropdown-item:last-child {
  border-bottom: none;
}

.season-dropdown-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.season-dropdown-item.active {
  background: rgba(255, 255, 255, 0.1);
}

.season-item-left {
  flex: 1;
}

.season-name {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
  font-weight: 500;
}

.season-item-right {
  margin-left: 1rem;
}

.season-count {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
  font-weight: 400;
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