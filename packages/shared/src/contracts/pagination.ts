/**
 * Canonical Pagination Contracts
 * Master Execution Framework — JOB W008
 */

export interface PaginationQuery {
  limit?: number;
  offset?: number;
}

export interface PaginationMeta {
  total?: number;
  limit: number;
  offset: number;
  hasMore?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}
