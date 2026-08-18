import { useCallback } from 'react';
import { API_URL, fetchWithAuth } from '../utils/api';

/**
 * Hook for making regular (unauthenticated) API calls.
 * Automatically prefixes the endpoint with the configured API_URL.
 */
export const useApi = () => {
    const fetchApi = useCallback(async (endpoint: string, options: RequestInit = {}) => {
        // Ensure endpoint starts with a slash if not provided
        const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        return fetch(`${API_URL}${path}`, options);
    }, []);

    return fetchApi;
};

/**
 * Hook for making authenticated API calls.
 * Automatically prefixes the endpoint with the configured API_URL and attaches the JWT token.
 * Handles automatic token refreshing if the access token is expired.
 */
export const useAuthApi = () => {
    const fetchAuthApi = useCallback(async (endpoint: string, options: RequestInit = {}) => {
        // Ensure endpoint starts with a slash if not provided
        const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        return fetchWithAuth(`${API_URL}${path}`, options);
    }, []);

    return fetchAuthApi;
};
