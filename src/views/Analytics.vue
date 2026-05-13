<script setup>
import { onMounted, ref, computed, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useProfile } from '../composables/useProfile'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const router = useRouter()
const { currentUser, logout, loadCurrentUser, authenticatedFetch } = useAuth()
const { currentProfile, loadProfile } = useProfile()

// Mobile menu
const mobileMenuOpen = ref(false)

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

// Analytics data
const analyticsData = ref(null)
const loading = ref(true)
const error = ref(null)

// Chart refs
const genreChartRef = ref(null)
const audioChartRef = ref(null)
const yearsChartRef = ref(null)
const dailyActivityChartRef = ref(null)

// Chart instances
let genreChart = null
let audioChart = null
let yearsChart = null
let dailyActivityChart = null

// Cargar datos de analytics
async function loadAnalytics() {
  try {
    loading.value = true
    error.value = null
    
    const response = await authenticatedFetch('/api/backoffice/analytics/')
    
    if (!response.ok) {
      throw new Error('Error al cargar métricas')
    }
    
    const data = await response.json()
    analyticsData.value = data
    
    // Esperar a que Vue actualice el DOM y los canvas se rendericen
    await nextTick()
    
    // Timeout adicional para asegurar que los canvas estén completamente renderizados
    setTimeout(() => {
      initializeCharts()
    }, 200)
    
  } catch (err) {
    error.value = err.message
    console.error('Error loading analytics:', err)
  } finally {
    loading.value = false
  }
}

// Inicializar todos los gráficos
function initializeCharts() {
  if (!analyticsData.value) {
    return
  }
  
  // Destruir gráficos existentes
  destroyCharts()
  
  // Crear gráficos
  createGenreChart()
  createAudioChart()
  createYearsChart()
  createDailyActivityChart()
}

// Destruir gráficos
function destroyCharts() {
  if (genreChart) genreChart.destroy()
  if (audioChart) audioChart.destroy()
  if (yearsChart) yearsChart.destroy()
  if (dailyActivityChart) dailyActivityChart.destroy()
}

// Gráfico de distribución por géneros (Barras horizontales)
function createGenreChart() {
  if (!genreChartRef.value || !analyticsData.value?.distributions?.genres) {
    return
  }
  
  const genres = analyticsData.value.distributions.genres
  const labels = genres.map(g => g.name)
  const data = genres.map(g => g.count)
  
  const ctx = genreChartRef.value.getContext('2d')
  genreChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Animes por Género',
        data: data,
        backgroundColor: 'rgba(147, 51, 234, 0.8)',
        borderColor: 'rgba(147, 51, 234, 1)',
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 12,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            color: '#b3b3b3',
            font: {
              size: 12
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        y: {
          ticks: {
            color: '#fff',
            font: {
              size: 13
            }
          },
          grid: {
            display: false
          }
        }
      }
    }
  })
}

// Gráfico de distribución por tipo de audio (Dona)
function createAudioChart() {
  if (!audioChartRef.value || !analyticsData.value?.distributions?.audio_types) return
  
  const audioTypes = analyticsData.value.distributions.audio_types
  const labels = audioTypes.map(a => {
    const typeMap = { 'SUB': 'Subtitulado', 'DUB': 'Doblado', 'BOTH': 'Sub y Dub' }
    return typeMap[a.audio_type] || a.audio_type
  })
  const data = audioTypes.map(a => a.count)
  
  const ctx = audioChartRef.value.getContext('2d')
  audioChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          'rgba(147, 51, 234, 0.9)',
          'rgba(168, 85, 247, 0.9)',
          'rgba(126, 34, 206, 0.9)'
        ],
        borderColor: '#141414',
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#fff',
            font: {
              size: 13
            },
            padding: 15
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 12,
          cornerRadius: 8
        }
      }
    }
  })
}

// Gráfico de distribución por años (Barras)
function createYearsChart() {
  if (!yearsChartRef.value || !analyticsData.value?.distributions?.years) return
  
  const years = analyticsData.value.distributions.years
  const labels = years.map(y => y.year)
  const data = years.map(y => y.count)
  
  const ctx = yearsChartRef.value.getContext('2d')
  yearsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Animes por Año',
        data: data,
        backgroundColor: 'rgba(147, 51, 234, 0.8)',
        borderColor: 'rgba(147, 51, 234, 1)',
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 12,
          cornerRadius: 8
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#b3b3b3',
            font: {
              size: 12
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        x: {
          ticks: {
            color: '#fff',
            font: {
              size: 12
            }
          },
          grid: {
            display: false
          }
        }
      }
    }
  })
}

