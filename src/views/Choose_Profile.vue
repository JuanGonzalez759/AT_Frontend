<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isEditing = ref(false)
const showEditModal = ref(false)
const showAvatarGallery = ref(false)
const showBackgroundGallery = ref(false)
const editingProfile = ref(null)
const editForm = ref({
  name: '',
  username: '',
  selectedAvatar: '',
  selectedBackground: '',
})

const availableAvatars = ref([
  '/profiles/Profile1.png',
  '/profiles/Profile2.png',
  '/profiles/Profile3.png',
  '/profiles/Profile4.png',
])

const availableBackgrounds = ref([
  { name: 'One Piece', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&h=900&fit=crop' },
  { name: 'Attack on Titan', url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1600&h=900&fit=crop' },
  { name: 'Demon Slayer', url: 'https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=1600&h=900&fit=crop' },
  { name: 'Jujutsu Kaisen', url: 'https://images.unsplash.com/photo-1578632292335-df3abbb0d586?w=1600&h=900&fit=crop' },
  { name: 'My Hero Academia', url: 'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=1600&h=900&fit=crop' },
  { name: 'Naruto', url: 'https://images.unsplash.com/photo-1606947884439-f9f064c0f3f6?w=1600&h=900&fit=crop' },
  { name: 'Dragon Ball', url: 'https://images.unsplash.com/photo-1555864326-5cf22ef123cf?w=1600&h=900&fit=crop' },
  { name: 'Death Note', url: 'https://images.unsplash.com/photo-1618556450991-2f1af64e8191?w=1600&h=900&fit=crop' },
])

const profiles = ref([
  {
    id: 1,
    name: 'Abril',
    avatar: '/profiles/Profile1.png',
    color: '#000000',
    background: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&h=900&fit=crop',
  },
  {
    id: 2,
    name: 'Laura',
    avatar: '/profiles/Profile2.png',
    color: '#000000',
    background: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1600&h=900&fit=crop',
  },
  {
    id: 3,
    name: 'Andrea',
    avatar: '/profiles/Profile3.png',
    color: '#000000',
    background: 'https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=1600&h=900&fit=crop',
  },
  {
    id: 4,
    name: 'Adri',
    avatar: '/profiles/Profile4.png',
    color: '#000000',
    background: 'https://images.unsplash.com/photo-1606947884439-f9f064c0f3f6?w=1600&h=900&fit=crop',
  },
])

function selectProfile(profile) {
  if (isEditing.value) return
  console.log('Perfil seleccionado:', profile.name)
  router.push('/home')
}

function toggleManageProfiles() {
  isEditing.value = !isEditing.value
}

function editProfile(profile) {
  editingProfile.value = { ...profile }
  editForm.value = {
    name: profile.name,
    username: '',
    selectedAvatar: profile.avatar,
    selectedBackground: profile.background,
  }
  showEditModal.value = true
}

function closeModal() {
  showEditModal.value = false
  editingProfile.value = null
}

function saveProfile() {
  if (!editForm.value.name.trim()) return
  
  const profileIndex = profiles.value.findIndex(p => p.id === editingProfile.value.id)
  if (profileIndex !== -1) {
    profiles.value[profileIndex] = {
      ...profiles.value[profileIndex],
      name: editForm.value.name,
      avatar: editForm.value.selectedAvatar,
      background: editForm.value.selectedBackground,
      color: '#000000', // Mantener el borde negro
    }
  }
  
  closeModal()
}

function selectAvatar(avatar) {
  editForm.value.selectedAvatar = avatar
  showAvatarGallery.value = false
}

function selectBackground(background) {
  editForm.value.selectedBackground = background
  showBackgroundGallery.value = false
}

function openAvatarGallery() {
  showAvatarGallery.value = true
}

function openBackgroundGallery() {
  showBackgroundGallery.value = true
}

function closeGallery() {
  showAvatarGallery.value = false
  showBackgroundGallery.value = false
}
</script>

<template>
  <div class="profile-container">
    <div class="profile-header">
      <h1 class="logo">AniToki</h1>
    </div>

    <div class="profile-content">
      <div class="profiles-grid">
        <div
          v-for="profile in profiles"
          :key="profile.id"
          class="profile-item"
          @click="selectProfile(profile)"
        >
          <div class="profile-avatar" :style="{ borderColor: profile.color }">
            <img :src="profile.avatar" :alt="profile.name" />
          </div>
          <div class="profile-name-container">
            <p class="profile-name">{{ profile.name }}</p>
            <button 
              v-if="isEditing" 
              class="btn-edit"
              @click.stop="editProfile(profile)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <button class="btn-manage" @click="toggleManageProfiles">
        <span class="btn-icon" v-if="!isEditing">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"></path>
          </svg>
        </span>
        {{ isEditing ? 'Finalizar edición' : 'Gestionar Perfiles' }}
      </button>
    </div>

    <!-- Modal de Edición -->
    <div v-if="showEditModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <h2 class="modal-title">Editar perfil</h2>

        <!-- Avatar Preview -->
        <div class="preview-section">
          <label>Avatar</label>
          <div class="preview-item" @click="openAvatarGallery">
            <img :src="editForm.selectedAvatar" alt="Avatar" class="preview-avatar" />
            <button class="btn-edit-overlay">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Background Preview -->
        <div class="preview-section">
          <label>Fondo del perfil</label>
          <div class="preview-item preview-background" @click="openBackgroundGallery">
            <div 
              class="preview-bg-image"
              :style="{ backgroundImage: `url('${editForm.selectedBackground}')` }"
            >
              <div class="preview-bg-overlay"></div>
            </div>
            <button class="btn-edit-overlay">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Form Fields -->
        <div class="form-group">
          <label>Nombre del perfil</label>
          <input 
            v-model="editForm.name" 
            type="text" 
            class="modal-input"
            placeholder="Nombre del perfil"
          />
        </div>

        <div class="form-group">
          <label>Nombre de Usuario (opcional)</label>
          <input 
            v-model="editForm.username" 
            type="text" 
            class="modal-input"
            placeholder="Ingrese su nombre de usuario aquí"
          />
        </div>

        <!-- Action Buttons -->
        <div class="modal-actions">
          <button class="btn-save" @click="saveProfile">GUARDAR</button>
          <button class="btn-cancel" @click="closeModal">CANCELAR</button>
        </div>
      </div>
    </div>

    <!-- Modal de Galería de Avatares -->
    <div v-if="showAvatarGallery" class="modal-overlay" @click="closeGallery">
      <div class="gallery-modal" @click.stop>
        <button class="btn-close" @click="closeGallery">✕</button>
        <h2 class="modal-title">Selección de avatar</h2>
        <div class="avatar-gallery">
          <div
            v-for="avatar in availableAvatars"
            :key="avatar"
            class="avatar-gallery-option"
            :class="{ selected: editForm.selectedAvatar === avatar }"
            @click="selectAvatar(avatar)"
          >
            <img :src="avatar" :alt="avatar" />
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Galería de Backgrounds -->
    <div v-if="showBackgroundGallery" class="modal-overlay" @click="closeGallery">
      <div class="gallery-modal" @click.stop>
        <button class="btn-close" @click="closeGallery">✕</button>
        <h2 class="modal-title">Selección de fondo</h2>
        <div class="background-gallery">
          <div
            v-for="bg in availableBackgrounds"
            :key="bg.url"
            class="background-gallery-option"
            :class="{ selected: editForm.selectedBackground === bg.url }"
            :style="{ backgroundImage: `url('${bg.url}')` }"
            @click="selectBackground(bg.url)"
            :title="bg.name"
          >
            <div class="background-overlay"></div>
            <span class="bg-name">{{ bg.name }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-container {
  min-height: 100vh;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.7), rgba(10, 10, 10, 0.7)),
    url('/Background_profiles.png') center/cover;
  background-attachment: fixed;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2rem;
}

.profile-header {
  position: absolute;
  top: 2rem;
  left: 2rem;
}

.logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: #a855f7;
  margin: 0;
}

