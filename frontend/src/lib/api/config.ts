/** Browser requests use Next.js rewrite proxy to avoid CORS. */
export const backendConfig = {
  baseUrl: process.env.NEXT_PUBLIC_BACKEND_API_URL ?? '/api/backend',
}
