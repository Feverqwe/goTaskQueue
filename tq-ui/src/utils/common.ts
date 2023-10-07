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
