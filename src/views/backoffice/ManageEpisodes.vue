<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../../composables/useAuth'

const router = useRouter()
const route = useRoute()
const { API_BASE_URL } = useAuth()

const animeId = ref(route.params.id)
const anime = ref(null)
const episodes = ref([])
const isLoading = ref(true)
const showAddForm = ref(false)
const errorMessage = ref('')
const showDeleteModal = ref(false)
const episodeToDelete = ref(null)
const showEditModal = ref(false)
const episodeToEdit = ref(null)
const editForm = ref({
  title: '',
  description: '',
  duration: 24,
  video_url: '',
  thumbnail: ''
})

const episodeForm = ref({
  episode_number: 1,
  title: '',
  description: '',
  duration: 24,
  video_url: '',
  thumbnail: ''
})

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

onMounted(async () => {
  await loadAnime()
  await loadEpisodes()
})

async function loadAnime() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/backoffice/animes/${animeId.value}/`, {
      credentials: 'include'
    })
    if (response.ok) {
      anime.value = await response.json()
    }
  } catch (error) {
    console.error('Error loading anime:', error)
  }
}

async function loadEpisodes() {
  isLoading.value = true
  try {
    const response = await fetch(`${API_BASE_URL}/api/backoffice/episodes/?anime_id=${animeId.value}`, {
      credentials: 'include'
    })
    if (response.ok) {
      const data = await response.json()
      episodes.value = data.results || data
    }
  } catch (error) {
    console.error('Error loading episodes:', error)
  } finally {
    isLoading.value = false
  }
}

async function saveEpisode() {
  errorMessage.value = ''
  
  if (!episodeForm.value.title.trim() || !episodeForm.value.video_url.trim()) {
    errorMessage.value = 'El título y la URL del video son obligatorios'
    return
  }

  try {
    await setCsrfCookie()
    const csrfToken = getCookie('csrftoken')
    
    const response = await fetch(`${API_BASE_URL}/api/backoffice/episodes/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({
        ...episodeForm.value,
        anime_id: animeId.value
      })
    })

    if (response.ok) {
      showAddForm.value = false
      resetForm()
      await loadEpisodes()
    } else {
      const error = await response.json()
      errorMessage.value = error.error || 'Error al guardar el episodio'
    }
  } catch (error) {
    errorMessage.value = 'Error de conexión'
    console.error('Error:', error)
  }
}

function resetForm() {
  const nextEpisodeNumber = episodes.value.length > 0 
    ? Math.max(...episodes.value.map(e => e.episode_number)) + 1 
    : 1
  
  episodeForm.value = {
    episode_number: nextEpisodeNumber,
    title: '',
    description: '',
    duration: 24,
    video_url: '',
    thumbnail: ''
  }
}

function deleteEpisode(episode) {
  episodeToDelete.value = episode
  showDeleteModal.value = true
}

function closeDeleteModal() {
  showDeleteModal.value = false
  episodeToDelete.value = null
}

async function confirmDelete() {
  if (!episodeToDelete.value) return

  try {
    await setCsrfCookie()
    const csrfToken = getCookie('csrftoken')
    
    const response = await fetch(`${API_BASE_URL}/api/backoffice/episodes/${episodeToDelete.value.id}/`, {
      method: 'DELETE',
      headers: {
        'X-CSRFToken': csrfToken,
      },
      credentials: 'include'
    })

    if (response.ok) {
      await loadEpisodes()
      closeDeleteModal()
    } else {
      console.error('Error al eliminar episodio')
      alert('Error al eliminar el episodio')
    }
  } catch (error) {
    console.error('Error deleting episode:', error)
    alert('Error al eliminar el episodio')
  }
}

function goBack() {
  router.push('/backoffice')
}

