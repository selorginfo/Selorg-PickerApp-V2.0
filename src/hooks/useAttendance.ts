import { useStore } from '../store/AppStore';
import { useApiResource } from './useApiResource';
import { attendanceApi } from '../services/api/attendanceApi';
import { formatElapsed } from '../utils/formatters';
import type { AttendanceTab } from '../types';

export function useAttendance() {
  const { state, dispatch } = useStore();
  const resource = useApiResource(() => attendanceApi.getSummary());

  // Hours-worked figure follows the live shift timer when a shift is active.
  const liveHours = state.shift.active ? formatElapsed(state.shift.elapsed) : resource.data?.present.hoursToday;

  return {
    ...resource,
    tab: state.attendance.tab,
    setTab: (tab: AttendanceTab) => dispatch({ type: 'attendance/setTab', tab }),
    liveHours,
    dataState: state.ui.dataState,
  };
}
