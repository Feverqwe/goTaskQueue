let datetimeFormatter: Intl.DateTimeFormat | undefined;
export function getDatetimeFormatter() {
  if (!datetimeFormatter) {
    datetimeFormatter = new Intl.DateTimeFormat(window.navigator.language, {
      dateStyle: 'short',
      timeStyle: 'medium',
    });
  }
  return datetimeFormatter;
}

export function isAbortError(err: unknown) {
  return (err as Error).name === 'AbortError';
}

export function isIOS() {
  return (
    ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(
      navigator.platform,
    ) ||
    // iPad on iOS 13 detection
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
  );
}
