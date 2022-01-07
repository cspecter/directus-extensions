<template>
  <div
    v-if="type && !imgError"
    class="file-preview"
    v-bind:class="{ selected: isSelected }"
    id="{{ file.title }}"
	@click="$emit('item-selected', $event)"
  >
    <div
      v-if="type === 'image'"
      class="image"
      :class="{ svg: isSVG, 'max-size': inModal === false }"
    >
      <img :src="file.src" :alt="file.title" @error="imgError = true" />
      <div class="info">
        <div class="title">{{ file.title }}</div>
      </div>
    </div>

    <video
      v-else-if="type === 'video'"
      controls
      :src="file.src"
      :width="file.width"
      :height="auto"
    />

    <audio
      v-else-if="type === 'audio'"
      controls
      :src="file.src"
      :width="file.width"
      :height="auto"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, PropType } from "vue";
import { FileType } from "../../types";
import { ShowSelect } from '@directus/shared/types'

export default defineComponent({
  props: {
    file: {
      type: Object as PropType<FileType>,
      required: true,
    },
    inModal: {
      type: Boolean,
      default: false,
    },
    isSelected: {
      type: Boolean,
      default: false,
    },
	showSelect: {
			type: String as PropType<ShowSelect>,
			default: 'none',
		},
  },
  emits: ["click"],
  setup(props) {
    const imgError = ref(false);

    const file: FileType = props.file;

    const type = computed<"image" | "video" | "audio" | null>(() => {
      if (file.mime === null) return null;

      if (file.mime.startsWith("image")) {
        return "image";
      }

      if (file.mime.startsWith("video")) {
        return "video";
      }

      if (file.mime.startsWith("audio")) {
        return "audio";
      }

      return null;
    });

    const isSVG = computed(() => file.mime.includes("svg"));

    return { file, type, isSVG, imgError };
  },
});
</script>

<style lang="scss" scoped>
.title {
  padding: 25px;
}

.selected {
  background-color: lightgreen;
}

.file-preview {
  position: relative;
  width: 100%;
  max-width: calc(
    (var(--form-column-max-width) * 2) + var(--form-horizontal-gap)
  );
  height: 100%;
  margin-bottom: var(--form-vertical-gap);
  padding: 20px;
}

img,
video,
audio {
  width: 100%;
  max-height: 500px;
  object-fit: contain;
  border-radius: var(--border-radius);
}

.image {
  width: 100%;
  height: auto;
  cursor: pointer;

  &.max-size {
    max-height: 75vh;
    background-color: var(--background-normal);
    border-radius: var(--border-radius);
  }

  img {
    z-index: 1;
    display: block;
    margin: 0 auto;
  }

  .v-icon {
    position: absolute;
    right: 12px;
    bottom: 12px;
    z-index: 2;
    color: white;
    text-shadow: 0px 0px 8px rgb(0 0 0 / 0.75);
    opacity: 0;
    transition: opacity var(--fast) var(--transition);
  }

  &:hover {
    .v-icon {
      opacity: 1;
    }
  }
}

.svg {
  padding: 64px;
  background-color: var(--background-normal);
  border-radius: var(--border-radius);

  &.max-size img {
    // Max height - padding * 2
    max-height: calc(75vh - 128px);
  }
}
</style>
