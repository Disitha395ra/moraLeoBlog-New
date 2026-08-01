(function () {
  function assertConfig(cfg) {
    if (!cfg || !cfg.firebase || !cfg.firebase.projectId) {
      throw new Error("Missing ADMIN_CONFIG.firebase values in admin/index.html");
    }
  }

  function nowIso() {
    return new Date().toISOString();
  }

  const state = {
    app: null,
    auth: null,
    db: null,
    storage: null,
  };

  function initFirebase(config) {
    assertConfig(config);
    if (!firebase.apps.length) {
      state.app = firebase.initializeApp(config.firebase);
    } else {
      state.app = firebase.app();
    }
    state.auth = firebase.auth();
    state.db = firebase.firestore();
    state.storage = firebase.storage();
    return state;
  }

  function authSignIn(email, password) {
    return state.auth.signInWithEmailAndPassword(email, password);
  }

  function authSignOut() {
    return state.auth.signOut();
  }

  function onAuthChange(cb) {
    return state.auth.onAuthStateChanged(cb);
  }

  async function getAuthClaims(forceRefresh) {
    const user = state.auth.currentUser;
    if (!user) return {};
    const tokenResult = await user.getIdTokenResult(!!forceRefresh);
    return tokenResult && tokenResult.claims ? tokenResult.claims : {};
  }

  async function uploadCoverImage(file, config) {
    const safe = String(file.name || "cover.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${Date.now()}_${safe}`;
    const path = `${config.storage.coversPath}/${key}`;
    const ref = state.storage.ref().child(path);
    await ref.put(file);
    return ref.getDownloadURL();
  }

  function postsCollection(config) {
    return state.db.collection(config.collections.posts);
  }

  function categoriesCollection(config) {
    return state.db.collection(config.collections.categories);
  }

  function tagsCollection(config) {
    return state.db.collection(config.collections.tags);
  }

  async function listPosts(config) {
    const snap = await postsCollection(config).orderBy("updatedAt", "desc").get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async function getPost(config, id) {
    const doc = await postsCollection(config).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  async function createPost(config, post) {
    const payload = {
      ...post,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    const ref = await postsCollection(config).add(payload);
    return ref.id;
  }

  async function updatePost(config, id, post) {
    const payload = {
      ...post,
      updatedAt: nowIso(),
    };
    await postsCollection(config).doc(id).set(payload, { merge: true });
  }

  async function deletePost(config, id) {
    await postsCollection(config).doc(id).delete();
  }

  async function ensureTaxonomyDocs(config, category, tags) {
    const writes = [];
    if (category) {
      const categoryId = category.toLowerCase().trim().replace(/\s+/g, "-");
      writes.push(categoriesCollection(config).doc(categoryId).set({ name: category, updatedAt: nowIso() }, { merge: true }));
    }
    (tags || []).forEach((t) => {
      const name = String(t || "").trim();
      if (!name) return;
      const tagId = name.toLowerCase().replace(/\s+/g, "-");
      writes.push(tagsCollection(config).doc(tagId).set({ name, updatedAt: nowIso() }, { merge: true }));
    });
    await Promise.all(writes);
  }

  async function listCategories(config) {
    const snap = await categoriesCollection(config).orderBy("name", "asc").get();
    return snap.docs.map((d) => d.data().name).filter(Boolean);
  }

  window.AdminFirebase = {
    initFirebase,
    authSignIn,
    authSignOut,
    onAuthChange,
    getAuthClaims,
    uploadCoverImage,
    listPosts,
    getPost,
    createPost,
    updatePost,
    deletePost,
    ensureTaxonomyDocs,
    listCategories,
  };
})();
