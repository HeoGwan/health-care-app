/**
 * Web builds do not expose Android runtime permissions. Browser permissions
 * are requested by their respective Web APIs when a feature is used.
 */
export class PermissionManager {
  static async requestActivityRecognitionPermission(): Promise<boolean> {
    return true;
  }

  static async checkActivityRecognitionPermission(): Promise<boolean> {
    return true;
  }

  static showPermissionDeniedAlert(): void {
    // No Android settings screen exists in the browser build.
  }
}
