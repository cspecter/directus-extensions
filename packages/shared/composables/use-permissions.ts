import { Field } from '@directus/shared/types';
import { computed, ComputedRef, Ref } from 'vue';
import { cloneDeep } from 'lodash';
import { isAllowed } from '../utils/is-allowed';
import { useCollection } from '@directus/shared/composables';

type UsablePermissions = {
	deleteAllowed: ComputedRef<boolean>;
	saveAllowed: ComputedRef<boolean>;
	archiveAllowed: ComputedRef<boolean>;
	updateAllowed: ComputedRef<boolean>;
	fields: ComputedRef<Field[]>;
	revisionsAllowed: ComputedRef<boolean>;
};

export function usePermissions(collection: Ref<string>, item: Ref<any>, isNew: Ref<boolean>, userStore: any, permissionsStore: any): UsablePermissions {
	const { info: collectionInfo, fields: rawFields } = useCollection(collection);

	const deleteAllowed = computed(() => isAllowed(collection.value, 'delete', item.value, false, userStore, permissionsStore));

	const saveAllowed = computed(() => {
		if (isNew.value) {
			return true;
		}

		return isAllowed(collection.value, 'update', item.value, false, userStore, permissionsStore);
	});

	const updateAllowed = computed(() => isAllowed(collection.value, 'update', item.value, false, userStore, permissionsStore));

	const archiveAllowed = computed(() => {
		if (!collectionInfo.value?.meta?.archive_field) return false;

		return isAllowed(
			collection.value,
			'update',
			{
				[collectionInfo.value.meta.archive_field]: collectionInfo.value.meta.archive_value,
			},
			true, userStore, permissionsStore
		);
	});

	const fields = computed(() => {
		let fields = cloneDeep(rawFields.value);

		if (userStore.currentUser?.role?.admin_access === true) return fields;

		const permissions = permissionsStore.getPermissionsForUser(collection.value, isNew.value ? 'create' : 'update');

		if (!permissions) return fields;

		if (permissions.fields?.includes('*') === false) {
			fields = fields.map((field: Field) => {
				if (permissions.fields?.includes(field.field) === false) {
					field.meta = {
						...(field.meta || {}),
						readonly: true,
					} as any;
				}

				return field;
			});
		}

		if (permissions.presets) {
			fields = fields.map((field: Field) => {
				if (field.field in permissions.presets!) {
					field.schema = {
						...(field.schema || {}),
						default_value: permissions.presets![field.field],
					} as any;
				}

				return field;
			});
		}

		return fields;
	});

	const revisionsAllowed = computed(() => {
		if (userStore.currentUser?.role?.admin_access === true) return true;
		return !!permissionsStore.permissions.find(
			// @ts-ignore
			(permission) => permission.collection === 'directus_revisions' && permission.action === 'read'
		);
	});

	return { deleteAllowed, saveAllowed, archiveAllowed, updateAllowed, fields, revisionsAllowed };
}
