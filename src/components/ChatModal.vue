<template>
  <div v-if="show" class="chat-modal-backdrop" @click.self="close">
    <div class="chat-modal">
          <div class="chat-sidebar">
            <h3>Perfiles</h3>
            <div class="user-list-container">
              <ul class="user-list">
                <li
                  v-for="p in profiles"
                  :key="`${p.user_id}-${p.profile_id || 'np'}`"
                  :class="{ active: selectedProfile && selectedProfile.user_id === p.user_id && selectedProfile.profile_id === p.profile_id }
                  "
                  @click="selectUser(p)"
                >
                  <img v-if="p.avatar" :src="p.avatar" class="user-avatar" />
                  <span class="user-name">{{ p.name }}</span>
                </li>
              </ul>
            </div>
          </div>
      <div class="chat-window">
        <div class="chat-header">
          <h4 v-if="selectedProfile">Chat con {{ selectedProfile.name }}</h4>
          <h4 v-else>Selecciona un perfil</h4>
        </div>
        <div class="chat-messages" ref="messagesContainer">
          <div v-if="!selectedProfile" class="empty">Selecciona a quién escribir</div>
          <div v-else>
            <div v-for="m in messages" :key="m.id" :class="['message-row', isMine(m) ? 'out' : 'in']">
              <div :class="['message', isMine(m) ? 'out' : 'in']">
                <div class="message-content">{{ m.content }}</div>
                <div class="message-meta">{{ formatDate(m.created_at) }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="chat-input" v-if="selectedProfile">
          <div v-if="!currentProfile" class="no-profile-notice" style="padding:8px; color:#f2b;">
            Selecciona un perfil activo antes de enviar mensajes.
          </div>
          <textarea v-model="newMessage" placeholder="Escribe un mensaje..."></textarea>
          <button @click="sendMessage" :disabled="sending || !newMessage.trim() || !currentProfile">Enviar</button>
        </div>
      </div>
      <button class="chat-close" @click="close">×</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useProfile } from '../composables/useProfile'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['close'])

const { authenticatedFetch, currentUser, loadCurrentUser } = useAuth()
const { currentProfile, loadProfile } = useProfile()

const profiles = ref([])
const selectedProfile = ref(null)
const messages = ref([])
const newMessage = ref('')
const sending = ref(false)
const polling = ref(null)
const messagesContainer = ref(null)

async function loadUsers() {
  try {
    const res = await authenticatedFetch('/api/users/')
    if (res.ok) {
      const data = await res.json()
      profiles.value = data.profiles || []
    }
  } catch (e) {
    console.error('Error cargando usuarios', e)
  }
}

function selectUser(u) {
  selectedProfile.value = u
  newMessage.value = ''
  messages.value = []
  fetchMessages()
  startPolling()
}

async function fetchMessages() {
  if (!selectedProfile.value || !currentProfile.value) return
  try {
    const target_profile_param = selectedProfile.value.profile_id ? `&target_profile_id=${selectedProfile.value.profile_id}` : ''
    const res = await authenticatedFetch(`/api/chat/${selectedProfile.value.user_id}/messages/?my_profile_id=${currentProfile.value.id}${target_profile_param}`)
    if (res.ok) {
      const data = await res.json()
      const newMessages = (data.messages || []).slice().sort((a,b) => new Date(a.created_at) - new Date(b.created_at))

      // Detectar si hay mensajes nuevos para hacer auto-scroll
      const lastKnownId = messages.value.length ? messages.value[messages.value.length-1].id : null
      const lastNewId = newMessages.length ? newMessages[newMessages.length-1].id : null

      messages.value = newMessages

      if (lastNewId && lastNewId !== lastKnownId) {
        setTimeout(() => {
          if (messagesContainer.value) messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }, 50)
      }
    }
  } catch (e) {
    console.error('Error fetching messages', e)
  }
}

