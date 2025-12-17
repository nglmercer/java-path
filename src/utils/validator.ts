/**
 * Defines the standard response structure for all operations.
 * It is a discriminated union for type-safe handling.
 */
export type ServiceResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; data: T };

/**
 * Creates a standardized success response.
 * @param data - The data to return upon success.
 */
const createSuccessResponse = <T>(data: T): ServiceResponse<T> => ({
  success: true,
  data,
});

/**
 * Creates a standardized error response.
 * @param error - The error message.
 * @param data - Optional data to return with the error (defaults to false cast as T).
 */
const createErrorResponse = <T = unknown>(
  error: string,
  data: T = false as unknown as T,
): ServiceResponse<T> => ({
  success: false,
  data,
  error,
});

/**
 * Type guard to check if a response or boolean result is successful.
 * @param result - The ServiceResponse or boolean to check.
 */
function isSuccess<T>(
  result: ServiceResponse<T> | boolean,
): result is (ServiceResponse<T> & { success: true }) | true {
  if (typeof result === "boolean") {
    return result;
  }
  return result.success;
}

export { createSuccessResponse, createErrorResponse, isSuccess };

