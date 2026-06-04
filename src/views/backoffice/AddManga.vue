<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'

const router = useRouter()
const { API_BASE_URL, authenticatedFetch } = useAuth()

const mangaForm = ref({
  title: '',
  year: new Date().getFullYear(),
  genre: '',
  description: '',
  cover_image: '',
  background_image: '',
  rating: 0.0,
  chapter_count: 0,
})

const isSaving = ref(false)
const errorMessage = ref('')

// Modal de error
const showErrorModal = ref(false)
const errorModalMessage = ref('')
const errorModalTitle = ref('Error')

// Jikan API Search
const searchQuery = ref('')
const searchResults = ref([])
const isSearching = ref(false)
const showResults = ref(false)
let searchTimeout = null

function showError(title, message) {
  errorModalTitle.value = title
  errorModalMessage.value = message
  showErrorModal.value = true
}

function closeErrorModal() {
  showErrorModal.value = false
  errorModalTitle.value = 'Error'
  errorModalMessage.value = ''
}

function searchJikan() {
  if (searchTimeout) clearTimeout(searchTimeout)
  const query = searchQuery.value.trim()
  if (query.length < 3) {
    searchResults.value = []
    showResults.value = false
    return
  }

  searchTimeout = setTimeout(async () => {
    isSearching.value = true
    try {
      const response = await authenticatedFetch(`/api/backoffice/jikan/manga/search/?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        searchResults.value = data.results || []
        showResults.value = true
      } else if (response.status === 429) {
        const errorData = await response.json()
        showError('⏱️ Límite de búsqueda alcanzado', errorData.message || 'Has realizado demasiadas búsquedas. Por favor, espera unos segundos e intenta de nuevo.')
        searchResults.value = []
      } else {
        const errorData = await response.json()
        console.error('Error searching Jikan API (manga):', errorData)
        showError('⚠️ Error de búsqueda', errorData.message || 'Error al buscar en MyAnimeList. Usa el formulario manual.')
        searchResults.value = []
      }
    } catch (error) {
      console.error('Error:', error)
      showError('🌐 Error de conexión', 'No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet o ingresa los datos manualmente.')
      searchResults.value = []
    } finally {
      isSearching.value = false
    }
  }, 500)
}

function importManga(item) {
  mangaForm.value = {
    title: item.title_english || item.title,
    year: item.year || new Date().getFullYear(),
    genre: item.genre,
    description: item.description,
    cover_image: item.cover_image,
    background_image: item.background_image,
    rating: item.rating,
    chapter_count: item.chapters || 0,
  }
  searchQuery.value = ''
  searchResults.value = []
  showResults.value = false
}

async function saveManga() {
  if (!mangaForm.value.title.trim() || !mangaForm.value.genre.trim()) {
    errorMessage.value = 'El título y el género son obligatorios'
    return
  }
  isSaving.value = true
  errorMessage.value = ''

  try {
    const response = await authenticatedFetch(`/api/backoffice/mangas/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mangaForm.value)
    })
    if (response.ok) {
      router.push('/backoffice')
    } else {
      const error = await response.json()
      errorMessage.value = error.error || 'Error al guardar el manga'
    }
  } catch (error) {
    errorMessage.value = 'Error de conexión al guardar'
    console.error('Error:', error)
  } finally {
    isSaving.value = false
  }
}

function cancel() { router.push('/backoffice') }
</script>

