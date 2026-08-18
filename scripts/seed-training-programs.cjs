require("dotenv/config");

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TRAINING_PROGRAMS = [
  {
    code: "WUC_ETHICS",
    trainingName: "WUC Ethics & Professional Conduct Training",
    category: "WUC_REQUIRED_TRAINING",
    requirementType: "REQUIRED",
    appliesTo: ["ALL_EMPLOYEES"],
    startDate: "2026-08-24",
    dueDate: "2026-09-24",
    recurrence: "ANNUAL",
    recurrenceIntervalValue: 12,
    recurrenceIntervalUnit: "MONTHS",
    nextCycleDate: "2027-08-24",
    trainingMethod: "WUC_INTERNAL_COURSE",
    completionMethod: "EXAM_SCORE",
    examRequired: true,
    passingScore: 80,
    certificateRequired: true,
    status: "ACTIVE",
    assignEmployees: true,
  },
  {
    code: "CA_SHPT_EMPLOYEE",
    trainingName: "Sexual Harassment & Abusive Conduct Prevention - Employee",
    category: "CALIFORNIA_REQUIRED_TRAINING",
    requirementType: "REQUIRED",
    appliesTo: ["CALIFORNIA_NON_SUPERVISORY_EMPLOYEES"],
    startDate: "2026-08-24",
    dueDate: "2026-09-24",
    recurrence: "EVERY_2_YEARS",
    recurrenceIntervalValue: 24,
    recurrenceIntervalUnit: "MONTHS",
    nextCycleDate: "2028-08-24",
    trainingMethod: "EXTERNAL_TRAINING",
    completionMethod: "CERTIFICATE",
    examRequired: false,
    passingScore: null,
    certificateRequired: true,
    status: "ACTIVE",
    assignEmployees: true,
  },
  {
    code: "CA_SHPT_SUPERVISOR",
    trainingName: "Sexual Harassment & Abusive Conduct Prevention - Supervisor",
    category: "CALIFORNIA_REQUIRED_TRAINING",
    requirementType: "REQUIRED",
    appliesTo: ["CALIFORNIA_SUPERVISORS_MANAGERS"],
    startDate: "2026-08-24",
    dueDate: "2026-09-24",
    recurrence: "EVERY_2_YEARS",
    recurrenceIntervalValue: 24,
    recurrenceIntervalUnit: "MONTHS",
    nextCycleDate: "2028-08-24",
    trainingMethod: "EXTERNAL_TRAINING",
    completionMethod: "CERTIFICATE",
    examRequired: false,
    passingScore: null,
    certificateRequired: true,
    status: "ACTIVE",
    assignEmployees: true,
  },
  {
    code: "CA_WVPP",
    trainingName: "Workplace Violence Prevention Training",
    category: "CALIFORNIA_REQUIRED_TRAINING",
    requirementType: "REQUIRED",
    appliesTo: ["APPLICABLE_CALIFORNIA_EMPLOYEES"],
    startDate: "2026-08-24",
    dueDate: "2026-09-24",
    recurrence: "ANNUAL",
    recurrenceIntervalValue: 12,
    recurrenceIntervalUnit: "MONTHS",
    nextCycleDate: "2027-08-24",
    trainingMethod: "WUC_INTERNAL_COURSE",
    completionMethod: "EXAM_SCORE",
    examRequired: true,
    passingScore: 80,
    certificateRequired: true,
    status: "ACTIVE",
    assignEmployees: true,
  },
  {
    code: "BBP_SHARPS",
    trainingName: "Bloodborne Pathogens / Exposure Control & Sharps Safety",
    category: "CLINIC_SAFETY_TRAINING",
    requirementType: "REQUIRED",
    appliesTo: ["CLINIC_PERSONNEL", "EMPLOYEES_WITH_OCCUPATIONAL_EXPOSURE"],
    startDate: "2026-08-24",
    dueDate: "2026-09-24",
    recurrence: "ANNUAL",
    recurrenceIntervalValue: 12,
    recurrenceIntervalUnit: "MONTHS",
    nextCycleDate: "2027-08-24",
    trainingMethod: "WUC_INTERNAL_COURSE",
    completionMethod: "EXAM_SCORE",
    examRequired: true,
    passingScore: 80,
    certificateRequired: true,
    status: "ACTIVE",
    assignEmployees: true,
  },
  {
    code: "FACULTY_PD",
    trainingName: "Faculty Professional Development / Teaching Skills",
    category: "FACULTY_TRAINING",
    requirementType: "REQUIRED",
    appliesTo: ["FACULTY", "EDUCATIONAL_ADMINISTRATORS"],
    startDate: "2026-08-24",
    dueDate: "2027-08-23",
    recurrence: "ANNUAL",
    recurrenceIntervalValue: 12,
    recurrenceIntervalUnit: "MONTHS",
    nextCycleDate: "2027-08-24",
    trainingMethod: "PROFESSIONAL_DEVELOPMENT_RECORD",
    completionMethod: "HOURS_EVIDENCE_REQUIREMENT",
    examRequired: false,
    passingScore: null,
    certificateRequired: true,
    status: "ACTIVE",
    assignEmployees: true,
  },
  {
    code: "DE_FACULTY",
    trainingName: "Distance Education Faculty Training",
    category: "FACULTY_TRAINING",
    requirementType: "REQUIRED",
    appliesTo: ["ONLINE_HYBRID_FACULTY"],
    startDate: "2026-08-24",
    dueDate: "2026-09-24",
    recurrence: "ANNUAL",
    recurrenceIntervalValue: 12,
    recurrenceIntervalUnit: "MONTHS",
    nextCycleDate: "2027-08-24",
    trainingMethod: "WUC_INTERNAL_COURSE",
    completionMethod: "EXAM_SCORE",
    examRequired: true,
    passingScore: 80,
    certificateRequired: true,
    status: "ACTIVE",
    assignEmployees: true,
  },
  {
    code: "DE_ADMIN_PD",
    trainingName: "Distance Education Administrator Professional Development",
    category: "ACCREDITATION_COMPLIANCE_TRAINING",
    requirementType: "REQUIRED",
    appliesTo: ["DISTANCE_EDUCATION_ADMINISTRATORS"],
    startDate: "2026-08-24",
    dueDate: "2027-08-23",
    recurrence: "ANNUAL",
    recurrenceIntervalValue: 12,
    recurrenceIntervalUnit: "MONTHS",
    nextCycleDate: "2027-08-24",
    trainingMethod: "PROFESSIONAL_DEVELOPMENT_RECORD",
    completionMethod: "HOURS_EVIDENCE_REQUIREMENT",
    examRequired: false,
    passingScore: null,
    certificateRequired: true,
    status: "ACTIVE",
    assignEmployees: true,
  },
  {
    code: "CA_ACU_CE",
    trainingName: "California Acupuncturist Continuing Education",
    category: "PROFESSIONAL_DEVELOPMENT",
    requirementType: "REQUIRED",
    appliesTo: ["LICENSED_ACUPUNCTURISTS"],
    startDate: "2026-08-24",
    dueDate: "2028-08-23",
    recurrence: "EVERY_2_YEARS",
    recurrenceIntervalValue: 24,
    recurrenceIntervalUnit: "MONTHS",
    nextCycleDate: "2028-08-24",
    trainingMethod: "CERTIFICATE_RECORD_TRACKING",
    completionMethod: "HOURS_CE_REQUIREMENT",
    examRequired: false,
    passingScore: null,
    certificateRequired: true,
    status: "ACTIVE",
    assignEmployees: false,
  },
];

