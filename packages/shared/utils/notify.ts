let store: any;

export interface SnackbarRaw {
	id?: string;
	persist?: boolean;
	title: string;
	text?: string;
	type?: 'info' | 'success' | 'warning' | 'error';
	icon?: string | null;
	closeable?: boolean;
	progress?: number;
	loading?: boolean;
	dialog?: boolean;
	error?: Error;
}

export interface Snackbar extends SnackbarRaw {
	readonly id: string;
	readonly timestamp: number;
}

export function notify(notification: SnackbarRaw, useNotificationsStore: any): void {
	if (!store) store = useNotificationsStore();
	store.add(notification);
}
