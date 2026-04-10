<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { register } = useAuth()

const email = ref('')
const username = ref('')
const password = ref('')
const passwordConfirm = ref('')

const emailError = ref('')
const usernameError = ref('')
const passwordError = ref('')
const passwordConfirmError = ref('')

const showPassword = ref(false)
const passwordStrength = ref(0)
const passwordStrengthText = ref('Débil')

const validation = ref({
  email: false,
  username: false,
  password: false,
  passwordConfirm: false,
})

const isFormValid = computed(() => {
  return validation.value.email && validation.value.username && validation.value.password && validation.value.passwordConfirm
})

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

function validateEmail() {
  const emailValue = email.value.trim()
  let error = ''

  if (emailValue) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailValue)) {
      error = 'Email inválido.'
    }
  }

  validation.value.email = !error && emailValue.length > 0
  emailError.value = error
}

function validateUsername() {
  const usernameValue = username.value.trim()
  let error = ''

  if (usernameValue) {
    if (!/^[a-zA-Z0-9_.-]+$/.test(usernameValue)) {
      error = 'Solo letras, números, guiones y puntos.'
    } else if (usernameValue.length < 3) {
      error = 'Mínimo 3 caracteres.'
    }
  }

  validation.value.username = !error && usernameValue.length > 0
  usernameError.value = error
}

function validatePassword() {
  const pwd = password.value
  let strength = 0
  const errors = []

  if (pwd.length >= 8) strength += 20
  else errors.push('Mínimo 8 caracteres')
  if (pwd.length >= 12) strength += 5

  if (/[a-z]/.test(pwd)) strength += 20
  else errors.push('Incluye minúsculas')

  if (/[A-Z]/.test(pwd)) strength += 20
  else errors.push('Incluye mayúsculas')

  if (/[0-9]/.test(pwd)) strength += 20
  else errors.push('Incluye números')

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) strength += 15

  strength = Math.min(strength, 100)
  passwordStrength.value = strength
  validation.value.password = strength >= 80 && pwd.length > 0

  let text = 'Débil'
  if (strength >= 80) text = 'Fuerte'
  else if (strength >= 60) text = 'Medio'
  else if (strength >= 40) text = 'Regular'
  passwordStrengthText.value = text

  let error = ''
  if (pwd && strength < 80) {
    error = 'La contraseña debe ser Fuerte. ' + errors.join(', ')
  }

  passwordError.value = error

  if (passwordConfirm.value) {
    validatePasswordConfirm()
  }
}

function validatePasswordConfirm() {
  const pwd = password.value
  const pwdConfirm = passwordConfirm.value
  let error = ''

  if (pwdConfirm && pwd !== pwdConfirm) {
    error = 'Las contraseñas no coinciden.'
  }

  validation.value.passwordConfirm = !error && pwdConfirm.length > 0
  passwordConfirmError.value = error
}

function togglePassword() {
  showPassword.value = !showPassword.value
}

async function handleRegister() {
  if (!isFormValid.value) return

  try {
    await register(username.value, email.value, password.value)
    router.push('/home')
  } catch (error) {
    passwordError.value = error.message
  }
}

onMounted(() => {
  email.value = ''
  username.value = ''
  password.value = ''
  passwordConfirm.value = ''
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-black text-white">
    <a href="#" class="absolute top-6 left-6 text-purple-400 font-semibold">AniToki</a>

    <div class="w-full max-w-sm px-6">
      <div class="text-center mb-6">
        <h1 class="text-2xl font-extralight">Crear cuenta</h1>
      </div>

      <form @submit.prevent="handleRegister" class="card p-8 space-y-6" autocomplete="off" novalidate>
        <div>
          <label class="block text-sm mb-2 text-gray-300">Dirección de email</label>
          <div class="input-wrap relative">
            <input
              v-model="email"
              @input="validateEmail"
              @click="activateInput"
              type="text"
              required
              readonly
              class="input-field"
              placeholder=""
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              inputmode="email"
            />
            <span class="underline"></span>
          </div>
          <span v-if="emailError" class="text-red-400 text-xs mt-1">{{ emailError }}</span>
        </div>

        <div>
          <label class="block text-sm mb-2 text-gray-300">Nombre de usuario</label>
          <div class="input-wrap relative">
            <input
              v-model="username"
              @input="validateUsername"
              @click="activateInput"
              type="text"
              required
              readonly
              class="input-field"
              placeholder=""
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
            />
            <span class="underline"></span>
          </div>
          <span v-if="usernameError" class="text-red-400 text-xs mt-1">{{ usernameError }}</span>
        </div>

        <div>
          <label class="block text-sm mb-2 text-gray-300">Contraseña</label>
          <div class="relative input-wrap">
            <input
              v-model="password"
              @input="validatePassword"
              @click="activateInput"
              :type="showPassword ? 'text' : 'password'"
              required
              readonly
              class="input-field"
              placeholder=""
              autocomplete="off"
            />
            <button type="button" @click="togglePassword" class="toggle-btn">
              {{ showPassword ? 'ocultar' : 'mostrar' }}
            </button>
            <span class="underline"></span>
          </div>
          <div class="password-strength-container">
            <div class="password-strength-bar">
              <div class="password-strength-fill" :style="{ width: passwordStrength + '%' }"></div>
            </div>
            <span class="password-strength-text">{{ passwordStrengthText }}</span>
          </div>
          <span v-if="passwordError" class="text-red-400 text-xs mt-1">{{ passwordError }}</span>
        </div>

        <div>
          <label class="block text-sm mb-2 text-gray-300">Confirmar contraseña</label>
          <div class="relative input-wrap">
            <input
              v-model="passwordConfirm"
              @input="validatePasswordConfirm"
              @click="activateInput"
              :type="showPassword ? 'text' : 'password'"
              required
              readonly
              class="input-field"
              placeholder=""
              autocomplete="off"
            />
            <button type="button" @click="togglePassword" class="toggle-btn">
              {{ showPassword ? 'ocultar' : 'mostrar' }}
            </button>
            <span class="underline"></span>
          </div>
          <span v-if="passwordConfirmError" class="text-red-400 text-xs mt-1">{{ passwordConfirmError }}</span>
        </div>

        <div>
          <button type="submit" class="submit-btn" :disabled="!isFormValid">CREAR CUENTA</button>
        </div>

        <div class="text-center text-xs text-purple-400">
          <router-link to="/login">¿Ya tienes cuenta?</router-link>
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

.password-strength-container {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.password-strength-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2px;
  overflow: hidden;
}

.password-strength-fill {
  height: 100%;
  background: linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e);
  transition: width 180ms ease;
}

.password-strength-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  min-width: 45px;
}

a {
  color: #812e96;
  text-decoration: none;
}
</style>
