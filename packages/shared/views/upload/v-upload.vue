<template>
  <div
    data-dropzone
    class="upload"
    :class="{ dragging, uploading }"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave.prevent="onDragLeave"
    @drop.stop.prevent="onDrop"
  >
    <template v-if="dragging">
      <p class="type-label">{{ t("drop_to_upload") }}</p>
      <p class="type-text">{{ t("upload_pending") }}</p>
    </template>

    <template v-else-if="uploading">
      <p class="type-label">{{ progress }}%</p>
      <p class="type-text">
        {{
          multiple && numberOfFiles > 1
            ? t("upload_files_indeterminate", {
                done: done,
                total: numberOfFiles,
              })
            : t("upload_file_indeterminate")
        }}
      </p>
      <v-progress-linear :value="progress" rounded />
    </template>

    <template v-else>
      <p class="type-label">{{ t("drag_file_here") }}</p>
      <p class="type-text">{{ t("click_to_browse") }}</p>
      <input
        class="browse"
        type="file"
        :multiple="multiple"
        @input="onBrowseSelect"
      />

      <template v-if="fromUrl !== false || fromLibrary !== false">
        <v-menu show-arrow placement="bottom-end">
          <template #activator="{ toggle }">
            <v-icon
              clickable
              class="options"
              name="more_vert"
              @click="toggle"
            />
          </template>
          <v-list>
            <v-list-item
              v-if="fromLibrary"
              clickable
              @click="activeDialog = 'choose'"
            >
              <v-list-item-icon><v-icon name="folder_open" /></v-list-item-icon>
              <v-list-item-content>
                {{ "Choose from collection." }}
              </v-list-item-content>
            </v-list-item>

            <!-- <v-list-item v-if="fromUrl" clickable @click="activeDialog = 'url'">
              <v-list-item-icon><v-icon name="link" /></v-list-item-icon>
              <v-list-item-content>
                {{ t("import_from_url") }}
              </v-list-item-content>
            </v-list-item> -->
          </v-list>
        </v-menu>

        <drawer-collection
          :collection="collection"
          :active="activeDialog === 'choose'"
          :multiple="multiple"
          :selection="selection"
          :filter="filter"
          :prefix="prefix"
          :urlfield="urlfield"
          @input="stageSelection"
        />

        <v-dialog
          :model-value="activeDialog === 'url'"
          :persistent="urlLoading"
          @esc="activeDialog = null"
          @update:model-value="activeDialog = null"
        >
          <v-card>
            <v-card-title>{{ t("import_from_url") }}</v-card-title>
            <v-card-text>
              <v-input
                v-model="url"
                autofocus
                :placeholder="t('url')"
                :nullable="false"
                :disabled="urlLoading"
              />
            </v-card-text>
            <v-card-actions>
              <v-button
                :disabled="urlLoading"
                secondary
                @click="activeDialog = null"
              >
                {{ t("cancel") }}
              </v-button>
              <v-button
                :loading="urlLoading"
                :disabled="isValidURL === false"
                @click="importFromURL"
              >
                {{ t("import_label") }}
              </v-button>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </template>
    </template>
  </div>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
import { defineComponent, ref, computed, PropType, Ref } from "vue";
import { Filter } from "@directus/shared/types";
// import uploadFiles from '@/utils/upload-files';
// import uploadFile from '@/utils/upload-file';
import uploadSupabaseFile from "@directus-extensions/shared/utils/upload-supabase-file";
import DrawerCollection from "../drawer-collection";
import { useApi, useStores } from "@directus/extensions-sdk";
import emitter, { Events } from "@directus-extensions/shared/utils/events";
import { unexpectedError } from "@directus-extensions/shared/utils/unexpected-error";
import { notify } from "@directus-extensions/shared/utils/notify";
import imageDimensions from "@directus-extensions/shared/utils/image-dimensions";

import pino from "pino";

const logger = pino();

