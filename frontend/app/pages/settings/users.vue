<template>
  <div>
    <h2 class="text-2xl font-bold mb-6">User Management</h2>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Icon name="mdi:loading" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="card p-8 text-center">
      <Icon name="mdi:alert-circle" class="w-12 h-12 mx-auto mb-3 text-red-500" />
      <p class="font-medium text-red-400">Failed to load users</p>
      <p class="text-sm text-gray-500 mt-1">{{ errorMessage }}</p>
      <button @click="fetchUsers" class="btn btn-secondary btn-sm mt-4">Try Again</button>
    </div>

    <!-- Users List -->
    <div v-else class="space-y-4">
      <!-- Pending Approvals Alert -->
      <div v-if="pendingUsers.length > 0" class="card p-4 bg-yellow-900/20 border border-yellow-600/30">
        <div class="flex items-center gap-3">
          <Icon name="mdi:alert" class="w-6 h-6 text-yellow-400" />
          <div>
            <h3 class="font-semibold text-yellow-300">{{ pendingUsers.length }} user(s) awaiting approval</h3>
            <p class="text-sm text-yellow-200/70">Review and approve/reject below</p>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="card p-4">
        <div class="flex gap-3">
          <select v-model="filterRole" class="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm">
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
            <option value="user">User</option>
          </select>
          
          <select v-model="filterApproval" class="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm">
            <option value="">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
          </select>

          <div class="ml-auto text-sm text-gray-400 flex items-center">
            Total: {{ filteredUsers.length }} users
          </div>
        </div>
      </div>

      <!-- Users Table -->
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-700 bg-gray-800/50">
                <th class="text-left py-3 px-4 font-semibold">Username</th>
                <th class="text-left py-3 px-4 font-semibold">Role</th>
                <th class="text-left py-3 px-4 font-semibold">Status</th>
                <th class="text-left py-3 px-4 font-semibold">Language</th>
                <th class="text-left py-3 px-4 font-semibold">Requests</th>
                <th class="text-left py-3 px-4 font-semibold">Joined</th>
                <th class="text-right py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="user in filteredUsers"
                :key="user.id"
                class="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                :class="{ 'bg-yellow-900/10': !user.approved }"
              >
                <!-- Username -->
                <td class="py-3 px-4">
                  <div class="flex items-center gap-2">
                    <Icon 
                      :name="user.approved ? 'mdi:account-check' : 'mdi:account-clock'" 
                      class="w-5 h-5"
                      :class="user.approved ? 'text-green-400' : 'text-yellow-400'"
                    />
                    <span class="font-medium">
                      {{ user.username }}
                      <span v-if="user.id === currentUser?.id" class="text-xs text-gray-500 ml-1">(you)</span>
                    </span>
                  </div>
                </td>

                <!-- Role -->
                <td class="py-3 px-4">
                  <select
                    :value="user.role"
                    @change="changeRole(user, ($event.target as HTMLSelectElement).value)"
                    :disabled="processing.has(user.id) || user.id === currentUser?.id"
                    class="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                  >
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>

                <!-- Status -->
                <td class="py-3 px-4">
                  <span
                    :class="[
                      'px-2 py-1 rounded-full text-xs font-medium',
                      user.approved 
                        ? 'bg-green-600/20 text-green-400' 
                        : 'bg-yellow-600/20 text-yellow-400',
                    ]"
                  >
                    {{ user.approved ? '✓ Approved' : '⏳ Pending' }}
                  </span>
                </td>

                <!-- Language -->
                <td class="py-3 px-4 text-sm text-gray-400">
                  <span class="uppercase">{{ user.preferredLanguage || 'en' }}</span>
                </td>

                <!-- Requests Count -->
                <td class="py-3 px-4 text-sm text-gray-400">
                  {{ user._stats?.mediaRequests || 0 }}
                </td>

                <!-- Joined Date -->
                <td class="py-3 px-4 text-sm text-gray-400">
                  {{ formatDate(user.createdAt) }}
                </td>

                <!-- Actions -->
                <td class="py-3 px-4">
                  <div class="flex justify-end gap-2">
                    <!-- Approve (if pending) -->
                    <button
                      v-if="!user.approved"
                      @click="approveUser(user)"
                      :disabled="processing.has(user.id)"
                      class="btn btn-sm btn-success"
                    >
                      <Icon
                        :name="processing.has(user.id) ? 'mdi:loading' : 'mdi:check'"
                        :class="{ 'animate-spin': processing.has(user.id) }"
                        class="w-4 h-4 mr-1"
                      />
                      Approve
                    </button>

                    <!-- Delete -->
                    <button
                      v-if="user.id !== currentUser?.id"
                      @click="confirmDelete(user)"
                      :disabled="processing.has(user.id)"
                      class="btn btn-sm btn-secondary hover:bg-red-600/20 hover:text-red-400"
                    >
                      <Icon name="mdi:delete" class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty State -->
          <div v-if="filteredUsers.length === 0" class="p-12 text-center">
            <Icon name="mdi:account-multiple" class="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p class="text-gray-400">No users found with current filters</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-150"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="userToDelete"
          class="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
          @click.self="userToDelete = null"
        >
          <div class="card p-6 max-w-md w-full">
            <h3 class="text-xl font-semibold mb-2">Delete User?</h3>
            <p class="text-gray-400 mb-6 text-sm">
              Are you sure you want to delete user <strong class="text-white">"{{ userToDelete.username }}"</strong>?
              This action cannot be undone.
            </p>
            <div class="flex gap-3">
              <button @click="userToDelete = null" class="btn btn-secondary flex-1">
                Cancel
              </button>
              <button
                @click="deleteUser(userToDelete)"
                :disabled="deleting"
                class="btn btn-danger flex-1"
              >
                <Icon
                  :name="deleting ? 'mdi:loading' : 'mdi:delete'"
                  :class="{ 'animate-spin': deleting }"
                  class="w-5 h-5 mr-2"
                />
                Delete
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig();
const toast = useToast();

