<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  animeId: Number,
  title: String,
  subtitle: String,
  image: String,
  duration: String,
})

const router = useRouter()

function handleClick() {
  if (props.animeId) {
    router.push(`/watch?anime=${props.animeId}`)
  }
}
</script>

<template>
  <div class="anime-card" @click="handleClick">
    <div class="thumbnail">
      <img :src="image" :alt="title" />
      <div v-if="duration" class="duration-badge">{{ duration }}</div>
    </div>
    <div class="info">
      <h3>{{ title }}</h3>
      <p v-if="subtitle">{{ subtitle }}</p>
    </div>
  </div>
</template>

<style scoped>
.anime-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.anime-card:hover {
  transform: scale(1.05);
}

.thumbnail {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 8px;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.duration-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.8);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.info {
  margin-top: 8px;
}

.info h3 {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  color: #fff;
}

.info p {
  font-size: 12px;
  color: #999;
}
</style>
