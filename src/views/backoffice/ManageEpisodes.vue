<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const animeId = ref(route.params.id)
const anime = ref(null)
const episodes = ref([])
const isLoading = ref(true)
const showAddForm = ref(false)
const errorMessage = ref('')

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
  await fetch('/api/csrf/', {
    credentials: 'include',
  })
}

onMounted(async () => {
  await loadAnime()
  await loadEpisodes()
})

async function loadAnime() {
  try {
    const response = await fetch(`/api/backoffice/animes/${animeId.value}/`, {
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
    const response = await fetch(`/api/backoffice/episodes/?anime_id=${animeId.value}`, {
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
    
    const response = await fetch('/api/backoffice/episodes/', {
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

async function deleteEpisode(episodeId) {
  if (!confirm('¿Estás seguro de eliminar este episodio?')) return

  try {
    await setCsrfCookie()
    const csrfToken = getCookie('csrftoken')
    
    const response = await fetch(`/api/backoffice/episodes/${episodeId}/`, {
      method: 'DELETE',
      headers: {
        'X-CSRFToken': csrfToken,
      },
      credentials: 'include'
    })

    if (response.ok) {
      await loadEpisodes()
    }
  } catch (error) {
    console.error('Error deleting episode:', error)
  }
}

function goBack() {
  router.push('/backoffice')
}
</script>

<template>
  <div class="manage-episodes-container">
    <!-- Header -->
    <header class="header">
      <div>
        <h1 class="title" v-if="anime">Episodios de: {{ anime.title }}</h1>
        <h1 class="title" v-else>Gestionar Episodios</h1>
        <p class="subtitle">Agrega y administra los episodios con sus enlaces de video</p>
      </div>
      <button class="btn-back" @click="goBack">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"></path>
        </svg>
        Volver
      </button>
    </header>

    <!-- Add Episode Button -->
    <div class="content">
      <div class="section-header">
        <h2>Lista de Episodios</h2>
        <button class="btn-add" @click="showAddForm = !showAddForm">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"></path>
          </svg>
          {{ showAddForm ? 'Cancelar' : 'Añadir Episodio' }}
        </button>
      </div>

      <!-- Add Episode Form -->
      <div v-if="showAddForm" class="add-form">
        <h3>Nuevo Episodio</h3>
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
            <label>URL del Video * (YouTube, Google Drive, Vimeo, etc.)</label>
            <input 
              v-model="episodeForm.video_url" 
              type="url"
              placeholder="https://www.youtube.com/embed/..."
              required
            />
            <small>Usa la URL de incrustación (embed) para mejor compatibilidad</small>
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
            {{ errorMessage }}
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-save">Guardar Episodio</button>
            <button type="button" class="btn-cancel" @click="showAddForm = false">Cancelar</button>
          </div>
        </form>
      </div>

      <!-- Episodes List -->
      <div v-if="isLoading" class="loading">Cargando episodios...</div>
      
      <div v-else-if="episodes.length === 0" class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <polygon points="23 7 16 12 23 17 23 7"></polygon>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
        </svg>
        <p>No hay episodios registrados</p>
        <button class="btn-empty-add" @click="showAddForm = true">Añadir primer episodio</button>
      </div>

      <div v-else class="episodes-list">
        <div v-for="episode in episodes" :key="episode.id" class="episode-card">
          <div class="episode-thumbnail">
            <img 
              v-if="episode.thumbnail" 
              :src="episode.thumbnail" 
              :alt="episode.title"
            />
            <div v-else class="placeholder-thumbnail">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
            <div class="episode-number">EP {{ episode.episode_number }}</div>
          </div>
          <div class="episode-info">
            <h3>{{ episode.title }}</h3>
            <p class="episode-meta">Duración: {{ episode.duration }} min</p>
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
            <button class="btn-icon btn-delete" @click="deleteEpisode(episode.id)" title="Eliminar">
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
</template>

<style scoped>
.manage-episodes-container {
  min-height: 100vh;
  background: linear-gradient(to bottom, #0a0a0a, #1a1a1a);
  color: #fff;
}

.header {
  background: rgba(20, 20, 20, 0.95);
  padding: 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
}

.subtitle {
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

.btn-back {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.15);
}

.content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.section-header h2 {
  font-size: 1.5rem;
  margin: 0;
}

.btn-add {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  transition: transform 0.2s;
}

.btn-add:hover {
  transform: translateY(-2px);
}

.add-form {
  background: rgba(30, 30, 30, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
}

.add-form h3 {
  margin: 0 0 1.5rem 0;
  font-size: 1.25rem;
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
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.form-group input,
.form-group textarea {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 0.75rem;
  border-radius: 8px;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
}

.error-message {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
}

.btn-save {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 0.75rem 2rem;
  border-radius: 8px;
  cursor: pointer;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: rgba(255, 255, 255, 0.6);
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: rgba(255, 255, 255, 0.6);
}

.empty-state svg {
  opacity: 0.3;
  margin-bottom: 1rem;
}

.btn-empty-add {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 1rem;
}

.episodes-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.episode-card {
  background: rgba(30, 30, 30, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  gap: 1.5rem;
  transition: all 0.3s;
}

.episode-card:hover {
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.episode-thumbnail {
  position: relative;
  width: 200px;
  height: 113px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
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
  top: 0.5rem;
  left: 0.5rem;
  background: rgba(0, 0, 0, 0.8);
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 600;
}

.episode-info {
  flex: 1;
}

.episode-info h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
}

.episode-meta {
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
}

.episode-description {
  color: rgba(255, 255, 255, 0.7);
  margin: 0.5rem 0;
}

.episode-url {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
  margin-top: 0.75rem;
}

.episode-url span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.episode-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.btn-icon {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.15);
}

.btn-icon.btn-delete:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.4);
  color: #f87171;
}
</style>
