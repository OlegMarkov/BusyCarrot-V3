import axios from 'axios'

/**
 * Web transport for createApiClient — used by the Admin and Obs apps.
 *
 * Kept in its own entry point (@vegetable/api-client/axios) so the mobile app,
 * which talks to the network through `uni.request`, never pulls axios into its
 * bundle.
 *
 * `instance` can be passed in if a caller needs its own interceptors; otherwise
 * a bare axios instance is created per client.
 */
export function createAxiosTransport({ instance } = {}) {
  const http = instance || axios.create()

  return async function axiosTransport({ method, url, baseURL, params, data, headers }) {
    try {
      const response = await http.request({ method, url, baseURL, params, data, headers })
      return { data: response.data, status: response.status, headers: response.headers }
    } catch (cause) {
      const error = new Error(cause.message)
      error.status = cause.response?.status
      error.data = cause.response?.data
      error.cause = cause
      throw error
    }
  }
}
