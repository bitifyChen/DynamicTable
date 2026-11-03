<script setup>
import {
  computed,
  inject,
  nextTick,
  onActivated,
  onDeactivated,
  onMounted,
  ref,
  unref,
  watch,
} from "vue";
import { routeLocationKey, routerKey } from "vue-router";
import { ElNotification } from "element-plus";
import BaseTable from "./BaseTable.vue";
import DynamicTablePagination from "./DynamicTablePagination.vue";
import DynamicTableSearch from "./DynamicTableSearch.vue";
import {
  normalizeActions,
  normalizeColumn,
  normalizeExport,
  normalizeField,
  normalizeSelection,
} from "../utils/compat.js";
import {
  fromQuery,
  getDefaults,
  getFieldName,
  isEmpty,
  isEqual,
  removeQuery,
  snapshot,
  toParams,
  toQuery,
} from "../utils/search.js";

const props = defineProps({
  data: {
    type: Array,
    required: true,
  },
  columns: {
    type: Array,
    default: undefined,
  },
  table: {
    type: Array,
    default: undefined,
  },
  search: {
    type: Array,
    default: () => [],
  },
  defaults: {
    type: Object,
    default: undefined,
  },
  searchDefault: {
    type: Object,
    default: undefined,
  },
  total: {
    type: [Number, null],
    default: undefined,
  },
  page: {
    type: [Number, null],
    default: undefined,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  index: {
    type: Boolean,
    default: false,
  },
  actions: {
    type: Object,
    default: () => ({}),
  },
  detailMethod: Function,
  editMethod: Function,
  delMethod: Function,
  selection: {
    type: [Boolean, Object],
    default: false,
  },
  rowKey: {
    type: [String, Function],
    default: "id",
  },
  reserveSelection: Boolean,
  selectionSelectable: Function,
  query: {
    type: [Boolean, Object],
    default: false,
  },
  urlDriven: Boolean,
  export: {
    type: [Object, Function, String],
    default: null,
  },
  exportFileName: String,
  pdfExport: Boolean,
  pdfHandler: Function,
  pdfHeader: Function,
  pdfFooter: Function,
  pdfFileName: String,
  fixed: {
    type: Boolean,
    default: undefined,
  },
  fixedHeader: {
    type: Boolean,
    default: undefined,
  },
  height: {
    type: [String, Number],
    default: undefined,
  },
  tableHeight: {
    type: [String, Number],
    default: undefined,
  },
  expand: {
    type: Boolean,
    default: undefined,
  },
  expandable: {
    type: Boolean,
    default: undefined,
  },
  readonly: Boolean,
  tableProps: {
    type: Object,
    default: () => ({}),
  },
  pagination: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits([
  "request",
  "getData",
  "selection-change",
  "select",
  "select-all",
  "current-change",
  "expand-change",
]);

const route = inject(routeLocationKey, null);
const router = inject(routerKey, null);
const routeQuery = computed(() => route?.query ?? {});
const fields = computed(() => props.search.map(normalizeField));
const columns = computed(() =>
  (props.columns ?? props.table ?? []).map(normalizeColumn),
);
const defaults = computed(() =>
  getDefaults(fields.value, props.defaults ?? props.searchDefault ?? {}),
);
const total = computed(() => props.total ?? props.page ?? null);
const actions = computed(() =>
  normalizeActions(props.actions, {
    detailMethod: props.detailMethod,
    editMethod: props.editMethod,
    delMethod: props.delMethod,
  }),
);
const selection = computed(() =>
  normalizeSelection(props.selection, {
    rowKey: props.rowKey,
    reserveSelection: props.reserveSelection,
    selectionSelectable: props.selectionSelectable,
  }),
);
const exportConfig = computed(() =>
  normalizeExport(props.export, {
    exportFileName: props.exportFileName,
    pdfExport: props.pdfExport,
    pdfHandler: props.pdfHandler,
    pdfHeader: props.pdfHeader,
    pdfFooter: props.pdfFooter,
    pdfFileName: props.pdfFileName,
  }),
);
const queryConfig = computed(() =>
  typeof props.query === "object" ? props.query : {},
);
const queryEnabled = computed(
  () =>
    (props.query === true ||
      (typeof props.query === "object" && props.query.enabled !== false) ||
      props.urlDriven) &&
    Boolean(route && router),
);

const searchForm = ref({ ...defaults.value });
const previousDefaults = ref({ ...defaults.value });
const paginationRef = ref(null);
const tableRef = ref(null);
const active = ref(false);
const initialized = ref(false);
let lastQuerySnapshot = "";

const validSearch = ({ notify = false } = {}) => {
  const missing = fields.value.find(
    (field) =>
      unref(field.required) && isEmpty(searchForm.value[getFieldName(field)]),
  );
  if (!missing) return true;
  if (notify) {
    ElNotification.warning({
      title: "缺少搜尋條件",
      message:
        missing.requiredMessage ||
        `請輸入${missing.props?.placeholder || missing.label || "必填條件"}。`,
    });
  }
  return false;
};

const pageParams = (value = {}) => ({
  page: paginationRef.value?.state?.page ?? 1,
  perPage: paginationRef.value?.state?.pageSize ?? 20,
  ...value,
});

const request = (pagination = {}) => {
  if (!validSearch()) return false;
  const params = toParams(
    fields.value,
    searchForm.value,
    pageParams(pagination),
  );
  emit("request", params);
  emit("getData", params);
  return true;
};

const currentSnapshot = () =>
  snapshot(fields.value, routeQuery.value, defaults.value);
const formSnapshot = () =>
  snapshot(
    fields.value,
    toQuery(fields.value, searchForm.value),
    defaults.value,
  );
const nextQuery = () => ({
  ...removeQuery(fields.value, routeQuery.value),
  ...toQuery(fields.value, searchForm.value),
});

const autoOpen = () => {
  if (!queryEnabled.value) return;
  const key = queryConfig.value.autoOpen || "autoOpen";
  const id = routeQuery.value[key];
  const detail = actions.value.detail?.handler;
  if (!id || !detail) return;
  detail({ id });
  const query = { ...routeQuery.value };
  delete query[key];
  router.replace({ query });
};

const search = async ({ mode = null } = {}) => {
  if (props.loading && (mode === "set" || mode === "reset")) return;
  if (mode !== "init") paginationRef.value?.reset?.();

  if (mode === "init" && queryEnabled.value) {
    searchForm.value = fromQuery(
      fields.value,
      routeQuery.value,
      defaults.value,
    );
    lastQuerySnapshot = currentSnapshot();
    autoOpen();
    request();
    return;
  }

  if (mode === "reset") searchForm.value = { ...defaults.value };
  if (!validSearch({ notify: mode === "set" })) return;

  if ((mode === "set" || mode === "reset") && queryEnabled.value) {
    const current = currentSnapshot();
    const next = formSnapshot();
    if (current === next) {
      lastQuerySnapshot = current;
      request();
    } else {
      await router.replace({ query: nextQuery() });
    }
    return;
  }

  request();
};

watch(
  [fields, defaults],
  () => {
    const nextDefaults = defaults.value;
    const next = { ...searchForm.value };
    const names = new Set(fields.value.map(getFieldName));
    Object.keys(next).forEach((name) => {
      if (!names.has(name) && !Object.hasOwn(nextDefaults, name))
        delete next[name];
    });
    fields.value.forEach((field) => {
      const name = getFieldName(field);
      const oldDefault = previousDefaults.value[name];
      const canSync =
        oldDefault !== undefined
          ? isEqual(next[name], oldDefault)
          : isEmpty(next[name]);
      if (canSync) next[name] = nextDefaults[name];
    });
    previousDefaults.value = { ...nextDefaults };
    searchForm.value = next;
  },
  { deep: true },
);

watch(
  routeQuery,
  () => {
    if (!queryEnabled.value || !initialized.value || !active.value) return;
    const next = currentSnapshot();
    if (next !== lastQuerySnapshot) search({ mode: "init" });
    else autoOpen();
  },
  { deep: true },
);

onMounted(async () => {
  active.value = true;
  if ((props.query || props.urlDriven) && !queryEnabled.value) {
    console.warn(
      "[DynamicTable] query 功能需要在 Vue Router 應用程式內使用。已改為一般搜尋模式。",
    );
  }
  if (queryEnabled.value) {
    await nextTick();
    await search({ mode: "init" });
  } else {
    request();
  }
  initialized.value = true;
});

onActivated(() => {
  active.value = true;
  if (!initialized.value || !queryEnabled.value) return;
  if (currentSnapshot() !== lastQuerySnapshot) search({ mode: "init" });
  else autoOpen();
});
onDeactivated(() => {
  active.value = false;
});

const refresh = () => paginationRef.value?.request?.();
const reset = () => {
  search({ mode: "reset" });
  tableRef.value?.clearSelection?.();
};
const clearSelection = () => tableRef.value?.clearSelection?.();
const toggleRowSelection = (row, selected) =>
  tableRef.value?.toggleRowSelection?.(row, selected);
const getSelectionRows = () => tableRef.value?.getSelectionRows?.() || [];

defineExpose({
  searchForm,
  reset,
  refresh,
  clearSelection,
  toggleRowSelection,
  getSelectionRows,
  // 舊版方法名稱
  clearMethod: reset,
  clearSelectionMethod: clearSelection,
  toggleRowSelectionMethod: toggleRowSelection,
  getSelectionRowsMethod: getSelectionRows,
});
</script>

<template>
  <div class="dynamic-table">
    <DynamicTableSearch
      v-if="fields.length"
      v-model="searchForm"
      :fields="fields"
      :defaults="defaults"
      :loading="loading"
      :readonly="readonly"
      :export-config="exportConfig"
      :data="data"
      :columns="columns"
      @search="search"
    >
      <slot name="header" />
    </DynamicTableSearch>

    <BaseTable
      ref="tableRef"
      class="dynamic-table__body"
      :data="data"
      :columns="columns"
      :actions="actions"
      :selection="selection"
      :index="index"
      :expand="expand ?? expandable ?? false"
      :fixed="fixed ?? fixedHeader ?? true"
      :height="height ?? tableHeight ?? '100%'"
      :loading="loading"
      :table-props="tableProps"
      @selection-change="emit('selection-change', $event)"
      @select="(rows, row) => emit('select', rows, row)"
      @select-all="emit('select-all', $event)"
      @current-change="(current, old) => emit('current-change', current, old)"
      @expand-change="(row, rows) => emit('expand-change', row, rows)"
    >
      <template v-for="(_, name) in $slots" #[name]="scope">
        <slot :name="name" v-bind="scope || {}" />
      </template>
    </BaseTable>

    <DynamicTablePagination
      ref="paginationRef"
      :total="total"
      :loading="loading"
      :pagination="pagination"
      @request="request"
    >
      <slot name="footer" />
    </DynamicTablePagination>
  </div>
</template>