export default defineComponent({
  components: { DrawerCollection },
  props: {
    multiple: {
      type: Boolean,
      default: false,
    },
    preset: {
      type: Object,
      default: () => ({}),
    },
    fileId: {
      type: String,
      default: null,
    },
    fromUrl: {
      type: Boolean,
      default: false,
    },
    fromLibrary: {
      type: Boolean,
      default: false,
    },
    folder: {
      type: String,
      default: undefined,
    },
    selection: {
      type: Array as PropType<(number | string)[]>,
      default: () => [],
    },
    collection: {
      type: String,
      required: true,
    },
    filter: {
      type: Object as PropType<Filter>,
      default: null,
    },
    prefix: {
      type: String,
      default: null,
    },
    urlfield: {
      type: String,
      default: null,
    },
    width: {
      type: Number,
      default: null,
    },
    height: {
      type: Number,
      default: null,
    },
    items: {
      type: Array as PropType<Record<string, any>[]>,
      default: null,
    },
  },
  emits: ["input"],
  setup(props, { emit }) {
    const { t } = useI18n();
    const api = useApi();
    const { useNotificationsStore } = useStores();
    const { uploading, progress, upload, onBrowseSelect, done, numberOfFiles } =
      useUpload();
    const { onDragEnter, onDragLeave, onDrop, dragging } = useDragging();
    const {
      url,
      isValidURL,
      loading: urlLoading,
      importFromURL,
    } = useURLImport();
    const { setSelection, stageSelection } = useSelection();
    const activeDialog = ref<"choose" | "url" | null>(null);

    const filterByFolder = computed(() => {
      if (!props.folder) return null;
      return { folder: { id: { _eq: props.folder } } };
    });

    return {
      t,
      uploading,
      progress,
      onDragEnter,
      onDragLeave,
      onDrop,
      dragging,
      onBrowseSelect,
      done,
      numberOfFiles,
      activeDialog,
      filterByFolder,
      url,
      isValidURL,
      urlLoading,
      importFromURL,
      setSelection,
      stageSelection,
    };

    function useUpload() {
      const uploading = ref(false);
      const progress = ref(0);
      const numberOfFiles = ref(0);
      const done = ref(0);

      return {
        uploading,
        progress,
        upload,
        onBrowseSelect,
        numberOfFiles,
        done,
      };

      async function upload(files: File[]) {
        uploading.value = true;
        progress.value = 0;

        const folderPreset: { folder?: string } = {};

        if (props.folder) {
          folderPreset.folder = props.folder;
        }

        try {
          numberOfFiles.value = files.length;

          if (testFiles(files)) {
            const uploadedFiles = await uploadSupabaseFile(
              api,
              useNotificationsStore,
              files,
              props.folder,
              {
                onProgressChange: (percentage: any) => {
                  progress.value = percentage;
                  done.value = percentage === 100 ? 1 : 0;
                },
                fileId: props.fileId,
                preset: {
                  ...props.preset,
                  // ...folderPreset,
                },
              }
            );

            if (props.multiple) {
              const ids = uploadedFiles.map((y) => y.id)

              logger.info(props.items)

              if (props.items) {
                const newIds = props.items.forEach((item) => {
                  Object.keys(item).forEach((key) => {
                    if (key !== 'id') ids.push(item[key].id)
                  })
                })

                ids.concat(newIds)
              }

              emit(
                "input",
                ids
              );
            } else if (uploadedFiles.length === 1) {
              emit("input", uploadedFiles[0].id);
            }
          }
        } catch (err: any) {
          unexpectedError(err, useNotificationsStore, api);
        } finally {
          uploading.value = false;
          done.value = 0;
          numberOfFiles.value = 0;
        }
      }

      function testFiles(files: File[]) {
        let isImages = [];

        files.forEach((file) => {
          if (
            [
              "image/jpeg",
              "image/png",
              "image/webp",
              "image/gif",
              "image/tiff",
            ].includes(file.type)
          ) {
            imageDimensions(file, async (img) => {
              const testW = props.width;
              const testH = props.height;

              const w = img.width;
              const h = img.height;

              if (w === testW && h === testH) {
                isImages.push(true);
              } else {
                isImages.push(false);
                notify(
                  {
                    title: "Incorect Format",
                    type: "error",
                    text: `You need an image of ${testW} x ${testH} dimensions.`,
                  },
                  useNotificationsStore
                );
              }
            });
          } else {
            isImages.push(false);
            notify(
              {
                title: "Not an image file",
                type: "error",
              },
              useNotificationsStore
            );
          }
        });

        return isImages.indexOf(false) === -1;
      }

      function onBrowseSelect(event: InputEvent) {
        const files = (event.target as HTMLInputElement)?.files;

        if (files) {
          upload(files);
        }
      }
    }

    function useDragging() {
      const dragging = ref(false);

      let dragCounter = 0;

      return { onDragEnter, onDragLeave, onDrop, dragging };

      function onDragEnter() {
        dragCounter++;

        if (dragCounter === 1) {
          dragging.value = true;
        }
      }

      function onDragLeave() {
        dragCounter--;

        if (dragCounter === 0) {
          dragging.value = false;
        }
      }

      function onDrop(event: DragEvent) {
        dragCounter = 0;
        dragging.value = false;

        const files = event.dataTransfer?.files;

        if (files) {
          upload(files);
        }
      }
    }

    function useSelection() {
      const selectModalActive = ref(false);

      return { setSelection, stageSelection, selectModalActive };

      async function setSelection(selection: string[]) {
        if (selection[0]) {
          const id = selection[0];
          const fileResponse = await api.get(`/files/${id}`);
          emit("input", fileResponse.data.data);
        } else {
          emit("input", null);
        }
      }

      function stageSelection(newSelection: (number | string)[]) {
        // logger.info("Make selection");
        // logger.info(newSelection);
        if (newSelection.length === 0) {
          emit("input", null);
        } else {
          emit("input", newSelection[0]);
        }
        activeDialog.value = null;
      }
    }

    function useURLImport() {
      const url = ref("");
      const loading = ref(false);

      const isValidURL = computed(() => {
        try {
          new URL(url.value);
          return true;
        } catch {
          return false;
        }
      });

      return { url, loading, isValidURL, importFromURL };

      async function importFromURL() {
        loading.value = true;

        try {
          const response = await api.post(`/files/import`, {
            url: url.value,
            data: {
              folder: props.folder,
            },
          });

          emitter.emit(Events.upload);

          if (props.multiple) {
            emit("input", [response.data.data]);
          } else {
            emit("input", response.data.data);
          }

          activeDialog.value = null;
          url.value = "";
        } catch (err: any) {
          unexpectedError(err, useNotificationsStore, api);
        } finally {
          loading.value = false;
        }
      }
    }
  },
});
</script>

