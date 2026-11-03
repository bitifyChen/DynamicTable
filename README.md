# DynamicTable

以 Vue 3 與 Element Plus 建立的設定式表格元件，整合搜尋、分頁、列操作、勾選、展開、URL 查詢同步與檔案匯出流程。

本套件以 Element Plus 的命名與行為為基礎；原生表格設定可透過 `tableProps` 傳入，欄位設定則沿用 `ElTableColumn` 的 `prop`、`label`、`width`、`align` 等屬性。

## 環境需求

- Vue 3.3 以上
- Vue Router 4.2 以上
- Element Plus 2.8 以上
- `@element-plus/icons-vue` 2.3 以上

## 安裝

```bash
npm install @bitifychen/dynamic-table vue vue-router element-plus @element-plus/icons-vue
```

在應用程式入口載入 Element Plus 與套件樣式：

```js
import { createApp } from "vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import "@bitifychen/dynamic-table/style.css";

import App from "./App.vue";

createApp(App).use(ElementPlus).mount("#app");
```

## 快速開始

```vue
<script setup>
import { ref } from "vue";
import { DynamicTable } from "@bitifychen/dynamic-table";

const rows = ref([]);
const total = ref(0);
const loading = ref(false);

const columns = [
  { prop: "id", label: "編號", width: 90 },
  { prop: "name", label: "名稱", showOverflowTooltip: true },
  {
    prop: "status",
    label: "狀態",
    format: (value) => (value === 1 ? "啟用" : "停用"),
  },
];

const search = [
  {
    name: "keyword",
    type: "text",
    props: { placeholder: "搜尋名稱" },
  },
  {
    name: "status",
    type: "select",
    options: [
      { label: "啟用", value: 1 },
      { label: "停用", value: 0 },
    ],
    props: { placeholder: "選擇狀態" },
  },
  {
    name: "createdAt",
    type: "daterange",
    param: ["start_time", "end_time"],
    url: ["start_time", "end_time"],
    format: "YYYY-MM-DD",
  },
];

const load = async (params) => {
  loading.value = true;
  try {
    // const result = await api.get('/items', { params })
    // rows.value = result.data.items
    // total.value = result.data.total
  } finally {
    loading.value = false;
  }
};

const actions = {
  detail: (row) => console.log("詳細", row),
  edit: {
    label: "修改",
    handler: (row) => console.log("編輯", row),
  },
  remove: (row) => console.log("刪除", row),
};
</script>

<template>
  <DynamicTable
    :data="rows"
    :columns="columns"
    :search="search"
    :total="total"
    :loading="loading"
    :actions="actions"
    :selection="{ key: 'id', reserve: true }"
    query
    @request="load"
  />
</template>
```

元件掛載後會立即觸發一次 `request`。啟用 `query` 時，搜尋條件會先從目前 URL 還原，再觸發 `request`。

## Props

| Prop         | 型別                           | 預設值  | 說明                                                          |
| ------------ | ------------------------------ | ------- | ------------------------------------------------------------- |
| `data`       | `Array`                        | 必填    | 表格資料，對應 `ElTable.data`。                               |
| `columns`    | `Array`                        | `[]`    | 欄位設定，原生設定沿用 `ElTableColumn`。                      |
| `search`     | `Array`                        | `[]`    | 搜尋欄位設定；空陣列時不顯示搜尋列。                          |
| `defaults`   | `Object`                       | `{}`    | 搜尋表單預設值。                                              |
| `total`      | `number \| null`               | `null`  | 總筆數；`null` 時隱藏分頁。                                   |
| `loading`    | `boolean`                      | `false` | 顯示載入狀態並避免重複搜尋。                                  |
| `index`      | `boolean`                      | `false` | 顯示 Element Plus index 欄位。                                |
| `actions`    | `Object`                       | `{}`    | 內建 `detail`、`edit`、`remove` 操作。                        |
| `selection`  | `boolean \| Object`            | `false` | 啟用勾選欄，物件可設定 `key`、`reserve`、`selectable`。       |
| `query`      | `boolean \| Object`            | `false` | 將搜尋條件同步到 Vue Router query。                           |
| `export`     | `Function \| Object \| string` | `null`  | Excel／PDF 匯出設定。                                         |
| `fixed`      | `boolean`                      | `true`  | 是否以固定高度表格顯示表頭。                                  |
| `height`     | `string \| number`             | `100%`  | 固定表格高度，對應 `ElTable.height`。                         |
| `expand`     | `boolean`                      | `false` | 顯示展開欄與全部展開按鈕。                                    |
| `readonly`   | `boolean`                      | `false` | 將搜尋欄位設為唯讀或停用。                                    |
| `tableProps` | `Object`                       | `{}`    | 直接傳入 `ElTable` 的其他 props。                             |
| `pagination` | `Object`                       | `{}`    | 傳入 `ElPagination`，例如 `pageSize`、`pageSizes`、`layout`。 |

