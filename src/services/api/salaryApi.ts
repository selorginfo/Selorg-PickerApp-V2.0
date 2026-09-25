import { config } from '../../constants/config';
import { request, mockResponse } from './client';
import type { MonthlySalaryDto } from '../../types/api';

const emptySalary = (): MonthlySalaryDto => ({
  month: '',
  monthKey: '',
  currency: 'INR',
  config: {
    monthlySalary: 13000,
    standardShiftHours: 10,
    breakMinutes: 60,
    startHandoverMinutes: 30,
    endHandoverMinutes: 30,
    productiveWorkMinutes: 480,
    overtimeMultiplier: 1.5,
    weekOffAllowance: 4,
    weekOffWeekday: 0,
    monthlyWorkingDays: 26,
  },
  regular: {
    monthlySalary: 13000,
    monthlySalaryDisplay: '₹13,000',
    dailySalary: 0,
    dailySalaryDisplay: '₹0',
    workingDays: 0,
    weekOffs: 4,
    weekOffsScheduled: 4,
    weekOffsWorked: 0,
    paidDays: 0,
    unpaidLeave: 0,
    leaveDeduction: 0,
    leaveDeductionDisplay: '₹0',
  },
  overtime: {
    otHours: 0,
    otHoursDisplay: '0 hours',
    otRate: 0,
    otRateDisplay: '₹0/hour',
    otEarnings: 0,
    otEarningsDisplay: '₹0',
    weekOffWorkHours: 0,
    weekOffWorkEarnings: 0,
    weekOffWorkEarningsDisplay: '₹0',
  },
  finalSalary: 0,
  finalSalaryDisplay: '₹0',
  breakdown: {
    monthlySalary: '₹13,000',
    workingDays: '0',
    weekOffs: '4',
    paidDays: '0',
    unpaidLeave: '0 days',
    leaveDeduction: '₹0',
    otHours: '0 hours',
    otRate: '₹0/hour',
    otEarnings: '₹0',
    weekOffWorkEarnings: '₹0',
    finalSalary: '₹0',
  },
  weekOffDates: [],
  formula: {
    dailySalary: '',
    otHourlyRate: '',
    finalSalary: 'Monthly Salary − Leave Deduction + OT Earnings',
  },
});

export const salaryApi = {
  getMonthly(query?: { month?: string }) {
    if (config.USE_MOCKS) return mockResponse(emptySalary());
    return request<MonthlySalaryDto>('/salary/monthly', { query });
  },
};
