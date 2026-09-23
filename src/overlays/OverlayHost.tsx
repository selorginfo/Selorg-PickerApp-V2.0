import React from 'react';
import { Toast } from './Toast';
import { LogoutConfirmModal } from './LogoutConfirmModal';
import { ShiftVerifySheet } from './ShiftVerifySheet';
import { DeviceIssueSheet } from './DeviceIssueSheet';
import { TrainingVideoModal } from './TrainingVideoModal';
import { CollectDeviceSheet } from './CollectDeviceSheet';
import { WithdrawSheet } from './WithdrawSheet';

/**
 * Single mount point for every global overlay (sc-if blocks rendered outside
 * the .vp viewport in the source HTML). Placed above the navigator in App.tsx.
 */
export const OverlayHost: React.FC = () => (
  <>
    <ShiftVerifySheet />
    <DeviceIssueSheet />
    <CollectDeviceSheet />
    <WithdrawSheet />
    <TrainingVideoModal />
    <LogoutConfirmModal />
    <Toast />
  </>
);
