<template>
  <div class="min-h-screen bg-gray-950">
    <!-- Top Bar -->
    <header class="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-40 lg:pl-64">
      <div class="px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-14">
          <!-- Mobile menu button + Logo -->
          <div class="flex items-center gap-3">
            <button
              @click="sidebarOpen = !sidebarOpen"
              class="lg:hidden text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Icon name="mdi:menu" class="w-6 h-6" />
            </button>
            
            <!-- Logo (visible on mobile) -->
            <NuxtLink to="/" class="lg:hidden flex items-center gap-2 group">
              <div class="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center group-hover:bg-primary-500 transition-colors">
                <Icon name="mdi:filmstrip" class="w-5 h-5 text-white" />
              </div>
              <span class="text-lg font-bold text-white">Unifarr</span>
            </NuxtLink>
          </div>

          <!-- User Menu -->
          <div class="flex items-center gap-2">
            <div v-if="isAuthenticated" class="flex items-center gap-3">
              <span class="text-sm text-gray-400 hidden sm:inline">
                {{ user?.username }}
                <span v-if="isAdmin" class="ml-1 px-1.5 py-0.5 bg-primary-600 rounded text-xs">Admin</span>
              </span>
              <button @click="handleLogout" class="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
                <Icon name="mdi:logout" class="w-5 h-5" />
              </button>
            </div>
            <NuxtLink v-else to="/login" class="btn btn-sm btn-primary">
              <Icon name="mdi:login" class="w-4 h-4 mr-1" />
              Login
            </NuxtLink>
          </div>
        </div>
      </div>
    </header>

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 transform transition-transform duration-200 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ]"
    >
      <div class="flex flex-col h-full">
        <!-- Logo -->
        <div class="flex items-center gap-2 px-4 py-4 border-b border-gray-800">
          <div class="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <Icon name="mdi:filmstrip" class="w-5 h-5 text-white" />
          </div>
          <span class="text-lg font-bold text-white">Unifarr</span>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            @click="sidebarOpen = false"
            :class="[
              'sidebar-link',
              isActive(link.to) && 'sidebar-link-active',
            ]"
          >
            <Icon :name="link.icon" class="w-5 h-5 flex-shrink-0" />
            <span class="flex-1">{{ link.label }}</span>
            <span
              v-if="link.badge && link.badge > 0"
              :class="[
                'px-2 py-0.5 text-xs rounded-full font-medium',
                link.badgeColor || 'bg-primary-600 text-white',
              ]"
            >
              {{ link.badge }}
            </span>
          </NuxtLink>
        </nav>

        <!-- User Info (bottom) -->
        <div v-if="isAuthenticated" class="px-3 py-3 border-t border-gray-800">
          <div class="flex items-center gap-2 px-3 py-2 text-sm text-gray-400">
            <Icon name="mdi:account-circle" class="w-5 h-5" />
            <span class="flex-1 truncate">{{ user?.username }}</span>
            <span v-if="isAdmin" class="px-1.5 py-0.5 bg-primary-600 rounded text-xs text-white">Admin</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Overlay (mobile) -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="sidebarOpen"
        @click="sidebarOpen = false"
        class="fixed inset-0 bg-black/50 z-40 lg:hidden"
      />
    </Transition>

    <!-- Main Content -->
    <main class="lg:pl-64 pt-14">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <slot />
      </div>
    </main>

    <!-- Toast Notifications -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const sidebarOpen = ref(false);
const api = useApi();
const { isAuthenticated, isAdmin, user, logout } = useAuth();

// Close sidebar on route change (mobile)
watch(() => route.path, () => {
  sidebarOpen.value = false;
});

// Fetch counts
const unmatchedCount = ref(0);
const activeDownloads = ref(0);

const fetchCounts = async () => {
  try {
    const unmatched = await api.files.getUnmatched();
    unmatchedCount.value = unmatched?.length || 0;
  } catch { /* ignore */ }

  try {
    const downloads = await api.downloads.getActive();
    activeDownloads.value = downloads?.downloads?.length || 0;
  } catch { /* ignore */ }
};

// Initial fetch (client-side only)
if (import.meta.client) {
  fetchCounts();
}

// Refresh counts periodically
const { pause } = useIntervalFn(() => {
  fetchCounts();
}, 30000);

onUnmounted(() => {
  pause();
});

const handleLogout = () => {
  logout();
  router.push('/login');
};

const navLinks = computed(() => {
  const links = [
    { to: '/discover', icon: 'mdi:compass', label: 'Discover' },
  ];

  // Add requests link if authenticated
  if (isAuthenticated.value) {
    links.push({
      to: '/requests',
      icon: 'mdi:playlist-plus',
      label: isAdmin.value ? 'Requests' : 'My Requests',
    } as any);
  }

  // Admin-only links
  if (isAdmin.value) {
    links.push(
      { to: '/library/movies', icon: 'mdi:movie', label: 'Movies' },
      { to: '/library/tv', icon: 'mdi:television', label: 'TV Shows' },
      {
        to: '/unmatched',
        icon: 'mdi:help-circle',
        label: 'Unmatched',
        badge: unmatchedCount.value,
        badgeColor: 'bg-red-600',
      } as any,
      {
        to: '/downloads',
        icon: 'mdi:download',
        label: 'Downloads',
        badge: activeDownloads.value,
        badgeColor: 'bg-primary-600',
      } as any,
      { to: '/settings', icon: 'mdi:cog', label: 'Settings' }
    );
  }

  return links;
});

const isActive = (to: string) => {
  if (to === '/') return route.path === '/';
  return route.path.startsWith(to);
};
</script>

<style scoped>
.sidebar-link {
  @apply flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm font-medium;
}

.sidebar-link-active {
  @apply text-white bg-gray-800;
}
</style>
