/**
 * Test data for E2E tests
 */

export const testCode = {
    simple: `function add(a, b) {
  return a + b;
}`,

    withBug: `function divide(a, b) {
  // Bug: no check for division by zero
  return a / b;
}

function processData(data) {
  // Bug: no null check
  return data.map(x => x * 2);
}`,

    complex: `class Calculator {
  constructor() {
    this.history = [];
  }

  add(a, b) {
    const result = a + b;
    this.history.push({ op: 'add', a, b, result });
    return result;
  }

  subtract(a, b) {
    const result = a - b;
    this.history.push({ op: 'subtract', a, b, result });
    return result;
  }

  getHistory() {
    return this.history;
  }
}`,

    python: `def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)`,
};

export const testPrompts = {
    simple: 'Review this code for best practices',
    bugFix: 'Find and fix bugs in this code',
    optimization: 'Optimize this code for performance',
    refactor: 'Refactor this code to improve readability',
};

/**
 * Admin token for settings access (from environment or default for testing)
 */
export const adminToken = process.env.SETTINGS_TOKEN || 'test-admin-token';
