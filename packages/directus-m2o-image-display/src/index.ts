import { defineDisplay, getFieldsFromTemplate } from '@directus/shared/utils';
import adjustFieldsForDisplays from '@directus-extensions/shared/utils/adjust-fields-for-displays';
import getRelatedCollection from '@directus-extensions/shared/utils/get-related-collection';
import DisplayM2OImage from './m2o-image.vue';
import { useStores } from '@directus/extensions-sdk'

type Options = {
	template: string;
};

export default defineDisplay({
	id: 'm2o-image',
	name: '$t:displays.m2o-image.image',
	description: '$t:displays.m2o-image.description',
	types: ['uuid', 'string', 'text', 'integer', 'bigInteger'],
	localTypes: ['m2m', 'm2o', 'o2m', 'translations', 'm2a', 'file', 'files'],
	icon: 'insert_photo',
	component: DisplayM2OImage,
	options: ({ relations }) => {
		const relatedCollection = relations.o2m?.collection ?? relations.m2o?.related_collection;

		return [
			{
				field: 'template',
				name: '$t:display_template',
				meta: {
					interface: 'system-display-template',
					options: {
						collectionName: relatedCollection,
					},
					width: 'full',
				},
			},
			{
				field: 'urlprefix',
				name: '$t:displays..m2o-image.url-prefix',
				type: 'string',
				meta: {
					width: 'half',
					interface: 'input',
					options: {
						label: '$t:displays..m2o-image.url_prefix_label',
						trim: false,
					},
				},
			},
			{
				field: 'circle',
				name: '$t:displays.image.circle',
				type: 'boolean',
				meta: {
					width: 'half',
					interface: 'boolean',
					options: {
						label: '$t:displays.image.circle_label',
					},
				},
				schema: {
					default_value: false,
				},
			}
		];
	},
	fields: (options: Options | null, { field, collection }) => {
		const { useFieldsStore, useRelationsStore } = useStores()
		const fieldsStore = useFieldsStore();
		const relationsStore = useRelationsStore();
		const { relatedCollection, path } = getRelatedCollection(collection, field, fieldsStore, relationsStore);
		const primaryKeyField = fieldsStore.getPrimaryKeyFieldForCollection(relatedCollection);

		if (!relatedCollection) return [];

		const fields = options?.template
			? adjustFieldsForDisplays(getFieldsFromTemplate(options.template), relatedCollection, fieldsStore)
			: [];

		if (primaryKeyField) {
			const primaryKeyFieldValue = path ? [...path, primaryKeyField.field].join('.') : primaryKeyField.field;

			if (!fields.includes(primaryKeyFieldValue)) {
				fields.push(primaryKeyFieldValue);
			}
		}

		return fields;
	},
});
