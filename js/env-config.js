(function (global) {
  'use strict';

  var rootEnv = global.__LEO_ENV__ || {};
  var site = rootEnv.site || {};
  var firebase = rootEnv.firebase || {};
  var content = rootEnv.contentProvider || {};

  var productionUrl = String(site.productionUrl || 'https://moraleoblog.web.app/blog').replace(/\/$/, '');

  global.LEO_ENV = {
    site: {
      productionUrl: productionUrl,
    },
    firebase: {
      apiKey: firebase.apiKey || '',
      authDomain: firebase.authDomain || '',
      projectId: firebase.projectId || '',
      storageBucket: firebase.storageBucket || '',
      messagingSenderId: firebase.messagingSenderId || '',
      appId: firebase.appId || '',
    },
    contentProvider: {
      collection: content.collection || 'posts',
      apiKey: content.apiKey || firebase.apiKey || '',
      projectId: content.projectId || firebase.projectId || '',
    },
  };

  global.ADMIN_CONFIG = {
    firebase: global.LEO_ENV.firebase,
    collections: {
      posts: 'posts',
      categories: 'categories',
      tags: 'tags',
    },
    storage: {
      coversPath: 'post-covers',
    },
  };

  global.FIREBASE_CONTENT_CONFIG = {
    projectId: global.LEO_ENV.contentProvider.projectId,
    apiKey: global.LEO_ENV.contentProvider.apiKey,
    collection: global.LEO_ENV.contentProvider.collection,
  };
})(window);

