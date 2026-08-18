import { useCallback } from 'react';
import { API_URL, fetchWithAuth } from '../utils/api';

/**
 * Hook for making regular (unauthenticated) API calls.
 * Automatically prefixes the endpoint with the configured API_URL.
 */
export const useApi = () => {
    const fetchApi = useCallback(async (endpoint: string, options: RequestInit = {}) => {
        const baseUrl = (API_URL || '').replace(/\/$/, '');
        const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        return fetch(`${baseUrl}${path}`, options);
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
        const baseUrl = (API_URL || '').replace(/\/$/, '');
        const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        return fetchWithAuth(`${baseUrl}${path}`, options);
    }, []);

    return fetchAuthApi;
};
