let rawApiUrl = import.meta.env.VITE_API_URL || '';
if (rawApiUrl && !rawApiUrl.startsWith('http')) {
    rawApiUrl = `https://${rawApiUrl}`;
}
export const API_URL = rawApiUrl;

let currentAccessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
    currentAccessToken = token;
};

export const getAccessToken = () => currentAccessToken;

let refreshPromise: Promise<string> | null = null;

export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const makeHeaders = (token: string | null) => {
        const headers: Record<string, string> = {
            'Authorization': `Bearer ${token}`,
            ...options.headers as Record<string, string>
        };

        // Do not force application/json for FormData, as the browser must set the boundary automatically
        if (!(options.body instanceof FormData) && !headers['Content-Type'] && !headers['content-type']) {
            headers['Content-Type'] = 'application/json';
        }

        return headers;
    };

    let response = await fetch(url, { ...options, headers: makeHeaders(currentAccessToken) });

    if (response.status === 401 || response.status === 403) {
        if (!refreshPromise) {
            refreshPromise = fetch(`${API_URL}/api/auth/refresh`, {
                method: 'POST',
                credentials: 'include'
            }).then(async (refreshRes) => {
                if (!refreshRes.ok) {
                    throw new Error('Session expired or revoked.');
                }
                const data = await refreshRes.json();
                setAccessToken(data.accessToken);
                return data.accessToken;
            }).catch((error) => {
                setAccessToken(null);
                window.dispatchEvent(new Event('auth_expired'));
                throw error;
            }).finally(() => {
                refreshPromise = null;
            });
        }

        try {
            const newToken = await refreshPromise;
            response = await fetch(url, { ...options, headers: makeHeaders(newToken) });
        } catch (error) {
            // Already handled by the promise catch, just let it bubble or ignore
        }
    }

    return response;
};
