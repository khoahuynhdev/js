import ChronoNode from 'chrono-node';
import _compact from 'lodash/compact';

import dayjs from 'dayjs';

import './initializers/dayjs';
import './initializers/chrono-node';

import options from './options';
import isValidDate from './helpers/isValidDate';
import { OUTPUT_TYPES, DATE_RANGE_PATTERNS } from './constants';
import Errors, { InputError } from './errors';

const chrono = new ChronoNode.Chrono(options);

const splitInputStr = (str) => {
  let parts = [str];
  let isRangeEndInclusive = true;
  let rangeSeparator;
  let matches;

  if (str.match(DATE_RANGE_PATTERNS.rangeEndInclusive)) {
    matches = str.match(DATE_RANGE_PATTERNS.rangeEndInclusive);
    isRangeEndInclusive = true;
  } else if (str.match(DATE_RANGE_PATTERNS.rangeEndExclusive)) {
    matches = str.match(DATE_RANGE_PATTERNS.rangeEndExclusive);
    isRangeEndInclusive = false;
  }

  if (matches) {
    rangeSeparator = matches[2];
    parts = [matches[1], matches[3]];
  }

  return {
    isRange: !!rangeSeparator,
    parts,
    rangeSeparator,
    isRangeEndInclusive,
  };
};

/**
 * Parse the given date string into Chrono.ParsedResult
 * @param {String} str The date string to parse
 * @param {String|Date} ref Reference date
 * @param {Object} options
 * @param {Number} options.timezoneOffset Timezone offset in minutes
 * @param {OUTPUT_TYPES} options.output Type of the output dates
 * @return {ChronoNode.ParsedResult|Array}
 */
export const parse = (str, ref, { timezoneOffset = 0, output = OUTPUT_TYPES.parsed_component } = {}) => {
  const refDate = new Date(ref);
  if (!isValidDate(refDate)) throw new InputError(`Invalid reference date: ${ref}`);

  /* eslint-disable-next-line no-param-reassign */
  timezoneOffset = parseInt(timezoneOffset);
  if (Number.isNaN(timezoneOffset)) throw new InputError(`Invalid timezoneOffset: ${timezoneOffset}`);

  // Adjust refDate by timezoneOffset
  let refMoment = dayjs.utc(refDate);
  refMoment = refMoment.add(timezoneOffset, 'minute');
  const refDateAdjustedByTz = refMoment.toDate();

  const splittedInput = splitInputStr(str);
  const { parts, rangeSeparator } = splittedInput;
  let { isRange, isRangeEndInclusive } = splittedInput;

  const parsedResults = _compact(parts.map(part => chrono.parse(part, refDateAdjustedByTz, { timezoneOffset })[0]));

  if (output === OUTPUT_TYPES.raw) return parsedResults;

  const first = parsedResults[0];
  if (!first) return null;

  if (parsedResults.length === 1) {
    isRange = false;
    isRangeEndInclusive = true;
  }

  const last = parsedResults[parsedResults.length - 1];

  const result = new ChronoNode.ParsedResult({
    ref: refDate,
    index: first.index,
    tags: { ...first.tags, ...last.tags },
    text: isRange ? `${first.text} ${rangeSeparator} ${last.text}` : first.text,
  });
  result.start = first.start.clone();
  result.end = isRangeEndInclusive ? last.end.clone() : last.start.clone();

  if (output === OUTPUT_TYPES.date) {
    result.start = result.start.moment().format('YYYY-MM-DD');
    result.end = result.end.moment().format('YYYY-MM-DD');
  } else if (output === OUTPUT_TYPES.timestamp) {
    result.start = result.start.date().toISOString();
    result.end = result.end.date().toISOString();
  }

  return result;
};

export { OUTPUT_TYPES } from './constants';
export { default as Errors } from './errors';

export default {
  parse,
  OUTPUT_TYPES,
  Errors,
};
