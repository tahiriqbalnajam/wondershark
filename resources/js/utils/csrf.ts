/**
 * Get CSRF token from meta tag
 */
export function getCsrfToken(): string {
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (!token) {
        console.warn('CSRF token not found in meta tag');
        return '';
    }
    return token;
}
