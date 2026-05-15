<script setup>
import { ref, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'

const router = useRouter()
const { user, logout, API_BASE_URL, authenticatedFetch } = useAuth()

const adminProfile = ref({
  name: 'Admin',
  avatar: '/Avatar_Anitoki.png',
  background: '/one-piece-logo.png',
})

const animes = ref([])
const showDeleteModal = ref(false)
const animeToDelete = ref(null)

onMounted(() => {
  loadAnimes()
})

onActivated(() => {
  loadAnimes()
})

async function loadAnimes() {
  try {
    const response = await authenticatedFetch(`/api/backoffice/animes/?page_size=100`)
    if (response.ok) {
      const data = await response.json()
      // La API devuelve un objeto paginado con results
      animes.value = data.results || data
    } else {
      console.error('Error al cargar animes:', response.status, response.statusText)
      const errorData = await response.text()
      console.error('Detalles:', errorData)
    }
  } catch (error) {
    console.error('Error loading animes:', error)
  }
}

function goToAddAnime() {
  router.push('/backoffice/add-anime')
}

function goToManageEpisodes(animeId) {
  router.push(`/backoffice/episodes/${animeId}`)
}

function goToHome() {
  router.push('/home')
}

async function handleLogout() {
  await logout()
  router.push('/login')
}

function editAnime(anime) {
  router.push(`/backoffice/edit-anime/${anime.id}`)
}

function deleteAnime(anime) {
  animeToDelete.value = anime
  showDeleteModal.value = true
}

function closeDeleteModal() {
  showDeleteModal.value = false
  animeToDelete.value = null
}

async function confirmDelete() {
  if (!animeToDelete.value) return

  try {
    const response = await authenticatedFetch(`/api/backoffice/animes/${animeToDelete.value.id}/`, {
      method: 'DELETE'
    })

    if (response.ok) {
      // Remover el anime de la lista
      animes.value = animes.value.filter(a => a.id !== animeToDelete.value.id)
      console.log('Anime eliminado exitosamente')
      closeDeleteModal()
    } else if (response.status === 404) {
      // El anime ya no existe, eliminarlo de la lista local
      animes.value = animes.value.filter(a => a.id !== animeToDelete.value.id)
      console.log('Anime ya no existe en el servidor, removido de la lista')
      closeDeleteModal()
    } else {
      const error = await response.json()
      console.error('Error al eliminar:', error)
      alert('Error al eliminar el anime')
    }
  } catch (error) {
    console.error('Error:', error)
    alert('Error al eliminar el anime')
  }
}


</script>

<template>
  <div class="admin-container">
    <!-- Header -->
    <header class="admin-header">
      <div class="logo-container">
        <img src="/Logo_AniToki.png" alt="AniToki" class="logo-image" />
        <span class="badge">ADMIN</span>
      </div>
      <div class="header-actions">
        <button class="btn-home" @click="goToHome">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          Inicio
        </button>
        <button class="btn-logout" @click="handleLogout">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Cerrar Sesión
        </button>
      </div>
    </header>

    <!-- Admin Profile Section -->
    <div class="profile-section">
      <div class="profile-card" :style="{ backgroundImage: `url('${adminProfile.background}')` }">
        <div class="profile-overlay"></div>
        <div class="profile-info">
          <div class="profile-avatar">
            <img :src="adminProfile.avatar" :alt="adminProfile.name" />
          </div>
          <div class="profile-details">
            <h2 class="profile-name">{{ adminProfile.name }}</h2>
            <p class="profile-role">Administrador del sistema</p>
            <p class="profile-email" v-if="user">{{ user.email }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Anime Management Section -->
    <div class="content-section">
      <div class="section-header">
        <h2 class="section-title">Gestión de Animes</h2>
        <button class="btn-add-anime" @click="goToAddAnime">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"></path>
          </svg>
          Añadir Anime
        </button>
      </div>

      <div class="anime-grid" v-if="animes.length > 0">
        <div v-for="anime in animes" :key="anime.id" class="anime-card">
          <div class="anime-cover" :style="{ backgroundImage: `url('${anime.cover_image}')` }">
            <div class="anime-overlay">
              <div class="anime-actions">
                <button class="btn-icon" @click="goToManageEpisodes(anime.id)" title="Gestionar episodios">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>
                </button>
                <button class="btn-icon" @click.stop="editAnime(anime)" title="Editar anime">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button class="btn-icon btn-delete" @click.stop="deleteAnime(anime)" title="Eliminar anime">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div class="anime-info">
            <h3 class="anime-title">{{ anime.title }}</h3>
            <p class="anime-meta">{{ anime.year }} • {{ anime.genre }}</p>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
          <polyline points="17 2 12 7 7 2"></polyline>
        </svg>
        <p>No hay animes registrados</p>
        <button class="btn-empty-add" @click="goToAddAnime">Añadir primer anime</button>
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
        <h2 class="modal-title">¿Eliminar anime?</h2>
        <p class="modal-message">
          ¿Estás seguro de que deseas eliminar <strong>"{{ animeToDelete?.title }}"</strong>?
          <br><br>
          Esta acción no se puede deshacer y se eliminarán todos los episodios asociados.
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
  </div>
</template>

<style scoped>
.admin-container {
  min-height: 100vh;
  background: linear-gradient(to bottom, #0a0a0a, #1a1a1a);
  color: #fff;
}

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

.btn-home,
.btn-logout {
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

.btn-home:hover {
  background: #a855f7;
  border-color: #a855f7;
}

.btn-logout:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
  color: #ef4444;
}

.profile-section {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.profile-card {
  background-size: cover;
  background-position: center;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  height: 250px;
}

.profile-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.4));
}

.profile-info {
  position: relative;
  z-index: 2;
  padding: 2rem;
  display: flex;
  align-items: center;
  gap: 2rem;
  height: 100%;
}

.profile-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 4px solid #000000;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.profile-name {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0;
  color: #fff;
}

