'use client';
import { mapHeaders } from '../components/headerMapping';
import { nlDataRetrieval } from '../components/nlDataRetrieval';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import Papa from 'papaparse';
import DataGridComponent from '../components/DataGridComponent';
import { validateClients, validateWorkers, validateTasks } from '../components/validation';
import ValidationSummary from '../components/ValidationSummary';
import RuleForm from '../components/RuleForm';
import { FiUploadCloud, FiCpu, FiPlus, FiSearch, FiSliders, FiFileText, FiAlertCircle, FiChevronRight, FiDatabase } from 'react-icons/fi';


interface AppData {
  clients: any[];
  workers: any[];
  tasks: any[];
}


interface ValidationErrors {
  clients: { row: number; col: string; message: string }[];
  workers: { row: number; col: string; message: string }[];
  tasks: { row: number; col: string; message: string }[];
}


const CLIENT_SCHEMA = ['ClientID', 'ClientName', 'PriorityLevel', 'RequestedTaskIDs', 'GroupTag', 'AttributesJSON'];
const WORKER_SCHEMA = ['WorkerID', 'WorkerName', 'Skills', 'AvailableSlots', 'MaxLoadPerPhase', 'WorkerGroup', 'QualificationLevel'];
const TASK_SCHEMA = ['TaskID', 'TaskName', 'Category', 'Duration', 'RequiredSkills', 'PreferredPhases', 'MaxConcurrent'];


