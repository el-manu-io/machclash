const DEFAULT_LOCALE = 'en';

let locale = DEFAULT_LOCALE;
let catalog = {};
let fallbackCatalog = {};

const interpolate = (template, vars = {}) =>
  String(template).replace(/\{(\w+)\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : `{${key}}`
  );

const fetchCatalog = async (code) => {
  const res = await fetch(`./static/i18n/${code}.json`);
  if (!res.ok) throw new Error(`Failed to load i18n catalog: ${code}`);
  return res.json();
};

export const getLocale = () => locale;

export const setLocale = async (nextLocale) => {
  locale = nextLocale || DEFAULT_LOCALE;
  if (locale === DEFAULT_LOCALE) {
    catalog = fallbackCatalog;
    return locale;
  }
  try {
    catalog = await fetchCatalog(locale);
  } catch {
    locale = DEFAULT_LOCALE;
    catalog = fallbackCatalog;
  }
  return locale;
};

export const t = (key, vars) => {
  const raw = catalog[key] ?? fallbackCatalog[key] ?? key;
  return interpolate(raw, vars);
};

export const load = async (nextLocale = DEFAULT_LOCALE) => {
  fallbackCatalog = await fetchCatalog(DEFAULT_LOCALE);
  locale = nextLocale || DEFAULT_LOCALE;
  if (locale === DEFAULT_LOCALE) {
    catalog = fallbackCatalog;
  } else {
    try {
      catalog = await fetchCatalog(locale);
    } catch {
      locale = DEFAULT_LOCALE;
      catalog = fallbackCatalog;
    }
  }
  return locale;
};

export const defaultLocale = DEFAULT_LOCALE;
