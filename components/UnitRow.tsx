
import React from 'react';
import { UnitKey, UnitData } from '../types';

interface UnitRowProps {
  unit: UnitKey;
  data: UnitData;
  onChange: (unit: UnitKey, field: keyof UnitData, value: number) => void;
}

export const UnitRow: React.FC<UnitRowProps> = ({ unit, data, onChange }) => {
  return (
    <tr className="group hover:bg-slate-50/50 transition-colors">
      <td className="py-4 md:py-6 px-3 md:px-10">
        <div className="flex items-center gap-2 md:gap-4">
          <div className="w-6 h-6 md:w-8 md:h-8 rounded-md md:rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-[8px] md:text-[10px] font-black group-hover:bg-[#E11D48] group-hover:text-white transition-colors">
            {unit[0]}
          </div>
          <span className="font-black text-slate-800 text-[10px] md:text-base tracking-tight">{unit}</span>
        </div>
      </td>
      <td className="py-4 md:py-6 px-1 md:px-10">
        <div className="relative w-full max-w-[200px] mx-auto">
          <span className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-[10px] md:text-base">₹</span>
          <input
            type="number"
            inputMode="numeric"
            value={data.orderValue || ''}
            onChange={(e) => onChange(unit, 'orderValue', parseFloat(e.target.value) || 0)}
            className="w-full pl-6 md:pl-10 pr-2 md:pr-4 py-2 md:py-3 bg-slate-50 border border-slate-200 rounded-lg md:rounded-xl font-bold text-slate-700 text-[11px] md:text-base focus:ring-2 md:focus:ring-4 focus:ring-slate-100 focus:bg-white outline-none transition-all text-right"
            placeholder="0"
          />
        </div>
      </td>
      <td className="py-4 md:py-6 px-1 md:px-10">
        <div className="relative w-full max-w-[200px] mx-auto">
          <span className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-[10px] md:text-base">₹</span>
          <input
            type="number"
            inputMode="numeric"
            value={data.dispatchValue || ''}
            onChange={(e) => onChange(unit, 'dispatchValue', parseFloat(e.target.value) || 0)}
            className="w-full pl-6 md:pl-10 pr-2 md:pr-4 py-2 md:py-3 bg-slate-50 border border-slate-200 rounded-lg md:rounded-xl font-bold text-[#E11D48] text-[11px] md:text-base focus:ring-2 md:focus:ring-4 focus:ring-rose-50 focus:bg-white outline-none transition-all text-right"
            placeholder="0"
          />
        </div>
      </td>
    </tr>
  );
};