// Gráfico de actividad diaria (Línea)
function createDailyActivityChart() {
  if (!dailyActivityChartRef.value || !analyticsData.value?.activity?.daily_saves) return
  
  const activity = analyticsData.value.activity.daily_saves
  const labels = activity.map(a => {
    const date = new Date(a.date)
    return `${date.getDate()}/${date.getMonth() + 1}`
  })
  const data = activity.map(a => a.count)
  
  const ctx = dailyActivityChartRef.value.getContext('2d')
  dailyActivityChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Guardados por Día',
        data: data,
        borderColor: 'rgba(147, 51, 234, 1)',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(147, 51, 234, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 12,
          cornerRadius: 8
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#b3b3b3',
            font: {
              size: 12
            },
            stepSize: 1
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        x: {
          ticks: {
            color: '#b3b3b3',
            font: {
              size: 11
            },
            maxRotation: 45,
            minRotation: 45
          },
          grid: {
            display: false
          }
        }
      }
    }
  })
}

// Lifecycle hooks
onMounted(async () => {
  await loadCurrentUser()
  await loadProfile()
  await loadAnalytics()
})

onUnmounted(() => {
  destroyCharts()
})

function handleLogout() {
  logout()
  router.push('/login')
}

function goToTestWatch() {
  router.push('/anime/1')
}
</script>

