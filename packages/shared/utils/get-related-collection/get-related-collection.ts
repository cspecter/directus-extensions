import { Relation } from '@directus/shared/types';
import { getLocalTypeForField } from '../get-local-type';

export interface RelatedCollectionData {
	relatedCollection: string;
	junctionCollection?: string;
	path?: string[];
}

export default function getRelatedCollection(collection: string, field: string, fieldsStore: any, relationsStore: any): RelatedCollectionData {
	const relations: Relation[] = relationsStore.getRelationsForField(collection, field);
	const localType = getLocalTypeForField(collection, field, fieldsStore, relationsStore);

	const o2mTypes = ['o2m', 'm2m', 'm2a', 'translations', 'files'];
	if (localType && o2mTypes.includes(localType)) {
		if (localType == 'm2m' && relations.length > 1) {
			return {
				// @ts-ignore
				relatedCollection: relations[1].related_collection!,
				// @ts-ignore
				junctionCollection: relations[0].collection,
				// @ts-ignore
				path: [relations[1].field],
			};
		}
		// @ts-ignore
		return { relatedCollection: relations[0].collection };
	}
	// @ts-ignore
	return { relatedCollection: relations[0].related_collection! };
}
