<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const animeForm = ref({
  title: '',
  year: new Date().getFullYear(),
  genre: '',
  description: '',
  cover_image: '',
  background_image: '',
  rating: 0.0,
})

const isSaving = ref(false)
const isLoading = ref(true)
const errorMessage = ref('')

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
})

async function loadAnime() {
  isLoading.value = true
  try {
    const response = await fetch(`/api/backoffice/animes/${route.params.id}/`, {
      credentials: 'include'
    })

    if (response.ok) {
      const anime = await response.json()
      animeForm.value = {
        title: anime.title,
        year: anime.year,
        genre: anime.genre,
        description: anime.description,
        cover_image: anime.cover_image,
        background_image: anime.background_image,
        rating: anime.rating,
      }
    } else {
      errorMessage.value = 'Error al cargar el anime'
      setTimeout(() => router.push('/backoffice'), 2000)
    }
  } catch (error) {
    errorMessage.value = 'Error de conexión'
    console.error('Error:', error)
  } finally {
    isLoading.value = false
  }
}

async function saveAnime() {
  if (!animeForm.value.title.trim() || !animeForm.value.genre.trim()) {
    errorMessage.value = 'El título y el género son obligatorios'
    return
  }

  isSaving.value = true
  errorMessage.value = ''

  try {
    await setCsrfCookie()
    const csrfToken = getCookie('csrftoken')
    
    const response = await fetch(`/api/backoffice/animes/${route.params.id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify(animeForm.value)
    })

    if (response.ok) {
      router.push('/backoffice')
    } else {
      const error = await response.json()
      errorMessage.value = error.error || 'Error al actualizar el anime'
    }
  } catch (error) {
    errorMessage.value = 'Error de conexión al guardar'
    console.error('Error:', error)
  } finally {
    isSaving.value = false
  }
}

function cancel() {
  router.push('/backoffice')
}
</script>

<template>
  <div class="edit-anime-container">
    <!-- Header -->
    <header class="form-header">
      <div>
        <h1 class="form-title">Editar Anime</h1>
        <p class="form-subtitle">Actualiza los datos del anime</p>
      </div>
      <button class="btn-back" @click="cancel">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"></path>
        </svg>
        Volver
      </button>
    </header>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando anime...</p>
    </div>

    <!-- Form Content -->
    <div v-else class="form-content">
      <form @submit.prevent="saveAnime" class="anime-form">
        <div class="form-row">
          <div class="form-group">
            <label>Título del Anime *</label>
            <input 
              v-model="animeForm.title" 
              type="text" 
              class="form-input"
              placeholder="Ej: One Piece"
              required
            />
          </div>

          <div class="form-group">
            <label>Año *</label>
            <input 
              v-model.number="animeForm.year" 
              type="number" 
              class="form-input"
              min="1900"
              :max="new Date().getFullYear() + 5"
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label>Género *</label>
          <input 
            v-model="animeForm.genre" 
            type="text" 
            class="form-input"
            placeholder="Ej: Acción, Aventura, Shonen"
            required
          />
        </div>

        <div class="form-group">
          <label>Descripción</label>
          <textarea 
            v-model="animeForm.description" 
            class="form-textarea"
            rows="5"
            placeholder="Descripción del anime..."
          ></textarea>
        </div>

        <div class="form-group">
          <label>URL de Imagen de Portada</label>
          <input 
            v-model="animeForm.cover_image" 
            type="url" 
            class="form-input"
            placeholder="https://ejemplo.com/portada.jpg"
          />
          <div v-if="animeForm.cover_image" class="image-preview">
            <img :src="animeForm.cover_image" alt="Preview" @error="(e) => e.target.src = 'https://via.placeholder.com/150x200?text=No+Image'" />
          </div>
        </div>

        <div class="form-group">
          <label>URL de Imagen de Fondo</label>
          <input 
            v-model="animeForm.background_image" 
            type="url" 
            class="form-input"
            placeholder="https://ejemplo.com/fondo.jpg"
          />
          <div v-if="animeForm.background_image" class="image-preview image-preview-wide">
            <img :src="animeForm.background_image" alt="Preview" @error="(e) => e.target.src = 'https://via.placeholder.com/400x200?text=No+Image'" />
          </div>
        </div>

        <div class="form-group">
          <label>Puntuación (0-10)</label>
          <input 
            v-model.number="animeForm.rating" 
            type="number" 
            class="form-input"
            min="0"
            max="10"
            step="0.1"
          />
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-save" :disabled="isSaving">
            <svg v-if="!isSaving" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            <span v-if="isSaving">Actualizando...</span>
            <span v-else>Actualizar Anime</span>
          </button>
          <button type="button" class="btn-cancel" @click="cancel" :disabled="isSaving">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.edit-anime-container {
  min-height: 100vh;
  background: linear-gradient(to bottom, #0a0a0a, #1a1a1a);
  color: #fff;
}

.form-header {
  background: rgba(10, 10, 10, 0.95);
  padding: 1rem 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
}

.form-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.25rem 0;
  color: #fff;
}

.form-subtitle {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

.btn-back {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(168, 85, 247, 0.5);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: rgba(255, 255, 255, 0.5);
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(168, 85, 247, 0.2);
  border-top-color: #a855f7;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.form-content {
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
}

.anime-form {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 2.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  color: #ccc;
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 0.6rem;
}

.form-input,
.form-textarea {
  width: 100%;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 0.85rem 1rem;
  color: #fff;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.3s;
  font-family: inherit;
}

.form-input:focus,
.form-textarea:focus {
  border-color: #a855f7;
  background: rgba(0, 0, 0, 0.5);
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1);
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.form-textarea {
  resize: vertical;
}

.image-preview {
  margin-top: 1rem;
  width: 150px;
  aspect-ratio: 2/3;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.image-preview-wide {
  width: 100%;
  aspect-ratio: 16/9;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.error-message {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-save {
  flex: 1;
  background: #a855f7;
  border: none;
  color: #fff;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s;
}

.btn-save:hover:not(:disabled) {
  background: #9333ea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4);
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-cancel {
  flex: 1;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-cancel:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.3);
}

.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 1024px) {
  .edit-anime-container {
    padding: 1.5rem;
  }
}

@media (max-width: 768px) {
  .edit-anime-container {
    padding: 1rem;
  }

  .anime-title {
    font-size: 1.5rem;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn-save,
  .btn-cancel {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .edit-anime-container {
    padding: 0.75rem;
  }

  .anime-title {
    font-size: 1.25rem;
  }

  .form-group label {
    font-size: 0.875rem;
  }

  .btn-save,
  .btn-cancel {
    padding: 0.6rem 1rem;
    font-size: 0.875rem;
  }
}
</style>
