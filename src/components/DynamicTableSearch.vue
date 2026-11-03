<script setup>
import { computed, ref, watch } from "vue";
import {
  ElButton,
  ElCheckbox,
  ElCheckboxGroup,
  ElDatePicker,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElNotification,
  ElOption,
  ElSelect,
  ElTreeSelect,
} from "element-plus";
import { Delete, Download, Printer, Search } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import { normalizeColumn, normalizeField } from "../utils/compat.js";
import {
  getDefaults,
  getFieldName,
  isDirty,
  isEmpty,
  isEqual,
  toParams,
} from "../utils/search.js";

const props = defineProps({
  fields: {
    type: Array,
    default: () => [],
  },
  modelValue: {
    type: Object,
    required: true,
  },
  defaults: {
    type: Object,
    default: () => ({}),
  },
  loading: {
    type: Boolean,
    default: false,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  exportConfig: {
    type: Object,
    default: null,
  },
  data: {
    type: Array,
    default: () => [],
  },
  columns: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["update:modelValue", "search"]);
const formRef = ref(null);
const fields = computed(() => props.fields.map(normalizeField));
const defaults = computed(() => getDefaults(fields.value, props.defaults));
const previousDefaults = ref(defaults.value);
const canReset = computed(() =>
  isDirty(fields.value, props.modelValue, defaults.value),
);

const updateField = (field, value) => {
  emit("update:modelValue", {
    ...props.modelValue,
    [getFieldName(field)]: value,
  });
};

watch(
  defaults,
  (nextDefaults) => {
    const next = { ...props.modelValue };
    let changed = false;
    fields.value.forEach((field) => {
      const name = getFieldName(field);
      const oldDefault = previousDefaults.value?.[name];
      const canSync =
        oldDefault !== undefined
          ? isEqual(next[name], oldDefault)
          : isEmpty(next[name]);
      if (canSync && !isEqual(next[name], nextDefaults[name])) {
        next[name] = nextDefaults[name];
        changed = true;
      }
    });
    previousDefaults.value = nextDefaults;
    if (changed) emit("update:modelValue", next);
  },
  { deep: true },
);

const calendarStart = ref(null);
const calendarChange = (value) => {
  calendarStart.value = value?.[0] && !value?.[1] ? value[0] : null;
};
const disabledDate = (time, field) => {
  const nativeDisabled = field.props?.disabledDate;
  if (typeof nativeDisabled === "function" && nativeDisabled(time)) return true;
  if (!field.maxRange || !calendarStart.value) return false;
  return (
    Math.abs(
      dayjs(time)
        .startOf("day")
        .diff(dayjs(calendarStart.value).startOf("day"), "day"),
    ) > field.maxRange
  );
};

const submit = () => {
  if (!props.loading) emit("search", { mode: "set" });
};
const reset = () => {
  if (props.loading || !canReset.value) return;
  formRef.value?.clearValidate?.();
  emit("update:modelValue", { ...defaults.value });
  emit("search", { mode: "reset" });
};

const excelHandler = computed(() => props.exportConfig?.excel);
const pdfHandler = computed(() => props.exportConfig?.pdf);
const exportLoading = ref(false);
const pdfLoading = ref(false);
const pdfDialog = ref(false);
const selectedColumns = ref([]);

const buildUrl = (url, params) => {
  const target = new URL(url, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => target.searchParams.append(key, item));
    } else {
      target.searchParams.set(key, value);
    }
  });
  return target.toString();
};

const resolveBlob = async (result) => {
  if (result instanceof Blob) return result;
  if (result instanceof Response) {
    if (!result.ok) throw new Error("匯出請求失敗。");
    return result.blob();
  }
  if (result?.data instanceof Blob) return result.data;
  return null;
};

const download = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const exportExcel = async () => {
  if (!excelHandler.value || exportLoading.value) return;
  exportLoading.value = true;
  try {
    const params = toParams(fields.value, props.modelValue);
    const result =
      typeof excelHandler.value === "string"
        ? await fetch(buildUrl(excelHandler.value, params), {
            credentials: "include",
          })
        : await excelHandler.value(params);
    const blob = await resolveBlob(result);
    if (!blob) throw new Error("匯出函式必須回傳 Blob 或 Response。");
    download(blob, `${props.exportConfig?.name || "資料匯出"}.xlsx`);
  } catch (error) {
    ElNotification.error({
      title: "匯出失敗",
      message: error?.message || "請稍後再試。",
    });
  } finally {
    exportLoading.value = false;
  }
};

const openPdf = () => {
  if (!props.data.length) {
    ElNotification.warning({ title: "無法匯出", message: "目前沒有資料。" });
    return;
  }
  selectedColumns.value = props.columns
    .map(normalizeColumn)
    .filter((column) => column.label && column.prop)
    .map((column) => column.prop);
  pdfDialog.value = true;
};

