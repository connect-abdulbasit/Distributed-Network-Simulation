// Heavy computation tasks

exports.add = (numbers) => {
    return numbers.reduce((sum, num) => sum + num, 0);
  };
  
  exports.multiply = (numbers) => {
    return numbers.reduce((product, num) => product * num, 1);
  };
  
  exports.factorial = (n) => {
    if (n < 0) throw new Error('Factorial not defined for negative numbers');
    if (n === 0 || n === 1) return 1;
    
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  };
  
  exports.fibonacci = (n) => {
    if (n < 0) throw new Error('Fibonacci not defined for negative numbers');
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
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    
    for (let i = 5; i * i <= n; i += 6) {
      if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
  };
  
  exports.matrixMultiply = (matrixA, matrixB) => {
    const rowsA = matrixA.length;
    const colsA = matrixA[0].length;
    const colsB = matrixB[0].length;
    
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