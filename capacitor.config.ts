import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.teamlog.app',
  appName: 'TeamLog',
  webDir: 'dist',
  server: {
    url: 'https://teamlog-ko.vercel.app', 
    cleartext: true
  }
};

export default config;
