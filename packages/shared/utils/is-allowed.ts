import { Permission } from '@directus/shared/types';
import generateJoi from './generate-joi';

export function isAllowed(
	collection: string,
	action: Permission['action'],
	value: Record<string, any> | null,
	strict = false,
	userStore: any,
	permissionsStore: any
): boolean {

	if (userStore.isAdmin === true) return true;

	const permissions = permissionsStore.permissions;

	const permissionInfo = permissions.find(
		// @ts-ignore
		(permission) => permission.action === action && permission.collection === collection
	);

	if (!permissionInfo) return false;
	if (!permissionInfo.fields) return false;

	if (strict && permissionInfo.fields.includes('*') === false && value) {
		const allowedFields = permissionInfo.fields;
		const attemptedFields = Object.keys(value);

		if (attemptedFields.every((field) => allowedFields.includes(field)) === false) return false;
	}

	const schema = generateJoi(permissionInfo.permissions, {
		allowUnknown: true,
	});

	const { error } = schema.validate(value);

	if (!error) {
		return true;
	}

	return false;
}
