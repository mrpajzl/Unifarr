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
      <button @click="fetchUsers" class="btn btn-secondary btn-sm mt-4">Try Again</button>
    </div>

    <!-- Users List -->
    <div v-else-if="users.length > 0" class="space-y-4">
      <!-- Pending Approvals -->
      <div v-if="pendingUsers.length > 0" class="card p-4">
        <div class="flex items-center gap-2 mb-4">
          <Icon name="mdi:account-clock" class="w-5 h-5 text-yellow-400" />
          <h3 class="text-lg font-semibold">Pending Approvals ({{ pendingUsers.length }})</h3>
        </div>
        
        <div class="space-y-2">
          <div
            v-for="user in pendingUsers"
            :key="user.id"
            class="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
          >
            <div class="flex items-center gap-3">
              <Icon name="mdi:account-outline" class="w-5 h-5 text-gray-400" />
              <div>
                <p class="font-medium">{{ user.username }}</p>
                <p class="text-xs text-gray-500">Registered {{ formatDate(user.created_at) }}</p>
              </div>
            </div>
            
            <div class="flex gap-2">
              <button
                @click="approveUser(user)"
                :disabled="processing === user.id"
                class="btn btn-sm btn-primary"
              >
                <Icon
                  :name="processing === user.id ? 'mdi:loading' : 'mdi:check'"
                  :class="{ 'animate-spin': processing === user.id }"
                  class="w-4 h-4 mr-1"
                />
                Approve
              </button>
              <button
                @click="confirmReject(user)"
                :disabled="processing === user.id"
                class="btn btn-sm btn-secondary"
              >
                <Icon name="mdi:close" class="w-4 h-4 mr-1" />
                Reject
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- All Users -->
      <div class="card p-4">
        <h3 class="text-lg font-semibold mb-4">All Users</h3>
        
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-700">
                <th class="text-left py-2 px-3">Username</th>
                <th class="text-left py-2 px-3">Role</th>
                <th class="text-left py-2 px-3">Status</th>
                <th class="text-left py-2 px-3">Registered</th>
                <th class="text-right py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="user in approvedUsers"
                :key="user.id"
                class="border-b border-gray-800 hover:bg-gray-800/50"
              >
                <td class="py-3 px-3">
                  <div class="flex items-center gap-2">
                    <Icon name="mdi:account" class="w-4 h-4 text-gray-400" />
                    <span class="font-medium">{{ user.username }}</span>
                  </div>
                </td>
                <td class="py-3 px-3">
                  <select
                    :value="user.role"
                    @change="changeRole(user, ($event.target as HTMLSelectElement).value)"
                    :disabled="processing === user.id || user.id === currentUserId"
                    class="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td class="py-3 px-3">
                  <span
                    :class="[
                      'px-2 py-1 rounded-full text-xs font-medium',
                      user.approved ? 'bg-green-600' : 'bg-yellow-600',
                    ]"
                  >
                    {{ user.approved ? 'Approved' : 'Pending' }}
                  </span>
                </td>
                <td class="py-3 px-3 text-sm text-gray-400">
                  {{ formatDate(user.created_at) }}
                </td>
                <td class="py-3 px-3 text-right">
                  <button
                    v-if="user.id !== currentUserId"
                    @click="confirmDelete(user)"
                    :disabled="processing === user.id"
                    class="btn btn-sm btn-secondary text-red-400 hover:text-red-300"
                  >
                    <Icon name="mdi:delete" class="w-4 h-4" />
                  </button>
                  <span v-else class="text-xs text-gray-500">You</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else class="card p-12 text-center">
      <Icon name="mdi:account-multiple" class="w-16 h-16 mx-auto mb-4 text-gray-600" />
      <p class="text-gray-400">No users found</p>
    </div>

    <!-- Confirm Delete Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-150"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="userToDelete"
          class="fixed inset-0 bg-black/80 backdrop-blur-sm z-60 flex items-center justify-center p-4"
          @click.self="userToDelete = null"
        >
          <div class="card max-w-md w-full p-6">
            <h3 class="text-xl font-bold mb-4">Delete User</h3>
            <p class="text-gray-300 mb-6">
              Are you sure you want to delete user <strong>{{ userToDelete.username }}</strong>? This action cannot be undone.
            </p>
            <div class="flex gap-3 justify-end">
              <button @click="userToDelete = null" class="btn btn-secondary">
                Cancel
              </button>
              <button @click="deleteUser(userToDelete)" class="btn btn-primary bg-red-600 hover:bg-red-500">
                <Icon name="mdi:delete" class="w-4 h-4 mr-2" />
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
const { user: currentUser } = useAuth();

interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  approved: number;
  created_at: string;
}

const users = ref<User[]>([]);
const loading = ref(false);
const error = ref(false);
const processing = ref<number | null>(null);
const userToDelete = ref<User | null>(null);

const currentUserId = computed(() => currentUser.value?.id);

const pendingUsers = computed(() => users.value.filter(u => !u.approved));
const approvedUsers = computed(() => users.value.filter(u => u.approved));

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('unifarr_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const fetchUsers = async () => {
  loading.value = true;
  error.value = false;
  
  try {
    const data = await $fetch<{ users: User[] }>(`${config.public.apiBase}/api/users`, {
      headers: getAuthHeaders(),
    });
    users.value = data.users;
  } catch (err) {
    console.error('Failed to fetch users:', err);
    error.value = true;
    toast.error('Failed to load users');
  } finally {
    loading.value = false;
  }
};

const approveUser = async (user: User) => {
  processing.value = user.id;
  
  try {
    await $fetch(`${config.public.apiBase}/api/users/${user.id}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    
    toast.success(`User ${user.username} approved`);
    fetchUsers();
  } catch (err: any) {
    toast.error(err.data?.error || 'Failed to approve user');
  } finally {
    processing.value = null;
  }
};

const confirmReject = (user: User) => {
  userToDelete.value = user;
};

const confirmDelete = (user: User) => {
  userToDelete.value = user;
};

const deleteUser = async (user: User) => {
  processing.value = user.id;
  const isPending = !user.approved;
  
  try {
    if (isPending) {
      await $fetch(`${config.public.apiBase}/api/users/${user.id}/reject`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } else {
      await $fetch(`${config.public.apiBase}/api/users/${user.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    }
    
    toast.success(`User ${user.username} deleted`);
    userToDelete.value = null;
    fetchUsers();
  } catch (err: any) {
    toast.error(err.data?.error || 'Failed to delete user');
  } finally {
    processing.value = null;
  }
};

const changeRole = async (user: User, newRole: string) => {
  if (user.role === newRole) return;
  
  processing.value = user.id;
  
  try {
    await $fetch(`${config.public.apiBase}/api/users/${user.id}/role`, {
      method: 'PUT',
      body: { role: newRole },
      headers: getAuthHeaders(),
    });
    
    toast.success(`User ${user.username} role changed to ${newRole}`);
    fetchUsers();
  } catch (err: any) {
    toast.error(err.data?.error || 'Failed to change role');
  } finally {
    processing.value = null;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

onMounted(() => {
  fetchUsers();
});

useHead({ title: 'User Management - Unifarr' });
</script>
