import { describe, it, expect } from "bun:test";
import {
  createSuccessResponse,
  createErrorResponse,
  isSuccess,
} from "../../src/utils/validator.js";

describe("Validator utilities", () => {
  it("should create a success response", () => {
    const testData = { id: 1, name: "test" };
    const result = createSuccessResponse(testData);

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("data", testData);
    expect(result).not.toHaveProperty("error");
    expect(result.error).toBeUndefined();
  });

  it("should create an error response", () => {
    const errorMessage = "Test error message";
    const result = createErrorResponse(errorMessage);

    expect(result).toHaveProperty("success", false);
    expect(result).toHaveProperty("error", errorMessage);
    expect(result).toHaveProperty("data", false);
  });

  it("should create an error response with custom data", () => {
    const errorMessage = "Test error message";
    const customData = { code: 404 };
    const result = createErrorResponse(errorMessage, customData);

    expect(result).toHaveProperty("success", false);
    expect(result).toHaveProperty("error", errorMessage);
    expect(result).toHaveProperty("data", customData);
  });

  it("should correctly identify success responses", () => {
    const successResponse = createSuccessResponse({ test: "data" });
    expect(isSuccess(successResponse)).toBe(true);
  });

  it("should correctly identify error responses", () => {
    const errorResponse = createErrorResponse("Something went wrong");
    expect(isSuccess(errorResponse)).toBe(false);
  });

  it("should correctly identify boolean values", () => {
    expect(isSuccess(true)).toBe(true);
    expect(isSuccess(false)).toBe(false);
  });

  it("should handle complex success responses", () => {
    const complexData = {
      items: [{ id: 1 }, { id: 2 }],
      totalCount: 2,
      pageInfo: { hasNext: false },
    };
    const result = createSuccessResponse(complexData);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(complexData);
    expect(isSuccess(result)).toBe(true);
  });

  it("should handle service responses with additional properties", () => {
    // createSuccessResponse only accepts data parameter, not additional properties
    const result = createSuccessResponse({ id: 1 });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 1 });

    // Check that we only have the expected properties
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("data");
    expect(result).not.toHaveProperty("error");
    expect(result).not.toHaveProperty("statusCode");
    expect(result).not.toHaveProperty("headers");
  });

  it("should allow different types of success responses", () => {
    // Test with string data
    const stringResult = createSuccessResponse("Success message");
    expect(stringResult.success).toBe(true);
    expect(stringResult.data).toBe("Success message");
    expect(isSuccess(stringResult)).toBe(true);

    // Test with number data
    const numberResult = createSuccessResponse(42);
    expect(numberResult.success).toBe(true);
    expect(numberResult.data).toBe(42);
    expect(isSuccess(numberResult)).toBe(true);

    // Test with array data
    const arrayResult = createSuccessResponse([1, 2, 3]);
    expect(arrayResult.success).toBe(true);
    expect(arrayResult.data).toEqual([1, 2, 3]);
    expect(isSuccess(arrayResult)).toBe(true);

    // Test with null data
    const nullResult = createSuccessResponse(null);
    expect(nullResult.success).toBe(true);
    expect(nullResult.data).toBeNull();
    expect(isSuccess(nullResult)).toBe(true);
  });
});
