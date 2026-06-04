import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import RecuperarContraseña from '../views/RecuperarContraseña.vue'
import ResetPassword from '../views/ResetPassword.vue'
import Home from '../views/Home.vue'
import Categories from '../views/Categories.vue'
import MyList from '../views/MyList.vue'
import Analytics from '../views/Analytics.vue'
import AnimeDetails from '../views/AnimeDetails.vue'
import MangaDetails from '../views/MangaDetails.vue'
import ChooseProfile from '../views/manager/ChooseProfile.vue'
import AdminDashboard from '../views/backoffice/AdminDashboard.vue'
import AddAnime from '../views/backoffice/AddAnime.vue'
import AddManga from '../views/backoffice/AddManga.vue'
import EditAnime from '../views/backoffice/EditAnime.vue'
import ManageEpisodes from '../views/backoffice/ManageEpisodes.vue'
import WatchAnime from '../views/WatchAnime.vue'

const routes = [
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresGuest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { requiresGuest: true },
  },
  {
    path: '/recuperar-contraseña',
    name: 'RecuperarContraseña',
    component: RecuperarContraseña,
    meta: { requiresGuest: true },
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: ResetPassword,
    meta: { requiresGuest: true },
  },
  {
    path: '/manager/profiles',
    name: 'ChooseProfile',
    component: ChooseProfile,
    meta: { requiresAuth: true },
  },
  {
    path: '/backoffice',
    name: 'AdminDashboard',
    component: AdminDashboard,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/backoffice/add-anime',
    name: 'AddAnime',
    component: AddAnime,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/backoffice/add-manga',
    name: 'AddManga',
    component: AddManga,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/backoffice/edit-anime/:id',
    name: 'EditAnime',
    component: EditAnime,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/backoffice/episodes/:id',
    name: 'ManageEpisodes',
    component: ManageEpisodes,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/watch',
    name: 'WatchAnime',
    component: WatchAnime,
    meta: { requiresAuth: true },
  },
  {
    path: '/home',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true },
  },
  {
    path: '/categories',
    name: 'Categories',
    component: Categories,
    meta: { requiresAuth: true },
  },
  {
    path: '/my-list',
    name: 'MyList',
    component: MyList,
    meta: { requiresAuth: true },
  },
  {
    path: '/analytics',
    name: 'Analytics',
    component: Analytics,
    meta: { requiresAuth: true },
  },
  {
    path: '/anime/:id',
    name: 'AnimeDetails',
    component: AnimeDetails,
    meta: { requiresAuth: true },
  },
  {
    path: '/manga/:id',
    name: 'MangaDetails',
    component: MangaDetails,
    meta: { requiresAuth: true },
  },
  {
    path: '/manga/:id/read/:chapter',
    name: 'MangaReader',
    component: () => import('../views/MangaReader.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, from, next) => {
  const { currentUser, loadCurrentUser } = useAuth()

  // Si no tenemos info del usuario, la cargamos
  if (currentUser.value === null && !to.meta.requiresGuest) {
    await loadCurrentUser()
  }

  const isAuthenticated = !!currentUser.value
  const isAdmin = currentUser.value?.username === 'admin'

  // Proteger rutas que requieren autenticación
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
    return
  }

  // Proteger rutas que requieren ser administrador (solo usuario 'admin')
  if (to.meta.requiresAdmin && !isAdmin) {
    next('/home')
    return
  }

  // Proteger rutas que requieren ser invitado (guest)
  if (to.meta.requiresGuest && isAuthenticated) {
    next('/home')
    return
  }

  next()
})

export default router
