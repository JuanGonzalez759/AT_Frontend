import { ref } from 'vue'

const currentProfile = ref(null)

export function useProfile() {
  async function loadProfile() {
    const profileId = localStorage.getItem('currentProfileId') || sessionStorage.getItem('currentProfileId')
    
    if (!profileId) {
      currentProfile.value = null
      return null
    }

    try {
      const response = await fetch(`/api/manager/profiles/${profileId}/`, {
        credentials: 'include'
      })

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
    if (remember) {
      localStorage.setItem('currentProfileId', profileId)
    } else {
      sessionStorage.setItem('currentProfileId', profileId)
    }

    // Cargar datos del perfil
    return await loadProfile()
  }

  function clearProfile() {
    localStorage.removeItem('currentProfileId')
    sessionStorage.removeItem('currentProfileId')
    currentProfile.value = null
  }

  async function fetchProfiles() {
    try {
      const response = await fetch('/api/manager/profiles/', {
        credentials: 'include'
      })

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
