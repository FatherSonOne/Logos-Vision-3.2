import React, { useState, useMemo, useEffect } from 'react';
import type { Client, Project, Donation, Activity, Case, TeamMember } from '../types';
import { ActivityType, ProjectStatus, CasePriority } from '../types';
import { generateReportSummary, generateChartInsights } from '../services/geminiService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

type DataSource = 'donations' | 'activities' | 'projects' | 'cases';
type ChartType = 'bar' | 'pie' | 'line';
type ViewMode = 'chart' | 'table';

interface ReportsProps {
  projects: Project[];
  clients: Client[];
  donations: Donation[];
  activities: Activity[];
  cases: Case[];
  teamMembers: TeamMember[];
  documents: Document[];
}

const COLORS = ['#4F46E5', '#7C3AED', '#0EA5E9', '#14B8A6', '#F59E0B', '#EF4444', '#64748B'];
const currencyFormatter = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);

export const Reports: React.FC<ReportsProps> = ({ projects, clients, donations, activities, cases, teamMembers }) => {
    const [dataSource, setDataSource] = useState<DataSource>('donations');
    const [filters, setFilters] = useState<any>({ dateRange: { start: '', end: '' } });
    const [groupBy, setGroupBy] = useState<string>('');
    const [metric, setMetric] = useState<string>('');
    const [chartType, setChartType] = useState<ChartType>('bar');
    const [activeView, setActiveView] = useState<ViewMode>('chart');
    const [reportGoal, setReportGoal] = useState('');
    const [aiSummary, setAiSummary] = useState('');
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);
    const [aiInsights, setAiInsights] = useState('');
    const [isLoadingInsights, setIsLoadingInsights] = useState(false);

    const processedData = useMemo(() => {
        let baseData: any[] = [];
        let dateKey: string = '';
        switch (dataSource) {
            case 'donations': baseData = donations; dateKey = 'donationDate'; break;
            case 'activities': baseData = activities; dateKey = 'activityDate'; break;
            case 'projects': baseData = projects; dateKey = 'startDate'; break;
            case 'cases': baseData = cases; dateKey = 'createdAt'; break;
        }

        const filteredData = baseData.filter(item => {
            const { dateRange, ...otherFilters } = filters;
            let passes = true;
            if (dateRange?.start && dateKey) passes &&= new Date(item[dateKey]) >= new Date(dateRange.start);
            if (dateRange?.end && dateKey) passes &&= new Date(item[dateKey]) <= new Date(dateRange.end);
            for (const key in otherFilters) {
                if (otherFilters[key] && otherFilters[key] !== 'all') {
                    passes &&= item[key] === otherFilters[key];
                }
            }
            return passes;
        });
        
        if (!groupBy) return [];
        const grouped = filteredData.reduce((acc, item) => {
            let key = item[groupBy];
            if (groupBy === 'month') {
                const date = new Date(item[dateKey]);
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            }
            if (key === undefined || key === null) return acc;
            
            if (!acc[key]) acc[key] = { name: key, items: [] };
            acc[key].items.push(item);
            return acc;
        }, {} as Record<string, {name: string, items: any[]}>);

        return Object.values(grouped).map((group: any) => {
            let name = group.name;
            if (groupBy === 'clientId') name = clients.find(c => c.id === name)?.name || name;
            if (groupBy === 'createdById' || groupBy === 'assignedToId') name = teamMembers.find(tm => tm.id === name)?.name || name;
            if (groupBy === 'month') name = new Date(`${name}-02`).toLocaleString('default', { month: 'short', year: 'numeric' });

            let value = 0;
            switch(metric) {
                case 'count': value = group.items.length; break;
                case 'totalAmount': value = group.items.reduce((sum: number, i: any) => sum + i.amount, 0); break;
                case 'avgAmount': value = group.items.length > 0 ? group.items.reduce((sum: number, i: any) => sum + i.amount, 0) / group.items.length : 0; break;
                case 'taskCount': value = group.items.reduce((sum: number, i: any) => sum + (i.tasks?.length || 0), 0); break;
                default: value = group.items.length;
            }
            return { name, value };
        }).sort((a,b) => (typeof a.name === 'string' && typeof b.name === 'string') ? a.name.localeCompare(b.name) : 0);
    }, [dataSource, filters, groupBy, metric, donations, activities, projects, cases, clients, teamMembers]);
    
    const { groupOptions, metricOptions, filterControls } = useMemo(() => {
        let groupOpts: { value: string; label: string }[] = [];
        let metricOpts: { value: string; label: string }[] = [];
        let filterCtrl: any[] | null = null;

        const dateFilter = { key: 'dateRange', type: 'date' };

        switch (dataSource) {
            case 'donations':
                groupOpts = [{ value: 'campaign', label: 'Campaign' }, { value: 'clientId', label: 'Client' }, { value: 'month', label: 'Month' }];
                metricOpts = [{ value: 'totalAmount', label: 'Total Amount' }, { value: 'count', label: 'Number of Donations' }, { value: 'avgAmount', label: 'Average Amount' }];
                filterCtrl = [dateFilter];
                break;
            case 'activities':
                groupOpts = [{ value: 'type', label: 'Type' }, { value: 'createdById', label: 'Team Member' }, { value: 'clientId', label: 'Client' }, { value: 'month', label: 'Month' }];
                metricOpts = [{ value: 'count', label: 'Number of Activities' }];
                filterCtrl = [dateFilter, { key: 'type', type: 'select', options: Object.values(ActivityType).map(t => ({label: t, value: t})) }];
                break;
            case 'projects':
                groupOpts = [{ value: 'status', label: 'Status' }, { value: 'clientId', label: 'Client' }];
                metricOpts = [{ value: 'count', label: 'Number of Projects' }, { value: 'taskCount', label: 'Total Tasks'}];
                filterCtrl = [{ key: 'status', type: 'select', options: Object.values(ProjectStatus).map(s => ({label: s, value: s}))}];
                break;
            case 'cases':
                groupOpts = [{ value: 'status', label: 'Status' }, { value: 'priority', label: 'Priority' }, { value: 'assignedToId', label: 'Assignee' }, { value: 'month', label: 'Month' }];
                metricOpts = [{ value: 'count', label: 'Number of Cases' }];
                filterCtrl = [dateFilter, { key: 'priority', type: 'select', options: Object.values(CasePriority).map(p => ({label: p, value: p}))}];
                break;
        }
        return { groupOptions: groupOpts, metricOptions: metricOpts, filterControls: filterCtrl };
    }, [dataSource]);
    
    useEffect(() => {
        setFilters({ dateRange: { start: '', end: '' } });
        setGroupBy(groupOptions[0]?.value || '');
        setMetric(metricOptions[0]?.value || '');
        setAiSummary('');
        setAiInsights('');
    }, [dataSource, groupOptions, metricOptions]);

    useEffect(() => {
      setChartType(groupBy === 'month' ? 'line' : 'bar');
    }, [groupBy]);
    
    const handleFilterChange = (key: string, value: any) => setFilters((prev: any) => ({ ...prev, [key]: value }));

    const handleGenerateSummary = async () => {
        if (!reportGoal) return;
        setIsLoadingSummary(true);
        setAiSummary('');
        const summary = await generateReportSummary(processedData, reportGoal, dataSource);
        setAiSummary(summary);
        setIsLoadingSummary(false);
    };

    const handleGenerateInsights = async () => {
        if (processedData.length === 0) return;
        setIsLoadingInsights(true);
        setAiInsights('');
        const groupLabel = groupOptions.find(o => o.value === groupBy)?.label || groupBy;
        const metricLabel = metricOptions.find(o => o.value === metric)?.label || metric;
        const insights = await generateChartInsights(processedData, dataSource, groupLabel, metricLabel);
        setAiInsights(insights);
        setIsLoadingInsights(false);
    }
    
    const renderChart = () => {
        if (!processedData || processedData.length === 0) {
            return <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">No data to display.</div>;
        }
        const isCurrency = metric.toLowerCase().includes('amount') || metric.toLowerCase().includes('total');
        switch (chartType) {
            case 'pie': return <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={processedData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>{processedData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={(val) => isCurrency ? currencyFormatter(val as number) : val} /><Legend /></PieChart></ResponsiveContainer>;
            case 'line': return <ResponsiveContainer width="100%" height="100%"><LineChart data={processedData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tickFormatter={val => isCurrency ? currencyFormatter(val) : val} tick={{ fontSize: 12 }} /><Tooltip formatter={(val) => isCurrency ? currencyFormatter(val as number) : val} /><Legend /><Line type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={2} name={metricOptions.find(m=>m.value===metric)?.label || 'Value'} /></LineChart></ResponsiveContainer>;
            case 'bar': default: return <ResponsiveContainer width="100%" height="100%"><BarChart data={processedData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tickFormatter={val => isCurrency ? currencyFormatter(val) : val} tick={{ fontSize: 12 }} /><Tooltip formatter={(val) => isCurrency ? currencyFormatter(val as number) : val} /><Legend /><Bar dataKey="value" fill="#4F46E5" name={metricOptions.find(m=>m.value===metric)?.label || 'Value'} /></BarChart></ResponsiveContainer>;
        }
    };
    
    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full -m-6 sm:-m-8">
            <aside className="w-full lg:w-80 bg-white/30 dark:bg-slate-900/40 p-4 border-r border-white/20 dark:border-slate-700 flex flex-col gap-4 overflow-y-auto">
                <h2 className="text-xl font-bold">Report Builder</h2>
                <ControlGroup label="Data Source"><Select value={dataSource} onChange={e => setDataSource(e.target.value as DataSource)} options={[{ value: 'donations', label: 'Donations' }, { value: 'activities', label: 'Activities' }, { value: 'projects', label: 'Projects' }, { value: 'cases', label: 'Cases' }]} /></ControlGroup>
                {filterControls && <ControlGroup label="Filters"><div className="space-y-2 p-2 border rounded-md bg-slate-50 dark:bg-slate-800/50">{filterControls.map(f => f.type === 'date' ? <DateRangeFilter key={f.key} value={filters.dateRange} onChange={val => handleFilterChange('dateRange', val)} /> : <Select key={f.key} value={filters[f.key] || 'all'} onChange={e => handleFilterChange(f.key, e.target.value)} options={[{label: `All ${f.key}s`, value: 'all'},...f.options!]} />)}</div></ControlGroup>}
                <ControlGroup label="Group By"><Select value={groupBy} onChange={e => setGroupBy(e.target.value)} options={[{ value: '', label: 'Select...' }, ...groupOptions]} /></ControlGroup>
                <ControlGroup label="Metric"><Select value={metric} onChange={e => setMetric(e.target.value)} options={[{ value: '', label: 'Select...' }, ...metricOptions]} /></ControlGroup>
            </aside>

            <main className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-2 gap-6 overflow-y-auto">
                 <div className="bg-white/30 dark:bg-slate-900/40 backdrop-blur-xl p-4 rounded-lg border border-white/20 shadow-lg flex flex-col min-h-[400px]">
                    <div className="flex justify-between items-center mb-2">
                         <div className="flex items-center gap-1 p-1 bg-black/10 dark:bg-black/20 rounded-lg border border-white/20">
                            <button onClick={() => setActiveView('chart')} className={`w-20 py-1 text-sm font-semibold rounded-md transition-colors ${activeView === 'chart' ? 'bg-white dark:bg-slate-800 shadow' : ''}`}>Chart</button>
                            <button onClick={() => setActiveView('table')} className={`w-20 py-1 text-sm font-semibold rounded-md transition-colors ${activeView === 'table' ? 'bg-white dark:bg-slate-800 shadow' : ''}`}>Table</button>
                        </div>
                         <div className="flex items-center gap-2">
                             <Select value={chartType} onChange={e => setChartType(e.target.value as ChartType)} options={[{ value: 'bar', label: 'Bar' }, { value: 'pie', label: 'Pie' }, { value: 'line', label: 'Line' }]} />
                             <button onClick={handleGenerateInsights} disabled={isLoadingInsights || processedData.length === 0} className="p-2 rounded-md bg-violet-100 text-violet-600 hover:bg-violet-200 disabled:opacity-50"><SparklesIcon /></button>
                         </div>
                    </div>
                    <div className="flex-1">{activeView === 'chart' ? renderChart() : <DataTable data={processedData} metric={metricOptions.find(m=>m.value===metric)?.label || ''} />}</div>
                    {(isLoadingInsights || aiInsights) && (
                        <div className="mt-4 border-t border-white/20 pt-3">
                            {isLoadingInsights ? <p className="text-sm text-slate-400">Generating insights...</p> : <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{aiInsights}</div>}
                        </div>
                    )}
                </div>
                <div className="bg-white/30 dark:bg-slate-900/40 backdrop-blur-xl p-4 rounded-lg border border-white/20 shadow-lg flex flex-col">
                    <h3 className="text-lg font-bold mb-2">AI Report Summary</h3>
                    <textarea value={reportGoal} onChange={e => setReportGoal(e.target.value)} rows={3} placeholder="What is the goal of this report? e.g., 'Identify our top fundraising campaigns...'" className="w-full p-2 text-sm bg-white/50 dark:bg-black/30 border border-white/30 dark:border-slate-600 rounded-md"/>
                    <button onClick={handleGenerateSummary} disabled={isLoadingSummary || processedData.length === 0} className="mt-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold py-2 rounded-md disabled:opacity-50">
                       {isLoadingSummary ? 'Generating...' : 'Generate Summary'}
                    </button>
                    <div className="mt-4 border-t border-white/20 pt-4 flex-1 overflow-y-auto">
                        {aiSummary ? <div className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{aiSummary}</div> : <p className="text-sm text-slate-400">Your report summary will appear here.</p>}
                    </div>
                </div>
            </main>
        </div>
    );
};

const ControlGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (<div className="dark:text-slate-200"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>{children}</div>);
const Select: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; options: { value: string, label: string }[] }> = ({ value, onChange, options }) => (<select value={value} onChange={onChange} className="w-full p-2 text-sm bg-white/50 border border-white/30 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-black/30 dark:border-white/20">{options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>);
const DateRangeFilter: React.FC<{ value: { start: string, end: string }, onChange: (value: { start: string, end: string }) => void }> = ({ value, onChange }) => (<div><label className="text-xs font-medium text-slate-500">Date Range</label><div className="grid grid-cols-2 gap-2 mt-1"><input type="date" value={value.start} onChange={e => onChange({ ...value, start: e.target.value })} className="w-full p-1 border rounded text-sm bg-white/50 dark:bg-black/30 border-white/30" /><input type="date" value={value.end} onChange={e => onChange({ ...value, end: e.target.value })} className="w-full p-1 border rounded text-sm bg-white/50 dark:bg-black/30 border-white/30" /></div></div>);
const DataTable: React.FC<{ data: any[], metric: string }> = ({ data, metric }) => (<div className="h-full overflow-y-auto"><table className="min-w-full text-sm"><thead><tr className="bg-slate-100/50 dark:bg-slate-800/50 sticky top-0"><th className="p-2 text-left font-semibold">Group</th><th className="p-2 text-right font-semibold">{metric || 'Value'}</th></tr></thead><tbody>{data.map((row, i) => <tr key={i} className="border-t border-white/20"><td className="p-2">{row.name}</td><td className="p-2 text-right font-mono">{typeof row.value === 'number' && metric.toLowerCase().includes('amount') ? currencyFormatter(row.value) : row.value}</td></tr>)}</tbody></table></div>);
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L13 12l-1.293 1.293a1 1 0 01-1.414 0L8 10.414a1 1 0 010-1.414L10.293 7l-2.293-2.293a1 1 0 011.414 0L12 6.414l1.293-1.293a1 1 0 011.414 0zM17 12l-2.293 2.293a1 1 0 01-1.414 0L12 13l-1.293 1.293a1 1 0 01-1.414 0L8 13.414a1 1 0 010-1.414L10.293 10l-2.293-2.293a1 1 0 011.414 0L12 9.414l1.293-1.293a1 1 0 011.414 0L17 10.414a1 1 0 010 1.414L14.707 13l2.293 2.293a1 1 0 010 1.414L15 18l1.293-1.293a1 1 0 011.414 0L20 18.414a1 1 0 010-1.414L17.707 15l2.293-2.293a1 1 0 010-1.414L18 10l-1.293 1.293a1 1 0 01-1.414 0L14 10.414a1 1 0 010-1.414l2.293-2.293a1 1 0 011.414 0L20 9.414a1 1 0 010 1.414L17.707 12z" /></svg>;
