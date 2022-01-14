import { defineInterface } from '@directus/shared/utils';
import InterfaceListM2M from './list-m2m.vue';
// import PreviewSVG from './preview.svg?raw';

export default defineInterface({
	id: 'list-m2m-image',
	name: 'Many-To-Many Image Selection',
	description: 'An interface to select an image from a colleciton.',
	icon: 'note_add',
	component: InterfaceListM2M,
	relational: true,
	types: ['alias'],
	localTypes: ['m2m'],
	group: 'relational',
	options: ({ relations }) => {
		return [
			{
				field: 'template',
				name: '$t:display_template',
				meta: {
					interface: 'system-display-template',
					options: {
						collectionName: relations.o2m?.collection,
					},
				},
			},
			{
				field: 'enableCreate',
				name: '$t:creating_items',
				schema: {
					default_value: true,
				},
				meta: {
					interface: 'boolean',
					options: {
						label: '$t:enable_create_button',
					},
					width: 'half',
				},
			},
			{
				field: 'enableSelect',
				name: '$t:selecting_items',
				schema: {
					default_value: true,
				},
				meta: {
					interface: 'boolean',
					options: {
						label: '$t:enable_select_button',
					},
					width: 'half',
				},
			},
			{
				field: 'filter',
				name: '$t:filter',
				type: 'json',
				meta: {
					interface: 'system-filter',
					options: {
						collectionName: relations.m2o?.related_collection ?? null,
					},
					conditions: [
						{
							rule: {
								enableSelect: {
									_eq: false,
								},
							},
							hidden: true,
						},
					],
				},
			},
			{
				field: 'widthx',
				name: 'Width',
				type: 'integer',
				meta: {
					width: 'half',
					interface: 'input',
				},
			},
			{
				field: 'height',
				name: 'Height',
				type: 'integer',
				meta: {
					width: 'half',
					interface: 'input',
				},
			},
			{
				field: 'driver',
				name: 'Driver',
				type: 'string',
				schema: {
					default_value: 'url_field',
				},
				meta: {
					width: 'half',
					interface: 'select-dropdown',
					options: {
						choices: [
							{
								value: 'url_field',
								text: 'URL Field',
							},
							{
								value: 'supabase',
								text: 'Supabase',
							},
						],
					},
				},
			},
		];
	},
	recommendedDisplays: ['related-values'],
	// preview: PreviewSVG,
});
