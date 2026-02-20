/**
 * Wrapper around useLazyAsyncData that waits for auth to be ready
 * Prevents 401 errors from racing auth initialization
 */
export const useProtectedData = async <T>(
  key: string,
  handler: () => Promise<T>,
  options?: any
) => {
  // Wait for auth to be initialized from localStorage
  const { ready, isAuthenticated } = useAuth();
  
  // Wait a tick to ensure localStorage is read
  await nextTick();
  
  if (!isAuthenticated.value) {
    console.warn(`[useProtectedData] Not authenticated for: ${key}`);
  }
  
  return useLazyAsyncData(key, handler, options);
};
