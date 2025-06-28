import React, { useState } from 'react';

export default function RuleForm({ onAddRule }: { onAddRule: (rule: any) => void }) {
  const [type, setType] = useState('coRun');
  const [tasks, setTasks] = useState('');
  const [workerGroup, setWorkerGroup] = useState('');
  const [minSlots, setMinSlots] = useState('');
  const [maxSlots, setMaxSlots] = useState('');
  const [phaseTask, setPhaseTask] = useState('');
  const [phaseList, setPhaseList] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'coRun') {
      onAddRule({ type, tasks: tasks.split(',').map((t) => t.trim()) });
      setTasks('');
    }
    if (type === 'slotRestriction') {
      onAddRule({ type, workerGroup, minSlots: Number(minSlots) });
      setWorkerGroup('');
      setMinSlots('');
    }
    if (type === 'loadLimit') {
      onAddRule({ type, workerGroup, maxSlots: Number(maxSlots) });
      setWorkerGroup('');
      setMaxSlots('');
    }
    if (type === 'phaseWindow') {
      onAddRule({ type, taskId: phaseTask, allowedPhases: phaseList.split(',').map(p => p.trim()) });
      setPhaseTask('');
      setPhaseList('');
    }
    // Add more rule types as needed
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label>
        Rule Type:
        <select value={type} onChange={e => setType(e.target.value)} className="ml-2">
          <option value="coRun">Co-Run</option>
          <option value="slotRestriction">Slot Restriction</option>
          <option value="loadLimit">Load Limit</option>
          <option value="phaseWindow">Phase Window</option>
        </select>
      </label>
      {type === 'coRun' && (
        <label>
          Task IDs (comma separated): 
          <input
            type="text"
            value={tasks}
            onChange={e => setTasks(e.target.value)}
            className="ml-2 border px-1"
            placeholder="e.g. T1, T2"
          />
        </label>
      )}
      {type === 'slotRestriction' && (
        <>
          <label>
            Worker Group:
            <input
              type="text"
              value={workerGroup}
              onChange={e => setWorkerGroup(e.target.value)}
              className="ml-2 border px-1"
              placeholder="e.g. GroupA"
            />
          </label>
          <label>
            Min Common Slots:
            <input
              type="number"
              value={minSlots}
              onChange={e => setMinSlots(e.target.value)}
              className="ml-2 border px-1"
              placeholder="e.g. 2"
            />
          </label>
        </>
      )}
      {type === 'loadLimit' && (
        <>
          <label>
            Worker Group:
            <input
              type="text"
              value={workerGroup}
              onChange={e => setWorkerGroup(e.target.value)}
              className="ml-2 border px-1"
              placeholder="e.g. GroupA"
            />
          </label>
          <label>
            Max Slots Per Phase:
            <input
              type="number"
              value={maxSlots}
              onChange={e => setMaxSlots(e.target.value)}
              className="ml-2 border px-1"
              placeholder="e.g. 3"
            />
          </label>
        </>
      )}
      {type === 'phaseWindow' && (
        <>
          <label>
            Task ID:
            <input
              type="text"
              value={phaseTask}
              onChange={e => setPhaseTask(e.target.value)}
              className="ml-2 border px-1"
              placeholder="e.g. T1"
            />
          </label>
          <label>
            Allowed Phases (comma separated):
            <input
              type="text"
              value={phaseList}
              onChange={e => setPhaseList(e.target.value)}
              className="ml-2 border px-1"
              placeholder="e.g. 1,2,3"
            />
          </label>
        </>
      )}
      <button type="submit" className="bg-blue-500 text-white px-3 py-1 rounded">Add Rule</button>
    </form>
  );
}
