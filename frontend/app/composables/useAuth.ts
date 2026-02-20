import { ref, computed } from 'vue';

interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  createdAt?: string;
}

const user = ref<User | null>(null);
const token = ref<string | null>(null);
const loading = ref(false);

export const useAuth = () => {
  const config = useRuntimeConfig();
  const router = useRouter();

  // Initialize auth from localStorage
  const init = () => {
    if (typeof window === 'undefined') return;
    
    const savedToken = localStorage.getItem('unifarr_token');
    const savedUser = localStorage.getItem('unifarr_user');
    
    if (savedToken && savedUser) {
      token.value = savedToken;
      try {
        user.value = JSON.parse(savedUser);
      } catch (err) {
        console.error('Failed to parse saved user:', err);
        logout();
      }
    }
  };

  // Login
  const login = async (username: string, password: string) => {
    loading.value = true;
    try {
      const response = await $fetch<{ user: User; token: string }>(`${config.public.apiBase}/api/auth/login`, {
        method: 'POST',
        body: { username, password },
      });

      user.value = response.user;
      token.value = response.token;

      // Save to localStorage
      localStorage.setItem('unifarr_token', response.token);
      localStorage.setItem('unifarr_user', JSON.stringify(response.user));

      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.data?.error || 'Login failed' 
      };
    } finally {
      loading.value = false;
    }
  };

  // Register
  const register = async (username: string, password: string) => {
    loading.value = true;
    try {
      const response = await $fetch<{ 
        user: User; 
        token?: string;
        message?: string;
        requiresApproval?: boolean;
      }>(`${config.public.apiBase}/api/auth/register`, {
        method: 'POST',
        body: { username, password },
      });

      // If account requires approval
      if (response.requiresApproval) {
        return { 
          success: true, 
          requiresApproval: true,
          message: response.message || 'Registration successful! Your account is pending admin approval.',
        };
      }

      // Auto-approved (first user)
      user.value = response.user;
      token.value = response.token!;

      // Save to localStorage
      localStorage.setItem('unifarr_token', response.token!);
      localStorage.setItem('unifarr_user', JSON.stringify(response.user));

      return { success: true };
    } catch (error: any) {
      console.error('Register error:', error);
      return { 
        success: false, 
        error: error.data?.error || 'Registration failed' 
      };
    } finally {
      loading.value = false;
    }
  };

  // Logout
  const logout = () => {
    user.value = null;
    token.value = null;
    localStorage.removeItem('unifarr_token');
    localStorage.removeItem('unifarr_user');
    router.push('/login');
  };

  // Fetch current user
  const fetchMe = async () => {
    if (!token.value) return;

    try {
      const response = await $fetch<{ user: User }>(`${config.public.apiBase}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      });

      user.value = response.user;
      localStorage.setItem('unifarr_user', JSON.stringify(response.user));
    } catch (error: any) {
      console.error('Fetch me error:', error);
      // Token might be invalid
      if (error.status === 401) {
        logout();
      }
    }
  };

  // Computed
  const isAuthenticated = computed(() => !!user.value && !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');

  // Computed
  const ready = ref(false);

  // Initialize on first use (sync)
  if (typeof window !== 'undefined' && !ready.value) {
    init();
    ready.value = true;
  }

  return {
    user: computed(() => user.value),
    token: computed(() => token.value),
    loading: computed(() => loading.value),
    ready: computed(() => ready.value),
    isAuthenticated,
    isAdmin,
    init,
    login,
    register,
    logout,
    fetchMe,
  };
};