function toDate(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return date;
}

function daysBetween(startDate, dueDate) {
  return Math.max(0, Math.floor((dueDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
}

function calculateDueDateFromWindow(startDate, windowDays) {
  const dueDate = new Date(startDate);
  dueDate.setUTCDate(dueDate.getUTCDate() + Math.max(0, windowDays));
  return dueDate;
}

function includesNormalized(value, terms) {
  return terms.some((term) => value.includes(term));
}

function isCaliforniaEmployee(employee) {
  const location = (employee.staffWorkLocation || "").trim().toLowerCase();
  const department = employee.department.toLowerCase();
  const position = employee.position.toLowerCase();

  return (
    location === "ca" ||
    location === "california" ||
    location.includes("california") ||
    includesNormalized(department, ["california", "ca "]) ||
    includesNormalized(position, ["california", "ca "])
  );
}

function isSupervisoryRole(employee) {
  const role = employee.systemRole.toLowerCase();
  const position = employee.position.toLowerCase();

  return (
    role === "manager" ||
    role === "hr admin" ||
    role === "executive" ||
    includesNormalized(position, ["manager", "supervisor", "director", "administrator", "dean", "chair"])
  );
}

function isEducationalAdministrator(employee) {
  const department = employee.department.toLowerCase();
  const position = employee.position.toLowerCase();

  return includesNormalized(position, ["administrator", "director", "dean", "chair", "principal"]) ||
    includesNormalized(department, ["academic affairs", "education", "instruction", "faculty"]);
}

function isClinicOrExposureRole(employee) {
  const department = employee.department.toLowerCase();
  const position = employee.position.toLowerCase();

  return includesNormalized(department, ["clinic", "patient", "health", "acupuncture", "lab"]) ||
    includesNormalized(position, ["clinic", "patient", "health", "acupuncturist", "exposure", "sharps", "lab"]);
}

function isDistanceEducationAdministrator(employee) {
  const department = employee.department.toLowerCase();
  const position = employee.position.toLowerCase();
  const isDistanceEducation = includesNormalized(`${department} ${position}`, ["distance education", "online", "hybrid"]);

  return isDistanceEducation && isEducationalAdministrator(employee);
}

function matchesAppliesTo(employee, appliesTo, customGroupName) {
  if (appliesTo.includes("ALL_EMPLOYEES")) return true;
  if (appliesTo.includes("EMPLOYEES") && employee.systemRole === "Employee") return true;
  if (appliesTo.includes("MANAGERS") && employee.systemRole === "Manager") return true;
  if (appliesTo.includes("HR_ADMINS") && employee.systemRole === "HR Admin") return true;
  if (appliesTo.includes("EXECUTIVES") && employee.systemRole === "Executive") return true;

  const positionLower = employee.position.toLowerCase();
  const departmentLower = employee.department.toLowerCase();
  const californiaEmployee = isCaliforniaEmployee(employee);
  const supervisoryRole = isSupervisoryRole(employee);

  if (appliesTo.includes("CALIFORNIA_NON_SUPERVISORY_EMPLOYEES") && californiaEmployee && !supervisoryRole) return true;
  if (appliesTo.includes("CALIFORNIA_SUPERVISORS_MANAGERS") && californiaEmployee && supervisoryRole) return true;
  if (appliesTo.includes("APPLICABLE_CALIFORNIA_EMPLOYEES") && californiaEmployee) return true;
  if (appliesTo.includes("FACULTY") && positionLower.includes("faculty")) return true;
  if (appliesTo.includes("EDUCATIONAL_ADMINISTRATORS") && isEducationalAdministrator(employee)) return true;
  if (appliesTo.includes("CLINIC_PERSONNEL") && (departmentLower.includes("clinic") || positionLower.includes("clinic"))) return true;
  if (appliesTo.includes("EMPLOYEES_WITH_OCCUPATIONAL_EXPOSURE") && isClinicOrExposureRole(employee)) return true;
  if (appliesTo.includes("ONLINE_HYBRID_FACULTY") && positionLower.includes("faculty") && (positionLower.includes("online") || positionLower.includes("hybrid"))) return true;
  if (appliesTo.includes("DISTANCE_EDUCATION_ADMINISTRATORS") && isDistanceEducationAdministrator(employee)) return true;
  if (appliesTo.includes("LICENSED_ACUPUNCTURISTS") && positionLower.includes("acupuncturist")) return true;

  if (appliesTo.includes("CUSTOM_GROUP")) {
    const normalizedCustom = (customGroupName || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    return normalizedCustom.includes(employee.employeeId) || normalizedCustom.includes(employee.name);
  }

  return false;
}

async function loadActiveEmployees() {
  const [employees, offboardingRecords] = await Promise.all([
    prisma.employee.findMany({
      select: {
        id: true,
        employeeId: true,
        name: true,
        systemRole: true,
        department: true,
        position: true,
        staffWorkLocation: true,
      },
    }),
    prisma.offboardingRecord.findMany({
      select: {
        employeeId: true,
        step8: true,
      },
    }),
  ]);

  const offboardedEmployeeIds = new Set(
    offboardingRecords
      .filter((record) => Boolean(record.step8 && record.step8.confirmedOffboard))
      .map((record) => record.employeeId)
  );

  return employees.filter((employee) => !offboardedEmployeeIds.has(employee.employeeId));
}

async function upsertCycle(trainingProgramId, existingCycles, input) {
  const existingCycle = existingCycles.find(
    (cycle) => new Date(cycle.cycleStartDate).toISOString() === input.cycleStartDate.toISOString()
  );

  if (existingCycle) {
    return prisma.trainingCycle.update({
      where: { id: existingCycle.id },
      data: {
        cycleDueDate: input.cycleDueDate,
        status: input.status,
        windowDays: input.windowDays,
      },
    });
  }

  const nextSequence = existingCycles.reduce((max, cycle) => Math.max(max, cycle.sequence), 0) + 1;

  return prisma.trainingCycle.create({
    data: {
      trainingProgramId,
      cycleStartDate: input.cycleStartDate,
      cycleDueDate: input.cycleDueDate,
      status: input.status,
      sequence: nextSequence,
      windowDays: input.windowDays,
    },
  });
}

async function assignEmployeesToCycle(program, currentCycle, activeEmployees) {
  const eligibleEmployees = activeEmployees.filter((employee) =>
    matchesAppliesTo(employee, program.appliesTo, program.customGroupName || null)
  );

  if (eligibleEmployees.length === 0) {
    return 0;
  }

  const result = await prisma.employeeTrainingAssignment.createMany({
    data: eligibleEmployees.map((employee) => ({
      employeeId: employee.id,
      trainingProgramId: program.id,
      trainingCycleId: currentCycle.id,
      assignedDate: new Date(),
      dueDate: currentCycle.cycleDueDate,
      status: "ASSIGNED",
    })),
    skipDuplicates: true,
  });

  return result.count;
}

async function upsertTrainingProgram(definition, activeEmployees) {
  const startDate = toDate(definition.startDate);
  const dueDate = toDate(definition.dueDate);
  const nextCycleDate = definition.nextCycleDate ? toDate(definition.nextCycleDate) : null;
  const windowDays = daysBetween(startDate, dueDate);

  let existing = await prisma.trainingProgram.findUnique({
    where: { programCode: definition.code },
    include: {
      cycles: {
        orderBy: {
          sequence: "asc",
        },
      },
    },
  });

  if (!existing) {
    existing = await prisma.trainingProgram.findFirst({
      where: { trainingName: definition.trainingName },
      include: {
        cycles: {
          orderBy: {
            sequence: "asc",
          },
        },
      },
    });
  }

  const data = {
    programCode: definition.code,
    trainingName: definition.trainingName,
    category: definition.category,
    requirementType: definition.requirementType,
    appliesTo: definition.appliesTo,
    customGroupName: null,
    startDate,
    dueDate,
    recurrence: definition.recurrence,
    recurrenceIntervalValue: definition.recurrenceIntervalValue,
    recurrenceIntervalUnit: definition.recurrenceIntervalUnit,
    nextCycleDate,
    trainingMethod: definition.trainingMethod,
    completionMethod: definition.completionMethod,
    examRequired: definition.examRequired,
    passingScore: definition.passingScore,
    certificateRequired: definition.certificateRequired,
    status: definition.status,
  };

  const program = existing
    ? await prisma.trainingProgram.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.trainingProgram.create({
        data,
      });

  const cycles = existing ? existing.cycles : [];

  const currentCycle = await upsertCycle(program.id, cycles, {
    cycleStartDate: startDate,
    cycleDueDate: dueDate,
    status: "CURRENT",
    windowDays,
  });

  if (nextCycleDate) {
    const upcomingDueDate = calculateDueDateFromWindow(nextCycleDate, windowDays);
    await upsertCycle(program.id, cycles, {
      cycleStartDate: nextCycleDate,
      cycleDueDate: upcomingDueDate,
      status: "UPCOMING",
      windowDays,
    });
  }

  const assignedCount =
    definition.status === "ACTIVE" && definition.assignEmployees
      ? await assignEmployeesToCycle(program, currentCycle, activeEmployees)
      : 0;

  return {
    code: definition.code,
    trainingName: definition.trainingName,
    assignedCount,
  };
}

async function verifyResults() {
  const programs = await prisma.trainingProgram.findMany({
    where: {
      programCode: {
        in: TRAINING_PROGRAMS.map((program) => program.code),
      },
    },
    include: {
      cycles: {
        orderBy: {
          cycleStartDate: "asc",
        },
      },
      _count: {
        select: {
          assignments: true,
          completionRecords: true,
        },
      },
    },
    orderBy: {
      programCode: "asc",
    },
  });

  if (programs.length !== TRAINING_PROGRAMS.length) {
    throw new Error(`Expected ${TRAINING_PROGRAMS.length} training programs, found ${programs.length}.`);
  }

  for (const definition of TRAINING_PROGRAMS) {
    const matches = programs.filter((program) => program.programCode === definition.code);
    if (matches.length !== 1) {
      throw new Error(`Program ${definition.code} exists ${matches.length} times.`);
    }

    const program = matches[0];

    if (program.trainingName !== definition.trainingName) {
      throw new Error(`Program ${definition.code} has unexpected name ${program.trainingName}.`);
    }

    if (program.recurrence !== definition.recurrence) {
      throw new Error(`Program ${definition.code} has unexpected recurrence ${program.recurrence}.`);
    }

    if (program.trainingMethod !== definition.trainingMethod) {
      throw new Error(`Program ${definition.code} has unexpected training method ${program.trainingMethod}.`);
    }

    if (program.completionMethod !== definition.completionMethod) {
      throw new Error(`Program ${definition.code} has unexpected completion method ${program.completionMethod}.`);
    }
  }

  return programs.map((program) => ({
    code: program.programCode,
    trainingName: program.trainingName,
    startDate: program.startDate.toISOString().slice(0, 10),
    dueDate: program.dueDate.toISOString().slice(0, 10),
    nextCycleDate: program.nextCycleDate ? program.nextCycleDate.toISOString().slice(0, 10) : null,
    assignmentCount: program._count.assignments,
    completionCount: program._count.completionRecords,
  }));
}

async function main() {
  const activeEmployees = await loadActiveEmployees();

  for (const definition of TRAINING_PROGRAMS) {
    const result = await upsertTrainingProgram(definition, activeEmployees);
    console.log(`Upserted ${result.code}: ${result.trainingName} (${result.assignedCount} new assignments)`);
  }

  const verification = await verifyResults();
  console.table(verification);
}

main()
  .catch((error) => {
    console.error("Training program seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
