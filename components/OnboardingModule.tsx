"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Employee,
  OnboardingFormItem,
  OnboardingState,
  OnboardingStep1Update,
  OnboardingStep2Update,
  REQUIRED_ONBOARDING_FORMS,
} from "@/lib/employees";

interface OnboardingModuleProps {
  employees: Employee[];
  onSaveStep1: (employeeId: string, payload: OnboardingStep1Update) => Promise<void>;
  onSaveStep2: (employeeId: string, payload: OnboardingStep2Update) => Promise<void>;
}

const stepLabels = [
  "1. Pre-Onboarding",
  "2. Forms Completed",
  "3. Documents Verified",
  "4. Orientation Completed",
  "5. Activated",
  "6. Annual Tracking",
];

type Step2ChecklistItem = {
  name: string;
  urlFieldLabels?: string[];
};

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
      { name: "Form W-9" },
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
      { name: "PD Training Certification", urlFieldLabels: ["PD Training Certification URL"] },
      { name: "Faculty/Staff DE Exam", urlFieldLabels: ["Faculty/Staff DE Exam URL"] },
    ],
  },
  {
    title: "Sub-step 3: Follow-up actions",
    items: [
      { name: "Generate Orientation Certificate" },
      { name: "Notify Admin Assistant: Generate Staff Contract" },
      { name: "Notify Compliance Dept: Generate Personnel Report" },
    ],
  },
  {
    title: "Sub-step 4: Required orientation for new staff",
    items: [
      { name: "Read through employee manual", urlFieldLabels: ["Employee Manual URL"] },
      { name: "Read catalog and signed", urlFieldLabels: ["Catalog URL", "Signed Catalog URL"] },
      { name: "Pass orientation exam (70% or higher)", urlFieldLabels: ["Orientation Exam URL"] },
    ],
  },
  {
    title: "Sub-step 5: Annual renewal items",
    items: [
      { name: "Annual: PD/CEU Training Certification" },
      { name: "Annual: Personnel Report" },
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
    ],
  },
];

function getDefaultStep2Forms(completed: boolean): OnboardingFormItem[] {
  return REQUIRED_ONBOARDING_FORMS.map((name) => ({
    name,
    status: completed ? "Approved" : "Pending",
    dateCompleted: null,
    verifiedBy: completed ? "System" : "HR",
  }));
}

