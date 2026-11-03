<script setup>
import { computed, nextTick, ref, toRaw, watch } from "vue";
import { ElButton, ElTable, ElTableColumn, ElNotification } from "element-plus";
import { normalizeColumn } from "../utils/compat.js";

const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
  columns: {
    type: Array,
    default: () => [],
  },
  actions: {
    type: Object,
    default: () => ({}),
  },
  selection: {
    type: Object,
    default: null,
  },
  index: {
    type: Boolean,
    default: false,
  },
  expand: {
    type: Boolean,
    default: false,
  },
  fixed: {
    type: Boolean,
    default: true,
  },
  height: {
    type: [String, Number],
    default: "100%",
  },
  loading: {
    type: Boolean,
    default: false,
  },
  tableProps: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits([
  "selection-change",
  "select",
  "select-all",
  "current-change",
  "expand-change",
]);

const tableRef = ref(null);
const columns = computed(() => props.columns.map(normalizeColumn));
const actionList = computed(() =>
  ["detail", "edit", "remove"]
    .map((key) => ({ key, ...props.actions?.[key] }))
    .filter((action) => typeof action.handler === "function"),
);
const hasActions = computed(() => actionList.value.length > 0);

let internalId = 0;
const internalIdMap = new WeakMap();
const getRowKey = (row) => {
  const rawRow = toRaw(row);
  const key = props.selection?.key ?? props.tableProps?.rowKey ?? "id";
  if (typeof key === "function") return key(rawRow);
  if (rawRow?.[key] !== undefined && rawRow?.[key] !== null) return rawRow[key];
  if (!internalIdMap.has(rawRow)) internalIdMap.set(rawRow, ++internalId);
  return internalIdMap.get(rawRow);
};

const expandRowKeys = ref([]);
const allExpanded = computed(
  () =>
    props.data.length > 0 && expandRowKeys.value.length === props.data.length,
);
const partlyExpanded = computed(
  () =>
    expandRowKeys.value.length > 0 &&
    expandRowKeys.value.length < props.data.length,
);

const toggleAll = () => {
  expandRowKeys.value = allExpanded.value
    ? []
    : props.data.map((row) => getRowKey(row));
};

const onExpandChange = (row, expandedRows) => {
  expandRowKeys.value = expandedRows.map(getRowKey);
  emit("expand-change", row, expandedRows);
};

watch(
  () => props.data,
  () => {
    expandRowKeys.value = [];
    nextTick(() => tableRef.value?.setScrollTop?.(0));
  },
);

const getColumnProps = (column) => {
  const {
    component,
    slot,
    format,
    prefix,
    currency,
    componentProps,
    ...nativeProps
  } = column;
  return nativeProps;
};

const getCellValue = (column, row, index) => {
  const value = row?.[column.prop];
  if (typeof column.format === "function") {
    return column.format(value, row, column, index);
  }
  const prefix =
    typeof column.prefix === "function"
      ? column.prefix(row, column)
      : column.prefix;
  const legacyCurrency =
    typeof column.currency === "function"
      ? column.currency(row, column)
      : column.currency;
  return `${prefix ?? legacyCurrency ?? ""}${value ?? ""}`;
};

const copyCell = async (event, value) => {
  if (!event.ctrlKey && !event.metaKey) return;
  if (!navigator?.clipboard) return;
  await navigator.clipboard.writeText(String(value ?? ""));
  ElNotification.success({ title: "已複製", message: "欄位內容已複製。" });
};

const actionType = (key) => (key === "remove" ? "danger" : "primary");

const clearSelection = () => tableRef.value?.clearSelection?.();
const toggleRowSelection = (row, selected) =>
  tableRef.value?.toggleRowSelection?.(row, selected);
const getSelectionRows = () => tableRef.value?.getSelectionRows?.() || [];
const setCurrentRow = (row) => tableRef.value?.setCurrentRow?.(row);

defineExpose({
  tableRef,
  clearSelection,
  toggleRowSelection,
  getSelectionRows,
  setCurrentRow,
  // 舊版方法名稱
  clearSelectionMethod: clearSelection,
  toggleRowSelectionMethod: toggleRowSelection,
  getSelectionRowsMethod: getSelectionRows,
});
</script>

<template>
  <div class="dt-table-wrap">
    <div v-if="$slots.tableExtensions" class="dt-table-extensions">
      <slot name="tableExtensions" />
    </div>
    <ElTable
      ref="tableRef"
      v-loading="loading"
      v-bind="tableProps"
      :data="data"
      :height="fixed ? height : undefined"
      :row-key="getRowKey"
      :expand-row-keys="expandRowKeys"
      :border="tableProps.border ?? true"
      :stripe="tableProps.stripe ?? true"
      @selection-change="emit('selection-change', $event)"
      @select="(rows, row) => emit('select', rows, row)"
      @select-all="emit('select-all', $event)"
      @current-change="(current, old) => emit('current-change', current, old)"
      @expand-change="onExpandChange"
    >
      <ElTableColumn v-if="expand" type="expand" width="48">
        <template #header>
          <button
            class="dt-expand-toggle"
            type="button"
            :aria-label="allExpanded ? '收合全部' : '展開全部'"
            @click.stop="toggleAll"
          >
            {{ allExpanded || partlyExpanded ? "−" : "+" }}
          </button>
        </template>
        <template #default="scope">
          <slot name="expand" v-bind="scope" />
        </template>
      </ElTableColumn>

      <ElTableColumn
        v-if="selection"
        type="selection"
        width="48"
        :reserve-selection="Boolean(selection.reserve)"
        :selectable="selection.selectable"
      />

      <ElTableColumn
        v-if="index"
        type="index"
        width="56"
        label="No."
        align="center"
      />

      <ElTableColumn
        v-for="column in columns"
        :key="column.prop || column.label"
        v-bind="getColumnProps(column)"
      >
        <template #default="scope">
          <component
            :is="column.component"
            v-if="column.component"
            v-bind="
              typeof column.componentProps === 'function'
                ? column.componentProps(scope)
                : column.componentProps
            "
            :value="scope.row[column.prop]"
            :data="scope.row[column.prop]"
            :row="scope.row"
            :scope="column"
            :column="column"
            :index="scope.$index"
          />
          <slot
            v-else-if="column.slot"
            :name="column.slot"
            v-bind="scope"
            :value="scope.row[column.prop]"
          />
          <span
            v-else
            class="dt-cell"
            title="按住 Ctrl 或 Command 點擊即可複製"
            @click="
              copyCell($event, getCellValue(column, scope.row, scope.$index))
            "
          >
            {{ getCellValue(column, scope.row, scope.$index) }}
          </span>
        </template>
      </ElTableColumn>

      <ElTableColumn
        v-if="hasActions || $slots.actions"
        label="操作"
        align="center"
        :width="Math.max(100, actionList.length * 72)"
      >
        <template #default="scope">
          <ElButton
            v-for="action in actionList"
            :key="action.key"
            v-bind="action.props"
            :type="action.props?.type ?? actionType(action.key)"
            :size="action.props?.size ?? 'small'"
            :round="action.props?.round ?? true"
            @click="action.handler(scope.row)"
          >
            {{ action.label }}
          </ElButton>
          <slot name="actions" v-bind="scope" />
        </template>
      </ElTableColumn>
    </ElTable>
  </div>
</template>
