<script setup>
import { ref, computed } from 'vue'
import { useLists } from '../composables/useLists'
import { useWatchlist } from '../composables/useWatchlist'
import { useProfile } from '../composables/useProfile'

const props = defineProps({
  animeId: Number,
  title: String,
  image: String,
  show: Boolean
  ,contentType: String
})

// contentType can be 'MANGA' when saving a manga
const contentType = props.contentType || 'anime'
const emit = defineEmits(['close','added'])

const { getLists, createList, addToList } = useLists()
const { addToWatchlist } = useWatchlist()
const { currentProfile } = useProfile()

const newListName = ref('')
const creating = ref(false)

const lists = computed(() => getLists())

async function handleSelectList(list) {
  if (!currentProfile.value) return
  // special reserved id for "Mi Lista"
  if (list === 'mi-lista') {
    const type = (props.contentType === 'MANGA' || props.contentType === 'Manga') ? 'manga' : 'anime'
    const ok = await addToWatchlist(props.animeId, type)
    if (ok) emit('added', { to: 'mi-lista' })
  } else {
    const type = (props.contentType === 'MANGA' || props.contentType === 'Manga') ? 'manga' : 'anime'
    const ok = addToList(list.id, props.animeId, type)
    if (ok) emit('added', { to: list.id })
  }
  emit('close')
}

function handleCreateList() {
  const name = newListName.value && newListName.value.trim()
  if (!name) return
  creating.value = true
  const created = createList(name)
  newListName.value = ''
  creating.value = false
  // auto-select the new list
  if (created) {
    const type = (props.contentType === 'MANGA' || props.contentType === 'Manga') ? 'manga' : 'anime'
    addToList(created.id, props.animeId, type)
    emit('added', { to: created.id })
    emit('close')
  }
}

function close() {
  emit('close')
}
</script>

<template>
  <teleport to="body">
    <div v-if="show" class="modal-backdrop" @click.self="close">
      <div class="modal-card">
      <header class="modal-header">
        <h3>Guardar en...</h3>
        <button class="modal-close" @click="close">✕</button>
      </header>

      <div class="modal-body">
        <div class="list-item" @click="() => handleSelectList('mi-lista')">
          <img src="/profiles/Profile1.png" alt="Mi Lista" class="list-thumb" />
          <div class="list-info">
            <div class="list-name">Mi Lista</div>
            <div class="list-sub">Guardados generales</div>
          </div>
          <button class="list-action">Guardar</button>
        </div>

        <div v-for="list in lists" :key="list.id" class="list-item" @click="() => handleSelectList(list)">
          <img :src="image || '/profiles/Profile1.png'" alt="list.name" class="list-thumb" />
          <div class="list-info">
            <div class="list-name">{{ list.name }}</div>
            <div class="list-sub">{{ list.items.length }} elementos</div>
          </div>
          <button class="list-action">Guardar</button>
        </div>

        <div class="create-list">
          <input v-model="newListName" placeholder="Nombre de la nueva lista" />
          <button class="btn-create" @click="handleCreateList">+ Nueva lista</button>
        </div>
      </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.modal-card {
  width: 380px;
  background: #0f0f12;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.06);
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0,0,0,0.6);
}
.modal-header {
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:12px 16px;
  border-bottom:1px solid rgba(255,255,255,0.03);
}
.modal-header h3{margin:0;color:#fff}
.modal-close{background:none;border:none;color:#aaa;font-size:16px;cursor:pointer}
.modal-body{padding:12px}
.list-item{display:flex;align-items:center;gap:12px;padding:8px;border-radius:8px;cursor:pointer;transition:background .12s}
.list-item:hover{background:rgba(255,255,255,0.02)}
.list-thumb{width:48px;height:48px;border-radius:6px;object-fit:cover}
.list-info{flex:1;color:#ddd}
.list-name{font-weight:700}
.list-sub{font-size:12px;color:#999}
.list-action{background:#1f2937;color:#fff;border:none;padding:6px 10px;border-radius:8px}
.create-list{display:flex;gap:8px;margin-top:12px}
.create-list input{flex:1;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);background:#0b0b0b;color:#fff}
.btn-create{padding:8px 12px;border-radius:8px;background:#9333ea;border:none;color:#fff}
</style>
