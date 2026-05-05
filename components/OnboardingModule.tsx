"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Employee,
  OnboardingFormItem,
  OnboardingState,
  OnboardingStep1Update,
  OnboardingStep2Update,
  OnboardingStep3Update,
  OnboardingStep4Update,
  REQUIRED_HR_POLICY_SIGNOFFS,
  REQUIRED_ONBOARDING_FORMS,
  REQUIRED_TRAINING_ITEMS,
} from "@/lib/employees";

interface OnboardingModuleProps {
  employees: Employee[];
  onSaveStep1: (employeeId: string, payload: OnboardingStep1Update) => Promise<void>;
  onSaveStep2: (employeeId: string, payload: OnboardingStep2Update) => Promise<void>;
  onSaveStep3: (employeeId: string, payload: OnboardingStep3Update) => Promise<void>;
  onSaveStep4: (employeeId: string, payload: OnboardingStep4Update) => Promise<void>;
  onSaveStep5: (employeeId: string, activated: boolean) => Promise<void>;
}

const stepLabels = [
  "1. Pre-Onboarding",
  "2. Forms Completed",
  "3. HR Policies Sign Off",
  "4. Trainings",
  "5. Activated",
];

const STEP3_POLICY_ITEMS = REQUIRED_HR_POLICY_SIGNOFFS;

const STEP4_TRAINING_ITEMS: Array<{
  name: string;
  urlFieldLabels?: string[];
}> = [
  { name: "Annual: PD/CEU Training Certification" },
  { name: "Annual: FERPA training completed certificate", urlFieldLabels: ["FERPA Certificate URL"] },
  {
    name: "Annual: Training exam 1/year",
    urlFieldLabels: [
      "Training Exam URL",
      "Part 1 Reference URL #1",
      "Part 1 Reference URL #2",
      "Part 2 Reference URL #1",
      "Part 2 Reference URL #2",
      "Part 2 Reference URL #3",
      "Part 3 Reference URL",
      "Part 4 Reference URL",
    ],
  },
];

type Step2ChecklistItem = {
  name: string;
  detailText?: string;
  urlFieldLabels?: string[];
  allowNotApplicable?: boolean;
};

type Step2ActorRole =
  | "HR"
  | "Registrar"
  | "Administrative Specialist"
  | "Compliance Specialist";

const STEP2_VERIFIER_ROLE_CONFIG: Record<
  string,
  { label: string; roleKeywords: string[] }
> = {
  "Generate Orientation Certificate": {
    label: "Registrar",
    roleKeywords: ["registrar"],
  },
  "Notify Admin Assistant: Generate Staff Contract": {
    label: "Administrative Specialist",
    roleKeywords: ["administrative specialist"],
  },
  "Annual: Notify Compliance Dept: Generate Personnel Report": {
    label: "Compliance Specialist",
    roleKeywords: ["compliance specialist"],
  },
};

const STEP2_ACTOR_ROLE_OPTIONS: Array<{
  role: Step2ActorRole;
  roleKeywords: string[];
}> = [
  { role: "HR", roleKeywords: ["hr", "human resources"] },
  { role: "Registrar", roleKeywords: ["registrar"] },
  {
    role: "Administrative Specialist",
    roleKeywords: ["administrative specialist"],
  },
  {
    role: "Compliance Specialist",
    roleKeywords: ["compliance specialist"],
  },
];

const STEP2_SECTIONS: Array<{ title: string; items: Step2ChecklistItem[] }> = [
  {
    title: "Sub-step 1: Staff to fill out",
    items: [
      { name: "Application Form" },
      { name: "Direct Deposit Form" },
      { name: "Self-Identification Form" },
      { name: "Background Check Form" },
      { name: "Copyright Releasing Authorization Form" },
      { name: "Portrait Right Authorization Form" },
      { name: "Acknowledgement of Drug and Alcohol-Free Form" },
      { name: "Emergency Contact Form" },
      { name: "Faculty Handbook Signature Form" },
      { name: "Form W-4" },
      { name: "Form I-9 (Work Authorization)" },
      { name: "Verification Form" },
      { name: "Form W-2 (Employee)", allowNotApplicable: true },
      { name: "Form W-9 (Contractor)", allowNotApplicable: true },
    ],
  },
  {
    title: "Sub-step 2: Collect from staff",
    items: [
      { name: "ID Copy (U.S. Passport or Green Card)" },
      { name: "Current Resume" },
      { name: "Copy of Diplomas or Degrees" },
      { name: "Official Transcripts" },
      { name: "Recent Photo (2x3)" },
    ],
  },
  {
    title: "Sub-step 3: Follow-up actions",
    items: [
      {
        name: "Generate Orientation Certificate",
        detailText:
          "Includes: 1. Completed the orientation seminar/videos 2. Read the employee manual 3. Read the school catalog 4. Read the Distance Education training handbook 5. Read the emergency preparation plan 6. Completed the orientation exam (minimum score of 70% or higher)",
      },
      { name: "Notify Admin Assistant: Generate Staff Contract" },
    ],
  },
  {
    title: "Sub-step 4: Annual renewal items",
    items: [
      { name: "Annual: Notify Compliance Dept: Generate Personnel Report" },
    ],
  },
];

const REMOVED_STEP2_FORM_NAMES = new Set([
  "PD Training Certification",
  "Faculty/Staff DE Exam",
  "Read through employee manual",
  "Read catalog and signed",
  "Pass orientation exam (70% or higher)",
  "Annual: Training exam part 1 reference info",
  "Annual: Training exam part 2 reference info",
  "Annual: Training exam part 3 reference info",
  "Annual: Training exam part 4 reference info",
  ...REQUIRED_TRAINING_ITEMS,
]);

