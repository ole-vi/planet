import styleVars from '../_variables.scss';

// Highly unlikely random numbers will not be unique for practical amount of course steps
export const uniqueId = () => '_' + Math.random().toString(36).substr(2, 9);

export const dedupeShelfReduce = (ids, id) => {
    if (ids.indexOf(id) > -1) {
      return ids;
    }
    return ids.concat(id);
  };

export const removeFromArray = (startArray = [], removeArray = []) => {
  return startArray.filter(item => removeArray.indexOf(item) === -1);
};

export const addToArray = (startArray = [], addArray = []) => {
  return startArray.concat(addArray).reduce(dedupeShelfReduce, []);
};

export const findByIdInArray = (array = [], id: string) => array.find(item => item._id === id);

export const styleVariables: any = (() => {
  console.log(styleVars.match(/:export \{([\s\S]*)\}/)[1]);
  const varArray = styleVars.match(/:export \{([\s\S]*)\}/)[1].split(';').filter((val: string) => val.trim());
  return varArray.reduce((styleObj, variable) => {
    const [ prop, value ] = variable.split(': ');
    return { ...styleObj, [prop.trim()]: value };
  }, {});
})();

export const filterById = (array = [], id: string) => array.filter(item => item._id !== id);

export const arraySubField = (array: any[], field: string) => array.map(item => item[field]);

export const itemsShown = (paginator: any) => Math.min(paginator.length - (paginator.pageIndex * paginator.pageSize), paginator.pageSize);

export const isInMap = (tag: string, map: Map<string, boolean>) => map.get(tag);

export const mapToArray = (map: Map<string, boolean>, equalValue?) => {
  const iterable = map.entries();
  const keyToArray = ({ value, done }, array: string[]) => {
    if (done) {
      return array;
    }
    const [ key, val ] = value;
    return keyToArray(iterable.next(), !equalValue || val === equalValue ? [ ...array, key ] : array);
  };
  return keyToArray(iterable.next(), []);
};

export const twoDigitNumber = (number: number) => `${number.toString().length < 2 ? '0' : ''}${number.toString()}`;

export const addDateAndTime = (date, time) => new Date(date + (Date.parse('1970-01-01T' + time + 'Z') || 0));

export const getClockTime = (time: Date) => `${twoDigitNumber(time.getHours())}:${twoDigitNumber(time.getMinutes())}`;

export const parseToObject = (url: string) => {
  const frags = url.split(';');
  const obj = {};
  if (frags.length > 1) {
    const props = [];
    const value = [];
    for (i = 1; i < frags.length; i++) {
      const split = frags[i].split('=');
      obj[split[0]] = split[1];
    }
  }
  return obj;
};
