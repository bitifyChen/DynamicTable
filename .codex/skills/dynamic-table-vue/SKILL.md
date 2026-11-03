---
name: dynamic-table-vue
description: Use when installing, integrating, migrating, debugging, or maintaining @bitifychen/dynamic-table in a Vue 3 application, or when editing this DynamicTable repository. Covers Element Plus setup, table and search schemas, request ownership, URL query sync, selection, actions, and export workflows. Do not use for a generic ElTable that does not use this package.
---

# DynamicTable for Vue 3

Use the package's current canonical API. Read the repository root `README.md` and `types/index.d.ts` when the task needs exhaustive API details or exact types.

## Set up the package

Confirm the host application uses Vue 3 and Element Plus, then install the package and its peer dependencies:

```bash
npm install @bitifychen/dynamic-table vue vue-router element-plus @element-plus/icons-vue
```

Load Element Plus and both styles once at the application entry point:

```js
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import "@bitifychen/dynamic-table/style.css";

app.use(ElementPlus);
```

Import `DynamicTable` locally unless the application intentionally uses the default plugin for global registration.

## Build a table

Keep server state and API calls in the host application. Pass `data`, `total`, and `loading`; fetch data whenever the component emits `request`.

```vue
<script setup>
import { ref } from "vue";
import { DynamicTable } from "@bitifychen/dynamic-table";

const rows = ref([]);
const total = ref(0);
const loading = ref(false);

const columns = [
  { prop: "id", label: "ID", width: 90 },
  { prop: "name", label: "Name", showOverflowTooltip: true },
];

const search = [
  { name: "keyword", type: "text", props: { clearable: true } },
];

async function load(params) {
  loading.value = true;
  try {
    // const result = await api.get("/items", { params });
    // rows.value = result.items;
    // total.value = result.total;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <DynamicTable
    :data="rows"
    :columns="columns"
    :search="search"
    :total="total"
    :loading="loading"
    @request="load"
  />
</template>
```

## Follow the schema conventions

- Use `columns`, and use Element Plus `ElTableColumn` names such as `prop`, `label`, `width`, `align`, `fixed`, and `showOverflowTooltip`.
- Use column `format`, `slot`, or `component` only for package-specific rendering needs.
- Use search field keys `name`, `type`, `options`, `default`, `required`, `requiredMessage`, `param`, `url`, `format`, `maxRange`, `readonly`, and `props`.
- Put native Element Plus input options inside the search field's `props` object.
- Use `param: [startKey, endKey]` to split a date range into request parameters. Use `url` separately when URL query names differ.
- Keep pagination controlled through `total` and `pagination`; do not make the component own API state.

## Add optional behavior deliberately

- Use `actions` for standard detail, edit, and remove buttons. Use the `actions` slot for a custom action column.
- Use `selection` with a stable `key`; `reserve: true` requires unique row keys.
- Use `query` only when Vue Router is installed and URL state should be authoritative.
- Use `export` to configure controls. The host application owns Excel/PDF API calls, PDF libraries, fonts, and layout.
- Pass remaining native `ElTable` options through `tableProps` and native pagination options through `pagination`.
- Use component refs only for the documented public methods such as `reset()`, `refresh()`, and selection helpers.

## Migrate old integrations

Translate legacy aliases to canonical keys while touching the code:

- `table` to `columns`
- column `field` to `prop`
- `page` to `total`
- `searchDefault` to `defaults`
- `urlDriven` to `query`
- `fixedHeader` to `fixed`
- `tableHeight` to `height`
- `expandable` to `expand`
- `detailMethod`, `editMethod`, and `delMethod` to `actions`
- `selectOption` to `options`
- `treeSelect` to `tree-select`
- `getData` to `request`

Compatibility aliases are migration aids. Do not introduce them in new code.

## Preserve package boundaries

Do not copy private APIs, stores, aliases, business rules, credentials, or Tailwind assumptions from a host application into this package. Keep user-visible text in Traditional Chinese when the surrounding project uses Chinese.

## Verify the result

For a host integration, run the host project's relevant type checks, tests, and build. When editing this repository, run:

```bash
npm test
npm run build
```

Confirm that initial mount, search, reset, pagination, loading protection, selection, URL restoration when enabled, and configured export actions behave as expected.