<template>
  <div class="add-anime-container">
    <header class="form-header">
      <div>
        <h1 class="form-title">Añadir Nuevo Manga</h1>
        <p class="form-subtitle">Completa los datos del manga para añadirlo al catálogo</p>
      </div>
      <button class="btn-back" @click="cancel">Volver</button>
    </header>

    <div class="form-content">
      <div class="jikan-search-section">
        <div class="search-header">
          <h2 class="search-title">🔍 Buscar en MyAnimeList (Manga)</h2>
          <p class="search-subtitle">Importa datos automáticamente desde MyAnimeList</p>
          <div class="api-status-warning">⚠️ Si la búsqueda no funciona, la API puede estar temporalmente fuera de servicio. Usa el formulario manual abajo.</div>
        </div>
        <div class="search-box">
          <input v-model="searchQuery" @input="searchJikan" type="text" class="search-input" placeholder="Buscar manga en MyAnimeList... (3+ caracteres)" />
          <span v-if="isSearching" class="search-loading">Buscando...</span>
        </div>

        <div v-if="showResults && searchResults.length > 0" class="search-results">
          <div v-for="item in searchResults" :key="item.mal_id" class="result-card" @click="importManga(item)">
            <img :src="item.cover_image" :alt="item.title" class="result-image" @error="(e) => e.target.src = 'https://via.placeholder.com/150x200?text=No+Image'" />
            <div class="result-info">
              <h3 class="result-title">{{ item.title }}</h3>
              <p class="result-subtitle" v-if="item.title_english">{{ item.title_english }}</p>
              <div class="result-meta">
                <span class="meta-item">📅 {{ item.year || 'N/A' }}</span>
                <span class="meta-item">⭐ {{ item.rating }}/10</span>
                <span class="meta-item" v-if="item.chapters">📚 {{ item.chapters }} ch</span>
              </div>
              <p class="result-genre">{{ item.genre }}</p>
            </div>
            <div class="result-action"><span class="import-hint">Click para importar →</span></div>
          </div>
        </div>

        <div v-if="showResults && searchResults.length === 0" class="no-results">No se encontraron resultados para "{{ searchQuery }}"</div>
      </div>

      <div class="divider"><span>O AÑADE MANUALMENTE</span></div>

      <form @submit.prevent="saveManga" class="anime-form">
        <div class="form-row">
          <div class="form-group">
            <label>Título del Manga *</label>
            <input v-model="mangaForm.title" type="text" class="form-input" placeholder="Ej: One Piece" required />
          </div>

          <div class="form-group">
            <label>Año *</label>
            <input v-model.number="mangaForm.year" type="number" class="form-input" min="1900" :max="new Date().getFullYear() + 5" required />
          </div>
        </div>

        <div class="form-group">
          <label>Género *</label>
          <input v-model="mangaForm.genre" type="text" class="form-input" placeholder="Ej: Acción, Aventura" required />
        </div>

        <div class="form-group">
          <label>Descripción</label>
          <textarea v-model="mangaForm.description" class="form-textarea" rows="5" placeholder="Descripción del manga..."></textarea>
        </div>

        <div class="form-group">
          <label>URL de Imagen de Portada</label>
          <input v-model="mangaForm.cover_image" type="url" class="form-input" placeholder="https://ejemplo.com/portada.jpg" />
          <div v-if="mangaForm.cover_image" class="image-preview"><img :src="mangaForm.cover_image" alt="Preview" /></div>
        </div>

        <div class="form-group">
          <label>URL de Imagen de Fondo</label>
          <input v-model="mangaForm.background_image" type="url" class="form-input" placeholder="https://ejemplo.com/fondo.jpg" />
          <div v-if="mangaForm.background_image" class="image-preview image-preview-wide"><img :src="mangaForm.background_image" alt="Preview" /></div>
        </div>

        <div class="form-group">
          <label>Puntuación (0-10)</label>
          <input v-model.number="mangaForm.rating" type="number" class="form-input" min="0" max="10" step="0.1" />
        </div>

        <div class="form-group">
          <label>Capítulos</label>
          <input v-model.number="mangaForm.chapter_count" type="number" class="form-input" min="0" />
        </div>

        <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

        <div class="form-actions">
          <button type="submit" class="btn-save" :disabled="isSaving">
            <span v-if="isSaving">Guardando...</span>
            <span v-else>Guardar Manga</span>
          </button>
          <button type="button" class="btn-cancel" @click="cancel" :disabled="isSaving">Cancelar</button>
        </div>
      </form>
    </div>

    <!-- Modal de Error -->
    <div v-if="showErrorModal" class="modal-overlay" @click="closeErrorModal">
      <div class="modal-content" @click.stop>
        <h2 class="modal-title">{{ errorModalTitle }}</h2>
        <p class="modal-message">{{ errorModalMessage }}</p>
        <div class="modal-actions"><button class="btn-modal-ok" @click="closeErrorModal">Entendido</button></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.add-anime-container {
  min-height: 100vh;
  background: linear-gradient(to bottom, #0a0a0a, #1a1a1a);
  color: #fff;
}

.form-header {
  background: rgba(20, 20, 20, 0.95);
  padding: 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  color: #fff;
}

.form-subtitle {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
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
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
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

/* Jikan Search Styles */
.jikan-search-section {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(139, 92, 246, 0.05));
  border: 1px solid rgba(168, 85, 247, 0.2);
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
}

.search-header {
  margin-bottom: 1.5rem;
}

.search-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  color: #a855f7;
}