## Columns

欄位優先沿用 [Element Plus Table Column](https://element-plus.org/zh-CN/component/table.html#table-column-attributes) 的命名。

```js
const columns = [
  {
    prop: "amount",
    label: "金額",
    width: 140,
    align: "right",
    showOverflowTooltip: true,
    format: (value) => `$${value}`,
  },
  { prop: "status", label: "狀態", slot: "status" },
];
```

額外支援：

| Key                                 | 說明                                           |
| ----------------------------------- | ---------------------------------------------- |
| `format(value, row, column, index)` | 格式化一般文字內容。                           |
| `slot`                              | 使用指定名稱的 scoped slot。                   |
| `component`                         | 使用 Vue component 顯示欄位。                  |
| `componentProps`                    | 元件 props，或接收 Element Plus scope 的函式。 |
| `prefix`                            | 固定前綴，或接收 `(row, column)` 的函式。      |

```vue
<template #status="{ row, value }">
  <el-tag :type="value === 1 ? 'success' : 'info'">
    {{ row.status_text }}
  </el-tag>
</template>
```

## Search

| Key               | 說明                                                                      |
| ----------------- | ------------------------------------------------------------------------- |
| `name`            | 搜尋表單內的欄位名稱。                                                    |
| `type`            | `text`、`number`、`select`、`tree-select`、`daterange`、`datetimerange`。 |
| `options`         | `select` 或 `tree-select` 的選項資料。                                    |
| `default`         | 欄位預設值。                                                              |
| `required`        | 搜尋前必須有值。                                                          |
| `requiredMessage` | 缺少必填值時的訊息。                                                      |
| `param`           | `request` 參數名稱；日期可傳 `[開始 key, 結束 key]`。                     |
| `url`             | URL query 名稱；日期可傳字串或兩個 key 的陣列。                           |
| `format`          | 日期輸出格式。                                                            |
| `maxRange`        | 日期範圍最多可相差幾天。                                                  |
| `props`           | 直接傳給對應 Element Plus 輸入元件。                                      |

日期的 `param` 或 `url` 使用字串時會保留陣列；使用兩個 key 的陣列時會拆成開始與結束值：

```js
{
  name: 'createdAt',
  type: 'daterange',
  param: ['start_time', 'end_time'],
  url: 'created_at',
  format: 'YYYY-MM-DD'
}
```

## Actions

每一個 action 可直接使用函式，也可設定按鈕文字與 Element Plus Button props：

```js
const actions = {
  detail: showDetail,
  edit: {
    label: "修改",
    handler: editRow,
    props: { plain: true },
  },
  remove: {
    handler: removeRow,
    props: { type: "danger" },
  },
};
```

若需要完全自訂操作欄，使用 `actions` slot。

## Selection

```vue
<DynamicTable
  :selection="{
    key: 'id',
    reserve: true,
    selectable: (row) => !row.locked,
  }"
  @selection-change="onSelectionChange"
/>
```

`key` 對應 Element Plus 的 `row-key`，使用 `reserve` 時必須提供穩定且唯一的值。

## Export

### Excel

`excel` 會收到目前搜尋參數，應回傳 `Blob`、Fetch `Response`，或 `{ data: Blob }`：

```js
const exportConfig = {
  name: "商品清單",
  excel: async (params) => {
    const response = await fetch(
      "/api/products/export?" + new URLSearchParams(params),
    );
    if (!response.ok) throw new Error("無法匯出商品清單");
    return response;
  },
};
```

也可直接將 GET URL 指定給 `excel`；套件會附加搜尋參數並使用 `credentials: 'include'`。

### PDF

套件負責欄位選擇視窗，PDF 產生方式由應用程式提供，避免限制字型與版面工具：

```js
const exportConfig = {
  name: "商品清單",
  pdf: async ({ columns, data, fileName, header, footer }) => {
    // 使用 jsPDF、pdfmake 或後端 API 產生 PDF。
    // 可回傳 Blob；若自行下載，則不必回傳值。
  },
};
```

```vue
<DynamicTable :export="exportConfig" />
```

## Events

| Event              | 參數                        | 說明                                         |
| ------------------ | --------------------------- | -------------------------------------------- |
| `request`          | `params`                    | 初次掛載、搜尋、清除、分頁或重新整理時觸發。 |
| `selection-change` | `rows`                      | 對應 `ElTable` 事件。                        |
| `select`           | `rows, row`                 | 對應 `ElTable` 事件。                        |
| `select-all`       | `rows`                      | 對應 `ElTable` 事件。                        |
| `current-change`   | `currentRow, oldCurrentRow` | 對應 `ElTable` 事件。                        |
| `expand-change`    | `row, expandedRows`         | 對應 `ElTable` 事件。                        |

## Slots

| Slot              | 說明                     |
| ----------------- | ------------------------ |
| `header`          | 搜尋列內、操作按鈕前方。 |
| `footer`          | 分頁與重新整理按鈕之間。 |
| `tableExtensions` | 表格上方的擴充操作區。   |
| `actions`         | 自訂操作欄。             |
| `expand`          | 展開列內容。             |
| 欄位自訂名稱      | 對應 column 的 `slot`。  |

## 公開方法

透過 template ref 可使用：

- `reset()`：清除搜尋與勾選狀態。
- `refresh()`：以目前頁碼重新觸發 `request`。
- `clearSelection()`
- `toggleRowSelection(row, selected)`
- `getSelectionRows()`
- `searchForm`：目前搜尋表單 ref。

## 套件 exports

```js
import DynamicTablePlugin, {
  DynamicTable,
  DynamicTableSearch,
  DynamicTablePagination,
  BaseTable,
  toParams,
  toQuery,
  fromQuery,
} from "@bitifychen/dynamic-table";
```

若希望全域註冊主要元件：

```js
app.use(DynamicTablePlugin);
```

## AI agent skill

Repository 內含可由 Codex 探索的 skill：`.codex/skills/dynamic-table-vue/SKILL.md`。

- 在此 repository 工作時，agent 可依 skill 的描述自動套用安裝、整合、遷移與驗證規則。
- 需要明確指定時，可在提示中使用 `$dynamic-table-vue`。
- 若要在其他專案使用，將整個 `dynamic-table-vue` skill 資料夾複製到該專案的 `.codex/skills`，或使用者層級的 `~/.codex/skills`。

## 舊版 key 相容

新程式應使用前述簡潔 API。為協助既有畫面漸進遷移，目前仍接受：

| 舊 key                                    | 正式 key      |
| ----------------------------------------- | ------------- |
| `table`                                   | `columns`     |
| column `field`                            | column `prop` |
| `page`                                    | `total`       |
| `searchDefault`                           | `defaults`    |
| `urlDriven`                               | `query`       |
| `fixedHeader`                             | `fixed`       |
| `tableHeight`                             | `height`      |
| `expandable`                              | `expand`      |
| `detailMethod`／`editMethod`／`delMethod` | `actions`     |
| `selectOption`                            | `options`     |
| `treeSelect`                              | `tree-select` |
| `getData`                                 | `request`     |

相容 key 只用於遷移，未來主要版本可能移除。
