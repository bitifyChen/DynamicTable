import { unref } from "vue";
import dayjs from "dayjs";
import { normalizeField } from "./compat.js";

const DATE_TYPES = new Set(["daterange", "datetimerange"]);

const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object || {}, key);

export const cloneValue = (value) => {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value instanceof Date) return new Date(value.getTime());
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneValue(item)]),
    );
  }
  return value;
};

export const isDateField = (field) =>
  DATE_TYPES.has(normalizeField(field)?.type);

export const getFieldName = (field) =>
  Array.isArray(field?.name)
    ? field.name.join(",")
    : field?.name || field?.type;

export const getFieldDefault = (field) => {
  const current = normalizeField(field);
  const value = cloneValue(unref(current.default));
  if (current.props?.multiple) {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null || value === "") return [];
    return [value];
  }
  return value;
};

export const getDefaults = (fields = [], defaults = {}) => {
  const result = cloneValue(defaults) || {};
  fields.forEach((rawField) => {
    const field = normalizeField(rawField);
    const hasDefault =
      field.default !== undefined || Boolean(field.props?.multiple);
    if (hasDefault) result[getFieldName(field)] = getFieldDefault(field);
  });
  return result;
};

export const isEmpty = (value) => {
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "string") return value.trim() === "";
  return value === null || value === undefined;
};

export const isEqual = (left, right) => {
  if (isEmpty(left) && isEmpty(right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    return (
      left.length === right.length &&
      left.every((value, index) => isEqual(value, right[index]))
    );
  }
  return Object.is(left, right) || String(left) === String(right);
};

const getFormat = (field) =>
  field.format ||
  field.dateFormat ||
  (normalizeField(field).type === "daterange"
    ? "YYYY-MM-DD"
    : "YYYY-MM-DD HH:mm:ss");

const formatRange = (field, value) => {
  if (!Array.isArray(value) || value.length !== 2 || !value[0] || !value[1]) {
    return undefined;
  }
  const format = getFormat(field);
  return value.map((item) => dayjs(item).format(format));
};

const getLegacyDateTarget = (field, target) => {
  if (target === "param" && field.dateQuery === "array") {
    return field.queryName || getFieldName(field);
  }
  if (target === "url" && field.dateUrlQuery === "array") {
    return field.queryName || getFieldName(field);
  }
  if (Array.isArray(field.dateKeys) && field.dateKeys.length === 2) {
    return field.dateKeys;
  }
  if (Array.isArray(field.name) && field.name.length === 2) return field.name;
  if (field.name && field.name !== "daterange") {
    return [`${field.name}_start`, `${field.name}_end`];
  }
  return ["start_time", "end_time"];
};

export const getTarget = (field, target = "param") => {
  if (field?.[target] !== undefined) return field[target];
  if (isDateField(field)) return getLegacyDateTarget(field, target);
  return field?.queryName || getFieldName(field);
};

const writeValue = (result, target, value) => {
  if (Array.isArray(target)) {
    if (Array.isArray(value) && target.length === 2) {
      result[target[0]] = value[0];
      result[target[1]] = value[1];
    }
    return;
  }
  result[target] = cloneValue(value);
};

export const toParams = (fields = [], form = {}, pagination = {}) => {
  const params = {};
  fields.forEach((rawField) => {
    const field = normalizeField(rawField);
    const value = form?.[getFieldName(field)];
    if (isDateField(field)) {
      const range = formatRange(field, value);
      if (range) writeValue(params, getTarget(field, "param"), range);
      return;
    }
    if (isEmpty(value)) return;
    const normalized = typeof value === "string" ? value.trim() : value;
    writeValue(params, getTarget(field, "param"), normalized);
  });
  if (pagination.page !== undefined) params.page = pagination.page;
  if (pagination.perPage !== undefined) params.perPage = pagination.perPage;
  return params;
};

export const toQuery = (fields = [], form = {}) => {
  const query = {};
  fields.forEach((rawField) => {
    const field = normalizeField(rawField);
    const value = form?.[getFieldName(field)];
    if (isDateField(field)) {
      const range = formatRange(field, value);
      if (range) writeValue(query, getTarget(field, "url"), range);
      return;
    }
    if (!isEmpty(value)) writeValue(query, getTarget(field, "url"), value);
  });
  return query;
};

const readValue = (source, target) => {
  if (Array.isArray(target)) {
    if (target.length !== 2) return undefined;
    const first = source?.[target[0]];
    const second = source?.[target[1]];
    return first !== undefined && second !== undefined
      ? [first, second]
      : undefined;
  }
  return hasOwn(source, target) ? source[target] : undefined;
};

const parseValue = (field, value) => {
  if (value === undefined) return undefined;
  if (isDateField(field)) return Array.isArray(value) ? value : [value];
  if (field.props?.multiple) return Array.isArray(value) ? value : [value];
  if (field.type === "select" && typeof value === "string" && value !== "") {
    return Number.isNaN(Number(value)) ? value : Number(value);
  }
  return value;
};

export const fromQuery = (fields = [], query = {}, defaults = {}) => {
  const form = getDefaults(fields, defaults);
  fields.forEach((rawField) => {
    const field = normalizeField(rawField);
    const value = readValue(query, getTarget(field, "url"));
    const parsed = parseValue(field, value);
    if (parsed !== undefined) form[getFieldName(field)] = cloneValue(parsed);
  });
  return form;
};

export const queryKeys = (field) => {
  const target = getTarget(field, "url");
  return Array.isArray(target) ? target : [target];
};

export const removeQuery = (fields = [], query = {}) => {
  const next = { ...query };
  fields.forEach((field) => {
    queryKeys(field).forEach((key) => delete next[key]);
  });
  return next;
};

const sortValue = (value) => {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = sortValue(value[key]);
        return result;
      }, {});
  }
  return value;
};

export const snapshot = (fields = [], query = {}, defaults = {}) =>
  JSON.stringify(sortValue(fromQuery(fields, query, defaults)));

export const isDirty = (fields = [], form = {}, defaults = {}) =>
  fields.some((field) => {
    const name = getFieldName(field);
    const current = isDateField(field)
      ? formatRange(field, form?.[name]) || form?.[name]
      : form?.[name];
    const initial = isDateField(field)
      ? formatRange(field, defaults?.[name]) || defaults?.[name]
      : defaults?.[name];
    return !isEqual(current, initial);
  });

// 舊版工具名稱相容層
export const getSearchUiKey = getFieldName;
export const getSearchDefaultForm = getDefaults;
export const isSearchValueEmpty = isEmpty;
export const areSearchValuesEqual = isEqual;
export const normalizeSearchParams = toParams;
export const getSearchQueryFromForm = toQuery;
export const getSearchFormFromQuery = fromQuery;
export const removeSearchQueryKeys = removeQuery;
export const getSearchQuerySnapshot = snapshot;
export const isSearchFormDirty = isDirty;
