let activeBackHandler: (() => boolean) | null = null;

export function setHeaderBackHandler(handler: (() => boolean) | null) {
  activeBackHandler = handler;

  return () => {
    if (activeBackHandler === handler) {
      activeBackHandler = null;
    }
  };
}

export function handleGuardedHeaderBack() {
  return activeBackHandler?.() ?? false;
}
