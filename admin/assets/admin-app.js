(function () {
  const cfg = window.ADMIN_CONFIG;
  const svc = window.AdminFirebase;

  const els = {
    loginView: document.getElementById("loginView"),
    adminView: document.getElementById("adminView"),
    loginForm: document.getElementById("loginForm"),
    loginEmail: document.getElementById("loginEmail"),
    loginPassword: document.getElementById("loginPassword"),
    logoutBtn: document.getElementById("logoutBtn"),
    authBadge: document.getElementById("authBadge"),

    statPosts: document.getElementById("statPosts"),
    statDrafts: document.getElementById("statDrafts"),
    statPublished: document.getElementById("statPublished"),

    postList: document.getElementById("postList"),
    newPostBtn: document.getElementById("newPostBtn"),
    postSearch: document.getElementById("postSearch"),
    statusFilter: document.getElementById("statusFilter"),

    editorTitle: document.getElementById("editorTitle"),
    postForm: document.getElementById("postForm"),
    postId: document.getElementById("postId"),
    postTitle: document.getElementById("postTitle"),
    postSlug: document.getElementById("postSlug"),
    postExcerpt: document.getElementById("postExcerpt"),
    postCategory: document.getElementById("postCategory"),
    postTags: document.getElementById("postTags"),
    postAuthor: document.getElementById("postAuthor"),
    postReadTime: document.getElementById("postReadTime"),
    postStatus: document.getElementById("postStatus"),
    postFeatured: document.getElementById("postFeatured"),
    coverUpload: document.getElementById("coverUpload"),
    coverImageUrl: document.getElementById("coverImageUrl"),
    seoTitle: document.getElementById("seoTitle"),
    seoDescription: document.getElementById("seoDescription"),
    seoKeywords: document.getElementById("seoKeywords"),

    previewBtn: document.getElementById("previewBtn"),
    saveDraftBtn: document.getElementById("saveDraftBtn"),
    publishBtn: document.getElementById("publishBtn"),
    deleteBtn: document.getElementById("deleteBtn"),

    previewTitle: document.getElementById("previewTitle"),
    previewImage: document.getElementById("previewImage"),
    previewMeta: document.getElementById("previewMeta"),
    previewExcerpt: document.getElementById("previewExcerpt"),
    previewContent: document.getElementById("previewContent"),

    toast: document.getElementById("toast"),
  };

  const appState = {
    posts: [],
    filteredPosts: [],
    editor: null,
    user: null,
    loadedPostId: null,
    canWrite: false,
    localPreviewImageUrl: null,
  };

  const slugify = window.TextUtils?.slugify || ((value) => String(value || "").trim().toLowerCase());
  const splitCsv = window.TextUtils?.splitCsv || ((value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean));
  const fallbackCategories = [
    "general",
    "achievements",
    "education",
    "environment",
    "events",
    "health",
    "leadership",
    "news",
    "service",
    "stories",
    "technology",
  ];

  function toast(message, isError) {
    els.toast.textContent = message;
    els.toast.className = isError ? "toast show error" : "toast show";
    setTimeout(() => {
      els.toast.className = "toast";
    }, 2200);
  }

  function parseTags(value) {
    return splitCsv(value);
  }

  function toKeywords(value) {
    return splitCsv(value);
  }

  function hasFirebaseConfig() {
    const fb = cfg && cfg.firebase ? cfg.firebase : null;
    return !!(fb && fb.apiKey && fb.projectId && fb.authDomain && fb.storageBucket && fb.appId);
  }

  function defaultPost() {
    return {
      title: "",
      slug: "",
      excerpt: "",
      category: "general",
      tags: [],
      author: "",
      readTime: "",
      status: "draft",
      featured: false,
      coverImage: "",
      contentHtml: "",
      seo: {
        title: "",
        description: "",
        keywords: [],
      },
      publishedAt: "",
    };
  }

  function renderStats(posts) {
    const drafts = posts.filter((p) => p.status === "draft").length;
    const published = posts.filter((p) => p.status === "published").length;
    els.statPosts.textContent = String(posts.length);
    els.statDrafts.textContent = String(drafts);
    els.statPublished.textContent = String(published);
  }

  function releaseLocalPreviewImage() {
    if (appState.localPreviewImageUrl) {
      URL.revokeObjectURL(appState.localPreviewImageUrl);
      appState.localPreviewImageUrl = null;
    }
  }

  function setWriteControlsEnabled(enabled) {
    appState.canWrite = !!enabled;
    [
      els.saveDraftBtn,
      els.publishBtn,
      els.deleteBtn,
    ].forEach((el) => {
      if (!el) return;
      el.disabled = !enabled;
    });
  }

  function getIndexCategories() {
    const posts = Array.isArray(window.BLOG_POST_INDEX) ? window.BLOG_POST_INDEX : [];
    return posts.map((p) => String(p && p.category ? p.category : "").trim()).filter(Boolean);
  }

  function postItemHtml(post) {
    const safeTitle = (post.title || "Untitled").replace(/</g, "&lt;");
    return `
      <button class="post-item" data-id="${post.id}">
        <strong>${safeTitle}</strong>
        <span>${post.status || "draft"}</span>
      </button>
    `;
  }

  function renderPostList() {
    const q = els.postSearch.value.trim().toLowerCase();
    const s = els.statusFilter.value;

    appState.filteredPosts = appState.posts.filter((p) => {
      const matchesQuery = !q || [p.title, p.slug, p.author].join(" ").toLowerCase().includes(q);
      const matchesStatus = s === "all" || (p.status || "draft") === s;
      return matchesQuery && matchesStatus;
    });

    els.postList.innerHTML = appState.filteredPosts.map(postItemHtml).join("") || '<p class="muted">No posts found.</p>';

    Array.from(els.postList.querySelectorAll(".post-item")).forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        loadPostToForm(id);
      });
    });
  }

  function fillCategories(categories) {
    const merged = [...new Set([
      ...fallbackCategories,
      ...getIndexCategories(),
      ...(Array.isArray(categories) ? categories : []),
    ].map((v) => String(v || "").trim().toLowerCase()).filter(Boolean))];
    els.postCategory.innerHTML = merged.map((c) => `<option value="${c}">${c}</option>`).join("");
  }

  function hasSlugConflict(slugValue, currentId) {
    const target = String(slugValue || "").trim().toLowerCase();
    if (!target) return false;
    return appState.posts.some((p) => {
      const postId = String(p.id || "").trim();
      const postSlug = String(p.slug || "").trim().toLowerCase();
      return postSlug === target && postId !== String(currentId || "").trim();
    });
  }

  function applySaveMode(payload, mode) {
    if (mode === "draft") {
      payload.status = "draft";
      payload.publishedAt = "";
      payload.date = "";
      return;
    }

    if (mode === "publish") {
      const iso = new Date().toISOString();
      payload.status = "published";
      payload.publishedAt = iso;
      payload.date = iso.slice(0, 10);
      return;
    }

    if (payload.status === "published") {
      const iso = payload.publishedAt || new Date().toISOString();
      payload.publishedAt = iso;
      payload.date = iso.slice(0, 10);
    } else {
      payload.publishedAt = "";
      payload.date = "";
    }
  }

  function readForm() {
    return {
      title: els.postTitle.value.trim(),
      slug: els.postSlug.value.trim(),
      excerpt: els.postExcerpt.value.trim(),
      category: els.postCategory.value,
      tags: parseTags(els.postTags.value),
      author: els.postAuthor.value.trim(),
      readTime: els.postReadTime.value.trim(),
      status: els.postStatus.value,
      featured: els.postFeatured.value === "true",
      coverImage: els.coverImageUrl.value.trim(),
      contentHtml: appState.editor ? appState.editor.getData() : "",
      seo: {
        title: els.seoTitle.value.trim(),
        description: els.seoDescription.value.trim(),
        keywords: toKeywords(els.seoKeywords.value),
      },
      publishedAt: els.postStatus.value === "published" ? new Date().toISOString() : "",
    };
  }

  function writeForm(post) {
    const p = { ...defaultPost(), ...post, seo: { ...defaultPost().seo, ...(post.seo || {}) } };
    els.postId.value = post.id || "";
    els.postTitle.value = p.title;
    els.postSlug.value = p.slug;
    els.postExcerpt.value = p.excerpt;
    els.postCategory.value = p.category || "general";
    els.postTags.value = (p.tags || []).join(", ");
    els.postAuthor.value = p.author || "";
    els.postReadTime.value = p.readTime || "";
    els.postStatus.value = p.status || "draft";
    els.postFeatured.value = String(!!p.featured);
    els.coverImageUrl.value = p.coverImage || "";
    els.seoTitle.value = p.seo.title || "";
    els.seoDescription.value = p.seo.description || "";
    els.seoKeywords.value = (p.seo.keywords || []).join(", ");

    if (appState.editor) appState.editor.setData(p.contentHtml || "");

    els.deleteBtn.hidden = !post.id;
    els.editorTitle.textContent = post.id ? "Edit Post" : "Create Post";
    appState.loadedPostId = post.id || null;

    renderPreview();
  }

  async function refreshPostsAndUi() {
    appState.posts = await svc.listPosts(cfg);
    renderStats(appState.posts);
    renderPostList();
  }

  async function loadPostToForm(id) {
    const p = await svc.getPost(cfg, id);
    if (!p) return toast("Post not found", true);
    writeForm(p);
  }

  async function maybeUploadCover() {
    const file = els.coverUpload.files && els.coverUpload.files[0];
    if (!file) return null;
    const url = await svc.uploadCoverImage(file, cfg);
    els.coverImageUrl.value = url;
    return url;
  }

  async function savePost(mode) {
    try {
      if (!appState.canWrite) {
        toast("Your account is signed in but does not have admin publish permissions.", true);
        return;
      }

      if (!els.postTitle.value.trim()) {
        toast("Title is required", true);
        return;
      }

      if (!els.postSlug.value.trim()) {
        els.postSlug.value = slugify(els.postTitle.value);
      }

      const existingId = els.postId.value.trim();
      if (hasSlugConflict(els.postSlug.value, existingId)) {
        toast("Slug already exists. Please use a unique slug.", true);
        return;
      }

      await maybeUploadCover();

      const payload = readForm();
      applySaveMode(payload, mode);

      if (existingId) {
        await svc.updatePost(cfg, existingId, payload);
        await svc.ensureTaxonomyDocs(cfg, payload.category, payload.tags);
        toast("Post updated");
      } else {
        const newId = await svc.createPost(cfg, payload);
        await svc.ensureTaxonomyDocs(cfg, payload.category, payload.tags);
        els.postId.value = newId;
        toast("Post created");
      }

      await refreshPostsAndUi();
      await loadPostToForm(els.postId.value.trim());
    } catch (err) {
      if (err && (err.code === "storage/unauthorized" || err.code === "permission-denied")) {
        toast("Publish blocked: this account has no admin claim for Firestore/Storage writes.", true);
        return;
      }
      toast(err.message || "Save failed", true);
    }
  }

  async function deleteCurrentPost() {
    const id = els.postId.value.trim();
    if (!id) return;
    const ok = window.confirm("Delete this post permanently?");
    if (!ok) return;

    try {
      await svc.deletePost(cfg, id);
      writeForm(defaultPost());
      els.postId.value = "";
      await refreshPostsAndUi();
      toast("Post deleted");
    } catch (err) {
      toast(err.message || "Delete failed", true);
    }
  }

  function renderPreview() {
    const p = readForm();
    els.previewTitle.textContent = p.title || "Post title preview";
    els.previewMeta.textContent = `${p.category || "general"} | ${p.status || "draft"} | ${p.readTime || "read time"}`;
    els.previewExcerpt.textContent = p.excerpt || "Excerpt preview...";
    els.previewContent.innerHTML = p.contentHtml || "<p>Content preview...</p>";

    const file = els.coverUpload.files && els.coverUpload.files[0];
    if (file) {
      releaseLocalPreviewImage();
      appState.localPreviewImageUrl = URL.createObjectURL(file);
      els.previewImage.src = appState.localPreviewImageUrl;
      els.previewImage.hidden = false;
      return;
    }

    releaseLocalPreviewImage();
    if (p.coverImage) {
      els.previewImage.src = p.coverImage;
      els.previewImage.hidden = false;
    } else {
      els.previewImage.removeAttribute("src");
      els.previewImage.hidden = true;
    }
  }

  function resetToNewPost() {
    writeForm(defaultPost());
    els.postId.value = "";
    els.coverUpload.value = "";
    releaseLocalPreviewImage();
  }

  async function initEditor() {
    appState.editor = await ClassicEditor.create(document.getElementById("postContentEditor"));
    appState.editor.model.document.on("change:data", () => {
      renderPreview();
    });
  }

  function setSignedIn(user) {
    appState.user = user;
    const signedIn = !!user;
    els.loginView.hidden = signedIn;
    els.adminView.hidden = !signedIn;
    els.logoutBtn.hidden = !signedIn;
    els.authBadge.textContent = signedIn ? `Signed in: ${user.email}` : "Signed out";
    if (!signedIn) {
      setWriteControlsEnabled(false);
    }
  }

  async function syncPermissionsUi(user) {
    if (!user) {
      setWriteControlsEnabled(false);
      return;
    }

    try {
      const claims = await svc.getAuthClaims(true);
      const canWrite = !!claims.admin;
      setWriteControlsEnabled(canWrite);
      if (!canWrite) {
        els.authBadge.textContent = `Signed in: ${user.email} (no admin claim)`;
        toast("Login works, but publish/save needs admin custom claim in Firebase.", true);
      }
    } catch (err) {
      setWriteControlsEnabled(false);
      toast("Could not verify admin permissions. Please re-login.", true);
    }
  }

  async function hydrateAdmin() {
    const categories = await svc.listCategories(cfg).catch(() => []);
    fillCategories(categories);
    await refreshPostsAndUi();
    resetToNewPost();
  }

  function wireEvents() {
    els.loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await svc.authSignIn(els.loginEmail.value.trim(), els.loginPassword.value);
        toast("Signed in");
      } catch (err) {
        toast(err.message || "Sign-in failed", true);
      }
    });

    els.logoutBtn.addEventListener("click", async () => {
      await svc.authSignOut();
      toast("Signed out");
    });

    els.newPostBtn.addEventListener("click", () => {
      resetToNewPost();
      els.postTitle.focus();
    });

    els.postSearch.addEventListener("input", renderPostList);
    els.statusFilter.addEventListener("change", renderPostList);

    els.postTitle.addEventListener("input", () => {
      if (!els.postId.value.trim()) {
        els.postSlug.value = slugify(els.postTitle.value);
      }
      renderPreview();
    });

    [
      els.postSlug,
      els.postExcerpt,
      els.postCategory,
      els.postTags,
      els.postAuthor,
      els.postReadTime,
      els.postStatus,
      els.postFeatured,
      els.coverImageUrl,
      els.seoTitle,
      els.seoDescription,
      els.seoKeywords,
    ].forEach((input) => {
      input.addEventListener("input", renderPreview);
      input.addEventListener("change", renderPreview);
    });

    els.coverUpload.addEventListener("change", renderPreview);

    els.previewBtn.addEventListener("click", renderPreview);
    els.saveDraftBtn.addEventListener("click", () => savePost("draft"));
    els.publishBtn.addEventListener("click", () => savePost("publish"));
    els.deleteBtn.addEventListener("click", deleteCurrentPost);
  }

  async function main() {
    try {
      if (!hasFirebaseConfig()) {
        toast("Firebase environment config is missing. Load js/env-config.js with production values.", true);
        return;
      }

      svc.initFirebase(cfg);
      await initEditor();
      wireEvents();

      svc.onAuthChange(async (user) => {
        try {
          setSignedIn(user);
          if (user) {
            await syncPermissionsUi(user);
            await hydrateAdmin();
          }
        } catch (err) {
          toast(err.message || "Could not load admin data.", true);
        }
      });
    } catch (err) {
      toast(err.message || "Initialization failed", true);
      console.error(err);
    }
  }

  main();
})();
