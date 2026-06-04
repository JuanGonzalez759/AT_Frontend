<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const route = useRoute()
const router = useRouter()
const { authenticatedFetch } = useAuth()

const mangaId = route.params.id
const chapter = route.params.chapter
const pages = ref([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const res = await authenticatedFetch(`/api/backoffice/public/mangas/${mangaId}/chapters/${chapter}/`)
    const text = await res.text()
    let data = {}
    try { data = JSON.parse(text) } catch (e) { data = null }
    if (res.ok && data && Array.isArray(data.pages)) {
      pages.value = data.pages || []
    } else {
      console.error('Chapter fetch failed', res.status, data || text)
      // Try fallback without auth headers (in case Authorization header causes issues)
      try {
        const plain = await fetch(`${window.location.protocol}//${window.location.hostname}:8000/api/backoffice/public/mangas/${mangaId}/chapters/${chapter}/`)
        if (plain.ok) {
          const pd = await plain.json()
          if (pd && Array.isArray(pd.pages)) {
            pages.value = pd.pages
            error.value = ''
            return
          }
        }
      } catch (e) {
        console.error('Fallback fetch failed', e)
      }
      error.value = `Error cargando páginas: ${res.status} ${data?.error || data?.detail || text.substring(0,200)}`
    }
  } catch (e) { console.error(e); error.value = String(e) }
  finally { loading.value = false }
})

function goBack() { router.push(`/manga/${mangaId}`) }
</script>

<template>
  <div class="reader-container">
    <header class="reader-header">
      <button @click="goBack">← Volver</button>
      <h3>Leer capítulo {{ chapter }}</h3>
    </header>

    <main class="reader-main">
      <div v-if="loading">Cargando...</div>
      <div v-else>
        <div v-if="error" style="color:#f88">{{ error }}</div>
        <div v-else-if="pages.length === 0">No hay páginas disponibles.</div>
        <div v-else class="pages">
          <img v-for="p in pages" :key="p.page_number" :src="p.url" style="width:100%;max-width:900px;margin:18px auto;display:block" />
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.reader-container { padding: 1rem; color:#fff; min-height:100vh; background:linear-gradient(#0a0a0a,#111); }
.reader-header { display:flex; align-items:center; gap:12px; margin-bottom:12px }
.reader-main { display:flex; justify-content:center }
.pages { width:100%; display:block; }
</style>
