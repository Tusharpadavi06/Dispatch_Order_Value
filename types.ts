
export type UnitKey = 
  | 'KNITTING DISPATCH CIRCULAR'
  | 'CROCHET'
  | 'DAMAN ELASTIC'
  | 'DIGITAL PRINTING FABRIC'
  | 'DIGITAL PRINTING UNIT'
  | 'EMBROIDERY'
  | 'EYE HOOK UNIT'
  | 'HEKTOR'
  | 'MOLDING'
  | 'SACHIN KNITTING'
  | 'SUNSILK'
  | 'TAPE DYEING'
  | 'TORCHAN LACE'
  | 'UDHNA'
  | 'VALUE ADDITION'
  | 'WARP WEFT FABRICS';

export interface UnitData {
  orderValue: number;
  dispatchValue: number;
}

export type FormDataState = Record<UnitKey, UnitData>;

export interface SubmissionPayload {
  id: string; 
  date: string;
  units: FormDataState;
  totalOrder: number;
  totalDispatch: number;
}

export type TimeFilter = 'day' | 'month' | 'year' | 'all';

export interface DashboardFilters {
  unit: UnitKey | 'ALL';
  range: TimeFilter;
  selectedDate?: string;
  selectedMonth?: number;
  selectedYear?: number;
}

export interface GeminiAuditResponse {
  summary: string;
  insights: string[];
  status: 'normal' | 'warning' | 'excellent';
}
