export type LayoutOptions = {
	widths?: {
		[field: string]: number;
	};
	limit?: number;
	spacing?: 'comfortable' | 'cozy' | 'compact';
};

export type LayoutQuery = {
	fields: string[];
	sort: string[];
	page: number;
	limit: number;
};

export type FileType = {
	id: string
	src: string
	mime: string
	width: number
	title: string
}