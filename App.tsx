
import React, { useState, useMemo, useEffect } from 'react';
import { UNITS, INITIAL_FORM_STATE } from './constants';
import { FormDataState, UnitKey, UnitData, SubmissionPayload } from './types';
import { UnitRow } from './components/UnitRow';
import { DashboardView } from './components/DashboardView';

const SUPABASE_URL = "https://xhwixancggufvekyvyzg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhod2l4YW5jZ2d1ZnZla3l2eXpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTcxMjEsImV4cCI6MjA4NjI5MzEyMX0.xbrsZw2JgndRptEN-DaLqbRUs9vU2WpwqvwMJhYdDfw";
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyyM6m7LOuWzW5qUg8b9ynxP3EzMfE9zrz71eld3-r1U2pROK9-GwZ8sNBQSx-MnDe6/exec"; 

const GinzaLogo = () => (
  <div className="flex items-center justify-center bg-white p-2 rounded-xl shadow-sm border border-slate-100">
    <img 
      src="https://www.ginzalimited.com/cdn/shop/files/Ginza_logo.jpg?v=1668509673&width=500" 
      alt="Ginza Industries Limited" 
      className="h-10 md:h-14 w-auto object-contain"
    />
  </div>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'form' | 'dashboard'>('form');
  const [formData, setFormData] = useState<FormDataState>(INITIAL_FORM_STATE);
  const [currentDate, setCurrentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [history, setHistory] = useState<SubmissionPayload[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    fetchFromSupabase();
  }, []);

  const fetchFromSupabase = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/operational_logs?select=*&order=entry_date.desc`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      
      if (!response.ok) throw new Error("Supabase Fetch Failed");
      
      const data = await response.json();
      const mappedHistory: SubmissionPayload[] = data.map((item: any) => ({
        id: item.id,
        date: item.entry_date,
        totalOrder: item.total_order,
        totalDispatch: item.total_dispatch,
        units: item.units_data
      }));
      
      setHistory(mappedHistory);
    } catch (err) {
      console.error("Supabase Error:", err);
      setSyncError("Cloud Offline");
    } finally {
      setIsSyncing(false);
    }
  };

  const totals = useMemo(() => {
    return UNITS.reduce((acc, unit) => ({
      order: acc.order + (formData[unit]?.orderValue || 0),
      dispatch: acc.dispatch + (formData[unit]?.dispatchValue || 0),
    }), { order: 0, dispatch: 0 });
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totals.order === 0 && totals.dispatch === 0) {
      alert("Please enter values before submitting.");
      return;
    }
    
    setIsSubmitting(true);
    const submissionId = `GINZA-${Date.now()}`;
    
    const payloadSupabase = {
      entry_date: currentDate,
      units_data: formData,
      total_order: totals.order,
      total_dispatch: totals.dispatch,
    };

    const payloadGoogle = {
      id: submissionId,
      date: currentDate,
      units: formData,
      totalOrder: totals.order,
      totalDispatch: totals.dispatch,
    };

    try {
      const supabasePromise = fetch(`${SUPABASE_URL}/rest/v1/operational_logs`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payloadSupabase)
      });

      const googlePromise = fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payloadGoogle)
      });

      await Promise.all([supabasePromise, googlePromise]);
      
      setFormData(INITIAL_FORM_STATE);
      alert("Entry Centralized! Data sent to Cloud & Google Sheets.");
      fetchFromSupabase();
    } catch (err) {
      console.error("Submit error:", err);
      alert("Connectivity problem. Entry might not have saved to both platforms.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string, updatedPayload: SubmissionPayload) => {
    setIsSubmitting(true);
    try {
      const payloadSupabase = {
        units_data: updatedPayload.units,
        total_order: updatedPayload.totalOrder,
        total_dispatch: updatedPayload.totalDispatch,
      };

      const payloadGoogle = {
        action: 'UPDATE',
        id: id,
        date: updatedPayload.date,
        units: updatedPayload.units,
        totalOrder: updatedPayload.totalOrder,
        totalDispatch: updatedPayload.totalDispatch,
      };

      // 1. Update Supabase
      const supabasePromise = fetch(`${SUPABASE_URL}/rest/v1/operational_logs?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payloadSupabase)
      });

      // 2. Update Google Sheets
      const googlePromise = fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payloadGoogle)
      });

      await Promise.all([supabasePromise, googlePromise]);
      alert("Record Updated Successfully.");
      fetchFromSupabase();
    } catch (err) {
      console.error("Update error:", err);
      alert("Failed to update record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto w-full px-2 md:px-4 pt-4 md:pt-10 flex-1">
        <header className="flex flex-col lg:flex-row items-center justify-between gap-4 md:gap-6 mb-6 md:mb-10 bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 md:gap-5">
            <GinzaLogo />
            <div className="flex flex-col">
              <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">
                GINZA <span className="text-[#E11D48]">INDUSTRIES</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-rose-500 animate-ping' : syncError ? 'bg-amber-400' : 'bg-emerald-500'}`}></span>
                <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">
                  {isSyncing ? 'Syncing...' : syncError ? syncError : 'Centralized Platform Online'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl md:rounded-2xl border border-slate-200 gap-1 w-full lg:w-auto">
            <button onClick={() => setActiveTab('form')} className={`flex-1 md:flex-none px-4 md:px-10 py-2.5 md:py-3.5 rounded-lg md:rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'form' ? 'bg-white text-[#E11D48] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              Data Entry
            </button>
            <button onClick={() => setActiveTab('dashboard')} className={`flex-1 md:flex-none px-4 md:px-10 py-2.5 md:py-3.5 rounded-lg md:rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-white text-[#E11D48] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              Log History
              {history.length > 0 && <span className="ml-1.5 bg-[#E11D48] text-white text-[8px] px-1.5 py-0.5 rounded-full">{history.length}</span>}
            </button>
          </div>
        </header>

        <main className="animate-fade-in">
          {activeTab === 'form' ? (
            <div className="space-y-4 md:space-y-8 pb-20">
              <div className="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="w-10 h-10 md:w-14 md:h-14 bg-rose-50 rounded-xl md:rounded-2xl flex items-center justify-center text-[#E11D48]">
                    <i className="fas fa-calendar-alt text-lg md:text-2xl"></i>
                  </div>
                  <div>
                    <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left">Record Date</label>
                    <input type="date" value={currentDate} onChange={e => setCurrentDate(e.target.value)} className="text-lg md:text-2xl font-black text-slate-900 bg-transparent border-none focus:ring-0 p-0 cursor-pointer" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[1.5rem] md:rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
                <div className="overflow-x-auto -mx-px">
                  <table className="w-full text-left table-fixed min-w-[320px]">
                    <thead className="bg-slate-900 text-white">
                      <tr className="text-[8px] md:text-[10px] font-black uppercase tracking-wider">
                        <th className="py-4 md:py-8 px-3 md:px-10 w-1/4">Production Unit</th>
                        <th className="py-4 md:py-8 px-2 md:px-10 text-center w-3/8">Order Value (₹)</th>
                        <th className="py-4 md:py-8 px-2 md:px-10 text-center w-3/8">Dispatch (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {UNITS.map(unit => (
                        <UnitRow key={unit} unit={unit} data={formData[unit]} onChange={(u, f, v) => setFormData(prev => ({ ...prev, [u]: { ...prev[u], [f]: v } }))} />
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50/80">
                      <tr className="font-black">
                        <td className="py-6 md:py-14 px-3 md:px-10 text-slate-400 text-[9px] md:text-[11px] uppercase tracking-widest">Aggregate Total</td>
                        <td className="py-6 md:py-14 px-2 md:px-10 text-center text-xl md:text-5xl tracking-tighter">₹{totals.order.toLocaleString()}</td>
                        <td className="py-6 md:py-14 px-2 md:px-10 text-center text-xl md:text-5xl text-[#E11D48] tracking-tighter">₹{totals.dispatch.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <button 
                onClick={handleSubmit} 
                disabled={isSubmitting || (totals.order === 0 && totals.dispatch === 0)} 
                className="w-full py-5 md:py-8 bg-slate-900 text-white font-black text-[10px] md:text-[12px] uppercase tracking-[0.4em] rounded-2xl md:rounded-[2.5rem] shadow-xl hover:bg-[#E11D48] transition-all disabled:opacity-20 active:scale-[0.98] flex items-center justify-center gap-4"
              >
                {isSubmitting ? (
                  <>
                    <i className="fas fa-circle-notch animate-spin"></i>
                    Pushing to Cloud & Sheets...
                  </>
                ) : 'Commit Centralized Entry'}
              </button>
            </div>
          ) : (
            <DashboardView data={history} onUpdate={handleUpdate} onRefresh={fetchFromSupabase} isSyncing={isSyncing} />
          )}
        </main>
      </div>
      <footer className="py-8 md:py-12 text-center">
        <p className="text-slate-300 text-[8px] md:text-[10px] font-black uppercase tracking-[0.5em]">Ginza Group Centralized Intelligence</p>
      </footer>
    </div>
  );
};

export default App;
