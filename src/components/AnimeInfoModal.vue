<template>
  <Transition name="modal-fade">
    <div v-if="show" class="modal-backdrop" @click.self="close">
      <div class="modal-container">
        <!-- Close Button -->
        <button class="modal-close-btn" @click="close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <!-- Background Image with Overlay -->
        <div class="modal-background">
          <img 
            :src="anime.background || anime.background_image || anime.image" 
            :alt="anime.title"
            class="modal-bg-image"
          />
          <div class="modal-gradient-overlay"></div>
        </div>

        <!-- Content -->
        <div class="modal-content-wrapper">
          <div class="modal-content">
            <!-- Poster -->
            <div class="modal-poster">
              <img 
                :src="anime.image || anime.cover_image || anime.background" 
                :alt="anime.title"
                class="poster-image"
              />
            </div>

            <!-- Info -->
            <div class="modal-info">
              <h2 class="anime-title">{{ anime.title }}</h2>
              
              <!-- Meta Information -->
              <div class="anime-meta">
                <span v-if="anime.year" class="meta-item">{{ anime.year }}</span>
                <span v-if="anime.genre" class="meta-item">{{ anime.genre }}</span>
                <span v-if="anime.audio_type || anime.audioType" class="meta-item meta-tag">
                  {{ anime.audio_type || anime.audioType }}
                </span>
                <span v-if="anime.rating" class="meta-item rating">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  {{ anime.rating }}/10
                </span>
              </div>

              <!-- Description -->
              <p v-if="anime.description" class="anime-description">
                {{ anime.description }}
              </p>

              <!-- Action Buttons -->
              <div class="modal-actions">
                <button class="btn-primary" @click="$emit('watch', anime)">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  Ver ahora
                </button>
                <button class="btn-secondary" @click="close">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  anime: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['close', 'watch'])

function close() {
  emit('close')
}
</script>

<style scoped>
/* Modal Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-container,
.modal-fade-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-fade-enter-from .modal-container,
.modal-fade-leave-to .modal-container {
  transform: scale(0.9);
}

/* Backdrop */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 2rem;
}

/* Modal Container */
.modal-container {
  position: relative;
  width: 100%;
  max-width: 850px;
  max-height: 90vh;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
}

/* Background Image */
.modal-background {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
}

.modal-bg-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.3;
  filter: blur(20px);
  transform: scale(1.1);
}

.modal-gradient-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(10, 10, 10, 0.7) 0%,
    rgba(10, 10, 10, 0.85) 40%,
    rgba(10, 10, 10, 0.95) 100%
  );
}

/* Close Button */
.modal-close-btn {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  z-index: 10;
  background: rgba(20, 20, 20, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
}

.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

/* Content Wrapper */
.modal-content-wrapper {
  position: relative;
  z-index: 1;
  overflow-y: auto;
  max-height: 90vh;
  padding: 2.5rem;
}

/* Content Layout */
.modal-content {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

/* Poster */
.modal-poster {
  flex-shrink: 0;
}

.poster-image {
  width: 220px;
  height: 330px;
  object-fit: cover;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  transition: transform 0.3s ease;
}

.poster-image:hover {
  transform: scale(1.02);
}

/* Info Section */
.modal-info {
  flex: 1;
  color: #ffffff;
  min-width: 0;
}

.anime-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  line-height: 1.2;
  color: #ffffff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

/* Meta Information */
.anime-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1.5rem;
}

.meta-item {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.meta-tag {
  background: rgba(147, 51, 234, 0.2);
  border: 1px solid rgba(147, 51, 234, 0.4);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  color: #c084fc;
  font-weight: 600;
  font-size: 0.85rem;
}

.meta-item.rating {
  color: #fbbf24;
  font-weight: 600;
}

/* Description */
.anime-description {
  font-size: 1rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.85);
  margin: 0 0 2rem 0;
  max-height: 150px;
  overflow-y: auto;
}

.anime-description::-webkit-scrollbar {
  width: 6px;
}

.anime-description::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.anime-description::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.anime-description::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Action Buttons */
.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-primary {
  background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
  color: #ffffff;
  border: none;
  padding: 0.875rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(147, 51, 234, 0.3);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(147, 51, 234, 0.4);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 0.875rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

/* Responsive Design */
@media (max-width: 768px) {
  .modal-backdrop {
    padding: 1rem;
  }

  .modal-content-wrapper {
    padding: 1.5rem;
  }

  .modal-content {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .poster-image {
    width: 180px;
    height: 270px;
  }

  .anime-title {
    font-size: 1.5rem;
  }

  .modal-actions {
    flex-direction: column;
    width: 100%;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
    justify-content: center;
  }
}
</style>