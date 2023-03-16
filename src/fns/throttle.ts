function throttle<T, U extends unknown[]>(fn: (...args: U) => T, waitTime = 1000): (...args: U) => T | undefined {
  let inThrottle = false;

  return (...args: U): T | undefined => {
    if (inThrottle) return;
    inThrottle = true;
    setTimeout(() => (inThrottle = false), waitTime);

    return fn(...args);
  };
}

export default throttle;
