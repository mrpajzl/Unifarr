<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-950 px-4">
    <div class="card max-w-md w-full p-8">
      <!-- Logo / Title -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold mb-2">Unifarr</h1>
        <p class="text-gray-400">{{ mode === 'login' ? 'Sign in to continue' : 'Create your account' }}</p>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p class="text-sm text-red-400 text-center">{{ error }}</p>
      </div>

      <!-- Pending Approval Message -->
      <div v-if="pendingApproval" class="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <div class="flex items-start gap-3">
          <Icon name="mdi:account-clock" class="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p class="text-sm text-yellow-300 font-medium mb-1">Registration Successful!</p>
            <p class="text-sm text-yellow-200">{{ approvalMessage }}</p>
            <button @click="() => { pendingApproval = false; mode = 'login'; }" class="text-sm text-yellow-400 hover:text-yellow-300 mt-2 underline">
              Back to login
            </button>
          </div>
        </div>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit">
        <!-- Username -->
        <div class="mb-4">
          <label for="username" class="block text-sm font-medium mb-2">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            required
            class="input w-full"
            placeholder="Enter your username"
            :disabled="loading"
          />
        </div>

        <!-- Password -->
        <div class="mb-6">
          <label for="password" class="block text-sm font-medium mb-2">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            class="input w-full"
            placeholder="Enter your password"
            :disabled="loading"
          />
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="loading || !username || !password"
          class="btn btn-primary w-full"
        >
          <Icon
            :name="loading ? 'mdi:loading' : (mode === 'login' ? 'mdi:login' : 'mdi:account-plus')"
            :class="{ 'animate-spin': loading }"
            class="w-5 h-5 mr-2"
          />
          {{ loading 
            ? (mode === 'login' ? 'Signing in...' : 'Registering...') 
            : (mode === 'login' ? 'Sign In' : 'Register')
          }}
        </button>
      </form>

      <!-- Mode Switch -->
      <div class="mt-6 text-center">
        <p class="text-sm text-gray-400">
          <template v-if="mode === 'login'">
            Don't have an account?
            <button @click="mode = 'register'" class="text-primary-400 hover:text-primary-300">
              Register
            </button>
          </template>
          <template v-else>
            Already have an account?
            <button @click="mode = 'login'" class="text-primary-400 hover:text-primary-300">
              Sign in
            </button>
          </template>
        </p>
      </div>

      <!-- Register Mode Note -->
      <div v-if="mode === 'register'" class="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p class="text-sm text-blue-300">
          <strong>Note:</strong> The first user to register will become an admin with immediate access. 
          Additional registrations require admin approval before you can sign in.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter();
const { login, register, isAuthenticated } = useAuth();

const username = ref('');
const password = ref('');
const mode = ref<'login' | 'register'>('login');
const loading = ref(false);
const error = ref('');

// Redirect if already authenticated
watch(isAuthenticated, (authenticated) => {
  if (authenticated) {
    router.push('/');
  }
}, { immediate: true });

const pendingApproval = ref(false);
const approvalMessage = ref('');

const handleSubmit = async () => {
  error.value = '';
  pendingApproval.value = false;
  loading.value = true;

  try {
    const result = mode.value === 'login' 
      ? await login(username.value, password.value)
      : await register(username.value, password.value);

    if (result.success) {
      // Check if account requires approval
      if ((result as any).requiresApproval) {
        pendingApproval.value = true;
        approvalMessage.value = (result as any).message || 'Registration successful! Your account is pending admin approval.';
      } else {
        router.push('/');
      }
    } else {
      error.value = result.error || 'Authentication failed';
    }
  } catch (err: any) {
    error.value = err.message || 'An unexpected error occurred';
  } finally {
    loading.value = false;
  }
};

useHead({ title: 'Login - Unifarr' });
</script>
