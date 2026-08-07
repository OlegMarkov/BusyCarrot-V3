<template>
  <div class="picker">
    <!-- The framed square the design uses for a person, with the photograph
         inside it instead of initials when there is one. -->
    <div class="picker__tile">
      <img v-if="modelValue" :src="modelValue" class="picker__img" alt="" />
      <span v-else class="picker__initials">{{ initials || '—' }}</span>
    </div>

    <div class="picker__actions">
      <button class="btn btn-secondary picker__btn" type="button" @click="choose">
        {{ t('settings.choosePhoto') }}
      </button>
      <button
        v-if="modelValue"
        class="btn btn-secondary picker__btn"
        type="button"
        @click="$emit('update:modelValue', '')"
      >
        {{ t('settings.removePhoto') }}
      </button>
      <input
        ref="file"
        type="file"
        accept="image/*"
        class="picker__file"
        @change="onFile"
      />
    </div>

    <!-- crop -->
    <div v-if="source" class="crop">
      <div
        ref="viewport"
        class="crop__viewport blueprint"
        @pointerdown="startPan"
        @pointermove="pan"
        @pointerup="endPan"
        @pointerleave="endPan"
        @wheel.prevent="onWheel"
      >
        <i class="corner tl" /><i class="corner tr" /><i class="corner bl" /><i class="corner br" />
        <canvas ref="canvas" :width="SIZE" :height="SIZE" class="crop__canvas" />
      </div>

      <label class="crop__zoom">
        <span class="crop__zoom-label">{{ t('settings.zoom') }}</span>
        <input v-model.number="scale" type="range" :min="minScale" :max="minScale * 4" :step="0.01" />
      </label>

      <div class="crop__actions">
        <button class="btn btn-primary picker__btn" type="button" @click="apply">
          {{ t('common.save') }}
        </button>
        <button class="btn btn-secondary picker__btn" type="button" @click="cancel">
          {{ t('common.cancel') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * Picks and crops a square avatar.
 *
 * Vegetable.Admin used `vue-advanced-cropper` for this, and the desktop
 * redesign dropped both the component and the dependency. Rather than take the
 * dependency back for one field in one dialog, the crop is done here: the image
 * is drawn into a square canvas, dragged to position, zoomed with the wheel or
 * the slider, and read back as a data URL.
 *
 * The output shape is what the API already stores — `Employee.Avatar` is a
 * string, and the old editor put a `canvas.toDataURL()` in it. JPEG at 0.85
 * rather than PNG, because a photograph as PNG is several times the size and
 * this string travels in the employee record on every fetch.
 */
const props = defineProps({
  /** data URL, or '' */
  modelValue: { type: String, default: '' },
  initials: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()

/** Output edge in px. Large enough for a retina 34px tile, small enough to store. */
const SIZE = 256

const file = ref(null)
const canvas = ref(null)
const source = ref(null)
const image = ref(null)
const scale = ref(1)
const minScale = ref(1)
const offset = ref({ x: 0, y: 0 })
const dragging = ref(false)
const last = ref({ x: 0, y: 0 })

function choose() {
  file.value?.click()
}

function onFile(event) {
  const picked = event.target.files?.[0]
  if (!picked) return
  const reader = new FileReader()
  reader.onload = (e) => {
    source.value = e.target.result
  }
  reader.readAsDataURL(picked)
  // Let the same file be picked again after a cancel.
  event.target.value = ''
}

watch(source, async (value) => {
  if (!value) {
    image.value = null
    return
  }
  const img = new Image()
  img.onload = async () => {
    image.value = img
    // Start at "cover": the smaller edge fills the square, nothing is letterboxed.
    minScale.value = Math.max(SIZE / img.width, SIZE / img.height)
    scale.value = minScale.value
    offset.value = {
      x: (SIZE - img.width * minScale.value) / 2,
      y: (SIZE - img.height * minScale.value) / 2
    }
    await nextTick()
    draw()
  }
  img.src = value
})

watch([scale, offset], draw, { deep: true })

function draw() {
  const el = canvas.value
  const img = image.value
  if (!el || !img) return
  const ctx = el.getContext('2d')
  ctx.fillStyle = '#e9e9ea'
  ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.drawImage(img, offset.value.x, offset.value.y, img.width * scale.value, img.height * scale.value)
}

/** Keep the image covering the square however it is dragged or zoomed. */
function clamp() {
  const img = image.value
  if (!img) return
  const w = img.width * scale.value
  const h = img.height * scale.value
  offset.value.x = Math.min(0, Math.max(SIZE - w, offset.value.x))
  offset.value.y = Math.min(0, Math.max(SIZE - h, offset.value.y))
}

function startPan(event) {
  dragging.value = true
  last.value = { x: event.clientX, y: event.clientY }
  event.target.setPointerCapture?.(event.pointerId)
}

function pan(event) {
  if (!dragging.value) return
  const el = canvas.value
  if (!el) return
  // The viewport is displayed smaller than the canvas; move in canvas units.
  const ratio = SIZE / el.getBoundingClientRect().width
  offset.value.x += (event.clientX - last.value.x) * ratio
  offset.value.y += (event.clientY - last.value.y) * ratio
  last.value = { x: event.clientX, y: event.clientY }
  clamp()
  draw()
}

function endPan() {
  dragging.value = false
}

function onWheel(event) {
  const next = scale.value * (event.deltaY < 0 ? 1.08 : 1 / 1.08)
  scale.value = Math.min(minScale.value * 4, Math.max(minScale.value, next))
  clamp()
  draw()
}

function apply() {
  clamp()
  draw()
  emit('update:modelValue', canvas.value.toDataURL('image/jpeg', 0.85))
  cancel()
}

function cancel() {
  source.value = null
  image.value = null
}
</script>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.picker__tile {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--color-divider);
}

.picker__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.picker__initials {
  font: 600 20px var(--font-heading);
  letter-spacing: 0.04em;
  color: var(--color-accent-700);
}

.picker__actions {
  display: flex;
  gap: 8px;
}

.picker__btn {
  min-height: 32px;
  padding: 0 12px;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.picker__file {
  display: none;
}

.crop {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 10px;
}

.crop__viewport {
  width: 200px;
  height: 200px;
  cursor: grab;
  touch-action: none;
}

.crop__viewport:active {
  cursor: grabbing;
}

.crop__canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.crop__zoom {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 200px;
}

.crop__zoom-label {
  font: 400 9.5px/1 var(--font-body);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
}

.crop__actions {
  display: flex;
  gap: 8px;
}
</style>