<template>
  <div class="analytics-page">
    <!-- Header estilo Crunchyroll -->
    <header class="header">
      <div class="header-content">
        <div class="header-left">
          <img src="/Logo_AniToki.png" alt="AniToki" class="logo" @click="router.push('/home')" />
          <nav class="nav-links">
            <a @click="router.push('/categories')" class="nav-link" style="cursor: pointer;">Explorar</a>
            <a @click="router.push('/analytics')" class="nav-link" style="cursor: pointer;">Analytics</a>
          </nav>
        </div>
        <div class="header-right">
          <!-- Hamburger menu button (mobile) -->
          <button class="btn-hamburger" @click="toggleMobileMenu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <button class="btn-search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </button>
          
          <button 
            v-if="currentUser?.username === 'admin'" 
            @click="router.push('/backoffice')" 
            class="btn-admin"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            Gestión
          </button>
          
          <button class="btn-watchlist" @click="router.push('/my-list')">Mi Lista</button>
          
          <div v-if="currentUser" class="user-controls">
            <button @click="router.push('/manager/profiles')" class="btn-profile">
              <img v-if="currentProfile?.avatar" :src="currentProfile.avatar" :alt="currentProfile.name" class="profile-avatar" />
              <span v-else>{{ currentUser.username.charAt(0).toUpperCase() }}</span>
            </button>
            <button class="btn-logout" @click="handleLogout">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile Navigation Menu -->
      <div class="mobile-menu" :class="{ open: mobileMenuOpen }">
        <div class="mobile-menu-header">
          <img src="/Logo_AniToki.png" alt="AniToki" class="logo" />
          <button class="btn-close" @click="toggleMobileMenu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <nav class="mobile-nav-links">
          <a @click="router.push('/categories'); toggleMobileMenu()" class="mobile-nav-link">Explorar</a>
          <a @click="router.push('/analytics'); toggleMobileMenu()" class="mobile-nav-link">Analytics</a>
          <a @click="router.push('/my-list'); toggleMobileMenu()" class="mobile-nav-link">Mi Lista</a>
          <a v-if="currentUser?.username === 'admin'" @click="router.push('/backoffice'); toggleMobileMenu()" class="mobile-nav-link">Gestión</a>
          <a @click="goToTestWatch(); toggleMobileMenu()" class="mobile-nav-link">Reproductor</a>
        </nav>
        <div class="mobile-menu-footer">
          <button v-if="currentUser" @click="handleLogout; toggleMobileMenu()" class="btn-logout-mobile">
            Cerrar Sesión
          </button>
        </div>
      </div>
      <div v-if="mobileMenuOpen" class="mobile-menu-overlay" @click="toggleMobileMenu"></div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <div class="content-wrapper">
        <!-- Page Title -->
        <div class="page-header">
          <h1 class="page-title">📊 Métricas y Estadísticas</h1>
          <p class="page-subtitle">Panel de análisis de la plataforma</p>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Cargando métricas...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="error-state">
          <p>❌ {{ error }}</p>
        </div>

        <!-- Analytics Content -->
        <div v-else-if="analyticsData" class="analytics-content">
          <!-- KPI Cards -->
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-icon">📺</div>
              <div class="kpi-content">
                <div class="kpi-value">{{ analyticsData.overview.total_animes }}</div>
                <div class="kpi-label">Animes Disponibles</div>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-icon">🎬</div>
              <div class="kpi-content">
                <div class="kpi-value">{{ analyticsData.overview.total_episodes }}</div>
                <div class="kpi-label">Episodios Totales</div>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-icon">👥</div>
              <div class="kpi-content">
                <div class="kpi-value">{{ analyticsData.overview.total_users }}</div>
                <div class="kpi-label">Usuarios Registrados</div>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-icon">⭐</div>
              <div class="kpi-content">
                <div class="kpi-value">{{ analyticsData.overview.average_rating }}/10</div>
                <div class="kpi-label">Rating Promedio</div>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-icon">👤</div>
              <div class="kpi-content">
                <div class="kpi-value">{{ analyticsData.overview.total_profiles }}</div>
                <div class="kpi-label">Perfiles Creados</div>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-icon">💾</div>
              <div class="kpi-content">
                <div class="kpi-value">{{ analyticsData.overview.total_watchlist_items }}</div>
                <div class="kpi-label">Guardados Totales</div>
              </div>
            </div>
          </div>

          <!-- Charts Grid -->
          <div class="charts-grid">
            <!-- Genres Chart -->
            <div class="chart-card chart-wide">
              <h2 class="chart-title">Top 10 Géneros Más Populares</h2>
              <div class="chart-container">
                <canvas ref="genreChartRef"></canvas>
              </div>
            </div>

            <!-- Audio Distribution -->
            <div class="chart-card">
              <h2 class="chart-title">Distribución por Idioma</h2>
              <div class="chart-container chart-square">
                <canvas ref="audioChartRef"></canvas>
              </div>
            </div>

            <!-- Years Distribution -->
            <div class="chart-card">
              <h2 class="chart-title">Animes por Año (Últimos 10 años)</h2>
              <div class="chart-container">
                <canvas ref="yearsChartRef"></canvas>
              </div>
            </div>

            <!-- Daily Activity -->
            <div class="chart-card chart-wide">
              <h2 class="chart-title">Actividad de Guardados (Últimos 30 días)</h2>
              <div class="chart-container">
                <canvas ref="dailyActivityChartRef"></canvas>
              </div>
            </div>
          </div>

          <!-- Top Animes Lists -->
          <div class="top-lists">
            <!-- Most Saved -->
            <div class="top-list-card">
              <h2 class="list-title">🔥 Animes Más Guardados</h2>
              <div class="top-list">
                <div 
                  v-for="(anime, index) in analyticsData.top_animes.most_saved" 
                  :key="anime.id"
                  class="top-list-item"
                  @click="router.push(`/anime/${anime.id}`)"
                >
                  <span class="rank">{{ index + 1 }}</span>
                  <img :src="anime.cover_image" :alt="anime.title" class="list-thumb" />
                  <div class="list-info">
                    <p class="list-anime-title">{{ anime.title }}</p>
                    <p class="list-meta">⭐ {{ anime.rating }}/10 • 💾 {{ anime.saves_count }} guardados</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Best Rated -->
            <div class="top-list-card">
              <h2 class="list-title">⭐ Mejor Valorados</h2>
              <div class="top-list">
                <div 
                  v-for="(anime, index) in analyticsData.top_animes.best_rated" 
                  :key="anime.id"
                  class="top-list-item"
                  @click="router.push(`/anime/${anime.id}`)"
                >
                  <span class="rank">{{ index + 1 }}</span>
                  <img :src="anime.cover_image" :alt="anime.title" class="list-thumb" />
                  <div class="list-info">
                    <p class="list-anime-title">{{ anime.title }}</p>
                    <p class="list-meta">⭐ {{ anime.rating }}/10 • 📅 {{ anime.year }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.analytics-page {
  background-color: #141414;
  color: #fff;
  min-height: 100vh;
}

/* ===== HEADER ===== */
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(10, 10, 10, 0.98);
  backdrop-filter: blur(12px);
  z-index: 1000;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem 2.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 3rem;
}

.logo {
  height: 45px;
  width: auto;
  object-fit: contain;
  cursor: pointer;
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-link {
  color: var(--color-text-primary);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  transition: color 0.2s ease;
  position: relative;
}

.nav-link:hover {
  color: var(--color-primary-light);
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-primary);
  transform: scaleX(0);
  transition: transform 0.2s ease;
}