.profile-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3rem;
}

.profiles-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 3rem;
  max-width: 1000px;
}

.profile-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  transition: transform 0.3s;
}

.profile-item:hover {
  transform: scale(1.1);
}

.profile-avatar {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  border: 4px solid transparent;
  overflow: hidden;
  transition: border-color 0.3s;
  background: rgba(255, 255, 255, 0.1);
}

.profile-item:hover .profile-avatar {
  border-color: currentColor;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-name-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.profile-name {
  font-size: 1.2rem;
  font-weight: 500;
  color: #fff;
  margin: 0;
}

.btn-edit {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.btn-edit:hover {
  background: #a855f7;
  border-color: #a855f7;
  transform: scale(1.1);
}

.btn-manage {
  background: #a855f7;
  color: #fff;
  border: none;
  padding: 1rem 2.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s;
  margin-top: 2rem;
}

.btn-manage:hover {
  background: #9333ea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4);
}

.btn-icon {
  display: flex;
  align-items: center;
}

.btn-icon {
  display: flex;
  align-items: center;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: rgba(40, 40, 40, 0.98);
  border-radius: 12px;
  padding: 2.5rem;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.modal-title {
  color: #fff;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 2rem 0;
  text-align: center;
}

.preview-section {
  margin-bottom: 1.5rem;
}

.preview-section label {
  display: block;
  color: #ccc;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.preview-item {
  position: relative;
  cursor: pointer;
  display: inline-block;
}

.preview-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s;
}

.preview-item:hover .preview-avatar {
  border-color: #a855f7;
  transform: scale(1.05);
}

.preview-background {
  width: 100%;
}

.preview-bg-image {
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 8px;
  background-size: cover;
  background-position: center;
  position: relative;
  border: 2px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s;
}

.preview-item:hover .preview-bg-image {
  border-color: #a855f7;
  transform: scale(1.02);
}

.preview-bg-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  transition: all 0.3s;
}

.preview-item:hover .preview-bg-overlay {
  background: rgba(168, 85, 247, 0.2);
}

.btn-edit-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.3s;
}

