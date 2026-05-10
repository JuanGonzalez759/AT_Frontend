<template>
  <div v-if="show" class="modal-backdrop" @click.self="close">
    <div class="modal-content">
      <button class="modal-close" @click="close">✕</button>
      <div class="modal-body">
        <div class="modal-left">
          <img :src="anime.image || anime.background || anime.cover || anime.thumbnail" :alt="anime.title" />
        </div>
        <div class="modal-right">
          <h2 class="modal-title">{{ anime.title }}</h2>
          <p v-if="anime.subtitle" class="modal-subtitle">{{ anime.subtitle }}</p>
          <div class="modal-meta">
            <span v-if="anime.year">{{ anime.year }}</span>
            <span v-if="anime.genre">• {{ anime.genre }}</span>
            <span v-if="anime.rating">• ⭐ {{ anime.rating }}/10</span>
          </div>
          <p v-if="anime.description" class="modal-description">{{ anime.description }}</p>
          <div class="modal-actions">
            <button class="btn-play" @click="$emit('watch', anime)">Ver ahora</button>
            <button class="btn-close-alt" @click="close">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
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
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.modal-content {
  background: #0f0f0f;
  border-radius: 12px;
  width: min(900px, 95%);
  max-height: 90vh;
  overflow: auto;
  padding: 18px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.6);
  position: relative;
}
.modal-close {
  position: absolute;
  top: 10px;
  right: 12px;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
}
.modal-body {
  display: flex;
  gap: 18px;
}
.modal-left img {
  width: 280px;
  height: 420px;
  object-fit: cover;
  border-radius: 8px;
}
.modal-right {
  flex: 1;
  color: #e6e6e6;
}
.modal-title {
  margin: 0 0 8px 0;
  font-size: 24px;
}
.modal-subtitle {
  color: #a8a8a8;
  margin: 0 0 12px 0;
}
.modal-meta {
  color: #cfcfcf;
  margin-bottom: 12px;
}
.modal-description {
  line-height: 1.5;
  color: #dcdcdc;
}
.modal-actions {
  margin-top: 18px;
  display: flex;
  gap: 10px;
}
.btn-play {
  background: linear-gradient(90deg,#9333ea,#a855f7);
  color: white;
  border: none;
  padding: 10px 14px;
  border-radius: 8px;
  cursor: pointer;
}
.btn-close-alt {
  background: transparent;
  color: #ddd;
  border: 1px solid rgba(255,255,255,0.06);
  padding: 10px 14px;
  border-radius: 8px;
  cursor: pointer;
}
</style>