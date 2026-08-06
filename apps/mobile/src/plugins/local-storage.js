/**
 * Per-device "is this employee/service shown in the dashboard filter" flags.
 * Ported from vegetable.mobile.vue/store/local.storage.js (plus.sqlite).
 *
 * FLAGGED BEHAVIOUR CHANGE (signed off): in the original, `localStorage.init()` was commented
 * out in store/index.js, yet employee.module.js and service.module.js still
 * called getEmployeeIsChecked / setServiceIsChecked. With no database ever
 * opened, every read hit the `fail` branch — so the flags were effectively
 * never persisted. This port calls init() at launch (see App.vue onLaunch) so
 * the feature works as the code clearly intended. If you would rather keep the
 * old effective behaviour, remove the initLocalStorage() call in App.vue.
 *
 * On H5 the same interface is backed by uni storage so the dev target works.
 */

const DATABASE_NAME = 'vegetable'
const DATABASE_HANDLE = 'first'
const SERVICES_TABLE_NAME = 'services'
const EMPLOYEES_TABLE_NAME = 'employees'

// #ifndef APP-PLUS
const storageKey = (table, id) => `isChecked:${table}:${id}`
// #endif

export function initLocalStorage() {
  // #ifdef APP-PLUS
  if (isOpen()) closeDatabase()

  plus.sqlite.openDatabase({
    name: DATABASE_HANDLE,
    path: `_doc/${DATABASE_NAME}.db`,
    success() {
      ensureTablesExist()
    },
    fail(e) {
      console.error(`Open ${DATABASE_NAME} database failed`, e)
    }
  })
  // #endif
}

// #ifdef APP-PLUS
function ensureTablesExist() {
  ;[SERVICES_TABLE_NAME, EMPLOYEES_TABLE_NAME].forEach((table) => {
    plus.sqlite.executeSql({
      name: DATABASE_HANDLE,
      sql: `create table if not exists ${table}("id" BLOB PRIMARY KEY,"isChecked" INT)`,
      fail(e) {
        console.error(`Create ${table} table failed`, e)
      }
    })
  })
}

function isOpen() {
  return plus.sqlite.isOpenDatabase({ name: DATABASE_HANDLE, path: `_doc/${DATABASE_NAME}.db` })
}

function closeDatabase() {
  plus.sqlite.closeDatabase({ name: DATABASE_HANDLE })
}

function insertOrUpdate(table, id, value) {
  return new Promise((resolve, reject) => {
    plus.sqlite.executeSql({
      name: DATABASE_HANDLE,
      sql: `INSERT INTO ${table}(id,isChecked) VALUES('${id}','${value}')`,
      success: () => resolve(),
      fail: () => {
        // Row already exists — the original relied on the insert failing.
        plus.sqlite.executeSql({
          name: DATABASE_HANDLE,
          sql: `UPDATE ${table} SET isChecked = '${value}' WHERE id ='${id}'`,
          success: () => resolve(),
          fail: reject
        })
      }
    })
  })
}

function selectIsChecked(table, id) {
  return new Promise((resolve) => {
    plus.sqlite.selectSql({
      name: DATABASE_HANDLE,
      sql: `select * from ${table} where id = '${id}'`,
      success: (rows) => {
        // Unknown ids default to checked, as in the original.
        if (!rows || rows.length === 0) resolve(true)
        else resolve(!!rows[0].isChecked)
      },
      // The original rejected here, which propagated out of the awaiting store
      // action and aborted the whole employee fetch. Defaulting to checked
      // keeps a storage failure from breaking the list.
      fail: () => resolve(true)
    })
  })
}
// #endif

function getIsChecked(table, id) {
  // #ifdef APP-PLUS
  return selectIsChecked(table, id)
  // #endif
  // eslint-disable-next-line no-unreachable
  const stored = uni.getStorageSync(storageKey(table, id))
  return Promise.resolve(stored === '' || stored === null || stored === undefined ? true : !!stored)
}

function setIsChecked(table, id, value) {
  // #ifdef APP-PLUS
  return insertOrUpdate(table, id, value ? 1 : 0)
  // #endif
  // eslint-disable-next-line no-unreachable
  uni.setStorageSync(storageKey(table, id), value ? 1 : 0)
  return Promise.resolve()
}

export const getEmployeeIsChecked = (id) => getIsChecked(EMPLOYEES_TABLE_NAME, id)
export const getServiceIsChecked = (id) => getIsChecked(SERVICES_TABLE_NAME, id)
export const setEmployeeIsChecked = (id, value) => setIsChecked(EMPLOYEES_TABLE_NAME, id, value)
export const setServiceIsChecked = (id, value) => setIsChecked(SERVICES_TABLE_NAME, id, value)