async function sendMessage() {
  if (!selectedProfile.value || !newMessage.value.trim()) return
  sending.value = true
  try {
    if (!currentProfile.value) {
      console.error('No hay perfil activo (currentProfile) al enviar mensaje')
      return
    }

    const body = { content: newMessage.value.trim(), my_profile_id: currentProfile.value.id }
    if (selectedProfile.value.profile_id) body.target_profile_id = selectedProfile.value.profile_id

    const res = await authenticatedFetch(`/api/chat/${selectedProfile.value.user_id}/messages/`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
    if (res.ok) {
      // Intentar leer el mensaje creado retornado por la API y añadirlo inmediatamente
      const created = await res.json().catch(() => null)
      if (created) {
        messages.value.push(created)
        // scroll to bottom
        setTimeout(() => {
          if (messagesContainer.value) messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }, 50)
      } else {
        // Fallback: recargar mensajes
        await fetchMessages()
      }
      newMessage.value = ''
    } else {
      console.error('Failed to send message', res.status)
      // Opcional: mostrar error al usuario
    }
  } catch (e) {
    console.error('Error sending message', e)
  } finally {
    sending.value = false
  }
}

function startPolling() {
  stopPolling()
  // fetch immediately, then poll
  fetchMessages()
  polling.value = setInterval(fetchMessages, 2000)
}

function stopPolling() {
  if (polling.value) {
    clearInterval(polling.value)
    polling.value = null
  }
}

function close() {
  stopPolling()
  selectedProfile.value = null
  emit('close')
}

function formatDate(s) {
  try {
    const d = new Date(s)
    return d.toLocaleString()
  } catch (e) {
    return s
  }
}

function isMine(m) {
  try {
    const sender = Number(m.sender_id)
    const me = Number(currentUser?.value?.id ?? currentUser?.id ?? null)
    return !isNaN(sender) && !isNaN(me) && sender === me
  } catch (e) {
    return false
  }
}

watch(() => props.show, async (v) => {
  if (v) {
    await loadCurrentUser()
    await loadProfile()
    await loadUsers()
  } else {
    stopPolling()
  }
})

onBeforeUnmount(() => stopPolling())
</script>

<style scoped>
.chat-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.chat-modal {
  width: 900px;
  max-width: 95%;
  height: 600px;
  background: #0b0b0b;
  border-radius: 10px;
  display: flex;
  position: relative;
  overflow: hidden;
}
.chat-sidebar {
  width: 260px;
  background: #0f0f0f;
  padding: 16px;
  border-right: 1px solid rgba(255,255,255,0.04);
  display: flex;
  flex-direction: column;
}
.chat-sidebar h3 { margin: 0 0 10px 0 }
.user-list { list-style: none; padding: 0; margin: 0 }
.user-list-container { flex: 1 1 auto; overflow-y: auto; }
.user-list li { padding: 8px; cursor: pointer; border-radius: 6px }
.user-list li.active { background: rgba(255,255,255,0.04) }
.user-avatar { width:32px; height:32px; border-radius:50%; margin-right:8px; vertical-align:middle }
.user-name { vertical-align:middle }
.chat-window { flex: 1; display: flex; flex-direction: column }
.chat-header { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.04) }
.chat-messages { padding: 12px; flex: 1 1 auto; overflow-y: auto; background: linear-gradient(180deg, #070707 0%, #050505 100%); }
.chat-messages::-webkit-scrollbar { width: 10px }
.chat-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 6px }
.user-list-container::-webkit-scrollbar { width: 8px }
.user-list-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.04); border-radius: 6px }
.message-row { display: flex; margin: 6px 0 }
.message-row.in { justify-content: flex-start }
.message-row.out { justify-content: flex-end }

.message {
  box-sizing: border-box;
  display: inline-block;
  width: auto;
  max-width: 72%;
  padding: 12px 14px;
  border-radius: 12px;
  overflow-wrap: anywhere;
  word-wrap: break-word;
  white-space: pre-wrap;
}
.message.in { background: #1f1f1f; color: #fff }
.message.out { background: linear-gradient(180deg,#6b28d6,#3b1b8a); color: #fff }
 .message-content { display:block; white-space: pre-wrap; word-break: break-word }
.message-meta { font-size: 11px; color: #bdbdbd; margin-top: 6px }
.chat-input {
  padding: 12px;
  border-top: 1px solid rgba(255,255,255,0.04);
  display:flex;
  gap:8px;
  align-items:center;
  background: linear-gradient(180deg, rgba(11,11,11,0.9), rgba(11,11,11,0.95));
  flex: 0 0 auto;
}
.chat-input textarea { flex:1; resize:none; min-height:56px; max-height:140px; height:auto; background:#0b0b0b; color:#fff; border:1px solid rgba(255,255,255,0.04); padding:8px; border-radius:6px; overflow-y:auto; box-sizing:border-box }
.chat-input button { padding:8px 14px; background:var(--color-primary, #9333ea); color:#fff; border:none; border-radius:6px; flex:0 0 72px }

/* ensure messages area has space below for input */
.chat-messages { padding: 12px; flex: 1 1 auto; overflow-y: auto; background: linear-gradient(180deg, #070707 0%, #050505 100%); padding-bottom: 20px }
.chat-close { position:absolute; top:8px; right:8px; background:transparent; border:none; color:#fff; font-size:20px }
</style>