function openEditModal(episode) {
  episodeToEdit.value = episode
  editForm.value = {
    title: episode.title,
    description: episode.description || '',
    duration: episode.duration,
    video_url: episode.video_url,
    thumbnail: episode.thumbnail || ''
  }
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
  episodeToEdit.value = null
  editForm.value = {
    title: '',
    description: '',
    duration: 24,
    video_url: '',
    thumbnail: ''
  }
}

async function saveEdit() {
  if (!episodeToEdit.value) return
  
  if (!editForm.value.title.trim() || !editForm.value.video_url.trim()) {
    alert('El título y la URL del video son obligatorios')
    return
  }

  try {
    await setCsrfCookie()
    const csrfToken = getCookie('csrftoken')
    
    const response = await fetch(`${API_BASE_URL}/api/backoffice/episodes/${episodeToEdit.value.id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({
        ...editForm.value,
        anime_id: animeId.value,
        episode_number: episodeToEdit.value.episode_number
      })
    })

    if (response.ok) {
      await loadEpisodes()
      closeEditModal()
    } else {
      const error = await response.json()
      alert(error.error || 'Error al actualizar el episodio')
    }
  } catch (error) {
    console.error('Error updating episode:', error)
    alert('Error al actualizar el episodio')
  }
}
</script>

<template>
  <div class="manage-episodes-container">
    <!-- Header -->
    <header class="admin-header">
      <div class="logo-container">
        <img src="/Logo_AniToki.png" alt="AniToki" class="logo-image" />
        <span class="badge">ADMIN</span>
      </div>
      <div class="header-actions">
        <button class="btn-back" @click="goBack">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"></path>
          </svg>
          Volver
        </button>
      </div>
    </header>

    <!-- Anime Header Section -->
    <div class="anime-header-section" v-if="anime">
      <div class="anime-header-card" :style="{ backgroundImage: `url('${anime.cover_image}')` }">
        <div class="anime-header-overlay"></div>
        <div class="anime-header-info">
          <h1 class="anime-title">{{ anime.title }}</h1>
          <p class="anime-subtitle">Gestión de Episodios</p>
          <div class="anime-meta">
            <span>{{ anime.year }}</span>
            <span>•</span>
            <span>{{ anime.genre }}</span>
            <span>•</span>
            <span>{{ episodes.length }} episodios</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Episode Button -->
    <div class="content-section">
      <div class="section-header">
        <h2 class="section-title">Lista de Episodios</h2>
        <button class="btn-add-episode" @click="showAddForm = !showAddForm">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"></path>
          </svg>
          {{ showAddForm ? 'Cancelar' : 'Añadir Episodio' }}
        </button>
      </div>

      <!-- Add Episode Form -->
      <div v-if="showAddForm" class="add-form-container">
        <div class="add-form">
          <h3 class="form-title">Nuevo Episodio</h3>
          <form @submit.prevent="saveEpisode">
            <div class="form-row">
              <div class="form-group small">
                <label>Número *</label>
                <input 
                  v-model.number="episodeForm.episode_number" 
                  type="number" 
                  min="1"
                  required
                />
              </div>
              <div class="form-group">
                <label>Título *</label>
                <input 
                  v-model="episodeForm.title" 
                  type="text"
                  placeholder="Ej: El comienzo de la aventura"
                  required
                />
              </div>
              <div class="form-group small">
                <label>Duración (min)</label>
                <input 
                  v-model.number="episodeForm.duration" 
                  type="number" 
                  min="1"
                  max="300"
                />
              </div>
            </div>

            <div class="form-group">
              <label>URL del Video * (M3U8, YouTube, Google Drive, Vimeo, etc.)</label>
              <input 
                v-model="episodeForm.video_url" 
                type="url"
                placeholder="https://ejemplo.com/video.m3u8"
                required
              />
              <small>Admite URLs directas de video (M3U8, MP4) o URLs de incrustación</small>
            </div>

            <div class="form-group">
              <label>URL de Miniatura (opcional)</label>
              <input 
                v-model="episodeForm.thumbnail" 
                type="url"
                placeholder="https://ejemplo.com/thumbnail.jpg"
              />
            </div>

            <div class="form-group">
              <label>Descripción</label>
              <textarea 
                v-model="episodeForm.description"
                rows="3"
                placeholder="Descripción del episodio..."
              ></textarea>
            </div>

            <div v-if="errorMessage" class="error-message">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {{ errorMessage }}
            </div>

            <div class="form-actions">
              <button type="submit" class="btn-save">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Guardar Episodio
              </button>
              <button type="button" class="btn-cancel" @click="showAddForm = false">Cancelar</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Episodes List -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando episodios...</p>
      </div>
      
      <div v-else-if="episodes.length === 0" class="empty-state">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <polygon points="23 7 16 12 23 17 23 7"></polygon>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
        </svg>
        <h3>No hay episodios registrados</h3>
        <p>Comienza añadiendo el primer episodio de este anime</p>
        <button class="btn-empty-add" @click="showAddForm = true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"></path>
          </svg>
          Añadir primer episodio
        </button>
      </div>

      <div v-else class="episodes-grid">
        <div v-for="episode in episodes" :key="episode.id" class="episode-card">
          <div class="episode-thumbnail">
            <img 
              v-if="episode.thumbnail" 
              :src="episode.thumbnail" 
              :alt="episode.title"
            />
            <div v-else class="placeholder-thumbnail">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
            <div class="episode-number">EP {{ episode.episode_number }}</div>
            <div class="episode-duration">{{ episode.duration }} min</div>
          </div>
          <div class="episode-content">
            <div class="episode-info">
              <h3 class="episode-title">{{ episode.title }}</h3>
              <p class="episode-description" v-if="episode.description">{{ episode.description }}</p>
              <div class="episode-url">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
                <span>{{ episode.video_url }}</span>
              </div>
            </div>
            <div class="episode-actions">
              <button class="btn-action btn-edit" @click="openEditModal(episode)" title="Editar episodio">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="btn-action btn-delete" @click="deleteEpisode(episode)" title="Eliminar episodio">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Confirmación de Eliminación -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="closeDeleteModal">
      <div class="modal-content" @click.stop>
        <div class="modal-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h2 class="modal-title">¿Eliminar episodio?</h2>
        <p class="modal-message">
          ¿Estás seguro de que deseas eliminar <strong>"{{ episodeToDelete?.title }}"</strong>?
          <br><br>
          Esta acción no se puede deshacer.
        </p>
        <div class="modal-actions">
          <button class="btn-modal-cancel" @click="closeDeleteModal">Cancelar</button>
          <button class="btn-modal-delete" @click="confirmDelete">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Eliminar
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Edición -->
    <div v-if="showEditModal" class="modal-overlay" @click="closeEditModal">
      <div class="modal-content modal-edit" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">Editar Episodio</h2>
          <button class="btn-close" @click="closeEditModal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <form @submit.prevent="saveEdit" class="edit-form">
          <div class="form-group">
            <label>Título *</label>
            <input 
              v-model="editForm.title" 
              type="text"
              placeholder="Título del episodio"
              required
            />
          </div>

          <div class="form-group">
            <label>URL del Video * (M3U8, YouTube, etc.)</label>
            <input 
              v-model="editForm.video_url" 
              type="url"
              placeholder="https://ejemplo.com/video.m3u8"
              required
            />
            <small>Admite URLs de M3U8, YouTube (embed), MP4, etc.</small>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Duración (minutos)</label>
              <input 
                v-model.number="editForm.duration" 
                type="number" 
                min="1"
                max="300"
              />
            </div>
            <div class="form-group">
              <label>Miniatura (URL)</label>
              <input 
                v-model="editForm.thumbnail" 
                type="url"
                placeholder="https://ejemplo.com/thumbnail.jpg"
              />
            </div>
          </div>

          <div class="form-group">
            <label>Descripción</label>
            <textarea 
              v-model="editForm.description"
              rows="3"
              placeholder="Descripción del episodio..."
            ></textarea>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-modal-cancel" @click="closeEditModal">Cancelar</button>
            <button type="submit" class="btn-modal-save">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Container Principal */
.manage-episodes-container {
  min-height: 100vh;
  background: linear-gradient(to bottom, #0a0a0a, #1a1a1a);
  color: #fff;
}

/* Header con Logo */
.admin-header {
  background: rgba(20, 20, 20, 0.95);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-image {
  height: 45px;
  width: auto;
  object-fit: contain;
}

.badge {
  font-size: 0.7rem;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.btn-back {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s;
}

.btn-back:hover {
  background: #a855f7;
  border-color: #a855f7;
}

/* Anime Header Section */
.anime-header-section {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.anime-header-card {
  background-size: cover;
  background-position: center;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  height: 200px;
}

.anime-header-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0.6));
}

.anime-header-info {
  position: relative;
  z-index: 2;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
}

.anime-title {
  font-size: 2.2rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  color: #fff;
}

.anime-subtitle {
  font-size: 1.1rem;
  color: #a855f7;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
}

.anime-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.7);
}

.anime-meta span {
  display: flex;
  align-items: center;
}

/* Content Section */
.content-section {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.8rem;
  font-weight: 600;
  margin: 0;
  color: #fff;
}

.btn-add-episode {
  background: #a855f7;
  border: none;
  color: #fff;
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s;
}

.btn-add-episode:hover {
  background: #9333ea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4);
}

/* Add Form Container */
.add-form-container {
  margin-bottom: 2rem;
}

.add-form {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 2rem;
  backdrop-filter: blur(10px);
}

.form-title {
  margin: 0 0 1.5rem 0;
  font-size: 1.4rem;
  font-weight: 600;
  color: #fff;
}

.form-row {
  display: grid;
  grid-template-columns: 100px 1fr 120px;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group.small {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  font-size: 0.95rem;
}

.form-group input,
.form-group textarea {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  padding: 0.85rem;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.95rem;
  transition: all 0.3s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #a855f7;
  background: rgba(168, 85, 247, 0.05);
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1);
}

.form-group small {
  display: block;
  margin-top: 0.4rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
}

.error-message {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.95rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.btn-save {
  background: #a855f7;
  color: #fff;
  border: none;
  padding: 0.85rem 2rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s;
}

.btn-save:hover {
  background: #9333ea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4);
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  padding: 0.85rem 2rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.3s;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: 4rem 2rem;
  color: rgba(255, 255, 255, 0.6);
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(168, 85, 247, 0.2);
  border-top-color: #a855f7;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 5rem 2rem;
  color: rgba(255, 255, 255, 0.6);
}

.empty-state svg {
  opacity: 0.3;
  margin-bottom: 1.5rem;
}

.empty-state h3 {
  font-size: 1.5rem;
  margin: 0 0 0.5rem 0;
  color: rgba(255, 255, 255, 0.8);
}

.empty-state p {
  font-size: 1rem;
  margin: 0;
  color: rgba(255, 255, 255, 0.5);
}

.btn-empty-add {
  background: #a855f7;
  color: #fff;
  border: none;
  padding: 0.85rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 1.5rem;
  font-weight: 600;
  font-size: 1rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s;
}

.btn-empty-add:hover {
  background: #9333ea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4);
}

/* Episodes Grid */
.episodes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.episode-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
}

.episode-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(168, 85, 247, 0.3);
  border-color: rgba(168, 85, 247, 0.4);
}

.episode-thumbnail {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
}

.episode-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder-thumbnail {
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.3);
}

.episode-number {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  padding: 0.4rem 0.85rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 700;
  color: #a855f7;
  border: 1px solid rgba(168, 85, 247, 0.3);
}

.episode-duration {
  position: absolute;
  bottom: 0.75rem;
  right: 0.75rem;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  padding: 0.3rem 0.7rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
}

.episode-content {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
}

.episode-info {
  flex: 1;
}

.episode-title {
  margin: 0 0 0.75rem 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: #fff;
  line-height: 1.4;
}

.episode-description {
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.episode-url {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
  padding: 0.6rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.episode-url svg {
  flex-shrink: 0;
}

.episode-url span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.episode-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-action {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  width: 42px;
  height: 42px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.btn-action:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.btn-action.btn-delete:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.4);
  color: #fca5a5;
}

.btn-action.btn-edit:hover {
  background: rgba(168, 85, 247, 0.2);
  border-color: rgba(168, 85, 247, 0.4);
  color: #e9d5ff;
}

/* Responsive */
/* Modal de Confirmación */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.98), rgba(20, 20, 20, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 2rem;
  width: 90%;
  max-width: 480px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 1px rgba(168, 85, 247, 0.3);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 1.5rem;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
}

.modal-title {
  color: #fff;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  text-align: center;
}

.modal-message {
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
  line-height: 1.6;
  margin: 0 0 2rem 0;
  text-align: center;
}

.modal-message strong {
  color: #a855f7;
  font-weight: 600;
}

.modal-actions {
  display: flex;
  gap: 1rem;
}

.btn-modal-cancel {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  padding: 0.9rem 1.5rem;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-modal-cancel:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}

.btn-modal-delete {
  flex: 1;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: none;
  color: #fff;
  padding: 0.9rem 1.5rem;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.btn-modal-delete:hover {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
}

/* Modal de Edición */
.modal-content.modal-edit {
  max-width: 600px;
  padding: 0;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(168, 85, 247, 0.05);
}

.modal-header .modal-title {
  margin: 0;
  text-align: left;
  font-size: 1.25rem;
}

.btn-close {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: rotate(90deg);
}

.edit-form {
  padding: 2rem;
}

.edit-form .form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.edit-form .form-group {
  margin-bottom: 1.5rem;
}

.edit-form .form-group label {
  display: block;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.edit-form .form-group input,
.edit-form .form-group textarea {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.3s;
}

.edit-form .form-group input:focus,
.edit-form .form-group textarea:focus {
  outline: none;
  border-color: #a855f7;
  background: rgba(168, 85, 247, 0.05);
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1);
}

.edit-form .form-group small {
  display: block;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
  margin-top: 0.3rem;
}

.btn-modal-save {
  flex: 1;
  background: linear-gradient(135deg, #a855f7, #9333ea);
  border: none;
  color: #fff;
  padding: 0.9rem 1.5rem;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
}

.btn-modal-save:hover {
  background: linear-gradient(135deg, #9333ea, #7e22ce);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(168, 85, 247, 0.4);
}

@media (max-width: 1024px) {
  .manage-episodes-container {
    padding: 1.5rem;
  }

  .episodes-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}

@media (max-width: 768px) {
  .manage-episodes-container {
    padding: 1rem;
  }

  .anime-title {
    font-size: 1.5rem;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .episodes-grid {
    grid-template-columns: 1fr;
  }

  .modal-actions {
    flex-direction: column;
  }

  .btn-modal-save,
  .btn-modal-cancel {
    width: 100%;
  }

  .episode-actions {
    gap: 0.5rem;
  }
}

@media (max-width: 480px) {
  .manage-episodes-container {
    padding: 0.75rem;
  }

  .anime-title {
    font-size: 1.25rem;
  }

  .episode-card {
    padding: 0.75rem;
  }

  .episode-number {
    font-size: 0.875rem;
  }

  .form-group label {
    font-size: 0.875rem;
  }

  .btn-add-episode,
  .btn-bulk-add {
    padding: 0.6rem 1rem;
    font-size: 0.875rem;
  }
}
</style>
