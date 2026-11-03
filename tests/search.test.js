import { describe, expect, it } from "vitest";
import {
  fromQuery,
  getDefaults,
  isDirty,
  normalizeColumn,
  normalizeField,
  toParams,
  toQuery,
} from "../src/index.js";

const fields = [
  { name: "keyword", type: "text", default: "" },
  {
    name: "status",
    type: "select",
    options: [
      { label: "啟用", value: 1 },
      { label: "停用", value: 0 },
    ],
  },
  {
    name: "createdAt",
    type: "daterange",
    param: ["start_time", "end_time"],
    url: "created_at",
    format: "YYYY-MM-DD",
  },
];

describe("search utilities", () => {
  it("使用簡潔 schema 產生 API 參數", () => {
    expect(
      toParams(
        fields,
        {
          keyword: "  測試  ",
          status: 0,
          createdAt: ["2026-11-01", "2026-11-03"],
        },
        { page: 2, perPage: 20 },
      ),
    ).toEqual({
      keyword: "測試",
      status: 0,
      start_time: "2026-11-01",
      end_time: "2026-11-03",
      page: 2,
      perPage: 20,
    });
  });

  it("日期 URL 使用單一 key 時保留陣列", () => {
    expect(
      toQuery(fields, {
        createdAt: ["2026-11-01", "2026-11-03"],
      }),
    ).toEqual({ created_at: ["2026-11-01", "2026-11-03"] });
  });

  it("可由 URL query 還原表單", () => {
    expect(
      fromQuery(fields, {
        status: "1",
        created_at: ["2026-11-01", "2026-11-03"],
      }),
    ).toMatchObject({
      keyword: "",
      status: 1,
      createdAt: ["2026-11-01", "2026-11-03"],
    });
  });

  it("支援舊版欄位 key", () => {
    expect(
      normalizeField({ type: "treeSelect", selectOption: [{ id: 1 }] }),
    ).toMatchObject({ type: "tree-select", options: [{ id: 1 }] });
    expect(normalizeColumn({ field: "name", tooltip: true })).toMatchObject({
      prop: "name",
      showOverflowTooltip: true,
    });
  });

  it("可判斷搜尋條件是否異動", () => {
    const defaults = getDefaults(fields);
    expect(isDirty(fields, defaults, defaults)).toBe(false);
    expect(isDirty(fields, { ...defaults, keyword: "A" }, defaults)).toBe(true);
  });
});
