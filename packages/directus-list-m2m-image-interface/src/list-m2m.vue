<template>
  <v-notice v-if="!junction || !relation" type="warning">
    {{ "The relationship hasn't been configured correctly" }}
  </v-notice>
  <div v-else class="many-to-many">
    <template v-if="loading">
      <v-skeleton-loader
        v-for="n in (value || []).length || 3"
        :key="n"
        :type="
          (value || []).length > 4 ? 'block-list-item-dense' : 'block-list-item'
        "
      />
    </template>

    <v-notice v-else-if="sortedItems.length === 0">
      {{ "No items" }}
    </v-notice>

    <v-list v-else>
      <!-- <draggable
        :force-fallback="true"
        :model-value="sortedItems"
        item-key="id"
        handle=".drag-handle"
        :disabled="!junction.meta.sort_field"
        @update:model-value="sortItems($event)"
      > -->
      <!-- <template #item="{ element }"> -->
      <v-list-item
        :key="element.id"
        v-for="element in items"
        :dense="sortedItems.length > 4"
        block
        clickable
        height="auto"
        @click="editItem(element)"
      >
        <v-icon
          v-if="junction.meta.sort_field"
          name="drag_handle"
          class="drag-handle"
          left
          @click.stop="() => {}"
        />
        <render-template-image
          :collection="junctionCollection.collection"
          :item="element"
          :template="templateWithDefaults"
		  :prefix="prefix"
        />
        <div class="spacer" />
        <v-icon
          v-if="!disabled"
          name="close"
          @click.stop="deleteItem(element)"
        />
      </v-list-item>
      <!-- </template> -->
      <!-- </draggable> -->
    </v-list>

    <div v-if="!disabled" class="actions">
      <!-- <v-button
        v-if="enableCreate && createAllowed"
        @click="editModalActive = true"
        >{{ "Upload Image" }}</v-button
      > -->
      <upload
        :collection="relationCollection.collection"
        :selection="selectedPrimaryKeys"
        :filter="customFilter"
        :prefix="prefix"
        :urlfield="urlfield"
        :folder="folder"
        :width="widthx"
        :height="height"
        :items="items"
        multiple
        @input="stageSelection"
      />
      <v-button
        v-if="enableSelect && selectAllowed"
        @click="selectModalActive = true"
      >
        {{ "Add Existing" }}
      </v-button>
    </div>

    <drawer-item
      v-if="!disabled"
      :active="editModalActive"
      :collection="relationInfo.junctionCollection"
      :primary-key="currentlyEditing || '+'"
      :related-primary-key="relatedPrimaryKey || '+'"
      :junction-field="relationInfo.junctionField"
      :edits="editsAtStart"
      :circular-field="junction.field"
      @input="stageEdits"
      @update:active="cancelEdit"
    />

    <drawer-collection
      v-if="!disabled"
      v-model:active="selectModalActive"
      :collection="relationCollection.collection"
      :selection="selectedPrimaryKeys"
      :filter="customFilter"
      :prefix="prefix"
      :urlfield="urlfield"
      multiple
      @input="stageSelection"
    />
  </div>
</template>

<script lang="ts">
// import { useI18n } from "vue-i18n";
import { defineComponent, computed, PropType, toRefs, inject, ref } from "vue";
import DrawerItem from "@directus-extensions/shared/views/drawer-item";
import DrawerCollection from "@directus-extensions/shared/views/drawer-collection";
import Upload from "@directus-extensions/shared/views/upload";
import { get } from "lodash";
import Draggable from "vuedraggable";
import { Filter } from "@directus/shared/types";
import { parseFilter } from "@directus-extensions/shared/utils/parse-filter";
import { render } from "micromustache";
import { deepMap } from "@directus/shared/utils";
import { useStores, useApi } from "@directus/extensions-sdk";
import RenderTemplateImage from "@directus-extensions/shared/views/render-template-image";

import useActions from "./use-actions";
import useRelation from "@directus-extensions/shared/composables/use-m2m";
import usePreview from "./use-preview";
import useEdit from "./use-edit";
import usePermissions from "./use-permissions";
import useSelection from "./use-selection";
import useSort from "./use-sort";
import { getFieldsFromTemplate } from "@directus/shared/utils";
import adjustFieldsForDisplays from "@directus-extensions/shared/utils/adjust-fields-for-displays";

import pino from "pino";

const logger = pino();