.nav-link:hover::after {
  transform: scaleX(1);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn-search {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--color-text-primary);
  padding: 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-search:hover {
  background: rgba(147, 51, 234, 0.1);
  border-color: var(--color-primary);
}

.btn-watchlist {
  background: transparent;
  border: 1.5px solid var(--color-primary);
  color: var(--color-primary);
  padding: 0.6rem 1.5rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-watchlist:hover {
  background: var(--color-primary);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(147, 51, 234, 0.3);
}

.btn-admin {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: none;
  color: #fff;
  padding: 0.6rem 1.5rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.btn-admin:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
}

.user-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-profile {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: #fff;
  padding: 0;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.btn-profile:hover {
  transform: scale(1.1);
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 4px 12px rgba(147, 51, 234, 0.5);
}

.profile-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.btn-logout {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--color-text-primary);
  padding: 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
}

.btn-logout:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: #ef4444;
  color: #ef4444;
}

.btn-hamburger {
  display: none;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  transition: all 0.2s ease;
}

.btn-hamburger:hover {
  color: var(--color-primary-light);
}

/* Mobile Menu */
.mobile-menu {
  position: fixed;
  top: 0;
  right: -100%;
  width: 300px;
  height: 100vh;
  background: rgba(10, 10, 10, 0.98);
  backdrop-filter: blur(20px);
  z-index: 1001;
  transition: right 0.4s ease;
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.mobile-menu.open {
  right: 0;
}

.mobile-menu-header {
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.mobile-menu-header .logo {
  height: 35px;
}

.btn-close {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  transition: all 0.2s ease;
}

.btn-close:hover {
  color: #ef4444;
}

.mobile-nav-links {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1rem 0;
}

.mobile-nav-link {
  color: var(--color-text-primary);
  text-decoration: none;
  padding: 1rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
  cursor: pointer;
}

.mobile-nav-link:hover {
  background: rgba(255, 255, 255, 0.05);
  border-left-color: var(--color-primary);
  color: var(--color-primary-light);
}

.mobile-menu-footer {
  padding: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-logout-mobile {
  width: 100%;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid #ef4444;
  color: #ef4444;
  padding: 0.8rem 1.5rem;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-logout-mobile:hover {
  background: #ef4444;
  color: #fff;
}

.mobile-menu-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  cursor: pointer;
}

/* Main Content */
.main-content {
  margin-top: 72px;
  padding: 3rem 0;
}

.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
}

.page-header {
  text-align: center;
  margin-bottom: 3rem;
}

.page-title {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #9333ea 0%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  font-size: 1.2rem;
  color: #b3b3b3;
}

/* Loading & Error States */
.loading-state,
.error-state {
  text-align: center;
  padding: 4rem 2rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(147, 51, 234, 0.2);
  border-top-color: #9333ea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* KPI Cards */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.kpi-card {
  background: linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(0, 0, 0, 0.4) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 2rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  transition: all 0.3s;
}

.kpi-card:hover {
  transform: translateY(-5px);
  border-color: rgba(147, 51, 234, 0.5);
  box-shadow: 0 10px 30px rgba(147, 51, 234, 0.2);
}

.kpi-icon {
  font-size: 3rem;
}

.kpi-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: #9333ea;
  line-height: 1;
  margin-bottom: 0.3rem;
}

.kpi-label {
  font-size: 0.9rem;
  color: #b3b3b3;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Charts Grid */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
  margin-bottom: 3rem;
}

.chart-card {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 2rem;
}

.chart-wide {
  grid-column: span 2;
}

.chart-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: #fff;
}

.chart-container {
  height: 300px;
  position: relative;
}

.chart-square {
  height: 250px;
}

/* Top Lists */
.top-lists {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
}

.top-list-card {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 2rem;
}

.list-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: #fff;
}

.top-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.top-list-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.top-list-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateX(5px);
}

.rank {
  font-size: 1.5rem;
  font-weight: 700;
  color: #9333ea;
  min-width: 30px;
  text-align: center;
}

.list-thumb {
  width: 60px;
  height: 85px;
  object-fit: cover;
  border-radius: 6px;
}

.list-info {
  flex: 1;
}

.list-anime-title {
  font-weight: 600;
  margin-bottom: 0.3rem;
  font-size: 0.95rem;
}

.list-meta {
  font-size: 0.85rem;
  color: #b3b3b3;
}

/* Responsive */
@media (max-width: 1024px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
  
  .chart-wide {
    grid-column: span 1;
  }
  
  .top-lists {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .nav-links {
    display: none;
  }
  
  .btn-hamburger {
    display: block;
  }

  .btn-watchlist,
  .btn-admin {
    display: none;
  }

  .header-content {
    padding: 1rem 1.5rem;
  }

  .content-wrapper {
    padding: 0 1rem;
  }
  
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .page-title {
    font-size: 2rem;
  }
}

@media (max-width: 480px) {
  .kpi-grid {
    grid-template-columns: 1fr;
  }
  
  .kpi-card {
    padding: 1.5rem;
  }
  
  .kpi-value {
    font-size: 2rem;
  }
}
</style>