.search-subtitle {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 1rem 0;
}

.api-status-warning {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 0.85rem;
  color: #fca5a5;
  margin-top: 1rem;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  line-height: 1.4;
}

.search-box {
  position: relative;
  margin-bottom: 1rem;
}

.search-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid rgba(168, 85, 247, 0.3);
  border-radius: 8px;
  padding: 1rem 1.2rem;
  color: #fff;
  font-size: 1rem;
  outline: none;
  transition: all 0.3s;
}

.search-input:focus {
  border-color: #a855f7;
  background: rgba(0, 0, 0, 0.6);
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.15);
}

.search-loading {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #a855f7;
  font-size: 0.9rem;
  font-weight: 500;
}

.search-results {
  max-height: 500px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.result-card {
  display: flex;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.result-card:hover {
  background: rgba(168, 85, 247, 0.1);
  border-color: #a855f7;
  transform: translateX(5px);
}

.result-image {
  width: 80px;
  height: 112px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
}

.result-info {
  flex: 1;
}

.result-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.3rem 0;
  color: #fff;
}

.result-subtitle {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 0.5rem 0;
}

.result-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.meta-item {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
}

.result-genre {
  font-size: 0.85rem;
  color: #a855f7;
  margin: 0;
}

.result-action {
  display: flex;
  align-items: center;
}

.import-hint {
  color: #a855f7;
  font-size: 0.9rem;
  font-weight: 600;
  opacity: 0;
  transition: opacity 0.3s;
}

.result-card:hover .import-hint {
  opacity: 1;
}

.no-results {
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.95rem;
}

.divider {
  text-align: center;
  margin: 2rem 0;
  position: relative;
}

.divider::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 100%;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.2), transparent);
}

.divider span {
  position: relative;
  background: #1a1a1a;
  padding: 0 1rem;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 1px;
}

/* Modal de Error */
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
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-icon-warning {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
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

.modal-actions {
  display: flex;
  gap: 1rem;
}

.btn-modal-ok {
  flex: 1;
  background: linear-gradient(135deg, #a855f7, #9333ea);
  border: none;
  color: #fff;
  padding: 0.9rem 1.5rem;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
}

.btn-modal-ok:hover {
  background: linear-gradient(135deg, #9333ea, #7e22ce);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(168, 85, 247, 0.4);
}

@media (max-width: 1024px) {
  .add-anime-container {
    padding: 1.5rem;
  }
}

@media (max-width: 768px) {
  .add-anime-container {
    padding: 1rem;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn-primary,
  .btn-cancel {
    width: 100%;
  }
  
  .result-card {
    flex-direction: column;
  }
  
  .result-image {
    width: 100%;
    height: auto;
  }

  .search-results {
    max-height: 400px;
  }
}

@media (max-width: 480px) {
  .add-anime-container {
    padding: 0.75rem;
  }

  .page-title {
    font-size: 1.25rem;
  }

  .form-group label {
    font-size: 0.875rem;
  }

  .btn-search,
  .btn-primary,
  .btn-cancel {
    padding: 0.6rem 1rem;
    font-size: 0.875rem;
  }
}
</style>
