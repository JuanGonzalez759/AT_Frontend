import { ref } from 'vue'
import { useAuth } from './useAuth'
import { useProfile } from './useProfile'

// Cache compartido entre todos los componentes
const watchlistCache = ref(null)
const watchlistLoading = ref(false)
let watchlistPromise = null

export function useWatchlist() {
  const { authenticatedFetch } = useAuth()
  const { currentProfile } = useProfile()

  async function loadWatchlist() {
    // Si no hay perfil, retornar array vacío
    if (!currentProfile.value) {
      watchlistCache.value = []
      return []
    }

    // Si ya está cargando, esperar a que termine
    if (watchlistLoading.value && watchlistPromise) {
      return watchlistPromise
    }

    // Si ya tenemos cache válido, retornarlo
    if (watchlistCache.value !== null) {
      return watchlistCache.value
    }

    // Cargar desde el servidor
    watchlistLoading.value = true
    watchlistPromise = (async () => {
      try {
        const response = await authenticatedFetch('/api/manager/watchlist/')
        
        if (response.ok) {
          const data = await response.json()
          watchlistCache.value = data
          return data
        } else {
          watchlistCache.value = []
          return []
        }
      } catch (error) {
        console.error('Error loading watchlist:', error)
        watchlistCache.value = []
        return []
      } finally {
        watchlistLoading.value = false
        watchlistPromise = null
      }
    })()

    return watchlistPromise
  }

  function isInWatchlist(animeId) {
    if (!watchlistCache.value) return false
    return watchlistCache.value.some(item => item.anime.id === animeId)
  }

  function clearCache() {
    watchlistCache.value = null
  }

  async function addToWatchlist(animeId) {
    try {
      const response = await authenticatedFetch('/api/manager/watchlist/', {
        method: 'POST',
        body: JSON.stringify({ anime_id: animeId })
      })

      if (response.ok) {
        clearCache() // Invalidar cache para que se recargue
        return true
      }
      return false
    } catch (error) {
      console.error('Error adding to watchlist:', error)
      return false
    }
  }

  async function removeFromWatchlist(animeId) {
    try {
      const response = await authenticatedFetch(`/api/manager/watchlist/remove/${animeId}/`, {
        method: 'DELETE'
      })

      if (response.ok) {
        clearCache() // Invalidar cache para que se recargue
        return true
      }
      return false
    } catch (error) {
      console.error('Error removing from watchlist:', error)
      return false
    }
  }

  return {
    watchlistCache,
    watchlistLoading,
    loadWatchlist,
    isInWatchlist,
    clearCache,
    addToWatchlist,
    removeFromWatchlist,
  }
}
