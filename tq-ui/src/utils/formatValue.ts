import {getDatetimeFormatter} from './common';

export function formatValue(value: string | number, type?: 'datetime') {
  let formattedValue;
  switch (type) {
    case 'datetime': {
      const date = new Date(value);
      if (date.getFullYear() === 1) {
        formattedValue = '−';
      } else {
        formattedValue = getDatetimeFormatter().format(date);
      }
      break;
    }
    default: {
      formattedValue = value;
    }
  }
  return formattedValue;
}
