<template>
  <div>
    <section class="container">
      <div>
        <h1 class="title">{{ t('login.title') }}</h1>
        <h2 class="subtitle">{{ t('login.subtitle') }}</h2>
      </div>
    </section>
    <div id="login-container"></div>
  </div>
</template>

<script setup>
// Ported from vegetable/Vegetable.Admin/pages/login.vue.
// Behavior is unchanged: Auth0 Lock handles the login widget; on success we
// either create a new owner, attach an existing user to an owner (invite-link
// flow via ?companyid=), or just log in — then redirect to '/'.
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Auth0Lock from 'auth0-lock'
import { apiClient } from '@/plugins/api'
import config from '@/config'
import { useOwnerStore } from '@/stores/owner'

const { t } = useI18n()
const router = useRouter()
const owner = useOwnerStore()

onMounted(() => {
  const companyId = new URLSearchParams(window.location.search).get('companyid')

  const options = {
    autoclose: true,
    closable: false,
    container: 'login-container',
    auth: {
      params: { scope: 'openid profile email' },
      audience: 'vegetable'
    }
  }

  if (companyId) {
    owner.setTempCompanyId(companyId)
    options.allowLogin = false
  }

  if (!owner.authenticated) {
    owner.setUser({})
    owner.setOwner({})
  }

  const lock = new Auth0Lock(config.Auth0ClientId, config.Auth0Domain, options)

  if (!owner.authenticated || companyId) {
    lock.show()
  }

  lock.on('authenticated', (authResult) => {
    owner.setAuthenticated(true)
    lock.hide()

    lock.getUserInfo(authResult.accessToken, async (error, profile) => {
      if (error) return

      owner.setUser(profile)

      if (!owner.tempCompanyId && !profile[config.OwnerIdField]) {
        // create new owner
        await apiClient.OwnerService.create({ userId: profile.sub })
        owner.setTempCompanyId(null)
        lock.checkSession({}, () => {
          owner.setAuthenticated(true)
          router.push('/')
        })
      } else if (!profile[config.OwnerIdField]) {
        // create new user for an existing owner (invite-link flow)
        await apiClient.UsersService.updateMetadata({
          userId: profile.sub,
          id: owner.tempCompanyId
        })
        owner.setTempCompanyId(owner.tempCompanyId)
        router.push('/')
      } else {
        // login with existing user
        owner.setTempCompanyId(null)
        router.push('/')
      }
    })
  })
})
</script>

<style scoped>
.container {
  min-height: 20vh;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.title {
  font-family: 'Quicksand', 'Source Sans Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, sans-serif;
  display: block;
  font-weight: 300;
  font-size: 100px;
  color: #35495e;
  letter-spacing: 1px;
}

.subtitle {
  font-weight: 300;
  font-size: 42px;
  color: #526488;
  word-spacing: 5px;
  padding-bottom: 15px;
}
</style>
