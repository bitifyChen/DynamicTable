// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from "vitest";
import ElementPlus from "element-plus";
import { createApp, defineComponent, nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import DynamicTable from "../src/components/DynamicTable.vue";

beforeAll(() => {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserver;
  globalThis.matchMedia =
    globalThis.matchMedia ||
    (() => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }));
  HTMLElement.prototype.scrollTo = vi.fn();
});

describe("DynamicTable", () => {
  it("掛載時載入資料，並可送出搜尋條件", async () => {
    const requests = [];
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", component: { template: "<div />" } }],
    });
    await router.push("/");
    await router.isReady();

    const Host = defineComponent({
      components: { DynamicTable },
      setup() {
        return {
          data: [{ id: 1, name: "測試商品" }],
          columns: [
            { prop: "id", label: "編號" },
            { prop: "name", label: "名稱" },
          ],
          search: [
            {
              name: "keyword",
              type: "text",
              props: { placeholder: "搜尋名稱" },
            },
          ],
          onRequest: (params) => requests.push(params),
        };
      },
      template: `
        <DynamicTable
          :data="data"
          :columns="columns"
          :search="search"
          :total="1"
          @request="onRequest"
        />
      `,
    });

    const root = document.createElement("div");
    document.body.appendChild(root);
    const app = createApp(Host);
    app.use(ElementPlus);
    app.use(router);
    app.mount(root);
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(root.textContent).toContain("測試商品");
    expect(requests[0]).toMatchObject({ page: 1, perPage: 20 });

    const input = root.querySelector('input[placeholder="搜尋名稱"]');
    input.value = "測試";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    root
      .querySelector("form")
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await nextTick();

    expect(requests.at(-1)).toMatchObject({ keyword: "測試" });
    app.unmount();
    root.remove();
  });
});