export default function Home() {
  const [appData, setAppData] = useState<AppData>({ clients: [], workers: [], tasks: [] });
  const [errors, setErrors] = useState<ValidationErrors>({ clients: [], workers: [], tasks: [] });
  const [rules, setRules] = useState<any[]>([]);
  const [weights, setWeights] = useState({
    priorityLevel: 1,
    requestedTaskIDs: 1,
    fairness: 1,
    workload: 1,
  });


  // NL search state for all entities
  const [clientSearch, setClientSearch] = useState('');
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [workerSearch, setWorkerSearch] = useState('');
  const [filteredWorkers, setFilteredWorkers] = useState<any[]>([]);
  const [taskSearch, setTaskSearch] = useState('');
  const [filteredTasks, setFilteredTasks] = useState<any[]>([]);


  // Natural Language to Rules Converter state
  const [nlRuleText, setNlRuleText] = useState('');
  const [nlRuleResult, setNlRuleResult] = useState<any>(null);
  const [nlRuleError, setNlRuleError] = useState<string | null>(null);
  const [nlRuleLoading, setNlRuleLoading] = useState(false);


  // AI Rule Recommendations state
  const [aiRuleRecs, setAiRuleRecs] = useState<any[]>([]);
  const [aiRuleLoading, setAiRuleLoading] = useState(false);
  const [aiRuleError, setAiRuleError] = useState<string | null>(null);


  // --- AI Error Correction Fix Handlers ---
  const handleApplyClientFix = (rowIdx: number, col: string, newValue: any) => {
    const updated = [...appData.clients];
    updated[rowIdx] = { ...updated[rowIdx], [col]: newValue };
    const newAppData = { ...appData, clients: updated };
    setAppData(newAppData);
    setErrors({
      clients: validateClients(newAppData.clients, newAppData.tasks),
      workers: validateWorkers(newAppData.workers, newAppData.tasks),
      tasks: validateTasks(newAppData.tasks, newAppData.workers),
    });
  };


  const handleApplyWorkerFix = (rowIdx: number, col: string, newValue: any) => {
    const updated = [...appData.workers];
    updated[rowIdx] = { ...updated[rowIdx], [col]: newValue };
    const newAppData = { ...appData, workers: updated };
    setAppData(newAppData);
    setErrors({
      clients: validateClients(newAppData.clients, newAppData.tasks),
      workers: validateWorkers(newAppData.workers, newAppData.tasks),
      tasks: validateTasks(newAppData.tasks, newAppData.workers),
    });
  };


  const handleApplyTaskFix = (rowIdx: number, col: string, newValue: any) => {
    const updated = [...appData.tasks];
    updated[rowIdx] = { ...updated[rowIdx], [col]: newValue };
    const newAppData = { ...appData, tasks: updated };
    setAppData(newAppData);
    setErrors({
      clients: validateClients(newAppData.clients, newAppData.tasks),
      workers: validateWorkers(newAppData.workers, newAppData.tasks),
      tasks: validateTasks(newAppData.tasks, newAppData.workers),
    });
  };


  // Handle CSV upload and validate immediately, with header mapping
  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    entityType: keyof AppData
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;


    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        if (!results.data || !Array.isArray(results.data) || results.data.length === 0 || !results.data[0]) return;


        const headers = Object.keys(results.data[0]);
        let schema = CLIENT_SCHEMA;
        if (entityType === 'workers') schema = WORKER_SCHEMA;
        if (entityType === 'tasks') schema = TASK_SCHEMA;


        const mapping = mapHeaders(headers, schema);


        const mappedData = results.data.map((row: any) => {
          const newRow: any = {};
          Object.entries(mapping).forEach(([orig, mapped]) => {
            if (mapped) newRow[mapped] = row[orig];
          });
          return newRow;
        });


        setAppData(prev => {
          const newAppData = { ...prev, [entityType]: mappedData };
          setErrors({
            clients: validateClients(newAppData.clients, newAppData.tasks),
            workers: validateWorkers(newAppData.workers, newAppData.tasks),
            tasks: validateTasks(newAppData.tasks, newAppData.workers),
          });
          return newAppData;
        });
      },
      error: (error: any) => {
        console.error("CSV parsing error:", error);
        alert(`Error parsing ${file.name}`);
      },
    });
  };


  // Load sample CSVs and validate on mount
  useEffect(() => {
    const fetchCSV = async (filename: string): Promise<any[]> => {
      const res = await fetch(`/samples/${filename}`);
      const text = await res.text();
      return new Promise((resolve) => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data as any[]),
        });
      });
    };


    const loadAll = async () => {
      const [clients, workers, tasks] = await Promise.all([
        fetchCSV('clients.csv'),
        fetchCSV('workers.csv'),
        fetchCSV('tasks.csv'),
      ]);
      setAppData({ clients, workers, tasks });
      setErrors({
        clients: validateClients(clients, tasks),
        workers: validateWorkers(workers, tasks),
        tasks: validateTasks(tasks, workers),
      });
    };


    loadAll();
  }, []);


  // Reset filtered lists when data changes
  useEffect(() => {
    setFilteredClients([]);
    setClientSearch('');
  }, [appData.clients]);
  useEffect(() => {
    setFilteredWorkers([]);
    setWorkerSearch('');
  }, [appData.workers]);
  useEffect(() => {
    setFilteredTasks([]);
    setTaskSearch('');
  }, [appData.tasks]);


  // Memoized column definitions
  const clientColDefs = useMemo(() => [
    { field: 'ClientID', editable: true },
    { field: 'ClientName', editable: true },
    { field: 'PriorityLevel', editable: true },
    { field: 'RequestedTaskIDs', editable: true },
    { field: 'GroupTag', editable: true },
    { field: 'AttributesJSON', editable: true }
  ], []);


  const workerColDefs = useMemo(() => [
    { field: 'WorkerID', editable: true },
    { field: 'WorkerName', editable: true },
    { field: 'Skills', editable: true },
    { field: 'AvailableSlots', editable: true },
    { field: 'MaxLoadPerPhase', editable: true },
    { field: 'WorkerGroup', editable: true },
    { field: 'QualificationLevel', editable: true }
  ], []);


  const taskColDefs = useMemo(() => [
    { field: 'TaskID', editable: true },
    { field: 'TaskName', editable: true },
    { field: 'Category', editable: true },
    { field: 'Duration', editable: true },
    { field: 'RequiredSkills', editable: true },
    { field: 'PreferredPhases', editable: true },
    { field: 'MaxConcurrent', editable: true }
  ], []);


  // Handlers for cell editing (with validation)
  const onClientEdit = useCallback((event: any) => {
    const updated = [...appData.clients];
    updated[event.rowIndex] = { ...updated[event.rowIndex], [event.colDef.field]: event.newValue };
    const newAppData = { ...appData, clients: updated };
    setAppData(newAppData);
    setErrors({
      clients: validateClients(newAppData.clients, newAppData.tasks),
      workers: validateWorkers(newAppData.workers, newAppData.tasks),
      tasks: validateTasks(newAppData.tasks, newAppData.workers),
    });
  }, [appData]);


  const onWorkerEdit = useCallback((event: any) => {
    const updated = [...appData.workers];
    updated[event.rowIndex] = { ...updated[event.rowIndex], [event.colDef.field]: event.newValue };
    const newAppData = { ...appData, workers: updated };
    setAppData(newAppData);
    setErrors({
      clients: validateClients(newAppData.clients, newAppData.tasks),
      workers: validateWorkers(newAppData.workers, newAppData.tasks),
      tasks: validateTasks(newAppData.tasks, newAppData.workers),
    });
  }, [appData]);


  const onTaskEdit = useCallback((event: any) => {
    const updated = [...appData.tasks];
    updated[event.rowIndex] = { ...updated[event.rowIndex], [event.colDef.field]: event.newValue };
    const newAppData = { ...appData, tasks: updated };
    setAppData(newAppData);
    setErrors({
      clients: validateClients(newAppData.clients, newAppData.tasks),
      workers: validateWorkers(newAppData.workers, newAppData.tasks),
      tasks: validateTasks(newAppData.tasks, newAppData.workers),
    });
  }, [appData]);


  // Export rules as JSON (now includes weights)
  const handleExportRules = () => {
    const exportObj = {
      rules,
      weights,
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "rules.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };


  // Export CSV utility
  const exportCSV = (data: any[], filename: string) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };


  // Helper component for styled section cards
  const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-slate-800/50 border border-slate-700 rounded-xl shadow-lg backdrop-blur-sm p-6 ${className}`}>
        {children}
    </div>
  );

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen font-sans p-4 sm:p-6 lg:p-8">
        <style jsx global>{`
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .fade-in-up {
                animation: fadeIn 0.5s ease-out forwards;
            }
            @keyframes textShine {
                0% { background-position: 200% center; }
                100% { background-position: -200% center; }
            }
            .animated-gradient {
                background: linear-gradient(to right, #ef4444, #ec4899, #8b5cf6, #3b82f6, #ef4444);
                background-size: 200% auto;
                background-clip: text;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                animation: textShine 5s linear infinite;
            }
        `}</style>

        {/* --- New Header Section --- */}
        <header className="text-center mb-12 fade-in-up">
            <div className="py-12 bg-slate-800/30 rounded-xl border border-slate-700 shadow-2xl backdrop-blur-sm">
                <h1 className="text-5xl sm:text-7xl font-bold animated-gradient">
                    Data Alchemist
                </h1>
                <p className="text-slate-400 mt-4 text-lg max-w-2xl mx-auto">
                    The ultimate toolkit to validate, explore, and optimize your business data with the power of AI.
                </p>
            </div>
        </header>

        {/* File Upload Section */}
        <section className="mb-12 fade-in-up" style={{animationDelay: '0.1s'}}>
            <h2 className="text-2xl font-semibold mb-4 text-slate-300 flex items-center gap-2"><FiUploadCloud /> Upload Your Data</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['clients', 'workers', 'tasks'].map((entity) => (
                    <div key={entity} className="group relative bg-slate-800 border-2 border-dashed border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-red-500 hover:bg-slate-700/50 transition-all duration-300">
                        <FiUploadCloud className="text-4xl text-slate-500 group-hover:text-red-500 transition-colors" />
                        <label className="font-semibold mt-4 text-lg">
                            Upload {entity.charAt(0).toUpperCase() + entity.slice(1)}
                        </label>
                        <p className="text-slate-400 text-sm">Drop a .csv file or click to select</p>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => handleFileUpload(e, entity as keyof AppData)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>
                ))}
            </div>
        </section>

        {/* --- Example Files Label --- */}
        {appData.clients.length > 0 && (
            <section className="mb-12 text-center fade-in-up" style={{animationDelay: '0.2s'}}>
                <h2 className="text-2xl font-semibold text-slate-300 flex items-center justify-center gap-2">
                    <FiDatabase /> Example Datasets
                </h2>
                <p className="text-slate-500">Showing pre-loaded sample data. Upload your own files above to get started.</p>
            </section>
        )}

        {/* Data Grids */}
        {[
            { type: 'clients', data: appData.clients, searchVal: clientSearch, searchSetter: setClientSearch, filteredData: filteredClients, filterSetter: setFilteredClients, cols: clientColDefs, onEdit: onClientEdit, errors: errors.clients, onFix: handleApplyClientFix, placeholder: "e.g. PriorityLevel > 2" },
            { type: 'workers', data: appData.workers, searchVal: workerSearch, searchSetter: setWorkerSearch, filteredData: filteredWorkers, filterSetter: setFilteredWorkers, cols: workerColDefs, onEdit: onWorkerEdit, errors: errors.workers, onFix: handleApplyWorkerFix, placeholder: "e.g. Skills includes 'Python'" },
            { type: 'tasks', data: appData.tasks, searchVal: taskSearch, searchSetter: setTaskSearch, filteredData: filteredTasks, filterSetter: setFilteredTasks, cols: taskColDefs, onEdit: onTaskEdit, errors: errors.tasks, onFix: handleApplyTaskFix, placeholder: "e.g. Category = 'High-Priority'" },
        ].map((grid, index) => (
            grid.data.length > 0 && (
                <section key={grid.type} className="mb-12 fade-in-up" style={{animationDelay: `${0.3 + index * 0.1}s`}}>
                    <Card>
                        <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-slate-200">{grid.type.charAt(0).toUpperCase() + grid.type.slice(1)} Data</h3>
                            <div className="relative mt-4 md:mt-0 w-full md:w-1/2">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={grid.searchVal}
                                    onChange={e => grid.searchSetter(e.target.value)}
                                    placeholder={grid.placeholder}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-full px-10 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                                />
                                <button
                                    onClick={() => {
                                        if (grid.searchVal.trim() === '') grid.filterSetter([]);
                                        else grid.filterSetter(nlDataRetrieval(grid.searchVal, grid.data));
                                    }}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 bg-red-600 text-white px-4 py-1 rounded-full text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all"
                                >
                                    Search
                                </button>
                            </div>
                        </div>
                        {grid.searchVal && grid.filteredData.length === 0 && (
                            <div className="text-yellow-400 mb-2 flex items-center gap-2"><FiAlertCircle/>No matching {grid.type} found.</div>
                        )}
                        <DataGridComponent
                            title=""
                            rowData={grid.filteredData.length || grid.searchVal ? grid.filteredData : grid.data}
                            columnDefs={grid.cols}
                            onCellValueChanged={grid.onEdit}
                            errors={grid.errors}
                        />
                        <ValidationSummary
                            errors={grid.errors}
                            rowData={grid.data}
                            entityType={grid.type as keyof AppData}
                            onApplyFix={grid.onFix}
                        />
                        <button
                            className="mt-4 flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105"
                            onClick={() => exportCSV(grid.data, `${grid.type}_cleaned.csv`)}
                        >
                            <FiFileText />
                            Export Cleaned {grid.type.charAt(0).toUpperCase() + grid.type.slice(1)}
                        </button>
                    </Card>
                </section>
            )
        ))}

        {/* --- Rules & AI Panel --- */}
        <section className="my-12 fade-in-up" style={{animationDelay: '0.6s'}}>
             <h2 className="text-2xl font-semibold mb-4 text-slate-300 flex items-center gap-2"><FiCpu /> Business Rules & AI</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Manual & NL to Rule */}
                <Card>
                    <h3 className="font-bold text-xl mb-4 text-slate-200">Create Rules</h3>
                    {/* Manual Rule Form */}
                    <div className="mb-8">
                        <h4 className="font-semibold mb-3 text-slate-300">Add Rule Manually</h4>
                        <RuleForm onAddRule={rule => setRules(prev => [...prev, rule])} />
                    </div>

                    {/* Natural Language to Rule Converter */}
                    <div>
                         <h4 className="font-semibold mb-3 text-slate-300">...or with Natural Language</h4>
                        <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-700">
                             <form
                                onSubmit={async e => {
                                    e.preventDefault();
                                    setNlRuleLoading(true);
                                    setNlRuleError(null);
                                    setNlRuleResult(null);
                                    try {
                                        const response = await fetch('/api/nl-to-rule', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ text: nlRuleText }),
                                        });
                                        const data = await response.json();
                                        if (data.rule) setNlRuleResult(data.rule);
                                        else setNlRuleError('Could not parse rule.');
                                    } catch (err: any) {
                                        setNlRuleError('AI error: ' + err.message);
                                    }
                                    setNlRuleLoading(false);
                                }}
                                className="flex flex-col gap-3"
                            >
                                <input
                                    type="text"
                                    value={nlRuleText}
                                    onChange={e => setNlRuleText(e.target.value)}
                                    placeholder="e.g. Workers in group A cannot exceed 3 tasks per phase"
                                    className="bg-slate-800 border border-slate-600 rounded-md px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                                />
                                <button
                                    type="submit"
                                    disabled={nlRuleLoading}
                                    className="flex items-center justify-center gap-2 bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-red-700 transition-all duration-300 transform hover:scale-105 disabled:bg-slate-500 disabled:cursor-not-allowed"
                                >
                                    {nlRuleLoading ? 'Converting...' : 'Convert to Rule'}
                                </button>
                            </form>
                            {nlRuleError && <p className="text-red-400 mt-3">{nlRuleError}</p>}
                            {nlRuleResult && (
                                <div className="bg-green-900/50 text-green-200 p-4 rounded mt-4 border border-green-700">
                                    <div className="font-semibold">AI Parsed Rule:</div>
                                    <pre className="whitespace-pre-wrap text-sm my-2 p-2 bg-slate-900 rounded">{JSON.stringify(nlRuleResult, null, 2)}</pre>
                                    <button
                                        onClick={() => {
                                            setRules(prev => [...prev, nlRuleResult]);
                                            setNlRuleResult(null);
                                            setNlRuleText('');
                                        }}
                                        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg mt-3 shadow-lg transition-transform duration-200 hover:scale-105"
                                    >
                                        <FiPlus/> Add Rule
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* AI Recs & Rules List */}
                <div className="flex flex-col gap-8">
                    {/* AI Rule Recommendations Panel */}
                    <Card className="bg-gradient-to-br from-red-900/50 to-slate-800/50 border-red-700/50">
                        <h3 className="text-xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-400">
                          AI Rule Recommendations
                        </h3>
                         <button
                            disabled={aiRuleLoading}
                            onClick={async () => {
                                setAiRuleLoading(true);
                                setAiRuleError(null);
                                setAiRuleRecs([]);
                                try {
                                    const response = await fetch('/api/ai-rule-recommendations', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ data: appData, rules }),
                                    });
                                    const data = await response.json();
                                    if (data.aiRules && Array.isArray(data.aiRules)) setAiRuleRecs(data.aiRules);
                                    else setAiRuleError('No recommendations found.');
                                } catch (err: any) {
                                    setAiRuleError('AI error: ' + err.message);
                                }
                                setAiRuleLoading(false);
                            }}
                            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg px-5 py-3 shadow-lg transition-all duration-300 transform hover:scale-105 disabled:bg-slate-500"
                        >
                            <FiCpu /> {aiRuleLoading ? 'Analyzing...' : 'Get AI Recommendations'}
                        </button>
                        {aiRuleError && <p className="text-red-400 mt-3">{aiRuleError}</p>}
                        {aiRuleRecs.length > 0 && (
                            <ul className="space-y-3 mt-4">
                                {aiRuleRecs.map((rec, idx) => (
                                    <li key={idx} className="bg-slate-900/80 p-3 rounded-lg shadow-md flex items-center justify-between gap-4">
                                        <pre className="whitespace-pre-wrap text-sm flex-1">{JSON.stringify(rec, null, 2)}</pre>
                                        <button
                                            onClick={() => setRules(prev => [...prev, rec])}
                                            className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-full shadow transition hover:scale-110"
                                            title="Add Rule"
                                        >
                                          <FiPlus />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>

                    {/* Rules List */}
                     <Card>
                        <h3 className="font-bold text-xl mb-4 text-slate-200">Current Rules ({rules.length})</h3>
                        <ul className="space-y-2 max-h-48 overflow-y-auto pr-2">
                          {rules.map((rule, idx) => (
                            <li key={idx} className="bg-slate-900 p-3 rounded-md text-sm">
                                {rule.type === 'coRun' && <><b>Co-Run:</b> Tasks <b>{rule.tasks.join(', ')}</b></>}
                                {rule.type === 'slotRestriction' && <><b>Slot Restriction:</b> Group <b>{rule.workerGroup}</b>, Min Slots <b>{rule.minSlots}</b></>}
                                {rule.type === 'loadLimit' && <><b>Load Limit:</b> Group <b>{rule.workerGroup}</b>, Max Slots <b>{rule.maxSlots}</b></>}
                                {rule.type === 'phaseWindow' && <><b>Phase Window:</b> Task <b>{rule.taskId}</b>, Phases <b>{rule.allowedPhases.join(', ')}</b></>}
                                {!['coRun', 'slotRestriction', 'loadLimit', 'phaseWindow'].includes(rule.type) && <pre className="whitespace-pre-wrap">{JSON.stringify(rule)}</pre>}
                            </li>
                          ))}
                        </ul>
                         <button
                            onClick={handleExportRules}
                            className="w-full mt-4 flex items-center justify-center gap-2 bg-red-800 hover:bg-red-700 text-white font-semibold rounded-lg px-6 py-3 shadow-lg transition-all duration-300 transform hover:scale-105"
                         >
                            <FiFileText /> Export All Rules & Weights
                        </button>
                    </Card>
                </div>
            </div>
        </section>


        {/* Prioritization & Weights Panel */}
        <section className="my-12 fade-in-up" style={{animationDelay: '0.7s'}}>
            <h2 className="text-2xl font-semibold mb-4 text-slate-300 flex items-center gap-2"><FiSliders /> Prioritization & Weights</h2>
            <Card>
                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1">
                        <h3 className="font-bold text-lg mb-4 text-slate-200">Weight Presets</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                            <button
                                onClick={() => setWeights({ priorityLevel: 10, requestedTaskIDs: 3, fairness: 5, workload: 2 })}
                                className="p-4 bg-slate-700 hover:bg-red-600 rounded-lg shadow transition-all duration-200 text-left"
                            >
                                <p className="font-bold">Maximize Fulfillment</p>
                                <p className="text-sm text-slate-400">Prioritize high-level clients.</p>
                            </button>
                             <button
                                onClick={() => setWeights({ priorityLevel: 3, requestedTaskIDs: 10, fairness: 4, workload: 2 })}
                                className="p-4 bg-slate-700 hover:bg-red-600 rounded-lg shadow transition-all duration-200 text-left"
                            >
                                <p className="font-bold">Fair Distribution</p>
                                <p className="text-sm text-slate-400">Distribute tasks evenly.</p>
                            </button>
                             <button
                                onClick={() => setWeights({ priorityLevel: 2, requestedTaskIDs: 2, fairness: 4, workload: 10 })}
                                className="p-4 bg-slate-700 hover:bg-red-600 rounded-lg shadow transition-all duration-200 text-left"
                            >
                                <p className="font-bold">Minimize Workload</p>
                                <p className="text-sm text-slate-400">Optimize for worker efficiency.</p>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 space-y-6">
                         {[
                            { label: 'Priority Level Weight', value: weights.priorityLevel, key: 'priorityLevel' },
                            { label: 'Requested TaskIDs Fulfillment', value: weights.requestedTaskIDs, key: 'requestedTaskIDs' },
                            { label: 'Fairness Constraint', value: weights.fairness, key: 'fairness' },
                            { label: 'Minimize Workload', value: weights.workload, key: 'workload' },
                        ].map(({ label, value, key }) => (
                            <div key={key}>
                                <label className="flex justify-between items-center mb-1 text-slate-300">
                                    <span>{label}</span>
                                    <span className="font-mono text-red-400 bg-slate-700 px-2 py-1 rounded-md text-sm">{value}</span>
                                </label>
                                <input
                                    type="range"
                                    min={1} max={10} value={value}
                                    onChange={e => setWeights(w => ({ ...w, [key]: Number(e.target.value) }))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </Card>
        </section>

        <footer className="mt-16 mb-4 w-full flex justify-center fade-in-up" style={{animationDelay: '0.8s'}}>
            <div className="flex flex-col md:flex-row items-center gap-6 bg-slate-900/50 border border-slate-700 rounded-xl shadow-lg px-8 py-6 max-w-3xl w-full">
                <img
                    src="raj.jpg"
                    alt="Raj Pandey"
                    className="w-20 h-20 rounded-full border-2 border-red-500 shadow-lg object-cover"
                />
                <div className="flex-1 text-center md:text-left">
                    <div className="font-semibold text-xl text-slate-100">Made by Raj Pandey</div>
                    <p className="text-slate-400 mt-2 text-sm">
                       <strong>Motivation:</strong> Data Alchemist was built to empower users to easily validate, explore, and optimize business data using modern AI and intuitive tools. My goal was to combine robust data engineering with accessible, interactive design, inspired by real-world needs in analytics and automation.
                    </p>
                    <div className="flex justify-center md:justify-start flex-wrap items-center gap-4 mt-3">
                        <a href="mailto:rajxpandey7@gmail.com" className="text-slate-300 hover:text-red-500 transition-colors" target="_blank" rel="noopener noreferrer">Email</a>
                        <a href="https://www.linkedin.com/in/raj-pandey-/" className="text-slate-300 hover:text-red-500 transition-colors" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                        <a href="https://github.com/rajjpandeyy" className="text-slate-300 hover:text-red-500 transition-colors" target="_blank" rel="noopener noreferrer">GitHub</a>
                    </div>
                </div>
            </div>
        </footer>
    </div>
  );
}
