// Heavy computation tasks

exports.add = (numbers) => {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    throw new Error('Numbers array is required and must not be empty');
  }
  return numbers.reduce((sum, num) => sum + num, 0);
};

exports.multiply = (numbers) => {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    throw new Error('Numbers array is required and must not be empty');
  }
  return numbers.reduce((product, num) => product * num, 1);
};

exports.subtract = (numbers) => {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    throw new Error('Numbers array is required and must not be empty');
  }
  if (numbers.length === 1) return -numbers[0];
  return numbers.reduce((result, num, index) => {
    return index === 0 ? num : result - num;
  }, 0);
};

exports.divide = (numbers) => {
  if (!Array.isArray(numbers) || numbers.length < 2) {
    throw new Error('At least two numbers are required for division');
  }
  return numbers.reduce((result, num, index) => {
    if (index === 0) return num;
    if (num === 0) throw new Error('Division by zero is not allowed');
    return result / num;
  }, 0);
};

exports.factorial = (n) => {
  if (typeof n !== 'number' || n < 0) {
    throw new Error('Factorial requires a non-negative number');
  }
  if (n === 0 || n === 1) return 1;
  if (n > 170) throw new Error('Factorial too large (max 170)');
  
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
};

exports.fibonacci = (n) => {
  if (typeof n !== 'number' || n < 0) {
    throw new Error('Fibonacci requires a non-negative number');
  }
  if (n === 0) return 0;
  if (n === 1) return 1;
  
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    const temp = a + b;
    a = b;
    b = temp;
  }
  return b;
};

exports.primeCheck = (n) => {
  if (typeof n !== 'number' || n < 0) {
    throw new Error('Prime check requires a non-negative number');
  }
  if (n <= 1) return false;
  if (n <= 3) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
};

exports.matrixMultiply = (matrixA, matrixB) => {
  if (!Array.isArray(matrixA) || !Array.isArray(matrixB)) {
    throw new Error('Both arguments must be matrices (arrays)');
  }
  if (matrixA.length === 0 || matrixB.length === 0) {
    throw new Error('Matrices cannot be empty');
  }
  
  const rowsA = matrixA.length;
  const colsA = matrixA[0].length;
  const rowsB = matrixB.length;
  const colsB = matrixB[0].length;
  
  if (colsA !== rowsB) {
    throw new Error(`Matrix dimensions mismatch: ${rowsA}x${colsA} cannot multiply ${rowsB}x${colsB}`);
  }
  
  const result = Array(rowsA).fill(0).map(() => Array(colsB).fill(0));
  
  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      for (let k = 0; k < colsA; k++) {
        result[i][j] += matrixA[i][k] * matrixB[k][j];
      }
    }
  }
  return result;
};

exports.power = (base, exponent) => {
  if (typeof base !== 'number' || typeof exponent !== 'number') {
    throw new Error('Both base and exponent must be numbers');
  }
  if (exponent < 0) {
    throw new Error('Negative exponents not supported');
  }
  if (exponent === 0) return 1;
  if (exponent === 1) return base;
  
  let result = 1;
  for (let i = 0; i < exponent; i++) {
    result *= base;
  }
  return result;
};

exports.sumOfSquares = (numbers) => {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    throw new Error('Numbers array is required and must not be empty');
  }
  return numbers.reduce((sum, num) => sum + (num * num), 0);
};

exports.average = (numbers) => {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    throw new Error('Numbers array is required and must not be empty');
  }
  const sum = numbers.reduce((sum, num) => sum + num, 0);
  return sum / numbers.length;
};