/*
 * A sidebar nav label localized via the plugin's own translation ref. Passed to
 * PageBlueprint's `navLabel`, it renders inside the host's app tree (React and
 * core-plugin-api are shared singletons), so `useTranslationRef` resolves the
 * host's translationApi and the label re-renders when the language changes.
 */
import { useTranslationRef } from '@octopus/core-plugin-api';
import { remoteDemoTranslationRef } from './translation';

type MessageKey = 'nav_remote_demo' | 'issues_list' | 'test_plans';

export function NavLabel({ messageKey }: { messageKey: MessageKey }) {
  const { t } = useTranslationRef(remoteDemoTranslationRef);
  return <>{t(messageKey)}</>;
}