const LEGACY_STEP2_FORM_NAME_MAP: Record<string, string> = {
  "Notify Compliance Dept: Generate Personnel Report":
    "Annual: Notify Compliance Dept: Generate Personnel Report",
  "Form W-9": "Form W-9 (Contractor)",
};

function getDefaultStep2Forms(): OnboardingFormItem[] {
  return REQUIRED_ONBOARDING_FORMS.map((name) => ({
    name,
    status: "Pending",
    dateCompleted: null,
    verifiedBy: "HR",
    url: "",
    extraUrls: [],
  }));
}

function getTodayPacificDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getDefaultStep3Forms(completed = false): OnboardingFormItem[] {
  return STEP3_POLICY_ITEMS.map((name) => ({
    name,
    status: completed ? "Approved" : "Pending",
    dateCompleted: completed ? getTodayPacificDate() : null,
    verifiedBy: "HR",
    url: "",
    extraUrls: [],
  }));
}

function getStep3Completion(forms: OnboardingFormItem[]): boolean {
  return forms.length > 0 && forms.every((form) => form.status === "Approved");
}

function getDefaultStep4Forms(completed = false): OnboardingFormItem[] {
  return REQUIRED_TRAINING_ITEMS.map((name) => ({
    name,
    status: completed ? "Approved" : "Pending",
    dateCompleted: completed ? getTodayPacificDate() : null,
    verifiedBy: "HR",
    url: "",
    extraUrls: [],
  }));
}

function getStep4Completion(forms: OnboardingFormItem[]): boolean {
  return forms.length > 0 && forms.every((form) => form.status === "Approved");
}

function sanitizeStep4Forms(forms: OnboardingFormItem[], completed = false): OnboardingFormItem[] {
  const lookup = new Map(forms.map((form) => [form.name, form]));

  return REQUIRED_TRAINING_ITEMS.map((name) => {
    const form = lookup.get(name);
    return {
      name,
      status:
        form?.status === "Submitted" || form?.status === "Approved"
          ? form.status
          : completed
            ? "Approved"
            : "Pending",
      dateCompleted: form?.dateCompleted || (completed ? getTodayPacificDate() : null),
      verifiedBy: form?.verifiedBy || "HR",
      url: form?.url || "",
      extraUrls: form?.extraUrls || [],
    };
  });
}

function sanitizeStep3Forms(forms: OnboardingFormItem[], completed = false): OnboardingFormItem[] {
  const lookup = new Map(forms.map((form) => [form.name, form]));

  return STEP3_POLICY_ITEMS.map((name) => {
    const form = lookup.get(name);
    return {
      name,
      status:
        form?.status === "Submitted" || form?.status === "Approved"
          ? form.status
          : completed
            ? "Approved"
            : "Pending",
      dateCompleted: form?.dateCompleted || (completed ? getTodayPacificDate() : null),
      verifiedBy: "HR",
      url: "",
      extraUrls: [],
    };
  });
}

function findCurrentRoleEmployeeName(
  employees: Employee[],
  roleKeywords: string[]
): string | null {
  const matches = employees.filter((employee) => {
    const position = (employee.position || "").toLowerCase();
    return roleKeywords.some((keyword) => position.includes(keyword));
  });

  if (matches.length === 0) {
    return null;
  }

  matches.sort((left, right) => {
    const leftJoin = Date.parse(left.joinDate || "");
    const rightJoin = Date.parse(right.joinDate || "");
    return (Number.isNaN(rightJoin) ? 0 : rightJoin) - (Number.isNaN(leftJoin) ? 0 : leftJoin);
  });

  return matches[0].name;
}

function buildRoleVerifierLookup(employees: Employee[]): Record<string, string> {
  const lookup: Record<string, string> = {};

  Object.entries(STEP2_VERIFIER_ROLE_CONFIG).forEach(([formName, config]) => {
    const matchedName = findCurrentRoleEmployeeName(employees, config.roleKeywords);
    lookup[formName] = matchedName ? `${config.label}: ${matchedName}` : config.label;
  });

  return lookup;
}

function getDefaultVerifierForForm(
  formName: string,
  roleVerifierLookup: Record<string, string>
): string {
  return roleVerifierLookup[formName] || "HR";
}

function getStep2Completion(forms: OnboardingFormItem[]): boolean {
  return forms.length > 0 && forms.every((form) => form.status === "Approved" || form.status === "N/A");
}

function parseVerifierIdentity(verifiedBy: string | undefined | null) {
  const normalized = (verifiedBy || "").trim();
  if (!normalized) {
    return { role: null, name: null };
  }

  if (normalized === "HR") {
    return { role: "HR", name: null };
  }

  if (normalized.startsWith("HR:")) {
    return {
      role: "HR",
      name: normalized.slice(3).trim() || null,
    };
  }

  for (const { label } of Object.values(STEP2_VERIFIER_ROLE_CONFIG)) {
    if (normalized === label) {
      return { role: label, name: null };
    }

    if (normalized.startsWith(`${label}:`)) {
      return {
        role: label,
        name: normalized.slice(label.length + 1).trim() || null,
      };
    }
  }

  return { role: normalized, name: null };
}

