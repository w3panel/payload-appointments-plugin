'use client';

import type { Host, AppointmentStatus } from '../../types';

import React from 'react';

interface ToolbarProps {
  currentDate: Date;
  hosts: Host[];
  onDateChange: (date: Date) => void;
  onNewAppointment: () => void;
  onStatusFilterChange: (status: AppointmentStatus | 'all') => void;
  onTeamFilterChange: (hostId: string | 'all') => void;
  statusFilter: AppointmentStatus | 'all';
  teamFilter: string | 'all';
}

const statusOptions: { label: string; value: AppointmentStatus | 'all' }[] = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'No Show', value: 'no-show' },
];

const Toolbar: React.FC<ToolbarProps> = ({
  currentDate,
  hosts,
  onDateChange,
  onNewAppointment,
  onStatusFilterChange,
  onTeamFilterChange,
  statusFilter,
  teamFilter,
}) => {
  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    if (!isNaN(date.getTime())) {
      onDateChange(date);
    }
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="appointments-toolbar">
      <div className="appointments-toolbar__left">
        <button
          className="appointments-toolbar__btn appointments-toolbar__btn--primary"
          onClick={onNewAppointment}
          type="button"
        >
          <svg
            fill="none"
            height="16"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="16"
          >
            <line x1="12" x2="12" y1="5" y2="19" />
            <line x1="5" x2="19" y1="12" y2="12" />
          </svg>
          New Appointment
        </button>
      </div>

      <div className="appointments-toolbar__center">
        <input
          className="appointments-toolbar__date-picker"
          onChange={handleDateInputChange}
          type="date"
          value={formatDateForInput(currentDate)}
        />
      </div>

      <div className="appointments-toolbar__right">
        <select
          className="appointments-toolbar__select"
          onChange={(e) => onStatusFilterChange(e.target.value as AppointmentStatus | 'all')}
          value={statusFilter}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          className="appointments-toolbar__select"
          onChange={(e) => onTeamFilterChange(e.target.value)}
          value={teamFilter}
        >
          <option value="all">All Hosts</option>
          {hosts.map((host) => (
            <option key={host.id} value={host.id}>
              {host.preferredNameAppointments || `${host.firstName ?? ''} ${host.lastName ?? ''}`.trim() || `Host ${host.id}`}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default Toolbar;