const exportPdf = async () => {
  if (typeof pdfHandler.value !== "function" || pdfLoading.value) return;
  if (!selectedColumns.value.length) {
    ElNotification.warning({
      title: "請選擇欄位",
      message: "至少需要選擇一個 PDF 欄位。",
    });
    return;
  }
  pdfLoading.value = true;
  try {
    const columns = props.columns
      .map(normalizeColumn)
      .filter((column) => selectedColumns.value.includes(column.prop));
    const name =
      props.exportConfig?.pdfName || props.exportConfig?.name || "資料匯出";
    const result = await pdfHandler.value({
      columns,
      data: props.data,
      fileName: `${name}.pdf`,
      header: props.exportConfig?.header,
      footer: props.exportConfig?.footer,
    });
    const blob = await resolveBlob(result);
    if (blob) download(blob, `${name}.pdf`);
    pdfDialog.value = false;
  } catch (error) {
    ElNotification.error({
      title: "PDF 匯出失敗",
      message: error?.message || "請稍後再試。",
    });
  } finally {
    pdfLoading.value = false;
  }
};

defineExpose({ reset, resetFormMethod: reset });
</script>

<template>
  <div class="dt-search">
    <ElForm
      ref="formRef"
      class="dt-search-form"
      :model="modelValue"
      hide-required-asterisk
      @submit.prevent="submit"
    >
      <ElFormItem
        v-for="field in fields"
        :key="getFieldName(field)"
        :prop="getFieldName(field)"
        :required="Boolean(field.required)"
      >
        <ElInput
          v-if="field.type === 'text' || field.type === 'number'"
          v-bind="field.props"
          class="dt-search-input"
          :type="field.type"
          :model-value="modelValue[getFieldName(field)]"
          :readonly="readonly || field.readonly"
          :clearable="field.props?.clearable ?? !(readonly || field.readonly)"
          @update:model-value="updateField(field, $event)"
        />

        <ElSelect
          v-else-if="field.type === 'select'"
          v-bind="field.props"
          class="dt-search-select"
          :model-value="modelValue[getFieldName(field)]"
          :disabled="readonly || field.readonly"
          :clearable="field.props?.clearable ?? !(readonly || field.readonly)"
          @update:model-value="updateField(field, $event)"
        >
          <ElOption
            v-for="option in field.options"
            :key="option.value"
            v-bind="option"
          />
        </ElSelect>

        <ElDatePicker
          v-else-if="
            field.type === 'daterange' || field.type === 'datetimerange'
          "
          v-bind="field.props"
          :type="field.type"
          :model-value="modelValue[getFieldName(field)]"
          :disabled="readonly || field.readonly"
          :clearable="field.props?.clearable ?? !(readonly || field.readonly)"
          :disabled-date="(time) => disabledDate(time, field)"
          unlink-panels
          range-separator="－"
          start-placeholder="開始時間"
          end-placeholder="結束時間"
          @calendar-change="calendarChange"
          @change="calendarStart = null"
          @blur="calendarStart = null"
          @update:model-value="updateField(field, $event)"
        />

        <ElTreeSelect
          v-else-if="field.type === 'tree-select'"
          v-bind="field.props"
          :model-value="modelValue[getFieldName(field)]"
          :data="field.options"
          :disabled="readonly || field.readonly"
          :clearable="field.props?.clearable ?? !(readonly || field.readonly)"
          :filterable="field.props?.filterable ?? true"
          :props="field.props?.props ?? { label: 'name', value: 'id' }"
          check-strictly
          default-expand-all
          @update:model-value="updateField(field, $event)"
        />
      </ElFormItem>

      <div class="dt-search-slot"><slot /></div>
      <div class="dt-search-actions">
        <ElButton
          v-if="excelHandler"
          type="info"
          plain
          round
          :icon="Download"
          :loading="exportLoading"
          @click="exportExcel"
        >
          匯出
        </ElButton>
        <ElButton
          v-if="typeof pdfHandler === 'function'"
          type="success"
          plain
          round
          :icon="Printer"
          @click="openPdf"
        >
          PDF
        </ElButton>
        <ElButton
          type="danger"
          round
          :icon="Delete"
          :disabled="!canReset || loading"
          @click="reset"
        >
          清除
        </ElButton>
        <ElButton
          type="primary"
          round
          native-type="submit"
          :icon="Search"
          :loading="loading"
        >
          搜尋
        </ElButton>
      </div>
    </ElForm>

    <ElDialog
      v-model="pdfDialog"
      title="選擇 PDF 匯出欄位"
      width="400px"
      append-to-body
      destroy-on-close
    >
      <p class="dt-pdf-help">請勾選要包含在 PDF 中的欄位：</p>
      <ElCheckboxGroup v-model="selectedColumns" class="dt-pdf-columns">
        <ElCheckbox
          v-for="column in columns
            .map(normalizeColumn)
            .filter((item) => item.label && item.prop)"
          :key="column.prop"
          :value="column.prop"
        >
          {{ column.label }}
        </ElCheckbox>
      </ElCheckboxGroup>
      <template #footer>
        <ElButton :disabled="pdfLoading" @click="pdfDialog = false">
          取消
        </ElButton>
        <ElButton type="primary" :loading="pdfLoading" @click="exportPdf">
          確認匯出
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>
