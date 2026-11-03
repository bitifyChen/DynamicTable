import type { App, Component, DefineComponent } from "vue";

export type TableAction<Row = Record<string, unknown>> =
  | ((row: Row) => void)
  | {
      handler: (row: Row) => void;
      label?: string;
      props?: Record<string, unknown>;
    };

export interface DynamicColumn<Row = Record<string, unknown>> {
  prop: keyof Row | string;
  label?: string;
  width?: string | number;
  minWidth?: string | number;
  align?: "left" | "center" | "right";
  fixed?: boolean | "left" | "right";
  showOverflowTooltip?: boolean | object;
  slot?: string;
  component?: Component;
  componentProps?: Record<string, unknown> | ((scope: unknown) => object);
  format?: (
    value: unknown,
    row: Row,
    column: DynamicColumn<Row>,
    index: number,
  ) => unknown;
  [key: string]: unknown;
}

export interface SearchField {
  name: string;
  type:
    | "text"
    | "number"
    | "select"
    | "tree-select"
    | "daterange"
    | "datetimerange";
  label?: string;
  options?: Array<Record<string, unknown>>;
  default?: unknown;
  required?: boolean;
  requiredMessage?: string;
  param?: string | [string, string];
  url?: string | [string, string];
  format?: string;
  maxRange?: number;
  readonly?: boolean;
  props?: Record<string, unknown>;
}

export interface DynamicTableProps<Row = Record<string, unknown>> {
  data: Row[];
  columns: DynamicColumn<Row>[];
  search?: SearchField[];
  defaults?: Record<string, unknown>;
  total?: number | null;
  loading?: boolean;
  index?: boolean;
  actions?: {
    detail?: TableAction<Row>;
    edit?: TableAction<Row>;
    remove?: TableAction<Row>;
  };
  selection?:
    | boolean
    | {
        key?: string | ((row: Row) => string | number);
        reserve?: boolean;
        selectable?: (row: Row, index: number) => boolean;
      };
  query?: boolean | Record<string, unknown>;
  export?: Record<string, unknown> | ((params: object) => unknown);
  fixed?: boolean;
  height?: string | number;
  expand?: boolean;
  readonly?: boolean;
  tableProps?: Record<string, unknown>;
  pagination?: Record<string, unknown>;
}

export const DynamicTable: DefineComponent<DynamicTableProps>;
export const DynamicTableSearch: DefineComponent<Record<string, unknown>>;
export const DynamicTablePagination: DefineComponent<Record<string, unknown>>;
export const BaseTable: DefineComponent<Record<string, unknown>>;

declare const plugin: {
  install(app: App): void;
};

export default plugin;

export function normalizeField(field?: Record<string, unknown>): SearchField;
export function normalizeColumn<Row = Record<string, unknown>>(
  column?: Record<string, unknown>,
): DynamicColumn<Row>;
export function getDefaults(
  fields?: SearchField[],
  defaults?: Record<string, unknown>,
): Record<string, unknown>;
export function toParams(
  fields?: SearchField[],
  form?: Record<string, unknown>,
  pagination?: Record<string, unknown>,
): Record<string, unknown>;
export function toQuery(
  fields?: SearchField[],
  form?: Record<string, unknown>,
): Record<string, unknown>;
export function fromQuery(
  fields?: SearchField[],
  query?: Record<string, unknown>,
  defaults?: Record<string, unknown>,
): Record<string, unknown>;