export default defineComponent({
  components: {
    DrawerItem,
    DrawerCollection,
    Draggable,
    Upload,
    RenderTemplateImage,
  },
  props: {
    value: {
      type: Array as PropType<(number | string | Record<string, any>)[] | null>,
      default: null,
    },
    primaryKey: {
      type: [Number, String],
      required: true,
    },
    collection: {
      type: String,
      required: true,
    },
    field: {
      type: String,
      required: true,
    },
    template: {
      type: String,
      default: null,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    enableCreate: {
      type: Boolean,
      default: true,
    },
    enableSelect: {
      type: Boolean,
      default: true,
    },
    filter: {
      type: Object as PropType<Filter>,
      default: null,
    },
    driver: {
      type: String,
      default: null,
    },
    widthx: {
      type: Number,
      default: null,
    },
    height: {
      type: Number,
      default: null,
    },
  },
  emits: ["input"],
  setup(props, { emit }) {
    // const { t } = useI18n();
    const {
      useUserStore,
      useRelationsStore,
      useCollectionsStore,
      useFieldsStore,
      usePermissionsStore,
    } = useStores();
    const api = useApi();
    const userStore = useUserStore();
    const fieldsStore = useFieldsStore();

    const folder = computed(() => {
        return `${props.collection}/${props.field.replace('_id', '')}/`
    })

    const values = inject("values", ref<Record<string, any>>({}));

    const { prefix, urlfield } = useDriver();

    const customFilter = computed(() => {
      return parseFilter(
        deepMap(props.filter, (val: any) => {
          if (val && typeof val === "string") {
            return render(val, values.value);
          }

          return val;
        }),
        userStore
      );
    });

    const { value, collection, field } = toRefs(props);

    const {
      junction,
      junctionCollection,
      relation,
      relationCollection,
      relationInfo,
    } = useRelation(collection, field, useRelationsStore, useCollectionsStore);

    const templateWithDefaults = computed(() => {
      if (props.template) return props.template;
      if (junctionCollection.value.meta?.display_template)
        return junctionCollection.value.meta.display_template;

      let relatedDisplayTemplate =
        relationCollection.value.meta?.display_template;
      if (relatedDisplayTemplate) {
        const regex = /({{.*?}})/g;
        const parts = relatedDisplayTemplate.split(regex).filter((p) => p);

        for (const part of parts) {
          if (part.startsWith("{{") === false) continue;
          const key = part.replace(/{{/g, "").replace(/}}/g, "").trim();
          const newPart = `{{${relation.value.field}.${key}}}`;

          relatedDisplayTemplate = relatedDisplayTemplate.replace(
            part,
            newPart
          );
        }

        return relatedDisplayTemplate;
      }

      return `{{${relation.value.field}.${relationInfo.value.relationPkField}}}`;
    });

    const fields = computed(() =>
      adjustFieldsForDisplays(
        getFieldsFromTemplate(templateWithDefaults.value),
        junctionCollection.value.collection,
        fieldsStore
      )
    );

    const {
      deleteItem,
      getUpdatedItems,
      getNewItems,
      getPrimaryKeys,
      getNewSelectedItems,
    } = useActions(value, relationInfo, emitter);

    const { tableHeaders, items, initialItems, loading } = usePreview(
      value,
      fields,
      relationInfo,
      getNewSelectedItems,
      getUpdatedItems,
      getNewItems,
      getPrimaryKeys,
      useFieldsStore,
      api
    );

    const {
      currentlyEditing,
      editItem,
      editsAtStart,
      stageEdits,
      cancelEdit,
      relatedPrimaryKey,
      editModalActive,
    } = useEdit(value, relationInfo, emitter);

    const { stageSelection, selectModalActive, selectedPrimaryKeys } =
      useSelection(items, initialItems, relationInfo, emitter);

    const { sort, sortItems, sortedItems } = useSort(
      relationInfo,
      fields,
      items,
      emitter
    );

    const { createAllowed, selectAllowed } = usePermissions(
      junctionCollection,
      relationCollection,
      usePermissionsStore,
      useUserStore
    );

    return {
      //   t,
      junction,
      relation,
      tableHeaders,
      loading,
      currentlyEditing,
      editItem,
      junctionCollection,
      relationCollection,
      editsAtStart,
      stageEdits,
      cancelEdit,
      stageSelection,
      selectModalActive,
      deleteItem,
      selectedPrimaryKeys,
      items,
      relationInfo,
      relatedPrimaryKey,
      get,
      editModalActive,
      sort,
      sortItems,
      sortedItems,
      templateWithDefaults,
      createAllowed,
      selectAllowed,
      customFilter,
      prefix,
      urlfield,
      folder,
    };

    function emitter(newVal: any[] | null) {
      logger.info("emitter")
      logger.info(newVal)
      emit("input", newVal);
    }

    function useDriver() {
      const prefix = ref("");

      let urlfield: string | string[] = props.template.replace("{{", "").replace("}}", "").split(".");

		urlfield = urlfield[urlfield.length - 1];

      //   const src = computed(() => {
      //     if (!currentItem.value) return null;

      //     return `${prefix.value}${currentItem.value[urlfield]}`;
      //   });

      async function getSupabase() {
        try {
          const res = await api.post("/supabase/file", { name: "" });
          prefix.value = res.data.url;
        } catch (e) {
          console.error(e);
        }
      }

      switch (props.driver) {
        case "supabase":
          getSupabase();
          break;
        default:
      }

      return { prefix, urlfield };
    }
  },
});
</script>

<style lang="scss" scoped>
.v-card {
  --input-height: auto;
}

.v-list {
  --input-height: auto;
  --v-list-padding: 0 0 4px;
}

.v-list-item.block.dense {
  height: auto
}

.actions {
  margin-top: 8px;

  .v-button + .v-button {
    margin-left: 8px;
  }
}

.deselect {
  --v-icon-color: var(--foreground-subdued);

  &:hover {
    --v-icon-color: var(--danger);
  }
}
</style>
