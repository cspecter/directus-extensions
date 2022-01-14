import emitter, { Events } from '../events';
import { notify } from '../notify';
import { unexpectedError } from '../unexpected-error';
// import pino from "pino";


// const logger = pino();
export default async function uploadSupabaseFile(
	api: any,
	useNotificationsStore: any,
	files: File[],
	folder: string,
	options?: {
		onProgressChange?: (percentage: number) => void;
		notifications?: boolean;
		preset?: Record<string, any>;
		fileId?: string;
	}
): Promise<any> {
	const progressHandler = options?.onProgressChange || (() => undefined);
	const formData = new FormData();

	if (options?.preset) {
		for (const [key, value] of Object.entries(options.preset)) {
			formData.append(key, value);
		}
	}

	formData.append('folder', folder);

	files.forEach((file, index) => {
		formData.append(`file${index}`, file);
	})

	try {
		let response = await api.post(`/supabase/upload`, formData, {
			onUploadProgress,
		});;

		if (options?.notifications) {
			notify({
				title: "Upload success!",
				type: 'success',
			}, useNotificationsStore);
		}

		emitter.emit(Events.upload);

		return response.data;
	} catch (err: any) {
		unexpectedError(err, useNotificationsStore, api);
	}

	function onUploadProgress(progressEvent: { loaded: number; total: number }) {
		const percentCompleted = Math.floor((progressEvent.loaded * 100) / progressEvent.total);
		progressHandler(percentCompleted);
	}
}
