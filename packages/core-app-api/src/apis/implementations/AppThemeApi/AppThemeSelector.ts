// Ported from Backstage's @backstage/core-app-api AppThemeSelector (Apache-2.0),
// trimmed to Octopus' observable utilities. Pure logic: it tracks the installed
// themes and the active theme id, leaving theme rendering to the UI layer.
import { AppThemeApi, AppTheme } from '@octopus/core-plugin-api';
import { Observable } from '@octopus/types';
import { BehaviorSubject } from '../../../lib';

const STORAGE_KEY = 'theme';

/**
 * Exposes the themes installed in the app and permits switching the currently
 * active theme. An active id of `undefined` means "no explicit selection" —
 * the UI is free to fall back to the OS preference.
 */
export class AppThemeSelector implements AppThemeApi {
  static create(themes: AppTheme[]) {
    return new AppThemeSelector(themes);
  }

  static createWithStorage(themes: AppTheme[]) {
    const selector = new AppThemeSelector(themes);

    if (!window.localStorage) {
      return selector;
    }

    const initialThemeId = window.localStorage.getItem(STORAGE_KEY) ?? undefined;
    selector.setActiveThemeId(initialThemeId);

    const subscription = selector.activeThemeId$().subscribe(themeId => {
      if (themeId) {
        window.localStorage.setItem(STORAGE_KEY, themeId);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    });

    const storageListener = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        selector.setActiveThemeId(
          window.localStorage.getItem(STORAGE_KEY) ?? undefined,
        );
      }
    };
    window.addEventListener('storage', storageListener);

    selector.#storageSubscription = subscription;
    selector.#storageListener = storageListener;

    return selector;
  }

  #activeThemeId: string | undefined;
  readonly #subject = new BehaviorSubject<string | undefined>(undefined);

  #storageSubscription?: { unsubscribe(): void };
  #storageListener?: (event: StorageEvent) => void;

  private constructor(private readonly themes: AppTheme[]) {}

  getInstalledThemes(): AppTheme[] {
    return this.themes.slice();
  }

  activeThemeId$(): Observable<string | undefined> {
    return this.#subject;
  }

  getActiveThemeId(): string | undefined {
    return this.#activeThemeId;
  }

  setActiveThemeId(themeId?: string): void {
    this.#activeThemeId = themeId;
    this.#subject.next(themeId);
  }

  /** Detaches the localStorage subscription/listener from createWithStorage(). */
  dispose(): void {
    if (this.#storageSubscription) {
      this.#storageSubscription.unsubscribe();
      this.#storageSubscription = undefined;
    }
    if (this.#storageListener) {
      window.removeEventListener('storage', this.#storageListener);
      this.#storageListener = undefined;
    }
  }
}