function getDefaultOnboarding(): OnboardingState {
  return {
    checklistAssigned: true,
    enrolled: true,
    step1Completed: true,
    systemAccess: {
      gmail: true,
      clickup: true,
      moodle: true,
      googleDrive: true,
    },
    step2Completed: true,
    step2Forms: getDefaultStep2Forms(true),
    step3Completed: true,
    step4Completed: true,
    step5Completed: true,
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

  return {
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
}

export default function OnboardingModule({ employees, onSaveStep1, onSaveStep2 }: OnboardingModuleProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [activeStep, setActiveStep] = useState<number>(1);
  const [saving, setSaving] = useState(false);
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
  const [step2Forms, setStep2Forms] = useState<OnboardingFormItem[]>(getDefaultStep2Forms(true));
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

  useEffect(() => {
    if (!selectedEmployeeId && sortedEmployees.length > 0) {
      setSelectedEmployeeId(sortedEmployees[0].id);
    }
  }, [selectedEmployeeId, sortedEmployees]);

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
    setStep2Forms(onboarding.step2Forms);
    setActiveStep(1);
  }, [selectedEmployeeId]);

  const completedSteps = [
    onboarding.step1Completed,
    onboarding.step2Completed,
    onboarding.step3Completed,
    onboarding.step4Completed,
    onboarding.step5Completed,
    onboarding.step6AnnualTracking,
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
      await onSaveStep1(selectedEmployee.id, formState);
      setActiveStep(2);
    } catch (error) {
      console.error("Failed to save onboarding step 1:", error);
      alert("Failed to save onboarding step 1.");
    } finally {
      setSaving(false);
    }
  };

  const handleStep2FieldChange = (
    formName: string,
    field: keyof Omit<OnboardingFormItem, "name">,
    value: string
  ) => {
    setStep2Forms((prev) =>
      prev.map((form) => {
        if (form.name !== formName) {
          return form;
        }

        if (field === "status") {
          const status = value as OnboardingFormItem["status"];
          return {
            ...form,
            status,
            dateCompleted: status === "Pending" ? null : form.dateCompleted,
            verifiedBy: status === "Pending" ? "HR" : form.verifiedBy,
          };
        }

        if (field === "extraUrls") {
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
      await onSaveStep2(selectedEmployee.id, { forms: step2Forms });
      alert("Employee forms saved.");
    } catch (error) {
      console.error("Failed to save onboarding step 2:", error);
      alert("Failed to save employee forms.");
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
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Current Enrollment Status</label>
              <div className="px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-800">
                {formState.checklistAssigned ? "Enrolled" : "Not enrolled"}
              </div>
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
            <button
              onClick={handleSave}
              disabled={saving || !formState.updatedBy.trim()}
              className="bg-cyan-500 text-white font-semibold py-2 px-5 rounded-lg hover:bg-cyan-600 disabled:bg-cyan-300"
            >
              {saving ? "Saving..." : "Save Step 1"}
            </button>
          </div>
        </div>
      );
    }

    if (activeStep === 2) {
      const approvedCount = step2Forms.filter((form) => form.status === "Approved").length;
      const formMap = new Map(step2Forms.map((form) => [form.name, form]));

      return (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-1">Step 2: Employee Forms Completion</h4>
              <p className="text-sm text-gray-600">
                Track each required form with status, date completed, and verifier. Step 2 completes when all forms are approved.
              </p>
            </div>
            <div className="text-sm font-semibold text-gray-700 bg-cyan-50 px-3 py-2 rounded-lg border border-cyan-200">
              Approved forms: {approvedCount}/{step2Forms.length}
            </div>
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
                        const form = formMap.get(item.name) || {
                          name: item.name,
                          status: "Pending",
                          dateCompleted: null,
                          verifiedBy: "HR",
                          url: "",
                          extraUrls: [],
                        };

                        return (
                          <div key={item.name} className="rounded-lg border border-gray-200 p-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
                              <div className="md:col-span-2">
                                <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                              </div>
                              <div>
                                <select
                                  value={form.status}
                                  onChange={(e) => handleStep2FieldChange(form.name, "status", e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="Submitted">Submitted</option>
                                  <option value="Approved">Approved</option>
                                </select>
                              </div>
                              <div>
                                <input
                                  type="date"
                                  value={form.dateCompleted || ""}
                                  onChange={(e) => handleStep2FieldChange(form.name, "dateCompleted", e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                                />
                              </div>
                            </div>

                            <div className="mt-3">
                              <input
                                type="text"
                                value={form.verifiedBy}
                                onChange={(e) => handleStep2FieldChange(form.name, "verifiedBy", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
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
            <button
              onClick={handleSaveStep2}
              disabled={saving}
              className="bg-cyan-500 text-white font-semibold py-2 px-5 rounded-lg hover:bg-cyan-600 disabled:bg-cyan-300"
            >
              {saving ? "Saving..." : "Save Step 2"}
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
          Flow: Pre-Onboarding → Forms Completed → Documents Verified → Orientation Completed → Activated → Annual Tracking
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
                employeeOnboarding.step6AnnualTracking,
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
                    <span className="text-xs text-gray-500">{employeeCompleted}/6 done</span>
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
                    Progress: {completedSteps}/6
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {stepLabels.map((label, index) => {
                    const completed = [
                      onboarding.step1Completed,
                      onboarding.step2Completed,
                      onboarding.step3Completed,
                      onboarding.step4Completed,
                      onboarding.step5Completed,
                      onboarding.step6AnnualTracking,
                    ][index];

                    return (
                      <button
                        key={label}
                        onClick={() => setActiveStep(index + 1)}
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
