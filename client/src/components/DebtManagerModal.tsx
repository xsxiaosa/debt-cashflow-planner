import React, { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

export interface DebtItem {
  category: string;
  totalAmount: number;
  remainingPeriods: number;
  monthlyPayment: number;
  nextRepaymentMonth?: string;
}

interface DebtManagerModalProps {
  isOpen: boolean;
  debts: DebtItem[];
  loading: boolean;
  saving: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSave: (debts: DebtItem[]) => Promise<void>;
}

const emptyDraft: DebtItem = {
  category: '',
  totalAmount: 0,
  remainingPeriods: 0,
  monthlyPayment: 0,
  nextRepaymentMonth: ''
};

const repaymentMonthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

function formatCurrency(value: number): string {
  return `¥${value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function createDraft(debt?: DebtItem): DebtItem {
  if (!debt) {
    return { ...emptyDraft };
  }

  return {
    category: debt.category,
    totalAmount: debt.totalAmount,
    remainingPeriods: debt.remainingPeriods,
    monthlyPayment: debt.monthlyPayment,
    nextRepaymentMonth: debt.nextRepaymentMonth || ''
  };
}

function normalizeDebtItem(debt: DebtItem): DebtItem {
  const trimmedMonth = debt.nextRepaymentMonth?.trim() || '';

  return {
    category: debt.category.trim(),
    totalAmount: Number(debt.totalAmount),
    remainingPeriods: Number(debt.remainingPeriods),
    monthlyPayment: Number(debt.monthlyPayment),
    nextRepaymentMonth: trimmedMonth || undefined
  };
}

const DebtManagerModal: React.FC<DebtManagerModalProps> = ({
  isOpen,
  debts,
  loading,
  saving,
  errorMessage,
  onClose,
  onSave
}) => {
  const [localDebts, setLocalDebts] = useState<DebtItem[]>([]);
  const [draft, setDraft] = useState<DebtItem>(createDraft());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [importing, setImporting] = useState<boolean>(false);
  const [pendingImportDebts, setPendingImportDebts] = useState<DebtItem[] | null>(null);
  const [pendingImportFileName, setPendingImportFileName] = useState<string>('');
  const [showPasteImporter, setShowPasteImporter] = useState<boolean>(false);
  const [pastedJsonText, setPastedJsonText] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setLocalDebts(debts);
    setDraft(createDraft());
    setEditingIndex(null);
    setFormError(null);
    setPendingImportDebts(null);
    setPendingImportFileName('');
    setShowPasteImporter(false);
    setPastedJsonText('');
  }, [isOpen, debts]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(localDebts) !== JSON.stringify(debts),
    [localDebts, debts]
  );

  const resetEditor = useCallback(() => {
    setDraft(createDraft());
    setEditingIndex(null);
    setFormError(null);
  }, []);

  const clearImportPreview = useCallback(() => {
    setPendingImportDebts(null);
    setPendingImportFileName('');
  }, []);

  const handleRequestClose = useCallback(() => {
    if (saving) {
      return;
    }

    if (hasUnsavedChanges && !window.confirm('当前有未保存的修改，确定要关闭并放弃吗？')) {
      return;
    }

    resetEditor();
    clearImportPreview();
    onClose();
  }, [saving, hasUnsavedChanges, resetEditor, clearImportPreview, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleRequestClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleRequestClose]);

  const handleDraftChange = (
    field: keyof DebtItem,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const rawValue = event.target.value;
    const numericFields: Array<keyof DebtItem> = ['totalAmount', 'remainingPeriods', 'monthlyPayment'];

    setDraft((prev) => ({
      ...prev,
      [field]: numericFields.includes(field)
        ? rawValue === ''
          ? 0
          : Number(rawValue)
        : rawValue
    }));
  };

  const validateDebtFields = (candidate: DebtItem): string | null => {
    const normalizedDebt = normalizeDebtItem(candidate);

    if (!normalizedDebt.category) {
      return '债务类别不能为空';
    }

    if (!Number.isFinite(normalizedDebt.totalAmount) || normalizedDebt.totalAmount < 0) {
      return '总金额必须是大于等于 0 的数字';
    }

    if (!Number.isInteger(normalizedDebt.remainingPeriods) || normalizedDebt.remainingPeriods < 0) {
      return '剩余期数必须是大于等于 0 的整数';
    }

    if (!Number.isFinite(normalizedDebt.monthlyPayment) || normalizedDebt.monthlyPayment < 0) {
      return '每期还款额必须是大于等于 0 的数字';
    }

    if (
      normalizedDebt.nextRepaymentMonth &&
      !repaymentMonthPattern.test(normalizedDebt.nextRepaymentMonth)
    ) {
      return '下次开始还款月份必须是 YYYY-MM 格式';
    }

    return null;
  };

  const validateDebt = (candidate: DebtItem, indexToIgnore: number | null): string | null => {
    const fieldMessage = validateDebtFields(candidate);
    if (fieldMessage) {
      return fieldMessage;
    }

    const normalizedDebt = normalizeDebtItem(candidate);

    const duplicatedCategory = localDebts.some((item, index) => (
      index !== indexToIgnore && item.category.trim() === normalizedDebt.category
    ));

    if (duplicatedCategory) {
      return '债务类别不能重复';
    }

    return null;
  };

  const parseImportPayload = (text: string, sourceName: string) => {
    const parsedData = JSON.parse(text);

    if (!Array.isArray(parsedData)) {
      throw new Error('导入内容必须是债务数组');
    }

    const normalizedDebts = parsedData.map((item) => normalizeDebtItem(item as DebtItem));
    normalizedDebts.forEach((item, index) => {
      const validationMessage = validateDebtFields(item);
      if (validationMessage) {
        throw new Error(`第 ${index + 1} 条数据无效：${validationMessage}`);
      }
    });

    const categorySet = new Set<string>();
    normalizedDebts.forEach((item) => {
      if (categorySet.has(item.category)) {
        throw new Error(`导入内容中存在重复类别：${item.category}`);
      }
      categorySet.add(item.category);
    });

    setPendingImportDebts(normalizedDebts);
    setPendingImportFileName(sourceName);
  };

  const isDraftBlank = (): boolean => (
    draft.category.trim() === '' &&
    Number(draft.totalAmount) === 0 &&
    Number(draft.remainingPeriods) === 0 &&
    Number(draft.monthlyPayment) === 0 &&
    !(draft.nextRepaymentMonth || '').trim()
  );

  const buildNextDebtsWithDraft = (): DebtItem[] | null => {
    if (editingIndex === null && isDraftBlank()) {
      return localDebts;
    }

    const validationMessage = validateDebt(draft, editingIndex);
    if (validationMessage) {
      setFormError(validationMessage);
      return null;
    }

    const normalizedDebt = normalizeDebtItem(draft);
    const nextDebts = [...localDebts];

    if (editingIndex === null) {
      nextDebts.push(normalizedDebt);
    } else {
      nextDebts[editingIndex] = normalizedDebt;
    }

    return nextDebts;
  };

  const importPreview = useMemo(() => {
    if (!pendingImportDebts) {
      return null;
    }

    const currentMap = new Map(localDebts.map((item) => [item.category, item]));
    const importedMap = new Map(pendingImportDebts.map((item) => [item.category, item]));

    const added = pendingImportDebts
      .filter((item) => !currentMap.has(item.category))
      .map((item) => item.category);

    const updated = pendingImportDebts
      .filter((item) => {
        const currentItem = currentMap.get(item.category);
        return currentItem && JSON.stringify(currentItem) !== JSON.stringify(item);
      })
      .map((item) => item.category);

    const unchanged = pendingImportDebts
      .filter((item) => {
        const currentItem = currentMap.get(item.category);
        return currentItem && JSON.stringify(currentItem) === JSON.stringify(item);
      })
      .map((item) => item.category);

    const removed = localDebts
      .filter((item) => !importedMap.has(item.category))
      .map((item) => item.category);

    return {
      added,
      updated,
      unchanged,
      removed,
      totalAfterImport: pendingImportDebts.length
    };
  }, [pendingImportDebts, localDebts]);

  const handleEditDebt = (index: number) => {
    setEditingIndex(index);
    setDraft(createDraft(localDebts[index]));
    setFormError(null);
  };

  const handleDeleteDebt = (index: number) => {
    const targetDebt = localDebts[index];
    if (!targetDebt) {
      return;
    }

    if (!window.confirm(`确定删除“${targetDebt.category}”吗？`)) {
      return;
    }

    const nextDebts = localDebts.filter((_, itemIndex) => itemIndex !== index);
    setLocalDebts(nextDebts);

    if (editingIndex === index) {
      resetEditor();
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const handleSaveCurrent = () => {
    const nextDebts = buildNextDebtsWithDraft();
    if (!nextDebts) {
      return;
    }

    setLocalDebts(nextDebts);
    resetEditor();
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setImporting(true);
    setFormError(null);

    try {
      const text = await file.text();
      parseImportPayload(text, file.name);
      setShowPasteImporter(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '导入失败，请检查文件格式');
    } finally {
      setImporting(false);
    }
  };

  const handleImportPaste = () => {
    if (!pastedJsonText.trim()) {
      setFormError('请先粘贴 JSON 内容');
      return;
    }

    setFormError(null);

    try {
      parseImportPayload(pastedJsonText, '粘贴内容');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '解析粘贴内容失败');
    }
  };

  const handleApplyImport = () => {
    if (!pendingImportDebts) {
      return;
    }

    setLocalDebts(pendingImportDebts);
    resetEditor();
    clearImportPreview();
    setPastedJsonText('');
    setShowPasteImporter(false);
  };

  const handleExport = () => {
    const content = JSON.stringify(localDebts, null, 2);
    const blob = new Blob([`${content}\n`], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'debts-export.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveAll = async () => {
    setFormError(null);
    const nextDebts = buildNextDebtsWithDraft();
    if (!nextDebts) {
      return;
    }

    await onSave(nextDebts);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="debt-modal-overlay" onClick={handleRequestClose}>
      <div className="debt-modal" onClick={(event) => event.stopPropagation()}>
        <div className="debt-modal-header">
          <div>
            <h2>编辑负债列表</h2>
            <p>在弹窗中集中维护债务数据，保存后将自动刷新主页面的还款计划。</p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={handleRequestClose}
            disabled={saving}
          >
            关闭
          </button>
        </div>

        <div className="debt-modal-toolbar">
          <button
            type="button"
            className="toolbar-btn primary"
            onClick={resetEditor}
            disabled={loading || saving}
          >
            + 添加债务
          </button>
          <label className={`toolbar-btn secondary file-import-btn ${importing || loading || saving ? 'disabled' : ''}`}>
            选择文件
            <input
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              disabled={importing || loading || saving}
            />
          </label>
          <button
            type="button"
            className="toolbar-btn secondary"
            onClick={() => {
              setShowPasteImporter((prev) => !prev);
              setFormError(null);
            }}
            disabled={loading || saving || importing}
          >
            {showPasteImporter ? '收起粘贴框' : '粘贴 JSON'}
          </button>
          <button
            type="button"
            className="toolbar-btn secondary"
            onClick={handleExport}
            disabled={loading || saving || localDebts.length === 0}
          >
            导出 JSON
          </button>
          <span className="toolbar-summary">
            当前共 {localDebts.length} 条债务{hasUnsavedChanges ? '，含未保存修改' : ''}
          </span>
        </div>

        {(errorMessage || formError) && (
          <div className="debt-modal-error">
            {errorMessage || formError}
          </div>
        )}

        {showPasteImporter && (
          <div className="paste-import-panel">
            <div className="paste-import-header">
              <div>
                <h3>直接粘贴 JSON</h3>
                <p>将债务数组 JSON 粘贴到输入框中，再点击“预览导入差异”。</p>
              </div>
              <button
                type="button"
                className="toolbar-btn primary"
                onClick={handleImportPaste}
                disabled={saving || importing}
              >
                预览导入差异
              </button>
            </div>
            <textarea
              className="paste-import-textarea"
              value={pastedJsonText}
              onChange={(event) => setPastedJsonText(event.target.value)}
              placeholder={'[\n  {\n    "category": "信用卡分期",\n    "totalAmount": 5000,\n    "remainingPeriods": 12,\n    "monthlyPayment": 300,\n    "nextRepaymentMonth": "2026-04"\n  }\n]'}
              spellCheck={false}
            />
          </div>
        )}

        {importPreview && (
          <div className="import-preview-panel">
            <div className="import-preview-header">
              <div>
                <h3>导入差异预览</h3>
                <p>
                  来源：{pendingImportFileName || '未命名内容'}，应用后将保留 {importPreview.totalAfterImport} 条债务。
                </p>
              </div>
              <div className="import-preview-actions">
                <button
                  type="button"
                  className="toolbar-btn secondary"
                  onClick={clearImportPreview}
                  disabled={saving}
                >
                  取消导入
                </button>
                <button
                  type="button"
                  className="toolbar-btn primary"
                  onClick={handleApplyImport}
                  disabled={saving}
                >
                  应用导入结果
                </button>
              </div>
            </div>

            <div className="import-preview-stats">
              <span className="preview-stat added">新增 {importPreview.added.length}</span>
              <span className="preview-stat updated">更新 {importPreview.updated.length}</span>
              <span className="preview-stat removed">删除 {importPreview.removed.length}</span>
              <span className="preview-stat unchanged">不变 {importPreview.unchanged.length}</span>
            </div>

            <div className="import-preview-grid">
              <div className="preview-list">
                <h4>将新增</h4>
                <p>{importPreview.added.length > 0 ? importPreview.added.join('、') : '无'}</p>
              </div>
              <div className="preview-list">
                <h4>将更新</h4>
                <p>{importPreview.updated.length > 0 ? importPreview.updated.join('、') : '无'}</p>
              </div>
              <div className="preview-list">
                <h4>将删除</h4>
                <p>{importPreview.removed.length > 0 ? importPreview.removed.join('、') : '无'}</p>
              </div>
              <div className="preview-list">
                <h4>保持不变</h4>
                <p>{importPreview.unchanged.length > 0 ? importPreview.unchanged.join('、') : '无'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="debt-modal-content">
          <div className="debt-table-panel">
            <table className="debt-table">
              <thead>
                <tr>
                  <th>类别</th>
                  <th>总金额</th>
                  <th>剩余期数</th>
                  <th>每期还款额</th>
                  <th>开始月份</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {!loading && localDebts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="debt-table-empty">
                      暂无债务数据，请先添加或导入。
                    </td>
                  </tr>
                )}
                {localDebts.map((debt, index) => (
                  <tr key={debt.category}>
                    <td>{debt.category}</td>
                    <td>{formatCurrency(debt.totalAmount)}</td>
                    <td>{debt.remainingPeriods}</td>
                    <td>{formatCurrency(debt.monthlyPayment)}</td>
                    <td>{debt.nextRepaymentMonth || '立即开始'}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="table-action-btn"
                          onClick={() => handleEditDebt(index)}
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          className="table-action-btn danger"
                          onClick={() => handleDeleteDebt(index)}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="debt-form-panel">
            <h3>{editingIndex === null ? '新增债务' : '编辑债务'}</h3>
            <div className="debt-form">
              <div className="form-group">
                <label htmlFor="debt-category">债务类别</label>
                <input
                  id="debt-category"
                  type="text"
                  value={draft.category}
                  onChange={(event) => handleDraftChange('category', event)}
                  placeholder="例如：信用卡分期"
                />
              </div>

              <div className="form-group">
                <label htmlFor="debt-total-amount">总金额</label>
                <input
                  id="debt-total-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.totalAmount}
                  onChange={(event) => handleDraftChange('totalAmount', event)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="debt-remaining-periods">剩余期数</label>
                <input
                  id="debt-remaining-periods"
                  type="number"
                  min="0"
                  step="1"
                  value={draft.remainingPeriods}
                  onChange={(event) => handleDraftChange('remainingPeriods', event)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="debt-monthly-payment">每期还款额</label>
                <input
                  id="debt-monthly-payment"
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.monthlyPayment}
                  onChange={(event) => handleDraftChange('monthlyPayment', event)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="debt-next-month">下次开始还款月份</label>
                <input
                  id="debt-next-month"
                  type="month"
                  value={draft.nextRepaymentMonth || ''}
                  onChange={(event) => handleDraftChange('nextRepaymentMonth', event)}
                />
              </div>
            </div>

            <div className="debt-modal-actions">
              <button
                type="button"
                className="toolbar-btn secondary"
                onClick={resetEditor}
                disabled={saving}
              >
                取消编辑
              </button>
              <button
                type="button"
                className="toolbar-btn primary"
                onClick={handleSaveCurrent}
                disabled={loading || saving}
              >
                保存当前项
              </button>
              <button
                type="button"
                className="toolbar-btn primary"
                onClick={handleSaveAll}
                disabled={loading || saving || importing}
              >
                {saving ? '保存中...' : '保存全部并关闭'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebtManagerModal;
