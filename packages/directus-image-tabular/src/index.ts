import { defineLayout } from '@directus/shared/utils';
import ImgTabularLayout from './tabular.vue';
import ImgTabularOptions from './options.vue';
import ImgTabularActions from './actions.vue';

import { useI18n } from 'vue-i18n';
import { ref, computed, watch, toRefs, ComputedRef } from 'vue';

import { Field } from '@directus/shared/types';
import { useRouter } from 'vue-router';
//@ts-ignore
import { debounce, clone } from 'lodash';
import { useCollection, useItems } from '@directus/shared/composables';
import adjustFieldsForDisplays from '@directus-extensions/shared/utils/adjust-fields-for-displays';
import hideDragImage from '@directus-extensions/shared/utils/hide-drag-image';
import { getDefaultDisplayForType } from '@directus-extensions/shared/utils/get-default-display-for-type';
import { useSync } from '@directus/shared/composables';
import { LayoutOptions, LayoutQuery, FileType } from './types';
import { syncRefProperty } from '@directus-extensions/shared/utils/sync-ref-property';
import { useStores } from '@directus/extensions-sdk'
import { mimeType } from '@directus-extensions/shared/utils/mime-type';
// import pino from 'pino'

// const logger = pino();

export type Alignment = 'left' | 'center' | 'right';

export type HeaderRaw = {
	text: string;
	value: string;
	align?: Alignment;
	sortable?: boolean;
	width?: number | null;
	[key: string]: any;
};

export type Header = Required<HeaderRaw>;

export type Item = {
	[key: string]: any;
};

export type ItemSelectEvent = {
	value: boolean;
	item: Item;
};

export type Sort = {
	by: string | null;
	desc: boolean;
};


