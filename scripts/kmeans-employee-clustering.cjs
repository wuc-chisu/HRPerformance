const fs = require("fs/promises");
const path = require("path");

const DEFAULT_DATA_FILE = path.join(
  __dirname,
  "..",
  "data-exports",
  "employees_latest.json"
);

function parseArgs(argv) {
  const options = {
    data: DEFAULT_DATA_FILE,
    k: 3,
    maxIterations: 50,
    seed: 42,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === "--data" && argv[i + 1]) {
      options.data = path.resolve(argv[i + 1]);
      i += 1;
      continue;
    }

    if (token === "--k" && argv[i + 1]) {
      const parsed = Number(argv[i + 1]);
      if (Number.isFinite(parsed) && parsed >= 2) {
        options.k = Math.floor(parsed);
      }
      i += 1;
      continue;
    }

    if (token === "--max-iter" && argv[i + 1]) {
      const parsed = Number(argv[i + 1]);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.maxIterations = Math.floor(parsed);
      }
      i += 1;
      continue;
    }

    if (token === "--seed" && argv[i + 1]) {
      const parsed = Number(argv[i + 1]);
      if (Number.isFinite(parsed)) {
        options.seed = Math.floor(parsed);
      }
      i += 1;
    }
  }

  return options;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function seededRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toFeatures(employee) {
  const records = Array.isArray(employee.weeklyRecords) ? employee.weeklyRecords : [];

  const workHoursRatios = records.map((record) => {
    const planned = Number(record.plannedWorkHours || 0);
    const actual = Number(record.actualWorkHours || 0);
    if (planned <= 0) return 0;
    return actual / planned;
  });

  const avgAssignedTasks = average(
    records.map((record) => Number(record.assignedTasks || 0))
  );

  const avgWeeklyOverdue = average(
    records.map((record) => Number(record.weeklyOverdueTasks || 0))
  );

  const avgAllOverdue = average(
    records.map((record) => Number(record.allOverdueTasks || 0))
  );

  return {
    employeeId: employee.employeeId || employee.id || "UNKNOWN",
    name: employee.name || "Unknown",
    // Feature vector: [work-hours ratio, assigned tasks, weekly overdue, all overdue]
    vector: [
      average(workHoursRatios),
      avgAssignedTasks,
      avgWeeklyOverdue,
      avgAllOverdue,
    ],
  };
}

function normalizeVectors(items) {
  const dimensions = items[0].vector.length;
  const mins = Array.from({ length: dimensions }, () => Number.POSITIVE_INFINITY);
  const maxs = Array.from({ length: dimensions }, () => Number.NEGATIVE_INFINITY);

  for (const item of items) {
    item.vector.forEach((value, idx) => {
      mins[idx] = Math.min(mins[idx], value);
      maxs[idx] = Math.max(maxs[idx], value);
    });
  }

  const normalized = items.map((item) => {
    const vector = item.vector.map((value, idx) => {
      const min = mins[idx];
      const max = maxs[idx];
      if (max === min) return 0;
      return clamp((value - min) / (max - min), 0, 1);
    });

    return { ...item, vector };
  });

  return { normalized, mins, maxs };
}

function distance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function meanVector(vectors, dimensions) {
  if (!vectors.length) return Array.from({ length: dimensions }, () => 0);
  const sums = Array.from({ length: dimensions }, () => 0);

  for (const vector of vectors) {
    for (let i = 0; i < dimensions; i += 1) {
      sums[i] += vector[i];
    }
  }

  return sums.map((sum) => sum / vectors.length);
}

function initializeCentroids(vectors, k, random) {
  const chosen = new Set();
  const centroids = [];

  while (centroids.length < k) {
    const idx = Math.floor(random() * vectors.length);
    if (chosen.has(idx)) continue;
    chosen.add(idx);
    centroids.push([...vectors[idx]]);
  }

  return centroids;
}

function runKMeans(vectors, k, maxIterations, seed) {
  if (vectors.length < k) {
    throw new Error(`k (${k}) cannot be greater than employee count (${vectors.length}).`);
  }

  const random = seededRandom(seed);
  let centroids = initializeCentroids(vectors, k, random);
  let assignments = Array.from({ length: vectors.length }, () => -1);
  let iterations = 0;

  for (let iter = 0; iter < maxIterations; iter += 1) {
    iterations = iter + 1;
    let changed = false;

    // Assign each point to nearest centroid.
    for (let i = 0; i < vectors.length; i += 1) {
      let bestCluster = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (let cluster = 0; cluster < centroids.length; cluster += 1) {
        const d = distance(vectors[i], centroids[cluster]);
        if (d < bestDistance) {
          bestDistance = d;
          bestCluster = cluster;
        }
      }

      if (assignments[i] !== bestCluster) {
        assignments[i] = bestCluster;
        changed = true;
      }
    }

    // Recompute centroids.
    const groups = Array.from({ length: k }, () => []);
    for (let i = 0; i < vectors.length; i += 1) {
      groups[assignments[i]].push(vectors[i]);
    }

    centroids = groups.map((group, clusterIndex) => {
      if (!group.length) {
        const fallback = Math.floor(random() * vectors.length);
        return [...vectors[fallback]];
      }
      return meanVector(group, vectors[0].length);
    });

    if (!changed) {
      break;
    }
  }

  return { assignments, centroids, iterations };
}

function roundVector(vector, decimals = 3) {
  return vector.map((value) => Number(value.toFixed(decimals)));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const payload = await fs.readFile(options.data, "utf8");
  const rawEmployees = JSON.parse(payload);

  if (!Array.isArray(rawEmployees) || rawEmployees.length === 0) {
    throw new Error("No employee data found in input dataset.");
  }

  const featureRows = rawEmployees.map(toFeatures);
  const { normalized } = normalizeVectors(featureRows);

  const vectors = normalized.map((row) => row.vector);
  const { assignments, centroids, iterations } = runKMeans(
    vectors,
    options.k,
    options.maxIterations,
    options.seed
  );

  const clusters = Array.from({ length: options.k }, () => ({
    members: [],
  }));

  normalized.forEach((row, index) => {
    clusters[assignments[index]].members.push(row);
  });

  console.log("K-means clustering example (employee performance data)");
  console.log("Data file:", options.data);
  console.log("Employees:", normalized.length);
  console.log("k:", options.k);
  console.log("Iterations:", iterations);
  console.log("");

  clusters.forEach((cluster, index) => {
    const memberCount = cluster.members.length;
    const avg = meanVector(
      cluster.members.map((member) => member.vector),
      vectors[0].length
    );

    console.log(`Cluster ${index + 1} (${memberCount} employees)`);
    console.log(
      "  Centroid [workHoursRatio, assignedTasks, weeklyOverdue, allOverdue]:",
      roundVector(centroids[index])
    );
    console.log("  Average member profile (normalized):", roundVector(avg));
    console.log(
      "  Members:",
      cluster.members
        .map((member) => `${member.employeeId} (${member.name})`)
        .join(", ") || "none"
    );
    console.log("");
  });
}

main().catch((error) => {
  console.error("Clustering failed:", error.message || error);
  process.exit(1);
});
