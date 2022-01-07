import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

let store: any;

type APIError = {
	message: string;
	extensions: {
		code: string;
		[key: string]: any;
	};
};

interface RequestConfig extends AxiosRequestConfig {
	id: string;
}

interface Response extends AxiosResponse {
	config: RequestConfig;
}

interface RequestError extends AxiosError {
	response: Response;
}

export function unexpectedError(error: Error | RequestError | APIError, useNotificationsStore: any, api: any): void {
	if (!store) store = useNotificationsStore();

	const code =
		(error as RequestError).response?.data?.errors?.[0]?.extensions?.code ||
		(error as APIError)?.extensions?.code ||
		'UNKNOWN';

	const message = (error as RequestError).response?.data?.errors?.[0]?.message || error.message || undefined;

	// eslint-disable-next-line no-console
	console.warn(error);

	store.add({
		title: `errors.${code}`,
		text: message,
		type: 'error',
		dialog: true,
		error,
	});
}
