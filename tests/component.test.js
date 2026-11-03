// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import ElementPlus from "element-plus";
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
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", component: { template: "<div />" } }],
    });
    await router.push("/");
    await router.isReady();

    const wrapper = mount(DynamicTable, {
      attachTo: document.body,
      props: {
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
        total: 1,
      },
      global: {
        plugins: [ElementPlus, router],
      },
    });

    await flushPromises();
    expect(wrapper.text()).toContain("測試商品");
    expect(wrapper.emitted("request")?.[0]?.[0]).toMatchObject({
      page: 1,
      perPage: 20,
    });

    await wrapper.find('input[placeholder="搜尋名稱"]').setValue("測試");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    const requests = wrapper.emitted("request");
    expect(requests?.at(-1)?.[0]).toMatchObject({ keyword: "測試" });
    wrapper.unmount();
  });
});
