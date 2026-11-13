import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yo.app',
  appName: 'Yo!!!',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