export default defineLayout<LayoutOptions, LayoutQuery>({
	id: 'tabular-img',
	name: 'Tabular Image Layout',
	icon: 'reorder',
	component: ImgTabularLayout,
	slots: {
		options: ImgTabularOptions,
		sidebar: () => undefined,
		actions: ImgTabularActions,
	},
	setup(props, { emit }) {
		// logger.info("DEFINE LAYOUT")
		// logger.info(props)
		const { t, n } = useI18n();

		const { useFieldsStore } = useStores()

		const fieldStore = useFieldsStore()

		const router = useRouter();

		const selection = useSync(props, 'selection', emit);
		const layoutOptions = useSync(props, 'layoutOptions', emit);
		const layoutQuery = useSync(props, 'layoutQuery', emit);

		const { collection, filter, filterUser, search } = toRefs(props);

		const { info, primaryKeyField, fields: fieldsInCollection, sortField } = useCollection(collection);

		const { sort, limit, page, fields, fieldsWithRelational } = useItemOptions();

		const { items, loading, error, totalPages, itemCount, totalCount, changeManualSort, getItems } = useItems(
			collection,
			{
				sort,
				limit,
				page,
				fields: fieldsWithRelational,
				filter,
				search,
			}
		);

		const files: ComputedRef<FileType[]> = computed(() => {
			if (items) return items.value.map((item) => {
				const title = item[props.urlfield]
				const src = `${props.prefix}${title}`
				const mime = mimeType.lookup(src)
				const width = 200
				return { title, src, mime, width, id: item.id }
			})
			return []
		})

		const { tableSort, tableHeaders, tableRowHeight, onRowClick, onSortChange, activeFields, tableSpacing } =
			useTable();

		const showingCount = computed(() => {
			if ((itemCount.value || 0) < (totalCount.value || 0) && filterUser.value) {
				if (itemCount.value === 1) {
					return t('one_filtered_item');
				}

				return t('start_end_of_count_filtered_items', {
					start: n((+page.value - 1) * limit.value + 1),
					end: n(Math.min(page.value * limit.value, itemCount.value || 0)),
					count: n(itemCount.value || 0),
				});
			}

			if (itemCount.value === 1) {
				return t('one_item');
			}

			return t('start_end_of_count_items', {
				start: n((+page.value - 1) * limit.value + 1),
				end: n(Math.min(page.value * limit.value, itemCount.value || 0)),
				count: n(itemCount.value || 0),
			});
		});

		const availableFields = computed(() => {
			return fieldsInCollection.value.filter((field: Field) => field.meta?.special?.includes('no-data') !== true);
		});

		return {
			tableHeaders,
			items,
			loading,
			error,
			totalPages,
			tableSort,
			onRowClick,
			onSortChange,
			tableRowHeight,
			page,
			toPage,
			itemCount,
			totalCount,
			fieldsInCollection,
			fields,
			limit,
			activeFields,
			tableSpacing,
			primaryKeyField,
			info,
			showingCount,
			sortField,
			changeManualSort,
			hideDragImage,
			refresh,
			resetPresetAndRefresh,
			selectAll,
			availableFields,
			filter,
			search,
			files
		};

		async function resetPresetAndRefresh() {
			await props?.resetPreset?.();
			refresh();
		}

		function refresh() {
			getItems();
		}

		function toPage(newPage: number) {
			page.value = newPage;
		}

		function selectAll() {
			if (!primaryKeyField.value) return;
			const pk = primaryKeyField.value;
			selection.value = clone(items.value).map((item: any) => item[pk.field]);
		}

		function useItemOptions() {
			const page = syncRefProperty(layoutQuery, 'page', 1);
			const limit = syncRefProperty(layoutQuery, 'limit', 25);
			const defaultSort = computed(() => (primaryKeyField.value ? [primaryKeyField.value?.field] : []));
			const sort = syncRefProperty(layoutQuery, 'sort', defaultSort);
			const fieldsDefaultValue = computed(() => {
				return fieldsInCollection.value
					.filter((field: Field) => !field.meta?.hidden)
					.slice(0, 4)
					.map(({ field }: Field) => field)
					.sort();
			});

			const fields = syncRefProperty(layoutQuery, 'fields', fieldsDefaultValue);

			const fieldsWithRelational = computed(() => {
				if (!props.collection) return [];
				return adjustFieldsForDisplays(fields.value, props.collection, fieldStore);
			});

			return { sort, limit, page, fields, fieldsWithRelational };
		}

		function useTable() {
			const tableSort = computed(() => {
				if (!sort.value?.[0]) {
					return null;
				} else if (sort.value?.[0].startsWith('-')) {
					return { by: sort.value[0].substring(1), desc: true };
				} else {
					return { by: sort.value[0], desc: false };
				}
			});

			const localWidths = ref<{ [field: string]: number }>({});

			watch(
				() => layoutOptions.value,
				() => {
					localWidths.value = {};
				}
			);

			const saveWidthsTolayoutOptions = debounce(() => {
				layoutOptions.value = Object.assign({}, layoutOptions.value, {
					widths: localWidths.value,
				});
			}, 350);

			const activeFields = computed<Field[]>({
				get() {
					return fields.value
						.map((key) => fieldsInCollection.value.find((field: Field) => field.field === key))
						.filter((f) => f) as Field[];
				},
				set(val) {
					fields.value = val.map((field) => field.field);
				},
			});

			const tableHeaders = computed<HeaderRaw[]>({
				get() {
					return activeFields.value.map((field) => ({
						text: field.name,
						value: field.field,
						width: localWidths.value[field.field] || layoutOptions.value?.widths?.[field.field] || null,
						field: {
							display: field.meta?.display || getDefaultDisplayForType(field.type),
							displayOptions: field.meta?.display_options,
							interface: field.meta?.interface,
							interfaceOptions: field.meta?.options,
							type: field.type,
							field: field.field,
						},
						sortable:
							['json', 'o2m', 'm2o', 'm2m', 'm2a', 'file', 'files', 'alias', 'presentation', 'translations'].includes(
								field.type
							) === false,
					}));
				},
				set(val) {
					const widths = {} as { [field: string]: number };

					val.forEach((header) => {
						if (header.width) {
							widths[header.value] = header.width;
						}
					});

					localWidths.value = widths;

					saveWidthsTolayoutOptions();
				},
			});

			const tableSpacing = syncRefProperty(layoutOptions, 'spacing', 'cozy');

			const tableRowHeight = computed<number>(() => {
				switch (tableSpacing.value) {
					case 'compact':
						return 32;
					case 'cozy':
					default:
						return 48;
					case 'comfortable':
						return 64;
				}
			});

			return {
				tableSort,
				tableHeaders,
				tableSpacing,
				tableRowHeight,
				onRowClick,
				onSortChange,
				activeFields,
				getFieldDisplay,
			};

			function onRowClick({ item, event }: { item: Item; event: PointerEvent }) {
				if (props.readonly === true || !primaryKeyField.value) return;

				const primaryKey = item[primaryKeyField.value.field];

				if (props.selectMode || selection.value?.length > 0) {
					if (selection.value?.includes(primaryKey) === false) {
						selection.value = selection.value.concat(primaryKey);
					} else {
						selection.value = selection.value.filter((item) => item !== primaryKey);
					}
				} else {
					const next = router.resolve(`/content/${collection.value}/${encodeURIComponent(primaryKey)}`);

					if (event.ctrlKey || event.metaKey) window.open(next.href, '_blank');
					else router.push(next);
				}
			}

			function onSortChange(newSort: { by: string; desc: boolean }) {
				let sortString = newSort.by;
				if (!newSort.by) {
					sort.value = [];
					return;
				}
				if (newSort.desc === true) {
					sortString = '-' + sortString;
				}
				sort.value = [sortString];
			}

			function getFieldDisplay(fieldKey: string) {
				const field = fieldsInCollection.value.find((field: Field) => field.field === fieldKey);

				if (!field?.meta?.display) return null;

				return {
					display: field.meta.display,
					options: field.meta.display_options,
				};
			}
		}
	},
});
