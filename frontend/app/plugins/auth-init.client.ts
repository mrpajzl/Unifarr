/**
 * Client-only plugin to initialize auth from localStorage
 * Runs before any components are mounted
 */
export default defineNuxtPlugin(() => {
  const { init } = useAuth();
  
  // Initialize auth from localStorage
  init();
  
  console.log('[auth-init] Auth initialized from localStorage');
});
