export interface ElectronUpdateInfo {
  success: boolean;
  hasUpdate: boolean;
  currentVersion: string;
  currentBuildDate?: string;
  newVersion?: string;
  newBuildDate?: string;
  releaseNotes?: string;
  bundleUrl?: string;
  bundleHash?: string;
  bundleSize?: number;
  offline?: boolean;
  error?: string;
}

export interface ElectronUpdateProgress {
  percent: number;
  downloadedMB?: string;
  totalMB?: string;
  message?: string;
}

export interface ElectronVersionInfo {
  version: string;
  versionCode?: number;
  buildDate?: string;
  releaseNotes?: string;
  source: string;
  isLive: boolean;
}

export interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  getVersionInfo: () => Promise<ElectronVersionInfo>;
  checkForUpdates: () => Promise<ElectronUpdateInfo>;
  downloadAndInstallUpdate: (updateInfo: ElectronUpdateInfo) => Promise<{ success: boolean; version: string }>;
  restartAndApplyUpdate: () => Promise<void>;
  onUpdateAvailable: (callback: (info: ElectronUpdateInfo) => void) => () => void;
  onUpdateProgress: (callback: (progress: ElectronUpdateProgress) => void) => () => void;
  onUpdateReady: (callback: (info: any) => void) => () => void;
  openExternal: (url: string) => void;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  showDesktopNotification: (title: string, body: string) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    __TRIGGER_SYNC__?: () => void;
    __REFRESH_DATA__?: () => void;
  }
}
