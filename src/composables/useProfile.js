import { ref } from 'vue'
import { useAuth } from './useAuth'

const currentProfile = ref(null)
const { API_BASE_URL } = useAuth()

// Helper functions
function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop().split(';').shift()
  }
  return ''
}

async function setCsrfCookie() {
  await fetch(`${API_BASE_URL}/api/csrf/`, {
    credentials: 'include',
  })
}

export function useProfile() {
  async function loadProfile() {
    const profileId = localStorage.getItem('currentProfileId') || sessionStorage.getItem('currentProfileId')
    
    if (!profileId) {
      currentProfile.value = null
      return null
    }

    try {
      // Primero verificar que el perfil existe
      const response = await fetch(`${API_BASE_URL}/api/manager/profiles/${profileId}/`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        
        // Guardar el perfil en la sesión del backend
        await setCsrfCookie()
        const csrfToken = getCookie('csrftoken')
        
        await fetch(`${API_BASE_URL}/api/manager/profiles/select/`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
          },
          body: JSON.stringify({ profile_id: profileId })
        })
        
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
      // Guardar el perfil en la sesión del backend
      await setCsrfCookie()
      const csrfToken = getCookie('csrftoken')
      
      const response = await fetch(`${API_BASE_URL}/api/manager/profiles/select/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({ profile_id: profileId })
      })

      if (!response.ok) {
        throw new Error('Failed to select profile')
      }

      const data = await response.json()
      currentProfile.value = data.profile

      // También guardar en localStorage/sessionStorage para persistencia
      if (remember) {
        localStorage.setItem('currentProfileId', profileId)
      } else {
        sessionStorage.setItem('currentProfileId', profileId)
      }

      return data.profile
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
      const response = await fetch(`${API_BASE_URL}/api/manager/profiles/`, {
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
