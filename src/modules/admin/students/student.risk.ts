import type { StudentRisk } from './student.types';

const labels: Record<StudentRisk['code'], string> = {
  DEBT: 'Есть долг',
  ENDING_SOON: 'Договор истекает',
  EXPIRED_CONTRACT: 'Договор истек',
  LOW_ATTENDANCE: 'Низкая посещаемость',
  NO_GROUP: 'Без группы',
};

export const riskLabel = (risk: StudentRisk) => labels[risk.code] ?? risk.label;
