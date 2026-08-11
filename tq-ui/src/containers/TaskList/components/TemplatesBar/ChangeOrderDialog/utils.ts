import {RawTemplate} from '../../../../../components/types';

export const getOrderedTemplatePlaces = (
  templates: RawTemplate[],
  templateOrder: string[],
): string[] => {
  const order = new Map(templateOrder.map((place, index) => [place, index]));
  return templates
    .map(({place}, index) => ({place, index}))
    .sort((a, b) => {
      const aPosition = order.get(a.place) ?? templateOrder.length + a.index;
      const bPosition = order.get(b.place) ?? templateOrder.length + b.index;
      return aPosition - bPosition;
    })
    .map(({place}) => place);
};
