<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] overflow-y-auto"
        @click.self="$emit('close')"
      >
        <div class="min-h-screen px-4 py-8 flex items-center justify-center">
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            leave-active-class="transition-all duration-150 ease-in"
            enter-from-class="opacity-0 scale-95 translate-y-4"
            leave-to-class="opacity-0 scale-95 translate-y-4"
          >
            <div
              v-if="show"
              class="card relative max-w-5xl w-full overflow-hidden"
              @click.stop
            >
              <!-- Close Button -->
              <button
                @click="$emit('close')"
                class="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm flex items-center justify-center transition-colors"
              >
                <Icon name="mdi:close" class="w-6 h-6 text-white" />
              </button>

              <!-- Loading -->
              <div v-if="loading" class="flex justify-center items-center py-24">
                <Icon name="mdi:loading" class="w-12 h-12 animate-spin text-primary-500" />
              </div>

              <!-- Error -->
              <div v-else-if="error" class="p-12 text-center">
                <Icon name="mdi:alert-circle" class="w-16 h-16 mx-auto mb-4 text-red-500" />
                <p class="text-red-400 font-medium">Failed to load person details</p>
                <button @click="fetchPerson" class="btn btn-secondary btn-sm mt-4">Try Again</button>
              </div>

              <!-- Content -->
              <div v-else-if="person" class="p-6">
                <!-- Header -->
                <div class="flex gap-6 mb-8">
                  <!-- Profile Photo -->
                  <div class="flex-shrink-0 w-32 md:w-48">
                    <div class="aspect-[2/3] rounded-lg overflow-hidden shadow-2xl">
                      <img
                        v-if="person.profile_path"
                        :src="`https://image.tmdb.org/t/p/w500${person.profile_path}`"
                        :alt="person.name"
                        class="w-full h-full object-cover"
                      />
                      <div v-else class="w-full h-full bg-gray-800 flex items-center justify-center">
                        <Icon name="mdi:account" class="w-16 h-16 text-gray-600" />
                      </div>
                    </div>
                  </div>

                  <!-- Info -->
                  <div class="flex-1 min-w-0">
                    <h2 class="text-3xl font-bold mb-3">{{ person.name }}</h2>
                    
                    <div class="space-y-2 text-sm text-gray-400 mb-4">
                      <div v-if="person.birthday" class="flex items-center gap-2">
                        <Icon name="mdi:cake" class="w-4 h-4" />
                        <span>{{ formatDate(person.birthday) }}</span>
                        <span v-if="getAge(person.birthday)" class="text-gray-500">({{ getAge(person.birthday) }} years old)</span>
                      </div>
                      
                      <div v-if="person.place_of_birth" class="flex items-center gap-2">
                        <Icon name="mdi:map-marker" class="w-4 h-4" />
                        <span>{{ person.place_of_birth }}</span>
                      </div>

                      <div v-if="person.known_for_department" class="flex items-center gap-2">
                        <Icon name="mdi:briefcase" class="w-4 h-4" />
                        <span>{{ person.known_for_department }}</span>
                      </div>
                    </div>

                    <!-- Biography -->
                    <div v-if="person.biography" class="mb-4">
                      <h3 class="text-sm font-semibold uppercase text-gray-500 mb-2">Biography</h3>
                      <p class="text-gray-300 text-sm leading-relaxed line-clamp-6">{{ person.biography }}</p>
                    </div>
                  </div>
                </div>

                <!-- Filmography Tabs -->
                <div class="border-t border-gray-800 pt-6">
                  <div class="flex gap-2 mb-4">
                    <button
                      @click="activeTab = 'movies'"
                      class="btn btn-sm"
                      :class="activeTab === 'movies' ? 'btn-primary' : 'btn-secondary'"
                    >
                      <Icon name="mdi:movie" class="w-4 h-4 mr-1.5" />
                      Movies ({{ movieCredits.length }})
                    </button>
                    <button
                      @click="activeTab = 'tv'"
                      class="btn btn-sm"
                      :class="activeTab === 'tv' ? 'btn-primary' : 'btn-secondary'"
                    >
                      <Icon name="mdi:television" class="w-4 h-4 mr-1.5" />
                      TV Shows ({{ tvCredits.length }})
                    </button>
                  </div>

                  <!-- Movies -->
                  <div v-if="activeTab === 'movies'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-96 overflow-y-auto pr-2">
                    <button
                      v-for="movie in movieCredits.slice(0, 20)"
                      :key="movie.id"
                      @click="openMediaDetails(movie)"
                      class="card overflow-hidden group text-left hover:ring-2 hover:ring-primary-600 transition-all relative"
                    >
                      <!-- In Library Badge -->
                      <div
                        v-if="movie.inLibrary"
                        class="absolute top-1 right-1 z-10 bg-green-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1"
                      >
                        <Icon name="mdi:check" class="w-2.5 h-2.5" />
                      </div>

                      <div class="aspect-[2/3] bg-gray-800">
                        <img
                          v-if="movie.poster_path"
                          :src="`https://image.tmdb.org/t/p/w300${movie.poster_path}`"
                          :alt="movie.title"
                          class="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div v-else class="w-full h-full flex items-center justify-center">
                          <Icon name="mdi:image-off" class="w-8 h-8 text-gray-600" />
                        </div>
                      </div>
                      <div class="p-2">
                        <p class="text-xs font-medium truncate">{{ movie.title }}</p>
                        <div class="flex items-center justify-between text-[10px] text-gray-500 mt-0.5">
                          <span v-if="movie.release_date">{{ new Date(movie.release_date).getFullYear() }}</span>
                          <span v-if="movie.character" class="truncate ml-1">{{ movie.character }}</span>
                        </div>
                      </div>
                    </button>
                  </div>

                  <!-- TV Shows -->
                  <div v-if="activeTab === 'tv'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-96 overflow-y-auto pr-2">
                    <button
                      v-for="show in tvCredits.slice(0, 20)"
                      :key="show.id"
                      @click="openMediaDetails(show)"
                      class="card overflow-hidden group text-left hover:ring-2 hover:ring-primary-600 transition-all relative"
                    >
                      <!-- In Library Badge -->
                      <div
                        v-if="show.inLibrary"
                        class="absolute top-1 right-1 z-10 bg-green-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1"
                      >
                        <Icon name="mdi:check" class="w-2.5 h-2.5" />
                      </div>

                      <div class="aspect-[2/3] bg-gray-800">
                        <img
                          v-if="show.poster_path"
                          :src="`https://image.tmdb.org/t/p/w300${show.poster_path}`"
                          :alt="show.name"
                          class="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div v-else class="w-full h-full flex items-center justify-center">
                          <Icon name="mdi:image-off" class="w-8 h-8 text-gray-600" />
                        </div>
                      </div>
                      <div class="p-2">
                        <p class="text-xs font-medium truncate">{{ show.name }}</p>
                        <div class="flex items-center justify-between text-[10px] text-gray-500 mt-0.5">
                          <span v-if="show.first_air_date">{{ new Date(show.first_air_date).getFullYear() }}</span>
                          <span v-if="show.character" class="truncate ml-1">{{ show.character }}</span>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  show: boolean;
  personId?: number;
}>();

