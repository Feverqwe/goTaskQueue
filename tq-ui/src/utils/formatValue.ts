import {getDatetimeFormatter} from './common';

export function formatValue(value: string | number, type?: 'datetime') {
  let formattedValue;
  switch (type) {
    case 'datetime': {
      formattedValue = getDatetimeFormatter().format(new Date(value));
      break;
    }
    default: {
      formattedValue = value;
    }
  }
  return formattedValue;
}
