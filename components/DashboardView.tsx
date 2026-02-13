
import React, { useState, useMemo } from 'react';
import { SubmissionPayload, DashboardFilters, UnitKey, TimeFilter, FormDataState } from '../types';
import { UNITS } from '../constants';

interface DashboardViewProps {
  data: SubmissionPayload[];
  onUpdate: (id: string, payload: SubmissionPayload) => void;
  onRefresh: () => void;
  isSyncing: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ data, onRefresh, isSyncing, onUpdate }) => {
  const [filters, setFilters] = useState<DashboardFilters>({ 
    unit: 'ALL', 
    range: 'all',
    selectedDate: '',
    selectedMonth: new Date().getMonth(),
    selectedYear: new Date().getFullYear()
  });

  const [editingRecord, setEditingRecord] = useState<SubmissionPayload | null>(null);

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    } catch {
      return dateString;
    }
  };

  const filteredData = useMemo(() => {
    let result = [...data];
    
    if (filters.range === 'day' && filters.selectedDate) {
      result = result.filter(item => item.date === filters.selectedDate);
    } else if (filters.range === 'month') {
      result = result.filter(item => {
        const d = new Date(item.date);
        return d.getMonth() === filters.selectedMonth && d.getFullYear() === filters.selectedYear;
      });
    } else if (filters.range === 'year') {
      result = result.filter(item => {
        const d = new Date(item.date);
        return d.getFullYear() === filters.selectedYear;
      });
    }

    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data, filters]);

  const stats = useMemo(() => {
    const totals = { order: 0, dispatch: 0 };
    const unitBreakdown = UNITS.reduce((acc, unit) => {
      acc[unit] = { order: 0, dispatch: 0 };
      return acc;
    }, {} as Record<UnitKey, { order: number; dispatch: number }>);

    filteredData.forEach(entry => {
      UNITS.forEach(u => {
        const order = (entry.units[u]?.orderValue || 0);
        const dispatch = (entry.units[u]?.dispatchValue || 0);
        unitBreakdown[u].order += order;
        unitBreakdown[u].dispatch += dispatch;
        
        totals.order += order;
        totals.dispatch += dispatch;
      });
    });
    return { totals, unitBreakdown };
  }, [filteredData]);

  const maxChartValue = useMemo(() => {
    const values = UNITS.flatMap(u => [stats.unitBreakdown[u].order, stats.unitBreakdown[u].dispatch]);
    return Math.max(...values, 1) * 1.1;
  }, [stats.unitBreakdown]);

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;
  
  const formatCompact = (val: number) => {
    if (val >= 10000000) return `${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `${(val / 100000).toFixed(2)} L`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)} K`;
    return val.toString();
  };

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const years = Array.from({length: 10}, (_, i) => new Date().getFullYear() - i);

  const handleEditChange = (unit: UnitKey, field: 'orderValue' | 'dispatchValue', value: number) => {
    if (!editingRecord) return;
    const newUnits = { ...editingRecord.units };
    newUnits[unit] = { ...newUnits[unit], [field]: value };

    const newTotals = UNITS.reduce((acc, u) => ({
      order: acc.order + (newUnits[u]?.orderValue || 0),
      dispatch: acc.dispatch + (newUnits[u]?.dispatchValue || 0)
    }), { order: 0, dispatch: 0 });

    setEditingRecord({
      ...editingRecord,
      units: newUnits,
      totalOrder: newTotals.order,
      totalDispatch: newTotals.dispatch
    });
  };

  const saveEdit = () => {
    if (editingRecord) {
      onUpdate(editingRecord.id, editingRecord);
      setEditingRecord(null);
    }
  };

  if (isSyncing && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40 bg-white rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-[#E11D48] rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accessing Centralized Cloud...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-10 pb-20 relative">
      {/* Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 animate-fade-in">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase">Edit Centralized Entry</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Record Date: {formatDate(editingRecord.date)}</p>
              </div>
              <button onClick={() => setEditingRecord(null)} className="w-10 h-10 rounded-full hover:bg-slate-200 flex items-center justify-center transition-all">
                <i className="fas fa-times text-slate-500"></i>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {UNITS.map(u => (
                  <div key={u} className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <p className="text-[9px] font-black text-slate-900 uppercase tracking-tight mb-3 truncate">{u}</p>
                    <div className="space-y-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-[10px] font-bold">₹</span>
                        <input 
                          type="number" 
                          value={editingRecord.units[u].orderValue || ''}
                          onChange={(e) => handleEditChange(u, 'orderValue', parseFloat(e.target.value) || 0)}
                          placeholder="Order"
                          className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold outline-none focus:ring-2 focus:ring-slate-100"
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-200 text-[10px] font-bold">₹</span>
                        <input 
                          type="number" 
                          value={editingRecord.units[u].dispatchValue || ''}
                          onChange={(e) => handleEditChange(u, 'dispatchValue', parseFloat(e.target.value) || 0)}
                          placeholder="Dispatch"
                          className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-[#E11D48] outline-none focus:ring-2 focus:ring-rose-50"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase">New Order Total</p>
                  <p className="text-xl font-black text-slate-900">{formatCurrency(editingRecord.totalOrder)}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase">New Dispatch Total</p>
                  <p className="text-xl font-black text-[#E11D48]">{formatCurrency(editingRecord.totalDispatch)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button onClick={() => setEditingRecord(null)} className="flex-1 md:flex-none px-8 py-3 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                <button onClick={saveEdit} className="flex-1 md:flex-none px-12 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#E11D48] transition-all shadow-lg">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Level Aggregate KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white p-6 md:p-8 rounded-[1.5rem] border border-slate-100 shadow-sm border-l-4 border-l-slate-900">
          <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Global Order Intake</p>
          <h4 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(stats.totals.order)}</h4>
        </div>
        <div className="bg-white p-6 md:p-8 rounded-[1.5rem] border border-slate-100 shadow-sm border-l-4 border-l-[#E11D48]">
          <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Global Dispatch Out</p>
          <h4 className="text-2xl md:text-4xl font-black text-[#E11D48] tracking-tighter">{formatCurrency(stats.totals.dispatch)}</h4>
        </div>
      </div>

      {/* Facility Wise Mini KPIs Grid */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest px-1">Unit Wise Operational Snapshots</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {UNITS.map(u => (
            <div key={u} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:border-slate-300 transition-all group">
              <p className="text-[8px] font-black text-slate-900 uppercase truncate mb-2 group-hover:text-[#E11D48] transition-colors" title={u}>{u}</p>
              <div className="space-y-1">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[7px] font-black text-slate-500 uppercase">ORD:</span>
                  <span className="text-[10px] font-black text-slate-900 whitespace-nowrap">₹{(stats.unitBreakdown[u].order).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center gap-2 border-t border-slate-50 pt-1">
                  <span className="text-[7px] font-black text-[#E11D48] uppercase">DISP:</span>
                  <span className="text-[10px] font-black text-[#E11D48] whitespace-nowrap">₹{(stats.unitBreakdown[u].dispatch).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Analytics Chart */}
      <div className="bg-white rounded-[1.5rem] md:rounded-[3rem] p-6 md:p-10 border border-slate-100 shadow-xl overflow-hidden">
        <h3 className="text-[10px] md:text-sm font-black text-slate-900 uppercase tracking-widest mb-8">Performance Comparison Chart</h3>
        <div className="h-[350px] md:h-[450px] overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
          <div className="flex items-end justify-between gap-1.5 md:gap-4 border-b border-slate-100 px-2 min-w-[1400px] h-[90%] pb-14">
            {UNITS.map(u => {
              const uData = stats.unitBreakdown[u];
              const orderH = (uData.order / maxChartValue) * 100;
              const dispatchH = (uData.dispatch / maxChartValue) * 100;
              
              return (
                <div key={u} className="flex-1 flex flex-col items-center h-full justify-end group min-w-[85px] relative">
                  {/* Bars Container */}
                  <div className="flex items-end gap-1.5 md:gap-3 w-full justify-center h-full pb-3 z-0">
                    {/* Order Bar */}
                    <div 
                      className="relative w-4 md:w-8 bg-slate-900 rounded-t-sm transition-all group-hover:brightness-110 shadow-sm flex justify-center items-start pt-2 overflow-visible" 
                      style={{ height: `${orderH}%` }}
                    >
                      <div className="rotate-[-90deg] origin-center absolute top-[-10px]">
                        <span className="text-blue-600 font-black text-[8px] md:text-[10px] whitespace-nowrap bg-white/80 px-1 rounded shadow-sm">
                          {formatCompact(uData.order)}
                        </span>
                      </div>
                    </div>

                    {/* Dispatch Bar */}
                    <div 
                      className="relative w-4 md:w-8 bg-[#E11D48] rounded-t-sm transition-all group-hover:brightness-110 shadow-sm flex justify-center items-start pt-2 overflow-visible" 
                      style={{ height: `${dispatchH}%` }}
                    >
                      <div className="rotate-[-90deg] origin-center absolute top-[-10px]">
                        <span className="text-blue-600 font-black text-[8px] md:text-[10px] whitespace-nowrap bg-white/80 px-1 rounded shadow-sm">
                          {formatCompact(uData.dispatch)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Vertical Facility Name Label */}
                  <div className="absolute inset-x-0 bottom-[-50px] flex justify-center pointer-events-none z-10">
                    <div className="rotate-[-90deg] origin-center transform translate-y-[10px]">
                      <span className="text-slate-700 font-black text-[7px] md:text-[9px] uppercase tracking-tight whitespace-nowrap px-1 py-0.5">
                        {u}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Operational History Table Section */}
      <div className="space-y-4">
        {/* Filter Mode */}
        <div className="bg-white p-4 md:p-6 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Filter Mode</label>
            <select 
              value={filters.range} 
              onChange={e => setFilters(f => ({...f, range: e.target.value as TimeFilter}))}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-[11px] font-bold text-slate-700 outline-none hover:border-slate-400 transition-colors"
            >
              <option value="all">Full History</option>
              <option value="day">By Date</option>
              <option value="month">By Month</option>
              <option value="year">By Year</option>
            </select>
          </div>

          {filters.range === 'day' && (
            <div className="flex flex-col gap-2 animate-fade-in">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date Selection</label>
              <input 
                type="date" 
                value={filters.selectedDate} 
                onChange={e => setFilters(f => ({...f, selectedDate: e.target.value}))}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-[11px] font-bold text-slate-700 outline-none"
              />
            </div>
          )}

          {filters.range === 'month' && (
            <>
              <div className="flex flex-col gap-2 animate-fade-in">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Select Month</label>
                <select 
                  value={filters.selectedMonth} 
                  onChange={e => setFilters(f => ({...f, selectedMonth: parseInt(e.target.value)}))}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-[11px] font-bold text-slate-700 outline-none"
                >
                  {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2 animate-fade-in">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Select Year</label>
                <select 
                  value={filters.selectedYear} 
                  onChange={e => setFilters(f => ({...f, selectedYear: parseInt(e.target.value)}))}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-[11px] font-bold text-slate-700 outline-none"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </>
          )}

          {filters.range === 'year' && (
            <div className="flex flex-col gap-2 animate-fade-in">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Select Year</label>
              <select 
                value={filters.selectedYear} 
                onChange={e => setFilters(f => ({...f, selectedYear: parseInt(e.target.value)}))}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-[11px] font-bold text-slate-700 outline-none"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
             <button onClick={onRefresh} className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-[#E11D48] transition-all h-[38px] w-[38px] flex items-center justify-center">
              <i className={`fas fa-sync-alt ${isSyncing ? 'animate-spin' : ''}`}></i>
             </button>
          </div>
        </div>

        {/* Centralized History Table */}
        <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden max-h-[800px] flex flex-col">
          <div className="p-6 md:p-8 border-b border-slate-100 flex flex-wrap justify-between items-center bg-slate-50/20 gap-4 shrink-0">
            <h3 className="text-sm md:text-lg font-black text-slate-900 uppercase tracking-tight">Cloud Operational History</h3>
            <span className="text-[9px] md:text-[10px] font-black bg-slate-900 text-white px-4 py-2 rounded-xl">{filteredData.length} Cloud Records</span>
          </div>
          <div className="overflow-auto scrollbar-thin scrollbar-thumb-slate-200 flex-1">
            <table className="w-full text-left min-w-[2800px] border-collapse">
              <thead className="bg-[#111827] text-white sticky top-0 z-40">
                <tr className="text-[8px] md:text-[9px] font-black uppercase tracking-wider">
                  <th className="py-6 px-8 sticky left-0 bg-[#111827] z-50 border-r border-slate-800 shadow-[2px_0_10px_rgba(0,0,0,0.1)]">Entry Date</th>
                  {UNITS.map(u => (
                    <th key={u} className="py-6 px-4 text-center border-r border-slate-800 last:border-r-0">
                      <div className="mb-1">{u}</div>
                      <div className="text-[7px] opacity-40 font-bold">ORDER / DISPATCH</div>
                    </th>
                  ))}
                  <th className="py-6 px-8 text-right border-l border-slate-800 bg-[#1E293B]">TOTAL ORDER</th>
                  <th className="py-6 px-8 text-right bg-[#1E293B] text-rose-400">TOTAL DISPATCH</th>
                  <th className="py-6 px-8 sticky right-0 bg-[#111827] z-50 border-l border-slate-800 shadow-[-2px_0_10px_rgba(0,0,0,0.1)] text-center w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-5 px-8 text-[10px] md:text-[11px] font-black text-slate-900 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-100 shadow-[2px_0_10px_rgba(0,0,0,0.02)] z-10">
                      {formatDate(row.date)}
                    </td>
                    {UNITS.map(u => (
                      <td key={u} className="py-5 px-4 text-center border-r border-slate-50">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold text-slate-900">₹{(row.units[u]?.orderValue || 0).toLocaleString()}</span>
                          <span className="text-[10px] font-bold text-[#E11D48]">₹{(row.units[u]?.dispatchValue || 0).toLocaleString()}</span>
                        </div>
                      </td>
                    ))}
                    <td className="py-5 px-8 text-right text-[11px] font-black bg-slate-50/50">₹{(row.totalOrder || 0).toLocaleString()}</td>
                    <td className="py-5 px-8 text-right text-[11px] font-black text-[#E11D48] bg-slate-50/50">₹{(row.totalDispatch || 0).toLocaleString()}</td>
                    <td className="py-5 px-8 sticky right-0 bg-white group-hover:bg-slate-50 z-10 border-l border-slate-100 shadow-[-2px_0_10px_rgba(0,0,0,0.02)]">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => setEditingRecord(row)}
                          className="p-2 w-10 h-10 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center group/btn"
                          title="Edit Directly"
                        >
                          <i className="fas fa-edit text-xs"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={UNITS.length + 4} className="py-32 text-center text-slate-400 font-black uppercase text-[10px] tracking-[0.5em]">
                      No centralized entries matching current filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