<style lang="scss" scoped>
.upload {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: var(--input-height-tall);
  padding: 32px;
  color: var(--foreground-subdued);
  text-align: center;
  border: 2px dashed var(--border-normal);
  border-radius: var(--border-radius);
  transition: var(--fast) var(--transition);
  transition-property: color, border-color, background-color;

  p {
    color: inherit;
  }

  &:not(.uploading):hover {
    color: var(--primary);
    border-color: var(--primary);
  }
}

.browse {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  width: 100%;
  height: 100%;
  cursor: pointer;
  opacity: 0;
  appearance: none;
}

.dragging {
  color: var(--primary);
  background-color: var(--primary-alt);
  border-color: var(--primary);

  * {
    pointer-events: none;
  }
}

.uploading {
  --v-progress-linear-color: var(--white);
  --v-progress-linear-background-color: rgb(255 255 255 / 0.25);
  --v-progress-linear-height: 8px;

  color: var(--white);
  background-color: var(--primary);
  border-color: var(--primary);
  border-style: solid;

  .v-progress-linear {
    position: absolute;
    bottom: 30px;
    left: 32px;
    width: calc(100% - 64px);
  }
}

.options {
  position: absolute;
  top: 12px;
  right: 12px;
  color: var(--foreground-subdued);
  cursor: pointer;
  transition: color var(--medium) var(--transition);
}

.v-upload:hover .options {
  color: var(--primary);
}
</style>