.preview-item:hover .btn-edit-overlay {
  opacity: 1;
  background: rgba(168, 85, 247, 0.9);
  border-color: #a855f7;
}

.avatar-selection {
  display: flex;
  gap: 1rem;
  justify-content: center;
  align-items: center;
  margin-bottom: 2rem;
  position: relative;
}

.avatar-option {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid transparent;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  background: rgba(255, 255, 255, 0.05);
}

.avatar-option:hover {
  border-color: rgba(168, 85, 247, 0.5);
  transform: scale(1.05);
}

.avatar-option.selected {
  border-color: #a855f7;
  transform: scale(1.1);
  box-shadow: 0 0 12px rgba(168, 85, 247, 0.6);
}

.avatar-option img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.btn-edit-avatar {
  position: absolute;
  top: -8px;
  right: 0;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.btn-edit-avatar:hover {
  background: #a855f7;
  border-color: #a855f7;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  color: #ccc;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.modal-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 0.75rem 1rem;
  color: #fff;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.3s;
}

.modal-input:focus {
  border-color: #a855f7;
  background: rgba(0, 0, 0, 0.4);
}

.modal-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

/* Gallery Modals */
.gallery-modal {
  background: rgba(30, 30, 30, 0.98);
  border-radius: 12px;
  padding: 2.5rem;
  width: 90%;
  max-width: 700px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  position: relative;
}

.btn-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  width: 35px;
  height: 35px;
  border-radius: 50%;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.btn-close:hover {
  background: rgba(255, 0, 0, 0.6);
  transform: rotate(90deg);
}

.avatar-gallery {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  margin-top: 1rem;
}

.avatar-gallery-option {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 4px solid transparent;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  background: rgba(255, 255, 255, 0.05);
}

.avatar-gallery-option:hover {
  border-color: rgba(168, 85, 247, 0.5);
  transform: scale(1.1);
}

.avatar-gallery-option.selected {
  border-color: #a855f7;
  transform: scale(1.15);
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.8);
}

.avatar-gallery-option img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.background-gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-top: 1rem;
  max-height: 400px;
  overflow-y: auto;
}

.background-gallery-option {
  aspect-ratio: 16/9;
  border-radius: 8px;
  cursor: pointer;
  border: 3px solid transparent;
  transition: all 0.3s;
  position: relative;
  background-size: cover;
  background-position: center;
  overflow: hidden;
}

.background-gallery-option:hover {
  transform: scale(1.05);
  border-color: rgba(168, 85, 247, 0.5);
}

.background-gallery-option.selected {
  border-color: #a855f7;
  transform: scale(1.05);
  box-shadow: 0 0 16px rgba(168, 85, 247, 0.8);
}

.background-gallery-option .background-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  transition: all 0.3s;
}

.background-gallery-option:hover .background-overlay {
  background: rgba(168, 85, 247, 0.3);
}

.background-gallery-option.selected::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: 2rem;
  font-weight: bold;
  text-shadow: 0 0 8px rgba(0, 0, 0, 0.9);
  z-index: 2;
}

.bg-name {
  position: absolute;
  bottom: 0.5rem;
  left: 0.5rem;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
  z-index: 2;
}

.background-selection {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
  margin-top: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
}

.background-option {
  aspect-ratio: 16/9;
  border-radius: 8px;
  cursor: pointer;
  border: 3px solid transparent;
  transition: all 0.3s;
  position: relative;
  background-size: cover;
  background-position: center;
  overflow: hidden;
}

.background-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  transition: all 0.3s;
}

.background-option:hover .background-overlay {
  background: rgba(168, 85, 247, 0.3);
}

.background-option:hover {
  transform: scale(1.05);
  border-color: rgba(168, 85, 247, 0.5);
}

.background-option.selected {
  border-color: #a855f7;
  transform: scale(1.05);
  box-shadow: 0 0 16px rgba(168, 85, 247, 0.6);
}

.background-option.selected::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: 1.5rem;
  font-weight: bold;
  text-shadow: 0 0 8px rgba(0, 0, 0, 0.9);
  z-index: 2;
}

.color-selection {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.color-option {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  border: 3px solid transparent;
  transition: all 0.3s;
  position: relative;
}

.color-option:hover {
  transform: scale(1.15);
  box-shadow: 0 0 12px currentColor;
}

.color-option.selected {
  border-color: #fff;
  transform: scale(1.2);
  box-shadow: 0 0 16px currentColor;
}

.color-option.selected::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: 1.2rem;
  font-weight: bold;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
}

.form-hint {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.8rem;
  margin-top: 0.5rem;
  line-height: 1.4;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-save {
  flex: 1;
  background: #a855f7;
  border: 1px solid #a855f7;
  color: #fff;
  padding: 0.8rem 1.5rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-save:hover {
  background: #9333ea;
  border-color: #9333ea;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4);
}

.btn-cancel {
  flex: 1;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 0.8rem 1.5rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.3);
}

@media (max-width: 768px) {
  .profiles-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
  }

  .profile-avatar {
    width: 120px;
    height: 120px;
  }
}
</style>