function buildActorVerifierLabel(role: Step2ActorRole, actorName: string): string {
  if (role === "HR") {
    return actorName ? `HR: ${actorName}` : "HR";
  }

  return actorName ? `${role}: ${actorName}` : role;
}

function applyStep2VerifierDefaults(
  forms: OnboardingFormItem[],
  roleVerifierLookup: Record<string, string>
): OnboardingFormItem[] {
  return forms.map((form) => {
    const roleDefault = roleVerifierLookup[form.name];
    if (!roleDefault) {
      return form;
    }

    // Follow-up actions keep their assigned role label and should not be user-edited.
    return {
      ...form,
      verifiedBy: roleDefault,
    };
  });
}

function sanitizeStep2Forms(forms: OnboardingFormItem[]): OnboardingFormItem[] {
  const renamedForms = forms
    .filter((form) => !REMOVED_STEP2_FORM_NAMES.has(form.name))
    .map((form) => ({
      ...form,
      name: LEGACY_STEP2_FORM_NAME_MAP[form.name] || form.name,
    }));

  const dedupedByName = new Map<string, OnboardingFormItem>();

  renamedForms.forEach((form) => {
    const existing = dedupedByName.get(form.name);
    if (!existing) {
      dedupedByName.set(form.name, form);
      return;
    }

    if (existing.status === "Pending" && form.status !== "Pending") {
      dedupedByName.set(form.name, form);
    }
  });

  return Array.from(dedupedByName.values());
}

function getDefaultOnboarding(): OnboardingState {
  return {
    checklistAssigned: false,
    enrolled: false,
    step1Completed: false,
    systemAccess: {
      gmail: false,
      clickup: false,
      moodle: false,
      googleDrive: false,
    },
    step2Completed: false,
    step2Forms: getDefaultStep2Forms(),
    step3Completed: false,
    step3Forms: getDefaultStep3Forms(),
    step4Completed: false,
    step4Forms: getDefaultStep4Forms(),
    step5Completed: false,
    step6AnnualTracking: false,
    step2CompletedAt: null,
    step3CompletedAt: null,
    step4CompletedAt: null,
    step5CompletedAt: null,
    step6StartedAt: null,
    step6LastReviewAt: null,
    updatedBy: "System",
    updatedAt: null,
    notes: "",
  };
}

function getResolvedOnboarding(employee?: Employee | null): OnboardingState {
  if (!employee?.onboarding) {
    return getDefaultOnboarding();
  }

  const onboarding = employee.onboarding;
  const systemAccess = onboarding.systemAccess || {
    gmail: false,
    clickup: false,
    moodle: false,
    googleDrive: false,
  };

  const resolved = {
    ...getDefaultOnboarding(),
    ...onboarding,
    systemAccess,
    step1Completed:
      Boolean(systemAccess.gmail) &&
      Boolean(systemAccess.clickup) &&
      Boolean(systemAccess.moodle) &&
      Boolean(systemAccess.googleDrive),
    enrolled: Boolean(onboarding.checklistAssigned),
  };

  const step2Forms = sanitizeStep2Forms(resolved.step2Forms);
  const step3Forms = sanitizeStep3Forms(resolved.step3Forms || [], resolved.step3Completed);
  const step4Forms = sanitizeStep4Forms(resolved.step4Forms || [], resolved.step4Completed);

  return {
    ...resolved,
    step2Forms,
    step2Completed: getStep2Completion(step2Forms),
    step3Forms,
    step3Completed: getStep3Completion(step3Forms),
    step4Forms,
    step4Completed: getStep4Completion(step4Forms),
  };
}

