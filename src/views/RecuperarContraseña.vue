<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

const email = ref('')
const successMessage = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

function activateInput(event) {
  const input = event.target
  const wrap = input.closest('.input-wrap')
  if (!input.hasAttribute('readonly') || !wrap) return
  
  event.preventDefault()
  wrap.classList.add('activating')
  setTimeout(() => {
    input.removeAttribute('readonly')
    wrap.classList.remove('activating')
    input.focus()
  }, 220)
}

async function handleRequestReset() {
  errorMessage.value = ''
  successMessage.value = ''
  
  if (!email.value || !email.value.includes('@')) {
    errorMessage.value = 'Por favor, introduce un email válido.'
    return
  }

  isLoading.value = true

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/password-reset/request/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email.value }),
    })

    const data = await response.json()

    if (response.ok) {
      successMessage.value = 'Te hemos enviado las instrucciones al correo. Si no lo ves, revisa tu carpeta de spam.'
      email.value = ''
    } else {
      errorMessage.value = data.detail || 'Error al solicitar el reseteo de contraseña.'
    }
  } catch (error) {
    errorMessage.value = 'Error de conexión. Inténtalo de nuevo.'
  } finally {
    isLoading.value = false
  }
}

function goBack() {
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-black text-white">
    <a href="#" class="absolute top-6 left-6" @click.prevent="goBack">
      <img src="/Logo_AniToki.png" alt="AniToki" class="h-10" />
    </a>

    <div class="w-full max-w-sm px-6">
      <div class="text-center mb-6">
        <h1 class="text-2xl font-extralight">Recuperar contraseña</h1>
        <p class="text-sm text-gray-400 mt-2">
          Introduce tu email y te enviaremos instrucciones para recuperar tu contraseña
        </p>
      </div>

      <form @submit.prevent="handleRequestReset" class="card p-8 space-y-6" autocomplete="off" novalidate>
        <div>
          <label class="block text-sm mb-2 text-gray-300">Email</label>
          <div class="input-wrap relative">
            <input
              v-model="email"
              type="email"
              required
              readonly
              @click="activateInput"
              class="input-field"
              placeholder=""
              autocomplete="off"
            />
            <span class="underline"></span>
          </div>
        </div>

        <div v-if="successMessage" class="text-green-400 text-sm">
          {{ successMessage }}
        </div>

        <div v-if="errorMessage" class="text-red-400 text-sm">
          {{ errorMessage }}
        </div>

        <div>
          <button type="submit" class="submit-btn" :disabled="isLoading">
            {{ isLoading ? 'ENVIANDO...' : 'ENVIAR INSTRUCCIONES' }}
          </button>
        </div>

        <div class="text-center text-xs text-purple-400">
          <a href="#" @click.prevent="goBack">Volver al inicio de sesión</a>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
}

.input-field {
  width: 100%;
  background: transparent;
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 10px 8px;
  color: #fff;
  outline: none;
  transition: border-color 0.12s, box-shadow 0.12s;
}

.input-field::placeholder {
  color: rgba(255, 255, 255, 0.18);
}

.input-field:focus {
  border-bottom-color: rgba(147, 51, 234, 0.9);
  outline: none;
  box-shadow: none;
}

.input-field[readonly] {
  cursor: text;
}

.input-wrap {
  position: relative;
}

.input-wrap .underline {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 6px;
  height: 2px;
  background: rgba(255, 255, 255, 0.06);
  transform-origin: left center;
  transform: scaleX(0);
  transition: transform 220ms ease, background-color 220ms ease;
}

.input-wrap.activating .underline {
  transform: scaleX(1);
  background-color: #9333ea;
}

.submit-btn {
  width: 100%;
  padding: 10px 12px;
  border-radius: 6px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  letter-spacing: 0.6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.12s, transform 0.06s;
}

.submit-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.02);
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

a {
  color: #9333ea;
  text-decoration: none;
}

/* Responsive */
@media (max-width: 640px) {
  .min-h-screen {
    padding: 1rem;
  }

  .absolute.top-6.left-6 {
    top: 1rem;
    left: 1rem;
  }

  .absolute.top-6.left-6 img {
    height: 2rem;
  }

  .w-full.max-w-sm {
    max-width: 100%;
  }
}

/* Utility Classes */
.min-h-screen {
  min-height: 100vh;
}

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.justify-center {
  justify-content: center;
}

.bg-black {
  background-color: #000;
}

.text-white {
  color: #fff;
}

.absolute {
  position: absolute;
}

.top-6 {
  top: 1.5rem;
}

.left-6 {
  left: 1.5rem;
}

.h-10 {
  height: 2.5rem;
}

.w-full {
  width: 100%;
}

.max-w-sm {
  max-width: 24rem;
}

.px-6 {
  padding-left: 1.5rem;
  padding-right: 1.5rem;
}

.text-center {
  text-align: center;
}

.mb-6 {
  margin-bottom: 1.5rem;
}

.text-2xl {
  font-size: 1.5rem;
  line-height: 2rem;
}

.font-extralight {
  font-weight: 200;
}

.text-sm {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.text-gray-400 {
  color: #9ca3af;
}

.text-gray-300 {
  color: #d1d5db;
}

.mt-2 {
  margin-top: 0.5rem;
}

.p-8 {
  padding: 2rem;
}

.space-y-6 > * + * {
  margin-top: 1.5rem;
}

.block {
  display: block;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.relative {
  position: relative;
}

.text-green-400 {
  color: #4ade80;
}

.text-red-400 {
  color: #f87171;
}

.text-purple-400 {
  color: #c084fc;
}

.text-xs {
  font-size: 0.75rem;
  line-height: 1rem;
}
</style>
