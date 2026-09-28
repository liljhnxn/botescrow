import React, { ReactNode } from "react";
import Link from "next/link";
import { FolderSearch } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  icon?: ReactNode;
}

export function EmptyState({
  title,
  description,
  actionText,
  actionHref,
  icon,
}: EmptyStateProps) {
  return (
    <div className="rounded-2xl glass-panel p-10 text-center border border-white/5 space-y-4 my-6">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
        {icon || <FolderSearch className="w-7 h-7 text-zinc-500" />}
      </div>
      <div className="max-w-md mx-auto space-y-1">
        <h3 className="text-base font-semibold text-zinc-200">{title}</h3>
        <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>
      </div>
      {actionText && actionHref && (
        <div className="pt-2">
          <Link
            href={actionHref}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 text-zinc-950 hover:bg-cyan-400 transition-colors shadow-md shadow-cyan-500/20"
          >
            {actionText}
          </Link>
        </div>
      )}
    </div>
  );
}