export default function OnboardingModule({
  employees,
  onSaveStep1,
  onSaveStep2,
  onSaveStep3,
  onSaveStep4,
  onSaveStep5,
}: OnboardingModuleProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [activeStep, setActiveStep] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [formState, setFormState] = useState<OnboardingStep1Update>({
    checklistAssigned: true,
    updatedBy: "HR Manager",
    notes: "",
    systemAccess: {
      gmail: true,
      clickup: true,
      moodle: true,
      googleDrive: true,
    },
  });
  const [step2Forms, setStep2Forms] = useState<OnboardingFormItem[]>(getDefaultStep2Forms());
  const [step3Forms, setStep3Forms] = useState<OnboardingFormItem[]>(getDefaultStep3Forms());
  const [step4Forms, setStep4Forms] = useState<OnboardingFormItem[]>(getDefaultStep4Forms());
  const [actingRole, setActingRole] = useState<Step2ActorRole>("HR");
  const [actingUserName, setActingUserName] = useState<string>("");
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set([STEP2_SECTIONS[0].title])
  );

  const toggleSection = (title: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });
  };

  const sortedEmployees = useMemo(
    () =>
      [...employees].sort((a, b) =>
        a.id.localeCompare(b.id, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      ),
    [employees]
  );

  const roleVerifierLookup = useMemo(
    () => buildRoleVerifierLookup(sortedEmployees),
    [sortedEmployees]
  );

  const actorsByRole = useMemo(() => {
    const entries = STEP2_ACTOR_ROLE_OPTIONS.map(({ role, roleKeywords }) => {
      const names = sortedEmployees
        .filter((employee) => {
          const position = (employee.position || "").toLowerCase();
          return roleKeywords.some((keyword) => position.includes(keyword));
        })
        .map((employee) => employee.name);

      // Fallback label when no employee matches (e.g. HR role not yet assigned)
      return [role, names.length > 0 ? names : [`${role} (unassigned)`]] as const;
    });

    return Object.fromEntries(entries) as Record<Step2ActorRole, string[]>;
  }, [sortedEmployees]);

  useEffect(() => {
    if (!selectedEmployeeId && sortedEmployees.length > 0) {
      setSelectedEmployeeId(sortedEmployees[0].id);
    }
  }, [selectedEmployeeId, sortedEmployees]);

  useEffect(() => {
    const availableActors = actorsByRole[actingRole] || [];
    if (availableActors.length === 0) {
      setActingUserName("");
      return;
    }

    if (!availableActors.includes(actingUserName)) {
      setActingUserName(availableActors[0]);
    }
  }, [actingRole, actingUserName, actorsByRole]);

  const selectedEmployee = sortedEmployees.find((emp) => emp.id === selectedEmployeeId) || null;
  const onboarding = getResolvedOnboarding(selectedEmployee);

  useEffect(() => {
    if (!selectedEmployee) return;
    setFormState({
      checklistAssigned: onboarding.checklistAssigned,
      updatedBy: onboarding.updatedBy || "HR Manager",
      notes: onboarding.notes || "",
      systemAccess: {
        gmail: onboarding.systemAccess.gmail,
        clickup: onboarding.systemAccess.clickup,
        moodle: onboarding.systemAccess.moodle,
        googleDrive: onboarding.systemAccess.googleDrive,
      },
    });
    setStep2Forms(applyStep2VerifierDefaults(onboarding.step2Forms, roleVerifierLookup));
    setStep3Forms(onboarding.step3Forms);
    setStep4Forms(onboarding.step4Forms);
    setSaveStatus(null);
    setActiveStep(1);
  }, [selectedEmployeeId, roleVerifierLookup]);

  const completedSteps = [
    onboarding.step1Completed,
    getStep2Completion(step2Forms),
    getStep3Completion(step3Forms),
    getStep4Completion(step4Forms),
    onboarding.step5Completed,
  ].filter(Boolean).length;

  const handleAccessToggle = (
    key: "gmail" | "clickup" | "moodle" | "googleDrive",
    checked: boolean
  ) => {
    setFormState((prev) => ({
      ...prev,
      systemAccess: {
        ...prev.systemAccess,
        [key]: checked,
      },
    }));
  };

  const handleSave = async () => {
    if (!selectedEmployee) return;

    try {
      setSaving(true);
      setSaveStatus(null);
      await onSaveStep1(selectedEmployee.id, formState);
      setActiveStep(2);
    } catch (error) {
      console.error("Failed to save onboarding step 1:", error);
      setSaveStatus({ ok: false, msg: "Failed to save step 1." });
    } finally {
      setSaving(false);
    }
  };

  const canSubmitStep2Form = (form: OnboardingFormItem): boolean => {
    if (actingRole === "HR") {
      return true;
    }

    const assignedVerifier = parseVerifierIdentity(
      form.verifiedBy || getDefaultVerifierForForm(form.name, roleVerifierLookup)
    );

    return (
      assignedVerifier.role === actingRole &&
      (!assignedVerifier.name || assignedVerifier.name === actingUserName)
    );
  };

  const canApproveStep2Form = actingRole === "HR";

  const handleStep2StatusAction = (
    formName: string,
    status: OnboardingFormItem["status"]
  ) => {
    setStep2Forms((prev) =>
      prev.map((form) => {
        if (form.name !== formName) {
          return form;
        }

        if (status === "Pending") {
          return {
            ...form,
            status,
            dateCompleted: null,
            verifiedBy: getDefaultVerifierForForm(form.name, roleVerifierLookup),
          };
        }

        const lockVerifierToDefault = Boolean(STEP2_VERIFIER_ROLE_CONFIG[form.name]);

        return {
          ...form,
          status,
          dateCompleted: form.dateCompleted || getTodayPacificDate(),
          verifiedBy: lockVerifierToDefault
            ? getDefaultVerifierForForm(form.name, roleVerifierLookup)
            : buildActorVerifierLabel(actingRole, actingUserName),
        };
      })
    );
  };

  const handleStep2FieldChange = (
    formName: string,
    field: "dateCompleted" | "verifiedBy",
    value: string
  ) => {
    setStep2Forms((prev) =>
      prev.map((form) => {
        if (form.name !== formName) {
          return form;
        }

        return {
          ...form,
          [field]: value,
        };
      })
    );
  };

  const handleStep2UrlChange = (formName: string, index: number, value: string) => {
    setStep2Forms((prev) =>
      prev.map((form) => {
        if (form.name !== formName) return form;

        if (index === 0) {
          return {
            ...form,
            url: value,
          };
        }

        const current = form.extraUrls || [];
        const next = [...current];
        next[index - 1] = value;
        return {
          ...form,
          extraUrls: next,
        };
      })
    );
  };

  const handleSaveStep2 = async () => {
    if (!selectedEmployee) return;

    try {
      setSaving(true);
      setSaveStatus(null);
      await onSaveStep2(selectedEmployee.id, { forms: step2Forms });
      setSaveStatus({ ok: true, msg: "Saved successfully." });
    } catch (error) {
      console.error("Failed to save onboarding step 2:", error);
      setSaveStatus({ ok: false, msg: "Failed to save." });
    } finally {
      setSaving(false);
    }
  };

  const handleStep3StatusAction = (
    formName: string,
    status: Extract<OnboardingFormItem["status"], "Pending" | "Submitted" | "Approved">
  ) => {
    setStep3Forms((prev) =>
      prev.map((form) => {
        if (form.name !== formName) {
          return form;
        }

        return {
          ...form,
          status,
          dateCompleted: status === "Pending" ? null : form.dateCompleted || getTodayPacificDate(),
          verifiedBy: "HR",
        };
      })
    );
  };

  const handleStep3FieldChange = (formName: string, value: string) => {
    setStep3Forms((prev) =>
      prev.map((form) => {
        if (form.name !== formName) {
          return form;
        }

        return {
          ...form,
          dateCompleted: value,
        };
      })
    );
  };

  const handleSaveStep3 = async () => {
    if (!selectedEmployee) return;

    try {
      setSaving(true);
      setSaveStatus(null);
      await onSaveStep3(selectedEmployee.id, { forms: step3Forms });
      setSaveStatus({ ok: true, msg: "Saved successfully." });
    } catch (error) {
      console.error("Failed to save onboarding step 3:", error);
      setSaveStatus({ ok: false, msg: "Failed to save." });
    } finally {
      setSaving(false);
    }
  };

  const handleStep4StatusAction = (
    formName: string,
    status: Extract<OnboardingFormItem["status"], "Pending" | "Submitted" | "Approved">
  ) => {
    setStep4Forms((prev) =>
      prev.map((form) => {
        if (form.name !== formName) {
          return form;
        }

        return {
          ...form,
          status,
          dateCompleted: status === "Pending" ? null : form.dateCompleted || getTodayPacificDate(),
          verifiedBy: "HR",
        };
      })
    );
  };

  const handleStep4FieldChange = (formName: string, field: "dateCompleted", value: string) => {
    setStep4Forms((prev) =>
      prev.map((form) => {
        if (form.name !== formName) {
          return form;
        }

        return {
          ...form,
          [field]: value,
        };
      })
    );
  };

  const handleStep4UrlChange = (formName: string, index: number, value: string) => {
    setStep4Forms((prev) =>
      prev.map((form) => {
        if (form.name !== formName) return form;

        if (index === 0) {
          return {
            ...form,
            url: value,
          };
        }

        const current = form.extraUrls || [];
        const next = [...current];
        next[index - 1] = value;
        return {
          ...form,
          extraUrls: next,
        };
      })
    );
  };

  const handleSaveStep4 = async () => {
    if (!selectedEmployee) return;

    try {
      setSaving(true);
      setSaveStatus(null);
      await onSaveStep4(selectedEmployee.id, { forms: step4Forms });
      setSaveStatus({ ok: true, msg: "Saved successfully." });
    } catch (error) {
      console.error("Failed to save onboarding step 4:", error);
      setSaveStatus({ ok: false, msg: "Failed to save." });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStep5 = async () => {
    if (!selectedEmployee) return;

    try {
      setSaving(true);
      setSaveStatus(null);
      await onSaveStep5(selectedEmployee.id, formState.checklistAssigned);
      setSaveStatus({ ok: true, msg: "Saved successfully." });
    } catch (error) {
      console.error("Failed to save onboarding step 5:", error);
      setSaveStatus({ ok: false, msg: "Failed to save." });
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    if (activeStep === 1) {
      return (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-lg font-bold text-gray-900 mb-1">Step 1: Pre-Onboarding Setup</h4>
          <p className="text-sm text-gray-600 mb-5">
            Employee profile, Employee ID, and work email are already managed. Track system access and onboarding enrollment here.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
              <input
                type="checkbox"
                checked={formState.systemAccess.gmail}
                onChange={(e) => handleAccessToggle("gmail", e.target.checked)}
              />
              <span className="font-medium text-gray-900">Gmail access</span>
            </label>
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
              <input
                type="checkbox"
                checked={formState.systemAccess.clickup}
                onChange={(e) => handleAccessToggle("clickup", e.target.checked)}
              />
              <span className="font-medium text-gray-900">ClickUp access</span>
            </label>
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
              <input
                type="checkbox"
                checked={formState.systemAccess.moodle}
                onChange={(e) => handleAccessToggle("moodle", e.target.checked)}
              />
              <span className="font-medium text-gray-900">Moodle access</span>
            </label>
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
              <input
                type="checkbox"
                checked={formState.systemAccess.googleDrive}
                onChange={(e) => handleAccessToggle("googleDrive", e.target.checked)}
              />
              <span className="font-medium text-gray-900">Google Drive access</span>
            </label>
          </div>

          <label className="flex items-center gap-3 p-3 border border-cyan-200 rounded-lg bg-cyan-50 mb-5">
            <input
              type="checkbox"
              checked={formState.checklistAssigned}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  checklistAssigned: e.target.checked,
                }))
              }
            />
            <span className="font-semibold text-gray-900">
              Assign onboarding checklist (required to move to Steps 2-5)
            </span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Updated By</label>
              <input
                type="text"
                value={formState.updatedBy}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    updatedBy: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-300"
                placeholder="HR Manager"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Step 1 Notes</label>
            <textarea
              value={formState.notes || ""}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-300"
              placeholder="Optional notes for this employee's pre-onboarding setup"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              Step 1 is complete only when all four system access boxes are checked.
            </p>
            <div className="flex items-center gap-3">
              {saveStatus && (
                <span className={`text-sm font-medium ${saveStatus.ok ? "text-green-600" : "text-red-600"}`}>
                  {saveStatus.msg}
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !formState.updatedBy.trim()}
                className="bg-cyan-500 text-white font-semibold py-2 px-5 rounded-lg hover:bg-cyan-600 disabled:bg-cyan-300"
              >
                {saving ? "Saving..." : "Save Step 1"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (activeStep === 2) {
      const formMap = new Map(step2Forms.map((form) => [form.name, form]));
      const allSectionItems = STEP2_SECTIONS.flatMap((s) => s.items);
      const approvedCount = allSectionItems.filter(
        (item) => { const s = formMap.get(item.name)?.status; return s === "Approved" || s === "N/A"; }
      ).length;
      const totalCount = allSectionItems.length;

      return (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-1">Step 2: Employee Forms Completion</h4>
              <p className="text-sm text-gray-600">
                Each form starts as Pending. Submitted is limited to the assigned role or HR, and Approved is HR-only.
              </p>
            </div>
            <div className="text-sm font-semibold text-gray-700 bg-cyan-50 px-3 py-2 rounded-lg border border-cyan-200">
              Approved forms: {approvedCount}/{totalCount}
            </div>
          </div>

          <div className="mb-5 rounded-lg border border-cyan-200 bg-cyan-50 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Acting Role</label>
                <select
                  value={actingRole}
                  onChange={(e) => setActingRole(e.target.value as Step2ActorRole)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
                >
                  {STEP2_ACTOR_ROLE_OPTIONS.map(({ role }) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Acting User</label>
                <select
                  value={actingUserName}
                  onChange={(e) => setActingUserName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
                >
                  {(actorsByRole[actingRole] || []).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-600">
              Temporary permission model for future Google authentication.
            </p>
          </div>

          <div className="space-y-5">
            {STEP2_SECTIONS.map((section) => {
              const isOpen = openSections.has(section.title);
              return (
                <div key={section.title} className="rounded-lg border border-cyan-100">
                  <button
                    type="button"
                    onClick={() => toggleSection(section.title)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-cyan-50 border-b border-cyan-100 hover:bg-cyan-100 transition-colors"
                  >
                    <h5 className="font-semibold text-gray-900">{section.title}</h5>
                    <span className="text-gray-500 text-lg select-none">{isOpen ? "▲" : "▼"}</span>
                  </button>
                  {isOpen && (
                    <div className="p-4 space-y-4">
                      {section.items.map((item) => {
                        const verifierLocked = section.title === "Sub-step 3: Follow-up actions";
                        const anyRoleCanSubmit =
                          section.title === "Sub-step 1: Staff to fill out" ||
                          section.title === "Sub-step 2: Collect from staff";
                        const form = formMap.get(item.name) || {
                          name: item.name,
                          status: "Pending",
                          dateCompleted: null,
                          verifiedBy: getDefaultVerifierForForm(item.name, roleVerifierLookup),
                          url: "",
                          extraUrls: [],
                        };

                        return (
                          <div key={item.name} className="rounded-lg border border-gray-200 px-4 py-3">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                                {item.detailText ? (
                                  <p className="text-xs text-gray-500 mt-1">{item.detailText}</p>
                                ) : null}
                              </div>

                              {/* Status badge */}
                              <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                                form.status === "Approved"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : form.status === "N/A"
                                  ? "bg-slate-100 text-slate-500"
                                  : form.status === "Submitted"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}>
                                {form.status}
                              </span>

                              {/* Context-sensitive action buttons */}
                              <div className="flex items-center gap-2 shrink-0">
                                {form.status === "Pending" && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleStep2StatusAction(form.name, "Submitted")}
                                      disabled={!(anyRoleCanSubmit || canSubmitStep2Form(form)) || saving}
                                      className="px-3 py-1 rounded-md border border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-100"
                                    >
                                      Mark Submitted
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleStep2StatusAction(form.name, "Approved")}
                                      disabled={!canApproveStep2Form || saving}
                                      className="px-3 py-1 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-100"
                                    >
                                      Approve
                                    </button>
                                    {item.allowNotApplicable && (
                                      <button
                                        type="button"
                                        onClick={() => handleStep2StatusAction(form.name, "N/A")}
                                        disabled={!canApproveStep2Form || saving}
                                        className="px-3 py-1 rounded-md border border-slate-300 bg-slate-50 text-slate-600 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
                                      >
                                        Not Applicable
                                      </button>
                                    )}
                                  </>
                                )}
                                {form.status === "Submitted" && (
                                  <button
                                    type="button"
                                    onClick={() => handleStep2StatusAction(form.name, "Approved")}
                                    disabled={!canApproveStep2Form || saving}
                                    className="px-3 py-1 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-100"
                                  >
                                    Approve
                                  </button>
                                )}
                                {form.status !== "Pending" && (
                                  <button
                                    type="button"
                                    onClick={() => handleStep2StatusAction(form.name, "Pending")}
                                    disabled={saving}
                                    className="text-xs text-gray-400 hover:text-gray-600 underline disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    Reset
                                  </button>
                                )}
                              </div>

                              {/* Date field — always visible */}
                              <input
                                type="date"
                                value={form.dateCompleted || ""}
                                onChange={(e) => handleStep2FieldChange(form.name, "dateCompleted", e.target.value)}
                                className="shrink-0 px-2 py-1 rounded-md border border-gray-300 text-xs"
                              />
                            </div>

                            {/* Verifier — always visible so responsible role is clear */}
                            <div className="mt-2">
                              <input
                                type="text"
                                value={form.verifiedBy}
                                onChange={
                                  verifierLocked
                                    ? undefined
                                    : (e) => handleStep2FieldChange(form.name, "verifiedBy", e.target.value)
                                }
                                readOnly={verifierLocked}
                                className={`w-full px-3 py-1.5 rounded-md text-xs ${
                                  verifierLocked
                                    ? "rounded-md border border-gray-200 bg-gray-50 text-gray-600"
                                    : "rounded-md border border-gray-300 bg-white text-gray-700"
                                }`}
                                placeholder="Verified by"
                              />
                            </div>

                            {item.urlFieldLabels && item.urlFieldLabels.length > 0 && (
                              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                {item.urlFieldLabels.map((label, index) => {
                                  const urlValue = index === 0 ? form.url || "" : form.extraUrls?.[index - 1] || "";
                                  return (
                                    <div key={`${item.name}-${label}`}>
                                      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                                      <input
                                        type="url"
                                        value={urlValue}
                                        onChange={(e) => handleStep2UrlChange(form.name, index, e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                                        placeholder="https://..."
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              Required forms: Application, payroll, authorization, compliance, emergency contact, tax, and verification forms.
            </p>
            <div className="flex items-center gap-3">
              {saveStatus && (
                <span className={`text-sm font-medium ${saveStatus.ok ? "text-green-600" : "text-red-600"}`}>
                  {saveStatus.msg}
                </span>
              )}
              <button
                onClick={handleSaveStep2}
                disabled={saving}
                className="bg-cyan-500 text-white font-semibold py-2 px-5 rounded-lg hover:bg-cyan-600 disabled:bg-cyan-300"
              >
                {saving ? "Saving..." : "Save Step 2"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (activeStep === 3) {
      const approvedCount = step3Forms.filter((form) => form.status === "Approved").length;

      return (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-1">Step 3: HR Policies Sign Off</h4>
              <p className="text-sm text-gray-600">
                Each policy starts as Pending. Submit records the sign-off date, and approval is HR-only.
              </p>
            </div>
            <div className="text-sm font-semibold text-gray-700 bg-cyan-50 px-3 py-2 rounded-lg border border-cyan-200">
              Approved items: {approvedCount}/{step3Forms.length}
            </div>
          </div>

          <div className="space-y-4">
            {step3Forms.map((form) => (
              <div key={form.name} className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{form.name}</div>
                    <div className="mt-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          form.status === "Approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : form.status === "Submitted"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {form.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {form.status === "Pending" && (
                      <button
                        onClick={() => handleStep3StatusAction(form.name, "Submitted")}
                        className="rounded-lg border border-cyan-300 bg-white px-3 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-100"
                      >
                        Submit
                      </button>
                    )}
                    {form.status === "Submitted" && (
                      <button
                        onClick={() => handleStep3StatusAction(form.name, "Approved")}
                        className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        Approve
                      </button>
                    )}
                    {form.status !== "Pending" && (
                      <button
                        onClick={() => handleStep3StatusAction(form.name, "Pending")}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                      >
                        Reset to Pending
                      </button>
                    )}
                  </div>
                </div>

                {form.status !== "Pending" && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                      <input
                        type="date"
                        value={form.dateCompleted || ""}
                        onChange={(e) => handleStep3FieldChange(form.name, e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Approved By</label>
                      <input
                        type="text"
                        value="HR"
                        disabled
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-100 text-sm text-gray-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              Step 3 completes only when all three HR policy acknowledgements are approved.
            </p>
            <div className="flex items-center gap-3">
              {saveStatus && (
                <span className={`text-sm font-medium ${saveStatus.ok ? "text-green-600" : "text-red-600"}`}>
                  {saveStatus.msg}
                </span>
              )}
              <button
                onClick={handleSaveStep3}
                disabled={saving}
                className="bg-cyan-500 text-white font-semibold py-2 px-5 rounded-lg hover:bg-cyan-600 disabled:bg-cyan-300"
              >
                {saving ? "Saving..." : "Save Step 3"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (activeStep === 4) {
      const approvedCount = step4Forms.filter((form) => form.status === "Approved").length;

      return (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-1">Step 4: Trainings</h4>
              <p className="text-sm text-gray-600">
                Training items start as Pending. Submit records the completion date, and approval confirms the training record.
              </p>
            </div>
            <div className="text-sm font-semibold text-gray-700 bg-cyan-50 px-3 py-2 rounded-lg border border-cyan-200">
              Approved items: {approvedCount}/{step4Forms.length}
            </div>
          </div>

          <div className="space-y-4">
            {STEP4_TRAINING_ITEMS.map((item) => {
              const form = step4Forms.find((entry) => entry.name === item.name);
              if (!form) return null;

              return (
                <div key={item.name} className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{form.name}</div>
                      <div className="mt-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            form.status === "Approved"
                              ? "bg-emerald-100 text-emerald-700"
                              : form.status === "Submitted"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {form.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {form.status === "Pending" && (
                        <button
                          onClick={() => handleStep4StatusAction(form.name, "Submitted")}
                          className="rounded-lg border border-cyan-300 bg-white px-3 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-100"
                        >
                          Submit
                        </button>
                      )}
                      {form.status === "Submitted" && (
                        <button
                          onClick={() => handleStep4StatusAction(form.name, "Approved")}
                          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          Approve
                        </button>
                      )}
                      {form.status !== "Pending" && (
                        <button
                          onClick={() => handleStep4StatusAction(form.name, "Pending")}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                        >
                          Reset to Pending
                        </button>
                      )}
                    </div>
                  </div>

                  {form.status !== "Pending" && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                        <input
                          type="date"
                          value={form.dateCompleted || ""}
                          onChange={(e) => handleStep4FieldChange(form.name, "dateCompleted", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Verified By</label>
                        <input
                          type="text"
                          value={form.verifiedBy || "HR"}
                          disabled
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-100 text-sm text-gray-600"
                        />
                      </div>
                    </div>
                  )}

                  {item.urlFieldLabels && item.urlFieldLabels.length > 0 && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {item.urlFieldLabels.map((label, index) => {
                        const urlValue = index === 0 ? form.url || "" : form.extraUrls?.[index - 1] || "";
                        return (
                          <div key={`${item.name}-${label}`}>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                            <input
                              type="url"
                              value={urlValue}
                              onChange={(e) => handleStep4UrlChange(form.name, index, e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
                              placeholder="https://..."
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              Step 4 completes only when all training items are approved.
            </p>
            <div className="flex items-center gap-3">
              {saveStatus && (
                <span className={`text-sm font-medium ${saveStatus.ok ? "text-green-600" : "text-red-600"}`}>
                  {saveStatus.msg}
                </span>
              )}
              <button
                onClick={handleSaveStep4}
                disabled={saving}
                className="bg-cyan-500 text-white font-semibold py-2 px-5 rounded-lg hover:bg-cyan-600 disabled:bg-cyan-300"
              >
                {saving ? "Saving..." : "Save Step 4"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (activeStep === 5) {
      return (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-lg font-bold text-gray-900 mb-1">Step 5: Activated</h4>
          <p className="text-sm text-gray-600 mb-5">
            Set and save the employee&apos;s current enrollment status.
          </p>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Current Enrollment Status</label>
            <select
              value={formState.checklistAssigned ? "Enrolled" : "In Progress"}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  checklistAssigned: e.target.value === "Enrolled",
                }))
              }
              className="w-full md:w-80 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
            >
              <option value="Enrolled">Enrolled</option>
              <option value="In Progress">In Progress</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3">
            {saveStatus && (
              <span className={`text-sm font-medium ${saveStatus.ok ? "text-green-600" : "text-red-600"}`}>
                {saveStatus.msg}
              </span>
            )}
            <button
              onClick={handleSaveStep5}
              disabled={saving}
              className="bg-cyan-500 text-white font-semibold py-2 px-5 rounded-lg hover:bg-cyan-600 disabled:bg-cyan-300"
            >
              {saving ? "Saving..." : "Save Step 5"}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="text-lg font-bold text-gray-900 mb-1">{stepLabels[activeStep - 1]}</h4>
        <p className="text-sm text-gray-600">
          Structure is ready for this step. We can build the detailed functionality next.
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Onboarding Module</h2>
        <p className="text-gray-600">
          Flow: Pre-Onboarding → Forms Completed → HR Policies Sign Off → Trainings → Activated
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-4 py-3 bg-cyan-100 border-b border-cyan-200">
            <h3 className="text-lg font-semibold text-gray-900">Employees</h3>
          </div>
          <div style={{ maxHeight: "620px" }} className="overflow-y-auto divide-y divide-gray-100">
            {sortedEmployees.map((employee) => {
              const employeeOnboarding = getResolvedOnboarding(employee);
              const enrolled = employeeOnboarding.checklistAssigned;
              const employeeCompleted = [
                employeeOnboarding.step1Completed,
                employeeOnboarding.step2Completed,
                employeeOnboarding.step3Completed,
                employeeOnboarding.step4Completed,
                employeeOnboarding.step5Completed,
              ].filter(Boolean).length;

              return (
                <button
                  key={employee.id}
                  onClick={() => setSelectedEmployeeId(employee.id)}
                  className={`w-full text-left p-4 transition-colors ${
                    selectedEmployeeId === employee.id
                      ? "bg-cyan-50"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="font-semibold text-gray-900">{employee.name}</div>
                  <div className="text-sm text-gray-600">{employee.id}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        enrolled
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {enrolled ? "Enrolled" : "Not enrolled"}
                    </span>
                    <span className="text-xs text-gray-500">{employeeCompleted}/5 done</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {!selectedEmployee && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-600">
              Select an employee to manage onboarding.
            </div>
          )}

          {selectedEmployee && (
            <>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-wrap gap-3 items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {selectedEmployee.name} ({selectedEmployee.id})
                    </h3>
                    <p className="text-gray-600 mt-1">{selectedEmployee.department} · {selectedEmployee.position}</p>
                  </div>
                  <div className="text-sm font-semibold text-gray-700 bg-cyan-50 px-3 py-2 rounded-lg border border-cyan-200">
                    Progress: {completedSteps}/5
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {stepLabels.map((label, index) => {
                    const completed = [
                      onboarding.step1Completed,
                      getStep2Completion(step2Forms),
                      getStep3Completion(step3Forms),
                      getStep4Completion(step4Forms),
                      onboarding.step5Completed,
                    ][index];

                    return (
                      <button
                        key={label}
                        onClick={() => { setSaveStatus(null); setActiveStep(index + 1); }}
                        className={`rounded-lg border px-3 py-2 flex items-center justify-between ${
                          activeStep === index + 1
                            ? "border-cyan-400 bg-cyan-50"
                            : completed
                              ? "border-emerald-200 bg-emerald-50"
                              : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <span className="font-medium text-gray-900">{label}</span>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            completed
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {completed ? "Completed" : "Pending"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {renderStepContent()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