const emit = defineEmits<{
  close: [];
  openMedia: [item: any];
}>();

const config = useRuntimeConfig();
const toast = useToast();

const person = ref<any>(null);
const loading = ref(false);
const error = ref(false);
const activeTab = ref<'movies' | 'tv'>('movies');

const movieCredits = computed(() => {
  if (!person.value?.movie_credits?.cast) return [];
  // Sort by popularity and release date
  return [...person.value.movie_credits.cast]
    .filter((m: any) => m.poster_path) // Only with posters
    .sort((a: any, b: any) => {
      // In library first
      if (a.inLibrary && !b.inLibrary) return -1;
      if (!a.inLibrary && b.inLibrary) return 1;
      // Then by popularity
      return (b.popularity || 0) - (a.popularity || 0);
    });
});

const tvCredits = computed(() => {
  if (!person.value?.tv_credits?.cast) return [];
  return [...person.value.tv_credits.cast]
    .filter((s: any) => s.poster_path)
    .sort((a: any, b: any) => {
      if (a.inLibrary && !b.inLibrary) return -1;
      if (!a.inLibrary && b.inLibrary) return 1;
      return (b.popularity || 0) - (a.popularity || 0);
    });
});

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getAge = (birthday: string) => {
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const fetchPerson = async () => {
  if (!props.personId) return;
  
  loading.value = true;
  error.value = false;
  
  try {
    const url = `${config.public.apiBase}/api/discover/person/${props.personId}`;
    person.value = await $fetch(url);
    // Default to movies if they have more movie credits
    activeTab.value = movieCredits.value.length >= tvCredits.value.length ? 'movies' : 'tv';
  } catch (err) {
    console.error('Failed to fetch person:', err);
    error.value = true;
    toast.error('Failed to load person details');
  } finally {
    loading.value = false;
  }
};

const openMediaDetails = (item: any) => {
  emit('openMedia', item);
};

watch(() => props.show, (show) => {
  if (show) {
    fetchPerson();
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>
