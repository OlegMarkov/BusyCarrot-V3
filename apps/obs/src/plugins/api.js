import { createApiClient } from '@vegetable/api-client'
import { createAxiosTransport } from '@vegetable/api-client/axios'

// Obs is anonymous/public — no auth token attached, unlike the Admin client.
export const apiClient = createApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  transport: createAxiosTransport()
})
