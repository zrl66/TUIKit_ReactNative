import { NativeModules, Platform } from 'react-native';

interface ForegroundServiceModuleInterface {
    startForegroundService(title?: string, description?: string): Promise<boolean>;
    stopForegroundService(): Promise<boolean>;
}

const { ForegroundServiceModule } = NativeModules;
const foregroundServiceModule = ForegroundServiceModule as ForegroundServiceModuleInterface | undefined;

export async function startForegroundService(title?: string, description?: string): Promise<boolean> {
    if (Platform.OS === 'ios') {
        return true;
    }

    if (!foregroundServiceModule) {
        console.warn('[ForegroundServiceTS] ForegroundServiceModule not available');
        return false;
    }

    return await foregroundServiceModule.startForegroundService(title, description);
}

export async function stopForegroundService(): Promise<boolean> {
    if (Platform.OS === 'ios') {
        return true;
    }

    if (!foregroundServiceModule) {
        console.warn('[ForegroundServiceTS] ForegroundServiceModule not available');
        return true;
    }

    return await foregroundServiceModule.stopForegroundService();
}
