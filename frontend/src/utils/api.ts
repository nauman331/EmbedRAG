let currentAccessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
    currentAccessToken = token;
};

export const getAccessToken = () => currentAccessToken;

export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${currentAccessToken}`,
        'Content-Type': 'application/json'
    };

    let response = await fetch(url, { ...options, headers });

    if (response.status === 403) {
        console.log('🔄 Access token expired. Attempting silent refresh...');

        try {
            const refreshRes = await fetch('http://localhost:5000/api/auth/refresh', {
                method: 'POST',
                credentials: 'include'
            });

            if (!refreshRes.ok) {
                throw new Error('Session expired or revoked.');
            }

            const data = await refreshRes.json();

            setAccessToken(data.accessToken);
            const newHeaders = {
                ...options.headers,
                'Authorization': `Bearer ${data.accessToken}`,
                'Content-Type': 'application/json'
            };

            response = await fetch(url, { ...options, headers: newHeaders });

        } catch (error) {
            console.error('🚨 Silent refresh failed. User must log in again.');
            setAccessToken(null);
            window.dispatchEvent(new Event('auth_expired'));
            throw error;
        }
    }

    return response;
};