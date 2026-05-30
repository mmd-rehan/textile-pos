export interface StandardResponse<T> {
  success: boolean;
  data: T;
  meta: Record<string, any>;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  [key: string]: any;
}

export function createSuccessResponse<T>(data: T, meta: Record<string, any> = {}): StandardResponse<T> {
  return {
    success: true,
    data,
    meta,
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  extraMeta: Record<string, any> = {},
): StandardResponse<T[]> {
  const totalPages = Math.ceil(total / limit);
  const paginatedMeta: PaginatedMeta = {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    ...extraMeta,
  };

  return {
    success: true,
    data,
    meta: paginatedMeta,
  };
}
