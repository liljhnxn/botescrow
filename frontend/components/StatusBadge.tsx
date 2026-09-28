import React from "react";
import {
  JobStatus,
  JOB_STATUS_LABELS,
  MilestoneStatus,
  MILESTONE_STATUS_LABELS,
} from "@/lib/contracts";

export function JobStatusBadge({ status }: { status: JobStatus | number }) {
  const meta = JOB_STATUS_LABELS[status as JobStatus] || {
    label: "Unknown",
    color: "text-zinc-400",
    bg: "bg-zinc-800 border-zinc-700",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${meta.bg} ${meta.color}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {meta.label}
    </span>
  );
}

export function MilestoneStatusBadge({ status }: { status: MilestoneStatus | number }) {
  const meta = MILESTONE_STATUS_LABELS[status as MilestoneStatus] || {
    label: "Unknown",
    color: "text-zinc-400",
    bg: "bg-zinc-800 border-zinc-700",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${meta.bg} ${meta.color}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {meta.label}
    </span>
  );
}
