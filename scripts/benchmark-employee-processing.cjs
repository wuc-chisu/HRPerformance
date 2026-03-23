const fs = require("fs/promises");
const path = require("path");
const { performance } = require("perf_hooks");

const DEFAULT_DATA_FILE = path.join(
  __dirname,
  "..",
  "data-exports",
  "employees_latest.json"
);

function parseArgs(argv) {
  const options = {
    data: DEFAULT_DATA_FILE,
    runs: 5,
    delayMs: 2,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--data" && argv[index + 1]) {
      options.data = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }

    if (token === "--runs" && argv[index + 1]) {
      const parsed = Number(argv[index + 1]);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.runs = Math.floor(parsed);
      }
      index += 1;
      continue;
    }

    if (token === "--delay-ms" && argv[index + 1]) {
      const parsed = Number(argv[index + 1]);
      if (Number.isFinite(parsed) && parsed >= 0) {
        options.delayMs = parsed;
      }
      index += 1;
      continue;
    }
  }

  return options;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processEmployee(employee, delayMs) {
  if (delayMs > 0) {
    await wait(delayMs);
  }

  const records = Array.isArray(employee.weeklyRecords) ? employee.weeklyRecords : [];

  let totalAssignedTasks = 0;
  let totalWeeklyOverdue = 0;

  for (const record of records) {
    totalAssignedTasks += Number(record.assignedTasks || 0);
    totalWeeklyOverdue += Number(record.weeklyOverdueTasks || 0);
  }

  return {
    employeeId: employee.employeeId || employee.id || "UNKNOWN",
    weeklyRecordCount: records.length,
    totalAssignedTasks,
    totalWeeklyOverdue,
  };
}

async function runSequential(employees, delayMs) {
  const result = [];
  for (const employee of employees) {
    result.push(await processEmployee(employee, delayMs));
  }
  return result;
}

async function runParallel(employees, delayMs) {
  return Promise.all(employees.map((employee) => processEmployee(employee, delayMs)));
}

async function measure(label, fn, runs) {
  const timings = [];
  let sample = null;

  for (let run = 0; run < runs; run += 1) {
    const start = performance.now();
    sample = await fn();
    timings.push(performance.now() - start);
  }

  const averageMs = timings.reduce((sum, time) => sum + time, 0) / timings.length;

  return {
    label,
    timings,
    averageMs,
    sample,
  };
}

function formatMs(value) {
  return `${value.toFixed(2)} ms`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const payload = await fs.readFile(options.data, "utf8");
  const employees = JSON.parse(payload);

  if (!Array.isArray(employees) || employees.length === 0) {
    throw new Error("No employees found in data file.");
  }

  console.log("Employee processing benchmark");
  console.log("Data file:", options.data);
  console.log("Employee count:", employees.length);
  console.log("Simulated async delay per employee:", `${options.delayMs} ms`);
  console.log("Runs per mode:", options.runs);
  console.log("");

  await runSequential(employees.slice(0, 3), options.delayMs);
  await runParallel(employees.slice(0, 3), options.delayMs);

  const sequential = await measure(
    "Sequential (for...of + await)",
    () => runSequential(employees, options.delayMs),
    options.runs
  );

  const parallel = await measure(
    "Parallel (Promise.all)",
    () => runParallel(employees, options.delayMs),
    options.runs
  );

  console.log(sequential.label, "average:", formatMs(sequential.averageMs));
  console.log("  timings:", sequential.timings.map(formatMs).join(", "));
  console.log(parallel.label, "average:", formatMs(parallel.averageMs));
  console.log("  timings:", parallel.timings.map(formatMs).join(", "));

  const speedup = sequential.averageMs / parallel.averageMs;
  const savings = sequential.averageMs - parallel.averageMs;

  console.log("");
  console.log("Average time saved by Promise.all:", formatMs(savings));
  console.log("Speedup:", `${speedup.toFixed(2)}x`);

  const sample = parallel.sample[0];
  if (sample) {
    console.log("");
    console.log("Sample processed employee output:", sample);
  }
}

main().catch((error) => {
  console.error("Benchmark failed:", error.message || error);
  process.exit(1);
});
