<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { login } = useAuth()

const username = ref('')
const password = ref('')
const errorMessage = ref('')
const showPassword = ref(false)

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

async function handleLogin() {
  errorMessage.value = ''
  
  if (!username.value || !password.value) {
    errorMessage.value = 'Usuario y contraseña son obligatorios.'
    return
  }

  try {
    const user = await login(username.value, password.value)
    // Redirigir según el tipo de usuario
    if (user?.username === 'admin') {
      router.push('/backoffice')
    } else {
      router.push('/home')
    }
  } catch (error) {
    errorMessage.value = error.message
  }
}

function togglePassword() {
  showPassword.value = !showPassword.value
}

onMounted(() => {
  // Clear inputs on mount
  username.value = ''
  password.value = ''
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-black text-white">
    <a href="#" class="absolute top-6 left-6 text-purple-400 font-semibold">AniToki</a>

    <div class="w-full max-w-sm px-6">
      <div class="text-center mb-6">
        <h1 class="text-2xl font-extralight">Acceder</h1>
      </div>

      <form @submit.prevent="handleLogin" class="card p-8 space-y-6" autocomplete="off" novalidate>
        <div>
          <label class="block text-sm mb-2 text-gray-300">Usuario o email</label>
          <div class="input-wrap relative">
            <input
              v-model="username"
              type="text"
              required
              readonly
              @click="activateInput"
              class="input-field"
              placeholder=""
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
            />
            <span class="underline"></span>
          </div>
        </div>

        <div>
          <label class="block text-sm mb-2 text-gray-300">Contraseña</label>
          <div class="relative input-wrap">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              readonly
              @click="activateInput"
              class="input-field"
              placeholder=""
              autocomplete="off"
            />
            <button
              type="button"
              @click="togglePassword"
              class="toggle-btn"
            >
              {{ showPassword ? 'ocultar' : 'mostrar' }}
            </button>
            <span class="underline"></span>
          </div>
        </div>

        <div v-if="errorMessage" class="text-red-400 text-xs">
          {{ errorMessage }}
        </div>

        <div>
          <button type="submit" class="submit-btn">ACCEDER</button>
        </div>

        <div class="flex justify-between text-xs text-purple-400">
          <a href="#">¿Has olvidado tu contraseña?</a>
          <router-link to="/register">CREAR CUENTA</router-link>
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
  border-bottom-color: rgba(129, 46, 150, 0.9);
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
  background-color: #812e96;
}

.toggle-btn {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: 0;
  color: rgba(129, 46, 150, 0.9);
  font-size: 12px;
  cursor: pointer;
  z-index: 5;
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
  color: #812e96;
  text-decoration: none;
}
</style>
