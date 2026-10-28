// Keep the stored group IDs stable for existing students and saved filters.
export const STUDENT_GROUP_OPTIONS = [
  { value: 'A', label: 'Муслимсаани' },
  { value: 'B', label: 'Тажвид' },
  { value: 'C', label: 'Куран' },
];

const groupLabels = new Map(STUDENT_GROUP_OPTIONS.map(({ value, label }) => [value, label]));

export function getStudentGroupLabel(group: string): string {
  return groupLabels.get(group) ?? group;
}
