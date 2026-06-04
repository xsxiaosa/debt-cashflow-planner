import { act } from 'react';
import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { createRoot, Root } from 'react-dom/client';
import App from './App';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

class MockResizeObserver {
  observe(): void {}

  unobserve(): void {}

  disconnect(): void {}
}

global.ResizeObserver = MockResizeObserver;

describe('App summary', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage.clear();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
    localStorage.clear();
  });

  it('shows the total outstanding payment summary', () => {
    act(() => {
      root.render(<App />);
    });

    expect(container.textContent).toContain('总待还款金额');
  });
});
