<template>
  <div class="login">
    <!--
      The design shares the sign-in screen across form factors: the same 375px
      column, centred on the page ground, with the hero photograph above it.
      What sits inside the form differs — this app authenticates through Auth0,
      not phone + SMS — so the widget takes the place of the phone fields.
    -->
    <div class="login__col">
      <div class="blueprint duotone login__hero">
        <i class="corner tl" /><i class="corner tr" /><i class="corner bl" /><i class="corner br" />
      </div>

      <div class="login__masthead">
        <div class="login__kicker">{{ t('login.kicker') }}</div>
        <div class="login__wordmark">
          <span class="login__busy">BUSY</span><span class="login__carrot">CARROT</span>
        </div>
        <p class="login__tagline">{{ t('login.tagline') }}</p>
      </div>

      <!-- Auth0 Lock renders itself in here. -->
      <div id="login-container" class="login__widget" />

      <div class="login__foot">
        <div class="seg login__seg">
          <label
            v-for="option in locales"
            :key="option"
            class="seg-opt login__seg-opt"
            :class="{ 'seg-opt--active': option === locale }"
            @click="setLocale(option)"
          >
            {{ option.toUpperCase() }}
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Ported from vegetable/Vegetable.Admin/pages/login.vue, then redrawn on
// Industry per the redesign handoff.
//
// Behaviour is unchanged: Auth0 Lock handles the login widget; on success we
// either create a new owner, attach an existing user to an owner (invite-link
// flow via ?companyid=), or just log in — then redirect to '/'.
//
// The Lock construction moved to plugins/auth.js. This page used to build its
// own, restating the client id, the domain and the audience that the plugin
// written to encapsulate exactly that already held.
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { createLock } from '@/plugins/auth'
import { apiClient } from '@/plugins/api'
import config from '@/config'
import { useOwnerStore } from '@/stores/owner'

const { t, locale, availableLocales } = useI18n()
const router = useRouter()
const owner = useOwnerStore()

const locales = computed(() => availableLocales)

/** Same shape as AppShell's handler, so the two switchers stay identical. */
function setLocale(next) {
  locale.value = next
}

onMounted(() => {
  const companyId = new URLSearchParams(window.location.search).get('companyid')

  const overrides = {}

  if (companyId) {
    owner.setTempCompanyId(companyId)
    // The invite link is for an existing owner: sign-up only, no login tab.
    overrides.allowLogin = false
  }

  if (!owner.authenticated) {
    owner.setUser({})
    owner.setOwner({})
  }

  const lock = createLock(overrides)

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
.login {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  justify-content: center;
  background: var(--color-bg);
  color: var(--color-text);
}

/* The design's column, at its own width whatever the window is doing. */
.login__col {
  width: 375px;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  padding: 0 20px 40px;
  box-sizing: border-box;
}

.login__hero {
  height: 184px;
  margin: 18px 6px 0;
  background-image: url('@/assets/background3.jpg');
  background-size: cover;
  background-position: center;
}

.login__masthead {
  margin-top: 34px;
}

.login__kicker {
  font: 400 10px/1 var(--font-body);
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
}

.login__wordmark {
  margin-top: 9px;
  font: 600 44px/0.95 var(--font-heading);
  letter-spacing: 0.01em;
}

.login__busy {
  color: var(--color-text);
}

.login__carrot {
  color: var(--color-accent);
}

.login__tagline {
  margin: 8px 0 0;
  max-width: 290px;
  font: 400 13px/1.5 var(--font-body);
  color: var(--color-neutral-700);
}

.login__widget {
  margin-top: 20px;
  min-height: 320px;
}

.login__foot {
  margin-top: 22px;
}

.login__seg {
  align-self: flex-start;
  display: inline-flex;
}

.login__seg-opt {
  min-height: 36px;
  padding: 0 16px;
  font: 600 11px var(--font-heading);
  letter-spacing: 0.1em;
}
</style>

<style>
/*
 * Unscoped, because Lock renders outside this component's tree.
 *
 * Only the frame is ours: the widget sits flush in the column, square and
 * hairline-bordered like every other panel, with no card shadow. Lock's
 * internals — its inputs, its type, its own rounding — are Auth0's markup and
 * are left alone rather than fought with brittle descendant selectors.
 */
/* Lock centres its 300px widget inside a 40px-padded box. Both go, so the
   widget sits flush in the column like every other panel on the screen. */
#login-container .auth0-lock.auth0-lock .auth0-lock-center {
  padding: 0;
  vertical-align: top;
}

#login-container .auth0-lock.auth0-lock .auth0-lock-widget {
  width: 100%;
  max-width: none;
  box-shadow: none;
  border-radius: 0;
}

#login-container .auth0-lock.auth0-lock .auth0-lock-header {
  border-radius: 0;
}

#login-container .auth0-lock.auth0-lock .auth0-lock-cred-pane {
  border-radius: 0;
}

#login-container .auth0-lock.auth0-lock .auth0-lock-widget-container {
  padding: 0;
}
</style>
