const copyIfMissing = (target, key, value) => {
  if (target[key] === undefined && value !== undefined) target[key] = value;
};

export const normalizeField = (field = {}) => {
  const normalized = {
    ...field,
    type: field.type === "treeSelect" ? "tree-select" : field.type,
    options: field.options ?? field.selectOption ?? [],
  };

  const nativeProps = { ...(field.props || {}) };
  [
    "clearable",
    "filterable",
    "multiple",
    "collapseTags",
    "collapseTagsTooltip",
    "disabledDate",
    "placeholder",
  ].forEach((key) => copyIfMissing(nativeProps, key, field[key]));

  normalized.props = nativeProps;
  return normalized;
};

export const normalizeColumn = (column = {}) => {
  const normalized = {
    ...column,
    prop: column.prop ?? column.field,
    showOverflowTooltip: column.showOverflowTooltip ?? column.tooltip ?? false,
  };
  delete normalized.field;
  delete normalized.tooltip;
  return normalized;
};

const normalizeAction = (value, defaultLabel) => {
  if (!value) return null;
  if (typeof value === "function") {
    return { handler: value, label: defaultLabel, props: {} };
  }
  const handler = value.handler ?? value.onClick;
  if (typeof handler !== "function") return null;
  return {
    handler,
    label: value.label ?? defaultLabel,
    props: value.props ?? {},
  };
};

export const normalizeActions = (actions = {}, legacy = {}) => ({
  detail: normalizeAction(actions.detail ?? legacy.detailMethod, "詳細"),
  edit: normalizeAction(actions.edit ?? legacy.editMethod, "編輯"),
  remove: normalizeAction(
    actions.remove ?? actions.delete ?? legacy.delMethod,
    "刪除",
  ),
});

export const normalizeSelection = (selection, legacy = {}) => {
  if (!selection) return null;
  const config = typeof selection === "object" ? selection : {};
  return {
    key: config.key ?? config.rowKey ?? legacy.rowKey ?? "id",
    reserve:
      config.reserve ?? config.reserveSelection ?? legacy.reserveSelection,
    selectable: config.selectable ?? legacy.selectionSelectable,
    ...config,
  };
};

export const normalizeExport = (value, legacy = {}) => {
  if (!value && !legacy.pdfExport) return null;
  if (typeof value === "function" || typeof value === "string") {
    return {
      excel: value,
      name: legacy.exportFileName || "資料匯出",
    };
  }
  const config = typeof value === "object" && value ? value : {};
  return {
    ...config,
    name: config.name ?? legacy.exportFileName ?? "資料匯出",
    pdf:
      config.pdf ??
      (legacy.pdfExport && typeof legacy.pdfHandler === "function"
        ? legacy.pdfHandler
        : undefined),
    pdfName: config.pdfName ?? legacy.pdfFileName,
    header: config.header ?? legacy.pdfHeader,
    footer: config.footer ?? legacy.pdfFooter,
  };
};
