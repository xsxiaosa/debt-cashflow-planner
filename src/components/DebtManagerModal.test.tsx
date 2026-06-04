import { act } from 'react';
import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { createRoot, Root } from 'react-dom/client';
import DebtManagerModal from './DebtManagerModal';
import type { DebtItem } from '../types/debt';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const debts: DebtItem[] = [
  {
    category: '信用卡分期',
    totalAmount: 3000,
    remainingPeriods: 3,
    annualInterestRate: 0,
  },
  {
    category: '房贷',
    totalAmount: 6000,
    remainingPeriods: 6,
    annualInterestRate: 4.2,
  },
];

describe('DebtManagerModal', () => {
  let container: HTMLDivElement;
  let root: Root;
  let confirmSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
    jest.restoreAllMocks();
  });

  it('clears all local debts after confirmation', () => {
    act(() => {
      root.render(
        <DebtManagerModal
          isOpen
          debts={debts}
          loading={false}
          saving={false}
          errorMessage={null}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );
    });

    const clearButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === '一键清空'
    );

    expect(clearButton).toBeTruthy();

    act(() => {
      clearButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(confirmSpy).toHaveBeenCalledWith('确定清空全部 2 条债务吗？此操作保存前仍可关闭弹窗放弃。');
    expect(container.textContent).toContain('当前共 0 条债务，含未保存修改');
    expect(container.textContent).toContain('暂无债务数据，请先添加或导入。');
  });
});