.profile-role {
  font-size: 1.1rem;
  color: #a855f7;
  font-weight: 600;
  margin: 0;
}

.profile-email {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

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

.btn-add-anime {
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

.btn-add-anime:hover {
  background: #9333ea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4);
}

.anime-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
}

.anime-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s;
  cursor: pointer;
}

.anime-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(168, 85, 247, 0.3);
}

.anime-cover {
  width: 100%;
  aspect-ratio: 2/3;
  background-size: cover;
  background-position: center;
  position: relative;
}

.anime-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  opacity: 0;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.anime-card:hover .anime-overlay {
  opacity: 1;
}

.anime-actions {
  display: flex;
  gap: 1rem;
}

.btn-icon {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.btn-icon:hover {
  background: #a855f7;
  border-color: #a855f7;
  transform: scale(1.1);
}

.btn-delete:hover {
  background: #ef4444;
  border-color: #ef4444;
}

.anime-info {
  padding: 1rem;
}

.anime-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.anime-meta {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: rgba(255, 255, 255, 0.4);
}

.empty-state svg {
  margin: 0 auto 1rem;
  opacity: 0.3;
}

.empty-state p {
  font-size: 1.2rem;
  margin: 1rem 0 2rem 0;
}

.btn-empty-add {
  background: #a855f7;
  border: none;
  color: #fff;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-empty-add:hover {
  background: #9333ea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4);
}

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

@media (max-width: 1024px) {
  .anime-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}

@media (max-width: 768px) {
  .admin-container {
    padding: 1rem;
  }

  .admin-header {
    flex-direction: column;
    gap: 1rem;
  }

  .admin-title {
    font-size: 1.5rem;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .anime-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }

  .modal-content {
    padding: 1.5rem;
    margin: 1rem;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .btn-modal-delete,
  .btn-modal-cancel {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .admin-container {
    padding: 0.75rem;
  }

  .admin-title {
    font-size: 1.25rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .anime-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.75rem;
  }

  .anime-card h3 {
    font-size: 0.875rem;
  }

  .modal-content {
    padding: 1rem;
    margin: 0.5rem;
  }
}
</style>
