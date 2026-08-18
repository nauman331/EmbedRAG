const API_URL = import.meta.env.VITE_API_URL;

let currentAccessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
    currentAccessToken = token;
};

export const getAccessToken = () => currentAccessToken;

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

    if (response.status === 403) {
        console.log('🔄 Access token expired. Attempting silent refresh...');

        try {
            const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
                method: 'POST',
                credentials: 'include'
            });

            if (!refreshRes.ok) {
                throw new Error('Session expired or revoked.');
            }

            const data = await refreshRes.json();
            setAccessToken(data.accessToken);

            response = await fetch(url, { ...options, headers: makeHeaders(data.accessToken) });

        } catch (error) {
            console.error('🚨 Silent refresh failed. User must log in again.');
            setAccessToken(null);
            window.dispatchEvent(new Event('auth_expired'));
            throw error;
        }
    }

    return response;
};

export { API_URL };