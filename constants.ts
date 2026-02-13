
import { UnitKey, FormDataState } from './types';

export const UNITS: UnitKey[] = [
  'KNITTING DISPATCH CIRCULAR',
  'CROCHET',
  'DAMAN ELASTIC',
  'DIGITAL PRINTING FABRIC',
  'DIGITAL PRINTING UNIT',
  'EMBROIDERY',
  'EYE HOOK UNIT',
  'HEKTOR',
  'MOLDING',
  'SACHIN KNITTING',
  'SUNSILK',
  'TAPE DYEING',
  'TORCHAN LACE',
  'UDHNA',
  'VALUE ADDITION',
  'WARP WEFT FABRICS'
];

export const INITIAL_UNIT_DATA = { orderValue: 0, dispatchValue: 0 };

export const INITIAL_FORM_STATE: FormDataState = UNITS.reduce((acc, unit) => {
  acc[unit] = { ...INITIAL_UNIT_DATA };
  return acc;
}, {} as FormDataState);

export const GOOGLE_SHEET_ID = "1j7zhkwKZYAufxkwsEUBHnauqMowQ_IPaQT5sVYFpT2w";
