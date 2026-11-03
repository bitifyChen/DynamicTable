import "./style.css";

import DynamicTable from "./components/DynamicTable.vue";
import DynamicTableSearch from "./components/DynamicTableSearch.vue";
import DynamicTablePagination from "./components/DynamicTablePagination.vue";
import BaseTable from "./components/BaseTable.vue";

export { DynamicTable, DynamicTableSearch, DynamicTablePagination, BaseTable };
export * from "./utils/search.js";
export * from "./utils/compat.js";

export default {
  install(app) {
    app.component("DynamicTable", DynamicTable);
    app.component("DynamicTableSearch", DynamicTableSearch);
    app.component("DynamicTablePagination", DynamicTablePagination);
  },
};
