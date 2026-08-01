(function (global) {
  'use strict';

  function normalizeToken(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function slugify(value) {
    return normalizeToken(value || '');
  }

  function splitCsv(value) {
    return String(value || '')
      .split(',')
      .map(function (item) { return item.trim(); })
      .filter(Boolean);
  }

  global.TextUtils = {
    normalizeToken: normalizeToken,
    slugify: slugify,
    splitCsv: splitCsv,
  };
})(window);
