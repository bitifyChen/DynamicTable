<script setup>
import { computed, reactive, watch } from "vue";
import { ElButton, ElPagination } from "element-plus";
import { Refresh } from "@element-plus/icons-vue";

const props = defineProps({
  total: {
    type: [Number, null],
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  pagination: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["request"]);
const state = reactive({
  page: props.pagination.currentPage ?? 1,
  pageSize: props.pagination.pageSize ?? 20,
});
const show = computed(() => props.total !== null);

watch(
  () => props.pagination.currentPage,
  (value) => {
    if (value !== undefined) state.page = value;
  },
);
watch(
  () => props.pagination.pageSize,
  (value) => {
    if (value !== undefined) state.pageSize = value;
  },
);

const request = ({ size = false } = {}) => {
  if (props.loading) return;
  if (size) state.page = 1;
  emit("request", { page: state.page, perPage: state.pageSize });
};

const reset = () => {
  state.page = 1;
};

defineExpose({
  state,
  request,
  reset,
  setTotal: () => {},
  // 舊版方法名稱
  pageData: state,
  getMethod: request,
  resetPageMethod: reset,
  setTotalMethod: () => {},
});
</script>

<template>
  <div class="dt-pagination">
    <ElPagination
      v-if="show"
      v-model:current-page="state.page"
      v-model:page-size="state.pageSize"
      v-bind="pagination"
      :page-sizes="pagination.pageSizes ?? [20, 50, 100]"
      :total="total ?? 0"
      :layout="pagination.layout ?? 'slot, sizes, prev, pager, next, jumper'"
      @size-change="request({ size: true })"
      @current-change="request()"
    >
      <span class="dt-pagination-label">每頁顯示：</span>
    </ElPagination>
    <span v-if="show" class="dt-pagination-total">共 {{ total }} 筆</span>
    <div class="dt-pagination-slot"><slot /></div>
    <ElButton
      type="primary"
      :icon="Refresh"
      circle
      :loading="loading"
      aria-label="重新整理"
      @click="request()"
    />
  </div>
</template>
