import { ref } from 'vue'
import { useAuth } from './useAuth'

const currentProfile = ref(null)
const { API_BASE_URL, authenticatedFetch } = useAuth()

export function useProfile() {
  async function loadProfile() {
    const profileId = localStorage.getItem('currentProfileId') || sessionStorage.getItem('currentProfileId')
    
    if (!profileId) {
      currentProfile.value = null
      return null
    }

    try {
      const response = await authenticatedFetch(`/api/manager/profiles/${profileId}/`)

      if (response.ok) {
        const data = await response.json()
        currentProfile.value = data
        return data
      } else {
        // Si el perfil no existe o hay error, limpiar
        localStorage.removeItem('currentProfileId')
        sessionStorage.removeItem('currentProfileId')
        currentProfile.value = null
        return null
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      currentProfile.value = null
      return null
    }
  }

  async function selectProfile(profileId, remember = true) {
    try {
      // Verificar que el perfil existe
      const response = await authenticatedFetch(`/api/manager/profiles/${profileId}/`)

      if (!response.ok) {
        throw new Error('Failed to select profile')
      }

      const data = await response.json()
      currentProfile.value = data

      // Guardar en localStorage/sessionStorage
      if (remember) {
        localStorage.setItem('currentProfileId', profileId)
      } else {
        sessionStorage.setItem('currentProfileId', profileId)
      }

      return data
    } catch (error) {
      console.error('Error selecting profile:', error)
      return null
    }
  }

  function clearProfile() {
    localStorage.removeItem('currentProfileId')
    sessionStorage.removeItem('currentProfileId')
    currentProfile.value = null
  }

  async function fetchProfiles() {
    try {
      const response = await authenticatedFetch('/api/manager/profiles/')

      if (response.ok) {
        return await response.json()
      }
      return []
    } catch (error) {
      console.error('Error fetching profiles:', error)
      return []
    }
  }

  return {
    currentProfile,
    loadProfile,
    selectProfile,
    clearProfile,
    fetchProfiles
  }
}
