(function (global) {
  'use strict';

  var normalizeToken = global.TextUtils && typeof global.TextUtils.normalizeToken === 'function'
    ? global.TextUtils.normalizeToken
    : function (value) { return String(value || '').toLowerCase().trim(); };

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toIsoDate(input) {
    if (!input) return '';
    var d = new Date(input);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }

  function formatDisplayDate(input) {
    var d = new Date(input);
    if (isNaN(d.getTime())) return 'Unknown Date';
    return d.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: '2-digit'
    });
  }

  function parseFirestoreValue(value) {
    if (!value || typeof value !== 'object') return null;

    if (Object.prototype.hasOwnProperty.call(value, 'stringValue')) return value.stringValue;
    if (Object.prototype.hasOwnProperty.call(value, 'integerValue')) return parseInt(value.integerValue, 10);
    if (Object.prototype.hasOwnProperty.call(value, 'doubleValue')) return Number(value.doubleValue);
    if (Object.prototype.hasOwnProperty.call(value, 'booleanValue')) return !!value.booleanValue;
    if (Object.prototype.hasOwnProperty.call(value, 'timestampValue')) return value.timestampValue;
    if (Object.prototype.hasOwnProperty.call(value, 'nullValue')) return null;

    if (Object.prototype.hasOwnProperty.call(value, 'arrayValue')) {
      var arr = value.arrayValue && Array.isArray(value.arrayValue.values)
        ? value.arrayValue.values
        : [];
      return arr.map(parseFirestoreValue);
    }

    if (Object.prototype.hasOwnProperty.call(value, 'mapValue')) {
      var fields = value.mapValue && value.mapValue.fields ? value.mapValue.fields : {};
      return decodeFirestoreFields(fields);
    }

    return null;
  }

  function decodeFirestoreFields(fields) {
    var out = {};
    Object.keys(fields || {}).forEach(function (key) {
      out[key] = parseFirestoreValue(fields[key]);
    });
    return out;
  }

  function mapCategoryIcon(category) {
    var c = String(category || '').toLowerCase();
    var icons = {
      news: 'fa-bullhorn',
      events: 'fa-calendar-check',
      service: 'fa-hands-helping',
      leadership: 'fa-chess-king',
      education: 'fa-book-open',
      environment: 'fa-leaf',
      health: 'fa-heartbeat',
      technology: 'fa-microchip',
      stories: 'fa-heart',
      achievements: 'fa-award'
    };
    return icons[c] || 'fa-newspaper';
  }

  function avatarClassForCategory(category) {
    var c = String(category || '').toLowerCase();
    if (c === 'environment') return 'green';
    if (c === 'service' || c === 'education' || c === 'stories' || c === 'achievements') return 'gold';
    return 'red';
  }

  function getRuntimeContentConfig() {
    var explicit = global.FIREBASE_CONTENT_CONFIG || {};
    var env = global.LEO_ENV && global.LEO_ENV.contentProvider ? global.LEO_ENV.contentProvider : {};

    return {
      projectId: String(explicit.projectId || env.projectId || '').trim(),
      apiKey: String(explicit.apiKey || env.apiKey || '').trim(),
      collection: String(explicit.collection || env.collection || 'posts').trim(),
    };
  }

  var cachedSource = 'static';
  var cachedPostsData = [];
  var cachedPostsPromise = null;

  function getStaticFallbackHtml() {
    var articleParts = global.BLOG_ARTICLES_PARTS;
    if (Array.isArray(articleParts) && articleParts.length) {
      return articleParts.join('\n\n');
    }

    var fallback = global.BLOG_ARTICLES_HTML;
    return typeof fallback === 'string' ? fallback : '';
  }

  function getCollectionEndpoint(config) {
    var base = 'https://firestore.googleapis.com/v1/projects/' +
      encodeURIComponent(config.projectId) +
      '/databases/(default)/documents/' +
      encodeURIComponent(config.collection || 'posts');

    var qs = '?pageSize=200';
    if (config.apiKey) {
      qs += '&key=' + encodeURIComponent(config.apiKey);
    }
    return base + qs;
  }

  async function fetchFirestoreDocuments() {
    var config = getRuntimeContentConfig();
    if (!config.projectId) return [];

    try {
      var res = await fetch(getCollectionEndpoint(config), { method: 'GET' });
      if (!res.ok) return [];
      var data = await res.json();
      return Array.isArray(data.documents) ? data.documents : [];
    } catch (_) {
      return [];
    }
  }

  function mapFirestoreDocToPost(doc) {
    var name = String(doc && doc.name ? doc.name : '');
    var docId = name.split('/').pop();
    var f = decodeFirestoreFields(doc && doc.fields ? doc.fields : {});

    var title = String(f.title || f.name || docId || '').trim();
    var slug = normalizeToken(f.slug || title || docId);
    var category = String(f.category || 'news').toLowerCase();
    var author = String(f.author || 'Leo Editorial Team').trim();
    var excerpt = String(f.excerpt || f.summary || '').trim();
    var contentHtml = String(f.contentHtml || f.content || '').trim();
    var coverImage = String(f.coverImage || f.image || '').trim();
    var readTime = String(f.readTime || '3 min read').trim();
    var dateRaw = f.date || f.publishedAt || f.createdAt || '';
    var dateIso = toIsoDate(dateRaw) || '2026-01-01';
    var tags = Array.isArray(f.tags) ? f.tags.filter(Boolean).map(String) : [];
    var featured = !!f.featured;
    var status = String(f.status || 'published').toLowerCase();

    return {
      id: docId || slug,
      slug: slug,
      title: title,
      category: category,
      author: author,
      date: dateIso,
      readTime: readTime,
      excerpt: excerpt,
      contentHtml: contentHtml,
      coverImage: coverImage,
      tags: tags,
      featured: featured,
      status: status
    };
  }

  async function getFirebasePosts() {
    var docs = await fetchFirestoreDocuments();
    if (!Array.isArray(docs) || !docs.length) {
      return [];
    }

    return docs
      .map(mapFirestoreDocToPost)
      .filter(function (p) {
        return p && p.title && p.status === 'published';
      })
      .sort(function (a, b) {
        return String(b.date).localeCompare(String(a.date));
      });
  }

  function getStaticPostsFromIndex() {
    if (!Array.isArray(global.BLOG_POST_INDEX)) {
      return [];
    }

    return global.BLOG_POST_INDEX.map(function (post) {
      return {
        id: String(post.slug || '').trim(),
        slug: String(post.slug || '').trim(),
        title: String(post.title || '').trim(),
        category: String(post.category || '').trim().toLowerCase(),
        author: String(post.author || '').trim(),
        date: String(post.date || '').trim(),
        readTime: String(post.readTime || '').trim(),
        tags: Array.isArray(post.tags) ? post.tags.filter(Boolean) : [],
        excerpt: '',
        contentHtml: '',
        coverImage: '',
        featured: false,
        status: 'published'
      };
    });
  }

  async function getPosts() {
    if (!cachedPostsPromise) {
      cachedPostsPromise = (async function () {
        var firebasePosts = await getFirebasePosts();
        if (firebasePosts.length) {
          cachedSource = 'firebase';
          cachedPostsData = firebasePosts;
          return firebasePosts;
        }

        cachedSource = 'static';
        cachedPostsData = getStaticPostsFromIndex();
        return cachedPostsData;
      })();
    }

    var posts = await cachedPostsPromise;
    return Array.isArray(posts) ? posts.slice() : [];
  }

  async function getRawArticleHtml() {
    var posts = await getPosts();
    if (cachedSource === 'firebase' && Array.isArray(posts) && posts.length) {
      return posts.map(renderPostCardHtml).join('\n\n');
    }

    return getStaticFallbackHtml();
  }

  async function getPost(slug) {
    var token = normalizeToken(slug || '');
    var posts = await getPosts();
    for (var i = 0; i < posts.length; i++) {
      if (normalizeToken(posts[i].slug) === token) {
        return posts[i];
      }
    }
    return null;
  }

  async function getFeaturedPost() {
    var posts = await getPosts();
    if (!posts.length) return null;

    for (var i = 0; i < posts.length; i++) {
      if (posts[i].featured) return posts[i];
    }

    return posts[0];
  }

  function getCategories(posts) {
    var list = Array.isArray(posts) ? posts : cachedPostsData;
    var map = {};
    list.forEach(function (post) {
      if (post && post.category) map[post.category] = true;
    });
    return Object.keys(map).sort();
  }

  function searchPosts(posts, term) {
    var list = Array.isArray(posts) ? posts : [];
    var q = String(term || '').trim().toLowerCase();
    if (!q) return list;

    return list.filter(function (post) {
      var title = String(post.title || '').toLowerCase();
      var excerpt = String(post.excerpt || '').toLowerCase();
      return title.indexOf(q) >= 0 || excerpt.indexOf(q) >= 0;
    });
  }

  function filterPosts(posts, filters) {
    var list = Array.isArray(posts) ? posts : [];
    var state = filters || {};

    var activeCat = String(state.category || 'all').toLowerCase();
    var activeAuthor = String(state.author || '').toLowerCase();
    var activeTag = String(state.tag || '').toLowerCase();
    var searchTerm = String(state.searchTerm || '').toLowerCase().trim();
    var postSlug = normalizeToken(String(state.postSlug || ''));

    return list.filter(function (post) {
      if (postSlug) {
        return normalizeToken(post.slug || '') === postSlug;
      }

      var catMatch = activeCat === 'all' || String(post.category || '').toLowerCase() === activeCat;
      var authorMatch = !activeAuthor || String(post.author || '').toLowerCase() === activeAuthor;
      var tags = Array.isArray(post.tags) ? post.tags.map(function (t) { return String(t).toLowerCase(); }) : [];
      var tagMatch = !activeTag || tags.indexOf(activeTag) >= 0;
      var title = String(post.title || '').toLowerCase();
      var excerpt = String(post.excerpt || '').toLowerCase();
      var searchMatch = !searchTerm || title.indexOf(searchTerm) >= 0 || excerpt.indexOf(searchTerm) >= 0;

      return catMatch && authorMatch && tagMatch && searchMatch;
    });
  }

  function buildPostRecords(cards) {
    var cardList = Array.isArray(cards) ? cards : [];
    var posts = Array.isArray(cachedPostsData) ? cachedPostsData : [];
    var lookup = {};

    posts.forEach(function (post) {
      var key = [
        normalizeToken(post.title),
        String(post.date || '').trim(),
        String(post.category || '').toLowerCase()
      ].join('|');
      lookup[key] = post;
    });

    return cardList.map(function (card) {
      var titleEl = card.querySelector('.card-title');
      var excerptEl = card.querySelector('.card-excerpt');
      var title = titleEl ? titleEl.textContent.trim() : '';
      var excerpt = excerptEl ? excerptEl.textContent.trim() : '';
      var category = String(card.dataset.category || '').toLowerCase();
      var date = String(card.dataset.date || '').trim();

      var key = [normalizeToken(title), date, category].join('|');
      var match = lookup[key] || null;
      var slug = match && match.slug ? match.slug : normalizeToken(title);
      var author = match && match.author ? match.author : String(card.dataset.author || '');
      var tags = match && Array.isArray(match.tags) ? match.tags.slice() : String(card.dataset.tags || '').split('|').filter(Boolean);
      var readTime = match && match.readTime ? String(match.readTime) : '';

      card.dataset.slug = slug;
      card.dataset.author = author;
      card.dataset.tags = tags.join('|');

      return {
        id: slug,
        slug: slug,
        title: title,
        excerpt: excerpt,
        category: category,
        date: date,
        author: author,
        tags: tags,
        readTime: readTime,
        card: card
      };
    });
  }

  function renderPostCardHtml(post) {
    var title = escapeHtml(post.title || 'Untitled');
    var slug = escapeHtml(post.slug || normalizeToken(title));
    var category = escapeHtml(String(post.category || 'news').toLowerCase());
    var categoryLabel = escapeHtml(String(post.category || 'News').replace(/^./, function (m) { return m.toUpperCase(); }));
    var author = escapeHtml(post.author || 'Leo Editorial Team');
    var authorInitial = escapeHtml((post.author || 'L').charAt(0).toUpperCase());
    var dateIso = escapeHtml(post.date || '2026-01-01');
    var dateDisplay = escapeHtml(formatDisplayDate(post.date));
    var excerpt = escapeHtml(post.excerpt || 'New article update from the Leo Club of Moratuwa.');
    var readTime = escapeHtml(post.readTime || '3 min read');
    var icon = mapCategoryIcon(post.category);
    var avatarClass = avatarClassForCategory(post.category);
    var contentHtml = post.contentHtml && post.contentHtml.trim() ? post.contentHtml : '<p>' + excerpt + '</p>';

    var imageBlock = '';
    if (post.coverImage) {
      var imageSrc = escapeHtml(post.coverImage);
      imageBlock =
        '<img class="card-image" src="' + imageSrc + '" alt="' + categoryLabel + ' article cover" loading="lazy" onerror="this.style.display=\'none\'; this.parentElement.classList.remove(\'has-image\');" />';
    }

    var tags = Array.isArray(post.tags) ? post.tags : [];
    var tagsHtml = tags.length
      ? '<div class="content-tags">' + tags.map(function (t) { return '<span class="tag">' + escapeHtml(t) + '</span>'; }).join('') + '</div>'
      : '';

    return '' +
      '<article class="blog-card reveal" data-category="' + category + '" data-date="' + dateIso + '" data-slug="' + slug + '">' +
      '  <div class="card-visual ' + category + (post.coverImage ? ' has-image' : '') + '" aria-hidden="true">' +
      imageBlock +
      '    <i class="fas ' + icon + '"></i>' +
      '    <div class="card-badge">' + categoryLabel + '</div>' +
      '    <div class="card-read-hint">Click to Read</div>' +
      '  </div>' +
      '  <div class="card-body">' +
      '    <div class="post-meta">' +
      '      <span class="post-category ' + category + '">' + categoryLabel + '</span>' +
      '      <span class="post-date"><i class="far fa-calendar-alt" aria-hidden="true"></i> ' + dateDisplay + '</span>' +
      '    </div>' +
      '    <h3 class="card-title">' + title + '</h3>' +
      '    <p class="card-excerpt">' + excerpt + '</p>' +
      '    <div class="card-footer">' +
      '      <div class="post-author-sm">' +
      '        <div class="author-avatar-sm ' + avatarClass + '" aria-hidden="true">' + authorInitial + '</div>' +
      '        <span>' + author + '</span>' +
      '      </div>' +
      '      <div class="card-info"><i class="far fa-clock" aria-hidden="true"></i> ' + readTime + '</div>' +
      '    </div>' +
      '  </div>' +
      '  <template class="post-full-content">' +
      '    <h2>' + title + '</h2>' +
      '    <p class="content-meta"><i class="far fa-calendar-alt"></i> ' + dateDisplay + ' &nbsp;|&nbsp; <i class="far fa-clock"></i> ' + readTime + ' &nbsp;|&nbsp; By ' + author + '</p>' +
      contentHtml +
      tagsHtml +
      '  </template>' +
      '</article>';
  }

  cachedPostsData = getStaticPostsFromIndex();

  var staticProvider = {
    getRawArticleHtml: getRawArticleHtml,
    getPosts: getPosts,
    getPost: getPost,
    getFeaturedPost: getFeaturedPost,
    getCategories: getCategories,
    searchPosts: searchPosts,
    filterPosts: filterPosts,
    buildPostRecords: buildPostRecords
  };

  global.StaticContentProvider = staticProvider;

  if (global.ContentService && typeof global.ContentService.setProvider === 'function') {
    global.ContentService.setProvider(staticProvider);
  }
})(window);
