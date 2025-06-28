'use client';
import { mapHeaders } from '../components/headerMapping';
import { nlDataRetrieval } from '../components/nlDataRetrieval';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import Papa from 'papaparse';
import DataGridComponent from '../components/DataGridComponent';
import { validateClients, validateWorkers, validateTasks } from '../components/validation';
import ValidationSummary from '../components/ValidationSummary';
import RuleForm from '../components/RuleForm';

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
      error: (error) => {
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

  return (
    <div className="p-6 bg-theme text-theme min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-center fade-in">📊 Data Alchemist Configurator</h1>

      {/* File Upload Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 fade-in">
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center custom-white-box">
          <label className="font-semibold mb-2">Upload Clients</label>
          <input type="file" accept=".csv" onChange={(e) => handleFileUpload(e, 'clients')}
            className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition" />
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center custom-white-box">
          <label className="font-semibold mb-2">Upload Workers</label>
          <input type="file" accept=".csv" onChange={(e) => handleFileUpload(e, 'workers')}
            className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition" />
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center custom-white-box">
          <label className="font-semibold mb-2">Upload Tasks</label>
          <input type="file" accept=".csv" onChange={(e) => handleFileUpload(e, 'tasks')}
            className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition" />
        </div>
      </div>

      {/* Data Grids */}
      {appData.clients.length > 0 && (
        <section className="mb-12 fade-in">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
            <input
              type="text"
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              placeholder="e.g. PriorityLevel = 3"
              className="border border-gray-300 rounded px-3 py-2 flex-1 bg-theme text-theme placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            <button
              onClick={() => {
                if (clientSearch.trim() === '') setFilteredClients([]);
                else setFilteredClients(nlDataRetrieval(clientSearch, appData.clients));
              }}
              className="custom-blue-button px-5 py-2 rounded shadow hover:scale-105 transition"
            >
              Search Clients
            </button>
          </div>
          {clientSearch && filteredClients.length === 0 && (
            <div className="text-red-600 mb-2">No matching clients found.</div>
          )}
          <DataGridComponent
            title="Clients Data"
            rowData={filteredClients.length ? filteredClients : appData.clients}
            columnDefs={clientColDefs}
            onCellValueChanged={onClientEdit}
            errors={errors.clients}
          />
          <ValidationSummary
            errors={errors.clients}
            rowData={appData.clients}
            entityType="clients"
            onApplyFix={handleApplyClientFix}
          />
          <button
            className="mt-4 custom-blue-button px-5 py-2 rounded shadow hover:scale-105 transition"
            onClick={() => exportCSV(appData.clients, 'clients_cleaned.csv')}
          >
            Export Clients as CSV
          </button>
        </section>
      )}

      {appData.workers.length > 0 && (
        <section className="mb-12 fade-in">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
            <input
              type="text"
              value={workerSearch}
              onChange={e => setWorkerSearch(e.target.value)}
              placeholder="e.g. MaxLoadPerPhase > 3"
              className="border border-gray-300 rounded px-3 py-2 flex-1 bg-theme text-theme placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            <button
              onClick={() => {
                if (workerSearch.trim() === '') setFilteredWorkers([]);
                else setFilteredWorkers(nlDataRetrieval(workerSearch, appData.workers));
              }}
              className="custom-blue-button px-5 py-2 rounded shadow hover:scale-105 transition"
            >
              Search Workers
            </button>
          </div>
          {workerSearch && filteredWorkers.length === 0 && (
            <div className="text-red-600 mb-2">No matching workers found.</div>
          )}
          <DataGridComponent
            title="Workers Data"
            rowData={filteredWorkers.length ? filteredWorkers : appData.workers}
            columnDefs={workerColDefs}
            onCellValueChanged={onWorkerEdit}
            errors={errors.workers}
          />
          <ValidationSummary
            errors={errors.workers}
            rowData={appData.workers}
            entityType="workers"
            onApplyFix={handleApplyWorkerFix}
          />
          <button
            className="mt-4 custom-blue-button px-5 py-2 rounded shadow hover:scale-105 transition"
            onClick={() => exportCSV(appData.workers, 'workers_cleaned.csv')}
          >
            Export Workers as CSV
          </button>
        </section>
      )}

      {appData.tasks.length > 0 && (
        <section className="mb-12 fade-in">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
            <input
              type="text"
              value={taskSearch}
              onChange={e => setTaskSearch(e.target.value)}
              placeholder="e.g. Duration > 1"
              className="border border-gray-300 rounded px-3 py-2 flex-1 bg-theme text-theme placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            <button
              onClick={() => {
                if (taskSearch.trim() === '') setFilteredTasks([]);
                else setFilteredTasks(nlDataRetrieval(taskSearch, appData.tasks));
              }}
              className="custom-blue-button px-5 py-2 rounded shadow hover:scale-105 transition"
            >
              Search Tasks
            </button>
          </div>
          {taskSearch && filteredTasks.length === 0 && (
            <div className="text-red-600 mb-2">No matching tasks found.</div>
          )}
          <DataGridComponent
            title="Tasks Data"
            rowData={filteredTasks.length ? filteredTasks : appData.tasks}
            columnDefs={taskColDefs}
            onCellValueChanged={onTaskEdit}
            errors={errors.tasks}
          />
          <ValidationSummary
            errors={errors.tasks}
            rowData={appData.tasks}
            entityType="tasks"
            onApplyFix={handleApplyTaskFix}
          />
          <button
            className="mt-4 custom-blue-button px-5 py-2 rounded shadow hover:scale-105 transition"
            onClick={() => exportCSV(appData.tasks, 'tasks_cleaned.csv')}
          >
            Export Tasks as CSV
          </button>
        </section>
      )}

      {/* --- Rules Panel --- */}
      <section className="my-12 fade-in">
        <h2 className="text-2xl font-semibold mb-4">Business Rules</h2>
        <RuleForm onAddRule={rule => setRules(prev => [...prev, rule])} />

        {/* --- Natural Language to Rule Converter --- */}
        <div className="mt-8 p-6 bg-white rounded-lg shadow custom-white-box">
          <h3 className="text-xl font-semibold mb-3 bg-black p-3 rounded text-white text-center">
            Natural Language to Rule Converter
          </h3>
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
              placeholder="e.g. Workers in group A should not have more than 3 tasks per phase"
              className="border border-gray-300 rounded px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-black transition"
            />
            <button
              type="submit"
              disabled={nlRuleLoading}
              className="bg-black px-5 py-2 rounded font-semibold text-white shadow hover:brightness-110 transition"
            >
              {nlRuleLoading ? 'Converting...' : 'Convert to Rule'}
            </button>
          </form>
          {nlRuleError && <p className="text-red-600 mt-3">{nlRuleError}</p>}
          {nlRuleResult && (
            <div className="bg-green-100 text-green-900 p-4 rounded mt-4">
              <div>AI Parsed Rule:</div>
              <pre className="whitespace-pre-wrap">{JSON.stringify(nlRuleResult, null, 2)}</pre>
              <button
                onClick={() => {
                  setRules(prev => [...prev, nlRuleResult]);
                  setNlRuleResult(null);
                  setNlRuleText('');
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded mt-3 shadow transition-transform duration-200 hover:scale-105"
              >
                Add Rule
              </button>
            </div>
          )}
        </div>

        {/* --- AI Rule Recommendations Panel --- */}
        <div className="flex justify-center w-full">
          <div className="mt-8 p-6 bg-blue-50 rounded-lg shadow fade-in w-full max-w-xl">
            <h3 className="text-xl font-semibold mb-3 text-blue-700 text-center">
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
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded px-5 py-2 shadow transition-transform duration-200 hover:scale-105 mx-auto block"
            >
              {aiRuleLoading ? 'Analyzing...' : 'Get AI Rule Recommendations'}
            </button>
            {aiRuleError && <p className="text-red-600 mt-3">{aiRuleError}</p>}
            {aiRuleRecs.length > 0 && (
              <ul className="list-disc ml-6 mt-4 space-y-2">
                {aiRuleRecs.map((rec, idx) => (
                  <li key={idx} className="bg-white p-3 rounded shadow flex items-center justify-between">
                    <pre className="whitespace-pre-wrap max-w-xl">{JSON.stringify(rec, null, 2)}</pre>
                    <button
                      onClick={() => setRules(prev => [...prev, rec])}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded shadow transition hover:scale-105"
                    >
                      Add Rule
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Rules List */}
        <ul className="mt-8 list-disc ml-6 space-y-2">
          {rules.map((rule, idx) => (
            <li key={idx} className="bg-gray-50 p-3 rounded shadow">
              {rule.type === 'coRun' && <>Co-Run: Tasks <b>{rule.tasks.join(', ')}</b></>}
              {rule.type === 'slotRestriction' && <>Slot Restriction: WorkerGroup <b>{rule.workerGroup}</b>, Min Common Slots <b>{rule.minSlots}</b></>}
              {rule.type === 'loadLimit' && <>Load Limit: WorkerGroup <b>{rule.workerGroup}</b>, Max Slots Per Phase <b>{rule.maxSlots}</b></>}
              {rule.type === 'phaseWindow' && <>Phase Window: Task <b>{rule.taskId}</b>, Allowed Phases <b>{rule.allowedPhases.join(', ')}</b></>}
              {!['coRun', 'slotRestriction', 'loadLimit', 'phaseWindow'].includes(rule.type) && <>{JSON.stringify(rule)}</>}
            </li>
          ))}
        </ul>
        <button
          onClick={handleExportRules}
          className="mt-6 bg-green-700 hover:bg-green-800 text-white font-semibold rounded px-6 py-3 shadow transition-transform duration-200 hover:scale-105"
        >
          Export Rules as JSON
        </button>
      </section>

      {/* Prioritization & Weights Panel */}
      <section className="my-12 fade-in">
        <h2 className="text-2xl font-semibold mb-4">Prioritization & Weights</h2>
        <div className="flex gap-4 mb-4 flex-wrap">
          <button
            onClick={() => setWeights({ priorityLevel: 10, requestedTaskIDs: 3, fairness: 5, workload: 2 })}
            className="bg-gray-300 hover:bg-gray-400 rounded px-4 py-2 shadow transition hover:scale-105"
          >
            Maximize Fulfillment
          </button>
          <button
            onClick={() => setWeights({ priorityLevel: 3, requestedTaskIDs: 10, fairness: 4, workload: 2 })}
            className="bg-gray-300 hover:bg-gray-400 rounded px-4 py-2 shadow transition hover:scale-105"
          >
            Fair Distribution
          </button>
          <button
            onClick={() => setWeights({ priorityLevel: 2, requestedTaskIDs: 2, fairness: 4, workload: 10 })}
            className="bg-gray-300 hover:bg-gray-400 rounded px-4 py-2 shadow transition hover:scale-105"
          >
            Minimize Workload
          </button>
        </div>
        <div className="space-y-6 max-w-md">
          {[
            { label: 'Priority Level Weight', value: weights.priorityLevel, key: 'priorityLevel' },
            { label: 'Requested TaskIDs Fulfillment', value: weights.requestedTaskIDs, key: 'requestedTaskIDs' },
            { label: 'Fairness Constraint', value: weights.fairness, key: 'fairness' },
            { label: 'Minimize Workload', value: weights.workload, key: 'workload' },
          ].map(({ label, value, key }) => (
            <div key={key}>
              <label className="block mb-1">{label}</label>
              <input
                type="range"
                min={1}
                max={10}
                value={value}
                onChange={e => setWeights(w => ({ ...w, [key]: Number(e.target.value) }))}
                className="w-full accent-blue-600"
              />
              <span className="font-mono">{value}</span>
            </div>
          ))}
        </div>
      </section>
 <footer className="mt-16 mb-4 w-full flex justify-center">
  <div className="flex flex-col md:flex-row items-center gap-4 bg-gray-900 text-white rounded-lg shadow-lg px-6 py-4 max-w-2xl w-full fade-in">
    <img
      src="raj.jpg"
      alt="Raj Pandey"
      className="w-16 h-16 rounded-full border-2 border-white shadow object-cover"
    />
    <div className="flex-1">
      <div className="font-semibold text-lg">Made by Raj Pandey</div>
      <div className="text-sm text-gray-300 mt-1">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <span>Contact:</span>
          <a
            href="mailto:rajxpandey7@gmail.com"
            className="underline text-blue-300 hover:text-blue-400"
            target="_blank" rel="noopener noreferrer"
          >Email</a>
          <a
            href="https://www.linkedin.com/in/raj-pandey-/"
            className="underline text-blue-300 hover:text-blue-400"
            target="_blank" rel="noopener noreferrer"
          >LinkedIn</a>
          <a
            href=""
            className="underline text-blue-300 hover:text-blue-400"
            target="_blank" rel="noopener noreferrer"
          >GitHub</a>
        </div>
        <span className="block mt-1">
          <strong>Motivation:</strong> Data Alchemist was built to empower users to easily validate, explore, and optimize business data using modern AI and intuitive tools. My goal was to combine robust data engineering with accessible, interactive design, inspired by real-world needs in analytics and automation.
        </span>
      </div>
    </div>
  </div>
</footer>


    </div>
  );
}
