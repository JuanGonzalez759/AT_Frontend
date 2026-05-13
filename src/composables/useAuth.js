import { ref } from 'vue'

const currentUser = ref(null)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

// Funciones para manejar tokens en localStorage
function getAccessToken() {
  return localStorage.getItem('access_token')
}

function getRefreshToken() {
  return localStorage.getItem('refresh_token')
}

function setTokens(access, refresh) {
  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)
}

function clearTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

// Headers con autenticación
function getAuthHeaders() {
  const token = getAccessToken()
  const headers = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export function useAuth() {
  async function loadCurrentUser() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/user/`, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) {
        currentUser.value = null
        return null
      }
      const data = await response.json()
      currentUser.value = data.isAuthenticated ? data.user : null
      return currentUser.value
    } catch (error) {
      currentUser.value = null
      return null
    }
  }

  async function register(username, email, password) {
    const response = await fetch(`${API_BASE_URL}/api/auth/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({ detail: 'Error al registrar' }))
      throw new Error(data.detail || 'Error al registrar')
    }

    const data = await response.json()
    
    // Guardar tokens
    setTokens(data.access, data.refresh)
    
    currentUser.value = data.user
    return data
  }

  async function login(username, password) {
    const response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({ detail: 'Credenciales inválidas' }))
      throw new Error(data.detail || 'Credenciales inválidas')
    }

    const data = await response.json()
    
    // Guardar tokens
    setTokens(data.access, data.refresh)
    
    currentUser.value = data.user
    return data.user
  }

  async function logout() {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout/`, {
        method: 'POST',
        headers: getAuthHeaders(),
      })
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    } finally {
      // Siempre limpiar tokens y usuario
      clearTokens()
      currentUser.value = null
    }
  }

  // Helper para hacer requests autenticados con token JWT
  async function authenticatedFetch(url, options = {}) {
    const { headers: optionsHeaders, ...restOptions } = options
    
    const mergedHeaders = {
      ...getAuthHeaders(),
      ...optionsHeaders,
    }
    
    const finalOptions = {
      headers: mergedHeaders,
      ...restOptions
    }
    
    return fetch(url, finalOptions)
  }

  return {
    currentUser,
    loadCurrentUser,
    register,
    login,
    logout,
    authenticatedFetch,
  }
}
