import { defineInterface } from '@directus/shared/utils';
import InterfaceFileImage from './cloudinary-interface.vue';

export default defineInterface({
	id: 'cloudinary-upload',
	name: 'Cloudinary Upload',
	description: 'Interface to receive images and send to Cloudinary!',
	icon: 'box',
	component: InterfaceFileImage,
	types: ['string'],
	group: 'standard',
	relational: true,
	options: [
		{
			field: 'width',
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
	],
	recommendedDisplays: ['image'],
});
