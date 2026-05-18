export type CoachSessionStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "OVERDUE";

export interface CoachStudentAttendance {
  id: string;
  name: string;
  attendance: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
}

export interface CoachSession {
  id: string;
  groupName: string;
  date: string;
  time: string;
  studentCount: number;
  status: CoachSessionStatus;
  cancelReason?: string;
  reportDone: boolean;
  attendanceSummary: string;
  students: CoachStudentAttendance[];
}

export const COACH_SESSIONS: CoachSession[] = [
  {
    id: "s1",
    groupName: "U10 A",
    date: "2026-05-18",
    time: "10:00",
    studentCount: 14,
    status: "PLANNED",
    reportDone: false,
    attendanceSummary: "0/14",
    students: [
      { id: "st1", name: "Arman K.", attendance: "PRESENT" },
      { id: "st2", name: "Daniyar T.", attendance: "PRESENT" },
      { id: "st3", name: "Miras A.", attendance: "ABSENT" },
      { id: "st4", name: "Ayan S.", attendance: "LATE" },
    ],
  },
  {
    id: "s2",
    groupName: "U12 B",
    date: "2026-05-18",
    time: "13:30",
    studentCount: 12,
    status: "IN_PROGRESS",
    reportDone: false,
    attendanceSummary: "8/12",
    students: [
      { id: "st5", name: "Ruslan M.", attendance: "PRESENT" },
      { id: "st6", name: "Nursultan Z.", attendance: "EXCUSED" },
      { id: "st7", name: "Temir B.", attendance: "PRESENT" },
      { id: "st8", name: "Adil R.", attendance: "LATE" },
    ],
  },
  {
    id: "s3",
    groupName: "U8 Kids",
    date: "2026-05-18",
    time: "17:00",
    studentCount: 10,
    status: "OVERDUE",
    reportDone: false,
    attendanceSummary: "10/10",
    students: [
      { id: "st9", name: "Alan P.", attendance: "PRESENT" },
      { id: "st10", name: "Ilyas N.", attendance: "PRESENT" },
      { id: "st11", name: "Yerkhan D.", attendance: "PRESENT" },
      { id: "st12", name: "Aldiyar U.", attendance: "PRESENT" },
    ],
  },
  {
    id: "s4",
    groupName: "U10 A",
    date: "2026-05-17",
    time: "10:00",
    studentCount: 14,
    status: "COMPLETED",
    reportDone: true,
    attendanceSummary: "13/14",
    students: [
      { id: "st13", name: "Dias O.", attendance: "PRESENT" },
      { id: "st14", name: "Amir B.", attendance: "PRESENT" },
      { id: "st15", name: "Sanzhar E.", attendance: "ABSENT" },
      { id: "st16", name: "Aset T.", attendance: "PRESENT" },
    ],
  },
  {
    id: "s5",
    groupName: "U12 B",
    date: "2026-05-16",
    time: "13:30",
    studentCount: 12,
    status: "CANCELLED",
    cancelReason: "Поле недоступно из-за погодных условий",
    reportDone: false,
    attendanceSummary: "0/12",
    students: [
      { id: "st17", name: "Askar I.", attendance: "EXCUSED" },
      { id: "st18", name: "Madina K.", attendance: "EXCUSED" },
    ],
  },
];
