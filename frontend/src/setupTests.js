// Jest setup file to mock ResizeObserver for recharts and other libraries

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}; 