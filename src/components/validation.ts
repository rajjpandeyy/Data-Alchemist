// Helper for safe JSON parse
function isValidJSON(str: string) {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

// Helper to parse AvailableSlots as either JSON array or comma-separated string
function parseAvailableSlots(value: string): number[] | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();

  // Try to parse as JSON array
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const arr = JSON.parse(trimmed);
      if (Array.isArray(arr) && arr.every(n => typeof n === 'number')) {
        return arr;
      }
    } catch (e) {
      // Not valid JSON, fall through
    }
  }

  // Try to parse as comma-separated numbers
  const arr = trimmed.split(',').map(s => Number(s.trim()));
  if (arr.every(n => !isNaN(n))) {
    return arr;
  }

  // If all parsing fails, return null
  return null;
}

// Validate Clients with cross-entity checks
export function validateClients(data: any[], tasks: any[]) {
  const errors: { row: number; col: string; message: string }[] = [];
  const idSet = new Set();
  const taskIDs = new Set(tasks.map((t: any) => t.TaskID));

  data.forEach((row, idx) => {
    // Required columns
    ['ClientID', 'ClientName', 'PriorityLevel'].forEach(col => {
      if (!row[col] || String(row[col]).trim() === '') {
        errors.push({ row: idx, col, message: `Missing required column ${col}.` });
      }
    });
    // Duplicate IDs
    if (idSet.has(row.ClientID)) {
      errors.push({ row: idx, col: 'ClientID', message: 'Duplicate ClientID.' });
    } else {
      idSet.add(row.ClientID);
    }
    // Out-of-range PriorityLevel
    const priority = parseInt(row.PriorityLevel, 10);
    if (isNaN(priority) || priority < 1 || priority > 5) {
      errors.push({ row: idx, col: 'PriorityLevel', message: 'PriorityLevel must be between 1 and 5.' });
    }
    // Broken JSON in AttributesJSON
    if (row.AttributesJSON && !isValidJSON(row.AttributesJSON)) {
      errors.push({ row: idx, col: 'AttributesJSON', message: 'Broken JSON in AttributesJSON.' });
    }
    // Unknown references in RequestedTaskIDs
    if (row.RequestedTaskIDs) {
      const ids = String(row.RequestedTaskIDs).split(',').map((id: string) => id.trim());
      ids.forEach(id => {
        if (id && !taskIDs.has(id)) {
          errors.push({ row: idx, col: 'RequestedTaskIDs', message: `Unknown TaskID: ${id}` });
        }
      });
    }
  });
  return errors;
}

// Validate Workers with improved AvailableSlots parsing
export function validateWorkers(data: any[], tasks: any[] = []) {
  const errors: { row: number; col: string; message: string }[] = [];
  const idSet = new Set();

  data.forEach((row, idx) => {
    // Required columns
    ['WorkerID', 'WorkerName', 'MaxLoadPerPhase'].forEach(col => {
      if (!row[col] || String(row[col]).trim() === '') {
        errors.push({ row: idx, col, message: `Missing required column ${col}.` });
      }
    });
    // Duplicate IDs
    if (idSet.has(row.WorkerID)) {
      errors.push({ row: idx, col: 'WorkerID', message: 'Duplicate WorkerID.' });
    } else {
      idSet.add(row.WorkerID);
    }
    // Out-of-range MaxLoadPerPhase
    const maxLoad = parseInt(row.MaxLoadPerPhase, 10);
    if (isNaN(maxLoad) || maxLoad < 1) {
      errors.push({ row: idx, col: 'MaxLoadPerPhase', message: 'MaxLoadPerPhase must be >= 1.' });
    }
    // Malformed AvailableSlots
    if (row.AvailableSlots) {
      const slots = parseAvailableSlots(row.AvailableSlots);
      if (!slots) {
        errors.push({ row: idx, col: 'AvailableSlots', message: 'Malformed AvailableSlots (must be numbers).' });
      } else {
        // Overloaded worker: slots.length < maxLoad
        if (slots.length < maxLoad) {
          errors.push({ row: idx, col: 'AvailableSlots', message: 'Worker overloaded: AvailableSlots.length < MaxLoadPerPhase.' });
        }
      }
    }
  });
  return errors;
}

// Validate Tasks with cross-entity skill coverage and out-of-range checks
export function validateTasks(data: any[], workers: any[] = []) {
  const errors: { row: number; col: string; message: string }[] = [];
  const idSet = new Set();

  // Build a set of all worker skills
  const allSkills = new Set<string>();
  workers.forEach(w => {
    if (w.Skills) {
      String(w.Skills).split(',').map((s: string) => s.trim()).forEach(skill => allSkills.add(skill));
    }
  });

  data.forEach((row, idx) => {
    // Required columns
    ['TaskID', 'TaskName', 'Duration'].forEach(col => {
      if (!row[col] || String(row[col]).trim() === '') {
        errors.push({ row: idx, col, message: `Missing required column ${col}.` });
      }
    });
    // Duplicate IDs
    if (idSet.has(row.TaskID)) {
      errors.push({ row: idx, col: 'TaskID', message: 'Duplicate TaskID.' });
    } else {
      idSet.add(row.TaskID);
    }
    // Out-of-range Duration
    const duration = parseInt(row.Duration, 10);
    if (isNaN(duration) || duration < 1) {
      errors.push({ row: idx, col: 'Duration', message: 'Duration must be >= 1.' });
    }
    // Skill coverage: every RequiredSkill must exist in at least one worker
    if (row.RequiredSkills) {
      const reqSkills = String(row.RequiredSkills).split(',').map((s: string) => s.trim());
      reqSkills.forEach(skill => {
        if (skill && !allSkills.has(skill)) {
          errors.push({ row: idx, col: 'RequiredSkills', message: `No worker covers required skill: ${skill}` });
        }
      });
    }
  });
  return errors;
}
