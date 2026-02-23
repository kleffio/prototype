import { useState } from "react";
import { Search, ChevronLeft, ChevronRight, User as UserIcon, MoreHorizontal } from "lucide-react";
import type { AdminUserListItem, UsersTableState } from "../types/admin";
import { RoleBadge } from "./RoleBadge";
import { Skeleton } from "@shared/ui/Skeleton";

interface UsersTableProps {
  users: AdminUserListItem[];
  total: number;
  isLoading: boolean;
  state: UsersTableState;
  onStateChange: (state: Partial<UsersTableState>) => void;
  onSelectUser: (user: AdminUserListItem) => void;
}

export function UsersTable({
  users,
  total,
  isLoading,
  state,
  onStateChange,
  onSelectUser
}: UsersTableProps) {
  const [searchInput, setSearchInput] = useState(state.search);

  const totalPages = Math.ceil(total / state.pageSize);

  const handleSearch = () => {
    onStateChange({ search: searchInput, page: 1 });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      {/* WCAG 2.0 AA: Search Bar with proper label */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" aria-hidden="true" />
          <label htmlFor="user-search-input" className="sr-only">
            Search users by email, username, or display name
          </label>
          <input
            id="user-search-input"
            type="search"
            placeholder="Search by email, username, or display name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Search users"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950/80 py-2 pl-10 pr-4 text-sm text-neutral-50 placeholder-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
          />
        </div>
        <button
          onClick={handleSearch}
          aria-label="Execute search"
          className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800"
        >
          Search
        </button>
      </div>

      {/* WCAG 2.0 AA: Table with caption for screen readers */}
      <div className="overflow-hidden rounded-xl border border-neutral-800/80 bg-neutral-900/60">
        <table className="w-full" aria-label="Users management table">
          <caption className="sr-only">
            List of platform users with their email, roles, status, and creation date. Click on a user row to view details.
          </caption>
          <thead>
            <tr className="border-b border-neutral-800/50 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
              <th scope="col" className="px-4 py-3">User</th>
              <th scope="col" className="px-4 py-3">Email</th>
              <th scope="col" className="px-4 py-3">Roles</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Created</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/50">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-32 bg-neutral-800" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-40 bg-neutral-800" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-24 bg-neutral-800" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-16 bg-neutral-800" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-20 bg-neutral-800" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Skeleton className="ml-auto h-5 w-8 bg-neutral-800" />
                  </td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="group cursor-pointer transition hover:bg-neutral-800/30"
                  onClick={() => onSelectUser(user)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 text-xs font-medium text-neutral-300">
                        {user.displayName?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || <UserIcon className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-neutral-50">{user.displayName}</div>
                        <div className="text-xs text-neutral-500">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-neutral-300">{user.email}</div>
                    {user.emailVerified && (
                      <span className="text-xs text-green-400">Verified</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.platformRoles?.length > 0 ? (
                        user.platformRoles.map((role) => (
                          <RoleBadge key={role} role={role} size="sm" />
                        ))
                      ) : (
                        <span className="text-xs text-neutral-500">No roles</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {user.isDeactivated ? (
                      <span className="inline-flex items-center rounded-md bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-300 border border-red-500/30">
                        Suspended
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-300 border border-green-500/30">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-neutral-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {/* WCAG 2.0 AA: Icon button has accessible name */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectUser(user);
                      }}
                      aria-label={`View details for ${user.displayName || user.username}`}
                      className="rounded p-1 text-neutral-500 opacity-0 transition hover:bg-neutral-700 hover:text-neutral-300 group-hover:opacity-100"
                    >
                      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-500">
            Showing {((state.page - 1) * state.pageSize) + 1} to {Math.min(state.page * state.pageSize, total)} of {total} users
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onStateChange({ page: state.page - 1 })}
              disabled={state.page === 1 || isLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="text-sm text-neutral-400">
              Page {state.page} of {totalPages}
            </span>
            <button
              onClick={() => onStateChange({ page: state.page + 1 })}
              disabled={state.page === totalPages || isLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}