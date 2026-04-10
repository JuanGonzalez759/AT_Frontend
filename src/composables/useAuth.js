import { ref } from 'vue'

const currentUser = ref(null)

function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop().split(';').shift()
  }
  return ''
}

async function setCsrfCookie() {
  await fetch('/api/csrf/', {
    credentials: 'include',
  })
}

export function useAuth() {
  async function loadCurrentUser() {
    try {
      const response = await fetch('/api/auth/user/', { credentials: 'include' })
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
    await setCsrfCookie()
    const csrfToken = getCookie('csrftoken')
    
    const response = await fetch('/api/auth/register/', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify({ username, email, password }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({ detail: 'Error al registrar' }))
      throw new Error(data.detail || 'Error al registrar')
    }

    const data = await response.json()
    currentUser.value = data.user
    return data
  }

  async function login(username, password) {
    await setCsrfCookie()
    const csrfToken = getCookie('csrftoken')
    
    const response = await fetch('/api/auth/login/', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify({ username, password }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({ detail: 'Credenciales inválidas' }))
      throw new Error(data.detail || 'Credenciales inválidas')
    }

    const data = await response.json()
    currentUser.value = data.user
    return data.user
  }

  async function logout() {
    try {
      await setCsrfCookie()
      const csrfToken = getCookie('csrftoken')
      
      const response = await fetch('/api/auth/logout/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken,
        },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({ detail: 'Error al cerrar sesión' }))
        throw new Error(data.detail || 'Error al cerrar sesión')
      }

      const data = await response.json()
      return data
    } catch (error) {
      // Incluso si hay un error, limpiamos el usuario localmente
      throw error
    } finally {
      // Siempre limpiar el usuario, incluso si hay error en el servidor
      currentUser.value = null
    }
  }

  return {
    currentUser,
    loadCurrentUser,
    register,
    login,
    logout,
  }
}
