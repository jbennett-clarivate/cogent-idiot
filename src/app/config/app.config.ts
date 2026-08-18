export interface AppConfig {
	apiServerUrl: string;
}

export const APP_CONFIG: AppConfig = {
	apiServerUrl: "",
};

export function useMockBackend(): boolean {
	return !APP_CONFIG.apiServerUrl;
}