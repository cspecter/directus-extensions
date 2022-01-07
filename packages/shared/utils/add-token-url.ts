import { addQueryToPath } from './add-query-to-path'

export function getToken(api: any): string | null {
    return api.defaults.headers.common['Authorization']?.split(' ')[1] || null;
}

export function addTokenToURL(api: any, url: string, token?: string): string {
    const accessToken = token || getToken(api);
    if (!accessToken) return url;

    return addQueryToPath(url, { access_token: accessToken });
}