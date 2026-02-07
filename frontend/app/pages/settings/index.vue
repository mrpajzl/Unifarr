<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold">Settings</h1>
      <p class="text-gray-500 mt-1">Configure Unifarr</p>
    </div>

    <!-- Settings Navigation -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Trackers Card -->
      <NuxtLink
        to="/settings/trackers"
        class="card p-6 hover:bg-gray-800/50 transition-all group"
      >
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-lg bg-primary-600/20 flex items-center justify-center group-hover:bg-primary-600/30 transition-colors">
            <Icon name="mdi:cloud-download" class="w-6 h-6 text-primary-400" />
          </div>
          <div class="flex-1">
            <h2 class="text-xl font-semibold mb-2">Trackers</h2>
            <p class="text-sm text-gray-400">
              Configure download providers and torrent trackers
            </p>
          </div>
        </div>
      </NuxtLink>

      <!-- Libraries Card -->
      <NuxtLink
        to="/settings/libraries"
        class="card p-6 hover:bg-gray-800/50 transition-all group"
      >
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center group-hover:bg-blue-600/30 transition-colors">
            <Icon name="mdi:folder-multiple" class="w-6 h-6 text-blue-400" />
          </div>
          <div class="flex-1">
            <h2 class="text-xl font-semibold mb-2">Libraries</h2>
            <p class="text-sm text-gray-400">
              Manage your movies and TV shows library paths
            </p>
          </div>
        </div>
      </NuxtLink>

      <!-- Metadata Card -->
      <NuxtLink
        to="/settings/metadata"
        class="card p-6 hover:bg-gray-800/50 transition-all group"
      >
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center group-hover:bg-purple-600/30 transition-colors">
            <Icon name="mdi:database" class="w-6 h-6 text-purple-400" />
          </div>
          <div class="flex-1">
            <h2 class="text-xl font-semibold mb-2">Metadata</h2>
            <p class="text-sm text-gray-400">
              Configure TMDB and metadata providers
            </p>
          </div>
        </div>
      </NuxtLink>

      <!-- Preferences Card -->
      <NuxtLink
        to="/settings/preferences"
        class="card p-6 hover:bg-gray-800/50 transition-all group"
      >
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center group-hover:bg-green-600/30 transition-colors">
            <Icon name="mdi:cog" class="w-6 h-6 text-green-400" />
          </div>
          <div class="flex-1">
            <h2 class="text-xl font-semibold mb-2">Preferences</h2>
            <p class="text-sm text-gray-400">
              Search preferences and language settings
            </p>
          </div>
        </div>
      </NuxtLink>

      <!-- Search Templates Card -->
      <NuxtLink
        to="/settings/search-templates"
        class="card p-6 hover:bg-gray-800/50 transition-all group"
      >
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-lg bg-orange-600/20 flex items-center justify-center group-hover:bg-orange-600/30 transition-colors">
            <Icon name="mdi:text-search" class="w-6 h-6 text-orange-400" />
          </div>
          <div class="flex-1">
            <h2 class="text-xl font-semibold mb-2">Search Templates</h2>
            <p class="text-sm text-gray-400">
              Configure search query formats for movies and TV shows
            </p>
          </div>
        </div>
      </NuxtLink>

      <!-- Users Card -->
      <NuxtLink
        to="/settings/users"
        class="card p-6 hover:bg-gray-800/50 transition-all group"
      >
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-lg bg-yellow-600/20 flex items-center justify-center group-hover:bg-yellow-600/30 transition-colors">
            <Icon name="mdi:account-multiple" class="w-6 h-6 text-yellow-400" />
          </div>
          <div class="flex-1">
            <h2 class="text-xl font-semibold mb-2">Users</h2>
            <p class="text-sm text-gray-400">
              Manage users and approve new registrations
            </p>
          </div>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Settings - Unifarr' });
</script>
