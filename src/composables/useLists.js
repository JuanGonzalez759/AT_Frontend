import { ref, watch } from 'vue'
import { useProfile } from './useProfile'

const listsByProfile = ref({})

function storageKey(profileId) {
  return `anitoki_lists_${profileId}`
}

function loadFromStorage(profileId) {
  try {
    const raw = localStorage.getItem(storageKey(profileId))
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.error('Error parsing lists from storage', e)
    return []
  }
}

function saveToStorage(profileId, lists) {
  try {
    localStorage.setItem(storageKey(profileId), JSON.stringify(lists))
  } catch (e) {
    console.error('Error saving lists to storage', e)
  }
}

export function useLists() {
  const { currentProfile } = useProfile()

  // initialize cache when profile changes
  watch(() => currentProfile.value?.id, (id) => {
    if (!id) return
    listsByProfile.value[id] = loadFromStorage(id)
  }, { immediate: true })

  function ensureLoaded() {
    const id = currentProfile.value?.id
    if (!id) return []
    if (!listsByProfile.value[id]) {
      // normalize stored lists: convert legacy numeric ids to objects { id, type }
      const raw = loadFromStorage(id)
      listsByProfile.value[id] = (raw || []).map(l => {
        const items = (l.items || []).map(it => {
          if (it && typeof it === 'object' && it.id) return it
          // legacy numeric/string id -> assume anime
          return { id: it, type: 'anime' }
        })
        return { ...l, items }
      })
    }
    return listsByProfile.value[id]
  }

  function getLists() {
    return ensureLoaded()
  }

  function createList(name) {
    const id = Date.now().toString(36)
    const newList = { id, name: name || 'Lista', items: [], createdAt: new Date().toISOString() }
    const idProfile = currentProfile.value?.id
    if (!idProfile) return null
    ensureLoaded()
    listsByProfile.value[idProfile].push(newList)
    saveToStorage(idProfile, listsByProfile.value[idProfile])
    return newList
  }

  function addToList(listId, itemId, type = 'anime') {
    const idProfile = currentProfile.value?.id
    if (!idProfile) return false
    ensureLoaded()
    const lists = listsByProfile.value[idProfile]
    const list = lists.find(l => l.id === listId)
    if (!list) return false
    const exists = list.items.find(i => String(i.id) === String(itemId) && (i.type || 'anime') === (type || 'anime'))
    if (!exists) {
      list.items.push({ id: itemId, type: type || 'anime' })
      saveToStorage(idProfile, lists)
    }
    return true
  }

  function removeFromList(listId, itemId, type = 'anime') {
    const idProfile = currentProfile.value?.id
    if (!idProfile) return false
    ensureLoaded()
    const lists = listsByProfile.value[idProfile]
    const list = lists.find(l => l.id === listId)
    if (!list) return false
    const idx = list.items.findIndex(i => String(i.id) === String(itemId) && (i.type || 'anime') === (type || 'anime'))
    if (idx !== -1) {
      list.items.splice(idx, 1)
      saveToStorage(idProfile, lists)
    }
    return true
  }

  function deleteList(listId) {
    const idProfile = currentProfile.value?.id
    if (!idProfile) return false
    ensureLoaded()
    const lists = listsByProfile.value[idProfile]
    const idx = lists.findIndex(l => l.id === listId)
    if (idx === -1) return false
    lists.splice(idx, 1)
    saveToStorage(idProfile, lists)
    return true
  }

  function restoreList(listObj) {
    const idProfile = currentProfile.value?.id
    if (!idProfile || !listObj) return false
    ensureLoaded()
    // if list id already exists, generate a new one
    const lists = listsByProfile.value[idProfile]
    if (lists.find(l => l.id === listObj.id)) {
      listObj.id = Date.now().toString(36)
    }
    lists.push(listObj)
    saveToStorage(idProfile, lists)
    return true
  }

  function isInList(listId, itemId, type = 'anime') {
    const idProfile = currentProfile.value?.id
    if (!idProfile) return false
    ensureLoaded()
    const lists = listsByProfile.value[idProfile]
    const list = lists.find(l => l.id === listId)
    if (!list) return false
    return !!list.items.find(i => String(i.id) === String(itemId) && (i.type || 'anime') === (type || 'anime'))
  }

  return {
    getLists,
    createList,
    addToList,
    removeFromList,
    deleteList,
    restoreList,
    isInList,
  }
}