interface User {
  id: number;
  username: string;
  role: string;
  approved: boolean;
  preferredLanguage: string;
  createdAt: string;
  _stats?: {
    mediaRequests: number;
    processedRequests: number;
  };
}

// State
const users = ref<User[]>([]);
const loading = ref(true);
const error = ref(false);
const errorMessage = ref('');
const processing = ref(new Set<number>());
const deleting = ref(false);
const userToDelete = ref<User | null>(null);
const currentUser = ref<User | null>(null);

// Filters
const filterRole = ref('');
const filterApproval = ref('');

// Computed
const pendingUsers = computed(() => users.value.filter(u => !u.approved));
const approvedUsers = computed(() => users.value.filter(u => u.approved));
const filteredUsers = computed(() => {
  let filtered = users.value;
  
  if (filterRole.value) {
    filtered = filtered.filter(u => u.role === filterRole.value);
  }
  
  if (filterApproval.value === 'approved') {
    filtered = filtered.filter(u => u.approved);
  } else if (filterApproval.value === 'pending') {
    filtered = filtered.filter(u => !u.approved);
  }
  
  return filtered.sort((a, b) => {
    // Pending first
    if (!a.approved && b.approved) return -1;
    if (a.approved && !b.approved) return 1;
    // Then by date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
});

// Fetch current user
const fetchCurrentUser = async () => {
  try {
    const response = await $fetch(`${config.public.apiBase}/api/users/me`);
    currentUser.value = response as User;
  } catch (err) {
    console.error('Failed to fetch current user:', err);
  }
};

// Fetch users
const fetchUsers = async () => {
  loading.value = true;
  error.value = false;
  
  try {
    const response = await $fetch(`${config.public.apiBase}/api/users`);
    users.value = (response as any).users || [];
  } catch (err: any) {
    console.error('Failed to fetch users:', err);
    error.value = true;
    errorMessage.value = err.data?.error?.message || 'Unknown error';
  } finally {
    loading.value = false;
  }
};

// Change role
const changeRole = async (user: User, newRole: string) => {
  if (user.role === newRole) return;
  
  processing.value.add(user.id);
  
  try {
    await $fetch(`${config.public.apiBase}/api/users/${user.id}`, {
      method: 'PATCH',
      body: { role: newRole },
    });
    
    user.role = newRole;
    toast.success(`Changed ${user.username}'s role to ${newRole}`);
  } catch (err: any) {
    console.error('Failed to change role:', err);
    toast.error(err.data?.error?.message || 'Failed to change role');
  } finally {
    processing.value.delete(user.id);
  }
};

// Approve user
const approveUser = async (user: User) => {
  processing.value.add(user.id);
  
  try {
    await $fetch(`${config.public.apiBase}/api/users/${user.id}`, {
      method: 'PATCH',
      body: { approved: true },
    });
    
    user.approved = true;
    toast.success(`Approved ${user.username}`);
  } catch (err: any) {
    console.error('Failed to approve user:', err);
    toast.error(err.data?.error?.message || 'Failed to approve user');
  } finally {
    processing.value.delete(user.id);
  }
};

// Confirm delete
const confirmDelete = (user: User) => {
  userToDelete.value = user;
};

// Delete user
const deleteUser = async (user: User) => {
  deleting.value = true;
  
  try {
    await $fetch(`${config.public.apiBase}/api/users/${user.id}`, {
      method: 'DELETE',
    });
    
    users.value = users.value.filter(u => u.id !== user.id);
    toast.success(`Deleted user ${user.username}`);
    userToDelete.value = null;
  } catch (err: any) {
    console.error('Failed to delete user:', err);
    toast.error(err.data?.error?.message || 'Failed to delete user');
  } finally {
    deleting.value = false;
  }
};

// Format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  
  return date.toLocaleDateString();
};

// On mount
onMounted(async () => {
  await Promise.all([
    fetchCurrentUser(),
    fetchUsers(),
  ]);
});

// Set page title
useHead({
  title: 'User Management - Unifarr',
});
</script>
