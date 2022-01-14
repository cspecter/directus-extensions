<template>
  <div class="gallery">
    <div class="gallery-panel" v-for="file in files" :key="file.id">
      <file-preview
        id="{{file.src}}"
        :file="file"
        :is-selected="getSelectedState(file)"
        in-modal
        :show-select="!disabled && showSelect"
        @click="$emit('click:row', { item: file, event: $event })"
        @item-selected="
            onItemSelected({
                item: file,
                value: !getSelectedState(file),
            })
        "
      />
    </div>
  </div>
  <slot name="footer" />
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { Item, ShowSelect } from "@directus/shared/types";
import FilePreview from "../file-preview";
import { clone } from 'lodash'
import pino from "pino";

const logger = pino();

type Sort = {
  by: string | null;
  desc: boolean;
};

type ItemSelectEvent = {
	value: boolean;
	item: Item;
};

export default defineComponent({
  components: { FilePreview },
  inheritAttrs: false,
  props: {
    items: {
      type: Array as PropType<Item[]>,
      required: true,
    },
    files: {
      type: Array as PropType<File[]>,
      required: true,
    },
    itemKey: {
      type: String,
      default: "id",
    },
    sort: {
      type: Object as PropType<Sort>,
      default: null,
    },
    mustSort: {
      type: Boolean,
      default: false,
    },
    showSelect: {
      type: String as PropType<ShowSelect>,
      default: "none",
    },
    showResize: {
      type: Boolean,
      default: false,
    },
    showManualSort: {
      type: Boolean,
      default: false,
    },
    manualSortKey: {
      type: String,
      default: null,
    },
    modelValue: {
      type: Array as PropType<any>,
      default: () => [],
    },
    fixedHeader: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    loadingText: {
      type: String,
      default: "Loading",
    },
    noItemsText: {
      type: String,
      default: "No Items",
    },
    serverSort: {
      type: Boolean,
      default: false,
    },
    rowHeight: {
      type: Number,
      default: 48,
    },
    selectionUseKeys: {
      type: Boolean,
      default: false,
    },
    inline: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    clickable: {
      type: Boolean,
      default: true,
    },
  },
  setup(props, { emit }) {

    return { getSelectedState, onItemSelected };

    function onItemSelected(event: ItemSelectEvent) {
			if (props.disabled) return;

			emit('item-selected', event);

			let selection = clone(props.modelValue) as any[];

			if (event.value === true) {
				if (props.selectionUseKeys) {
					selection.push(event.item[props.itemKey]);
				} else {
					selection.push(event.item);
				}
			} else {
				selection = selection.filter((item) => {
					if (props.selectionUseKeys) {
						return item !== event.item[props.itemKey];
					}

					return item[props.itemKey] !== event.item[props.itemKey];
				});
			}

			emit('update:modelValue', selection);
		}

    function getSelectedState(item: Item) {
      const selectedKeys = props.selectionUseKeys
        ? props.modelValue
        : props.modelValue.map((item: any) => item[props.itemKey]);

      return selectedKeys.includes(item[props.itemKey]);
    }
  },
});
</script>

<style lang="css">
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
  grid-gap: 1rem;
  max-width: 80rem;
  margin: 5rem auto;
}
</style>
