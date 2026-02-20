/**
 * Global auth middleware
 * - Redirects to /login if not authenticated (except public pages)
 * - Disables SSR for protected pages (localStorage token access)
 */
export default defineNuxtRouteMiddleware((to) => {
  // Public pages that don't require auth
  const publicPages = ['/login', '/register'];
  const isPublicPage = publicPages.includes(to.path);

  // Only run on client-side (after hydration)
  if (import.meta.server) {
    return;
  }

  // Check if user is authenticated
  const token = typeof window !== 'undefined' ? localStorage.getItem('unifarr_token') : null;
  const isAuthenticated = !!token;

  // Redirect to login if not authenticated and trying to access protected page
  if (!isAuthenticated && !isPublicPage) {
    return navigateTo('/login');
  }

  // Redirect to dashboard if authenticated and trying to access login/register
  if (isAuthenticated && isPublicPage) {
    return navigateTo('/');
  }
});
