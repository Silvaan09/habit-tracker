import { router } from 'expo-router';

export const TODAY_TAB_RESELECT_EVENT = 'habit-tracker:today-tab-reselect';

export function safeBack(fallback: Parameters<typeof router.replace>[0] = '/') {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}
