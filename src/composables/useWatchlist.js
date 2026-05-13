import { ref, watch, computed } from 'vue'
import { useAuth } from './useAuth'
import { useProfile } from './useProfile'

// Cache vinculado por perfil
const watchlistCacheByProfile = ref({})
const watchlistLoading = ref(false)
let watchlistPromise = null

export function useWatchlist() {
  const { authenticatedFetch } = useAuth()
  const { currentProfile } = useProfile()

  // Computed que devuelve el cache del perfil actual
  const watchlistCache = computed(() => {
    if (!currentProfile.value?.id) return null
    return watchlistCacheByProfile.value[currentProfile.value.id] || null
  })

  // Limpiar el promise cuando cambia el perfil
  watch(() => currentProfile.value?.id, (newProfileId, oldProfileId) => {
    if (newProfileId !== oldProfileId) {
      // El perfil cambió, invalidar el promise actual
      watchlistPromise = null
    }
  })

  function setProfileCache(data) {
    if (!currentProfile.value?.id) return
    watchlistCacheByProfile.value[currentProfile.value.id] = data
  }

  function clearProfileCache() {
    if (!currentProfile.value?.id) return
    delete watchlistCacheByProfile.value[currentProfile.value.id]
  }

  async function loadWatchlist() {
    // Si no hay perfil, retornar array vacío
    if (!currentProfile.value) {
      return []
    }

    // Si ya está cargando, esperar a que termine
    if (watchlistLoading.value && watchlistPromise) {
      return watchlistPromise
    }

    // Si ya tenemos cache válido para este perfil, retornarlo
    if (watchlistCache.value !== null && watchlistCache.value !== undefined) {
      return watchlistCache.value
    }

    // Cargar desde el servidor
    watchlistLoading.value = true
    watchlistPromise = (async () => {
      try {
        const profileId = currentProfile.value?.id
        if (!profileId) {
          setProfileCache([])
          return []
        }

        const response = await authenticatedFetch(`/api/manager/watchlist/?profile_id=${profileId}`)
        
        if (response.ok) {
          const data = await response.json()
          setProfileCache(data)
          return data
        } else {
          setProfileCache([])
          return []
        }
      } catch (error) {
        console.error('Error loading watchlist:', error)
        setProfileCache([])
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
    clearProfileCache()
  }

  async function addToWatchlist(animeId) {
    try {
      const profileId = currentProfile.value?.id
      if (!profileId) return false

      const response = await authenticatedFetch('/api/manager/watchlist/', {
        method: 'POST',
        body: JSON.stringify({ 
          anime_id: animeId,
          profile_id: profileId
        })
      })

      if (response.ok) {
        clearProfileCache() // Invalidar cache para que se recargue
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
      const profileId = currentProfile.value?.id
      if (!profileId) return false

      const response = await authenticatedFetch(`/api/manager/watchlist/remove/${animeId}/?profile_id=${profileId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        clearProfileCache() // Invalidar cache para que se recargue
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
