if (typeof Promise !== "undefined" && !Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    const promise = this.constructor;
    return this.then(
      (value) => promise.resolve(callback()).then(() => value),
      (reason) => promise.resolve(callback()).then(() => {
        throw reason;
      })
    );
  };
}
;
if (typeof uni !== "undefined" && uni && uni.requireGlobal) {
  const global = uni.requireGlobal();
  ArrayBuffer = global.ArrayBuffer;
  Int8Array = global.Int8Array;
  Uint8Array = global.Uint8Array;
  Uint8ClampedArray = global.Uint8ClampedArray;
  Int16Array = global.Int16Array;
  Uint16Array = global.Uint16Array;
  Int32Array = global.Int32Array;
  Uint32Array = global.Uint32Array;
  Float32Array = global.Float32Array;
  Float64Array = global.Float64Array;
  BigInt64Array = global.BigInt64Array;
  BigUint64Array = global.BigUint64Array;
}
;
if (uni.restoreGlobal) {
  uni.restoreGlobal(Vue, weex, plus, setTimeout, clearTimeout, setInterval, clearInterval);
}
(function(vue) {
  "use strict";
  const ON_SHOW = "onShow";
  const ON_HIDE = "onHide";
  const ON_LAUNCH = "onLaunch";
  function formatAppLog(type, filename, ...args) {
    if (uni.__log__) {
      uni.__log__(type, filename, ...args);
    } else {
      console[type].apply(console, [...args, filename]);
    }
  }
  const createHook = (lifecycle) => (hook, target = vue.getCurrentInstance()) => {
    !vue.isInSSRComponentSetup && vue.injectHook(lifecycle, hook, target);
  };
  const onShow = /* @__PURE__ */ createHook(ON_SHOW);
  const onHide = /* @__PURE__ */ createHook(ON_HIDE);
  const onLaunch = /* @__PURE__ */ createHook(ON_LAUNCH);
  const _sfc_main$a = /* @__PURE__ */ vue.defineComponent({
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const posts = vue.ref([]);
      const page = vue.ref(1);
      const loading = vue.ref(false);
      const noMore = vue.ref(false);
      const isRefreshing = vue.ref(false);
      const sortType = vue.ref("time");
      const formatTime = (timestamp) => {
        const now = (/* @__PURE__ */ new Date()).getTime();
        const diff = now - new Date(timestamp).getTime();
        if (diff < 6e4)
          return "刚刚";
        if (diff < 36e5)
          return `${Math.floor(diff / 6e4)}分钟前`;
        if (diff < 864e5)
          return `${Math.floor(diff / 36e5)}小时前`;
        if (diff < 2592e6)
          return `${Math.floor(diff / 864e5)}天前`;
        const date = new Date(timestamp);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      };
      const getPosts = async () => {
        if (loading.value)
          return;
        loading.value = true;
        const token = uni.getStorageSync("token");
        if (!token) {
          loading.value = false;
          uni.showToast({
            title: "请先登录",
            icon: "none",
            success: () => {
              setTimeout(() => {
                uni.navigateTo({
                  url: "/pages/login/index"
                });
              }, 1500);
            }
          });
          return;
        }
        uni.request({
          url: "http://192.168.100.101:8080/api/posts",
          method: "GET",
          header: {
            "Accept": "application/json",
            "Device-Type": "APP",
            "Authorization": `Bearer ${token}`
          },
          data: {
            type: "love",
            page: page.value,
            pageSize: 10,
            sortBy: sortType.value
          },
          success: (response) => {
            formatAppLog("log", "at pages/love/index.vue:162", "获取帖子响应：", response);
            if (response.statusCode === 200 && response.data.code === 200) {
              const { list, total } = response.data.data;
              const processedList = list.map((post) => {
                const user = post.user || {};
                return {
                  ...post,
                  user: {
                    ...user,
                    avatar: user.avatar ? `/api${user.avatar}` : null,
                    name: user.name || "匿名用户"
                  },
                  content: post.content || "",
                  images: (post.images || []).map((img) => `http://192.168.100.101:8080/api${img}`),
                  likeCount: post.likeCount || 0,
                  commentCount: post.commentCount || 0,
                  isLiked: !!post.isLiked
                };
              });
              if (page.value === 1) {
                posts.value = processedList;
              } else {
                posts.value = [...posts.value, ...processedList];
              }
              noMore.value = posts.value.length >= total;
              if (isRefreshing.value) {
                uni.showToast({
                  title: "刷新成功",
                  icon: "success"
                });
              }
            } else if (response.statusCode === 403) {
              uni.removeStorageSync("token");
              uni.removeStorageSync("userInfo");
              uni.showToast({
                title: "登录已过期，请重新登录",
                icon: "none",
                success: () => {
                  setTimeout(() => {
                    uni.navigateTo({
                      url: "/pages/login/index"
                    });
                  }, 1500);
                }
              });
            } else {
              uni.showToast({
                title: response.data.message || "加载失败",
                icon: "none"
              });
            }
          },
          fail: (error) => {
            formatAppLog("error", "at pages/love/index.vue:219", "获取帖子失败：", error);
            uni.showToast({
              title: "网络错误，请下拉刷新",
              icon: "none"
            });
          },
          complete: () => {
            loading.value = false;
            isRefreshing.value = false;
            uni.stopPullDownRefresh();
          }
        });
      };
      const changeSort = (type) => {
        if (sortType.value === type)
          return;
        sortType.value = type;
        page.value = 1;
        noMore.value = false;
        getPosts();
      };
      const refresh = () => {
        page.value = 1;
        noMore.value = false;
        isRefreshing.value = true;
        getPosts();
      };
      const loadMore = () => {
        if (noMore.value || loading.value)
          return;
        page.value++;
        getPosts();
      };
      const goToPost = () => {
        const token = uni.getStorageSync("token");
        if (!token) {
          uni.showToast({
            title: "请先登录",
            icon: "none"
          });
          setTimeout(() => {
            uni.navigateTo({
              url: "/pages/login/index"
            });
          }, 1500);
          return;
        }
        uni.navigateTo({
          url: "/pages/post/create?type=love"
        });
      };
      const goToDetail = (id) => {
        uni.navigateTo({
          url: `/pages/post/detail?id=${id}`
        });
      };
      const previewImage = (urls, current) => {
        uni.previewImage({
          urls,
          current: urls[current]
        });
      };
      const handleLike = (post) => {
        const token = uni.getStorageSync("token");
        if (!token) {
          uni.showToast({
            title: "请先登录",
            icon: "none"
          });
          return;
        }
        uni.request({
          url: `http://192.168.100.101:8080/api/posts/${post.id}/like`,
          method: "POST",
          header: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Device-Type": "APP",
            "Authorization": `Bearer ${token}`
          },
          success: (response) => {
            formatAppLog("log", "at pages/love/index.vue:314", "点赞响应：", response);
            if (response.statusCode === 200 && response.data.code === 200) {
              post.isLiked = !post.isLiked;
              post.likeCount = post.isLiked ? post.likeCount + 1 : post.likeCount - 1;
            } else {
              uni.showToast({
                title: response.data.message || "操作失败",
                icon: "none"
              });
            }
          },
          fail: (error) => {
            formatAppLog("error", "at pages/love/index.vue:327", "点赞失败：", error);
            uni.showToast({
              title: "网络错误，请稍后重试",
              icon: "none"
            });
          }
        });
      };
      vue.onMounted(() => {
        getPosts();
      });
      const __returned__ = { posts, page, loading, noMore, isRefreshing, sortType, formatTime, getPosts, changeSort, refresh, loadMore, goToPost, goToDetail, previewImage, handleLike };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  });
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  function _sfc_render$a(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "love-container" }, [
      vue.createCommentVNode(" 排序选项 "),
      vue.createElementVNode("view", { class: "sort-bar" }, [
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["sort-item", { active: $setup.sortType === "time" }]),
            onClick: _cache[0] || (_cache[0] = ($event) => $setup.changeSort("time"))
          },
          " 最新 ",
          2
          /* CLASS */
        ),
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["sort-item", { active: $setup.sortType === "hot" }]),
            onClick: _cache[1] || (_cache[1] = ($event) => $setup.changeSort("hot"))
          },
          " 最热 ",
          2
          /* CLASS */
        )
      ]),
      vue.createCommentVNode(" 帖子列表 "),
      vue.createElementVNode("scroll-view", {
        class: "post-list",
        "scroll-y": "",
        onScrollToLower: $setup.loadMore,
        "refresher-enabled": "",
        "refresher-triggered": $setup.isRefreshing,
        onRefresherRefresh: $setup.refresh
      }, [
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($setup.posts, (post) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              class: "post-item",
              key: post.id,
              onClick: ($event) => $setup.goToDetail(post.id)
            }, [
              vue.createCommentVNode(" 用户信息 "),
              vue.createElementVNode("view", { class: "post-header" }, [
                vue.createElementVNode("image", {
                  class: "avatar",
                  src: post.user && post.user.avatar ? `http://192.168.100.101:8080${post.user.avatar}` : "/static/default-avatar.png",
                  mode: "aspectFill"
                }, null, 8, ["src"]),
                vue.createElementVNode("view", { class: "user-info" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "username" },
                    vue.toDisplayString(post.user ? post.user.name : "匿名用户"),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    { class: "time" },
                    vue.toDisplayString($setup.formatTime(post.createTime)),
                    1
                    /* TEXT */
                  )
                ])
              ]),
              vue.createCommentVNode(" 帖子内容 "),
              vue.createElementVNode(
                "view",
                { class: "post-content" },
                vue.toDisplayString(post.content),
                1
                /* TEXT */
              ),
              vue.createCommentVNode(" 图片展示 "),
              post.images && post.images.length ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 0,
                class: "image-list"
              }, [
                (vue.openBlock(true), vue.createElementBlock(
                  vue.Fragment,
                  null,
                  vue.renderList(post.images, (img, index) => {
                    return vue.openBlock(), vue.createElementBlock("image", {
                      key: index,
                      src: img,
                      mode: "aspectFill",
                      onClick: vue.withModifiers(($event) => $setup.previewImage(post.images, index), ["stop"])
                    }, null, 8, ["src", "onClick"]);
                  }),
                  128
                  /* KEYED_FRAGMENT */
                ))
              ])) : vue.createCommentVNode("v-if", true),
              vue.createCommentVNode(" 互动信息 "),
              vue.createElementVNode("view", { class: "post-footer" }, [
                vue.createElementVNode("view", {
                  class: "action",
                  onClick: vue.withModifiers(($event) => $setup.handleLike(post), ["stop"])
                }, [
                  vue.createElementVNode(
                    "text",
                    {
                      class: vue.normalizeClass({ active: post.isLiked })
                    },
                    "❤",
                    2
                    /* CLASS */
                  ),
                  vue.createElementVNode(
                    "text",
                    null,
                    vue.toDisplayString(post.likeCount || 0),
                    1
                    /* TEXT */
                  )
                ], 8, ["onClick"]),
                vue.createElementVNode("view", { class: "action" }, [
                  vue.createElementVNode("text", null, "💬"),
                  vue.createElementVNode(
                    "text",
                    null,
                    vue.toDisplayString(post.commentCount || 0),
                    1
                    /* TEXT */
                  )
                ])
              ])
            ], 8, ["onClick"]);
          }),
          128
          /* KEYED_FRAGMENT */
        )),
        vue.createCommentVNode(" 加载更多 "),
        $setup.loading ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "loading"
        }, "加载中...")) : vue.createCommentVNode("v-if", true),
        $setup.noMore ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 1,
          class: "no-more"
        }, "没有更多了")) : vue.createCommentVNode("v-if", true)
      ], 40, ["refresher-triggered"]),
      vue.createCommentVNode(" 发帖按钮 "),
      vue.createElementVNode("view", {
        class: "post-btn",
        onClick: $setup.goToPost
      }, [
        vue.createElementVNode("text", null, "＋")
      ])
    ]);
  }
  const PagesLoveIndex = /* @__PURE__ */ _export_sfc(_sfc_main$a, [["render", _sfc_render$a], ["__scopeId", "data-v-0a5aaf4a"], ["__file", "C:/Users/m1950/Desktop/apap/pages/love/index.vue"]]);
  const _sfc_main$9 = {
    __name: "detail",
    setup(__props, { expose: __expose }) {
      __expose();
      const postId = vue.ref("");
      const post = vue.ref({});
      const comments = vue.ref([]);
      const commentContent = vue.ref("");
      const replyTo = vue.ref(null);
      const handleAuthError = () => {
        uni.showToast({
          title: "请重新登录",
          icon: "none"
        });
        uni.removeStorageSync("token");
        setTimeout(() => {
          uni.navigateTo({
            url: "/pages/login/index"
          });
        }, 1500);
      };
      const getPageParams = () => {
        var _a;
        const pages = getCurrentPages();
        if (pages.length > 0) {
          const currentPage = pages[pages.length - 1];
          const options = ((_a = currentPage.$page) == null ? void 0 : _a.options) || currentPage.options;
          if (options && options.id) {
            postId.value = options.id;
            getPostDetail();
            getComments();
          } else {
            uni.showToast({
              title: "参数错误",
              icon: "none"
            });
            setTimeout(() => {
              uni.navigateBack();
            }, 1500);
          }
        }
      };
      const getPostDetail = () => {
        const token = uni.getStorageSync("token");
        if (!token) {
          handleAuthError();
          return;
        }
        uni.request({
          url: `http://192.168.100.101:8080/api/posts/${postId.value}`,
          method: "GET",
          header: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Device-Type": "APP",
            "Authorization": `Bearer ${token}`
          },
          success: (response) => {
            var _a, _b;
            if (response.statusCode === 200 && response.data.code === 200) {
              const postData = response.data.data;
              post.value = {
                ...postData,
                name: ((_a = postData.user) == null ? void 0 : _a.name) || "匿名用户",
                avatar: ((_b = postData.user) == null ? void 0 : _b.avatar) ? `http://192.168.100.101:8080/api${postData.user.avatar}` : "/static/default-avatar.png",
                images: (postData.images || []).map((img) => `http://192.168.100.101:8080/api${img}`)
              };
            } else if (response.statusCode === 403) {
              handleAuthError();
            } else {
              uni.showToast({
                title: response.data.message || "加载失败",
                icon: "none"
              });
            }
          },
          fail: (error) => {
            formatAppLog("error", "at pages/post/detail.vue:181", "获取帖子详情失败：", error);
            uni.showToast({
              title: "网络错误，请稍后重试",
              icon: "none"
            });
          }
        });
      };
      const getComments = () => {
        const token = uni.getStorageSync("token");
        if (!token) {
          handleAuthError();
          return;
        }
        uni.request({
          url: `http://192.168.100.101:8080/api/posts/${postId.value}/comments`,
          method: "GET",
          header: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Device-Type": "APP",
            "Authorization": `Bearer ${token}`
          },
          success: (response) => {
            formatAppLog("log", "at pages/post/detail.vue:208", "评论数据：", response.data);
            if (response.statusCode === 200 && response.data.code === 200) {
              comments.value = response.data.data.map((comment) => {
                var _a, _b;
                return {
                  ...comment,
                  name: ((_a = comment.author) == null ? void 0 : _a.name) || "匿名用户",
                  // 改为 author
                  avatar: ((_b = comment.author) == null ? void 0 : _b.avatar) ? `http://192.168.100.101:8080/api${comment.author.avatar}` : "/static/default-avatar.png",
                  // 改为 author
                  replies: (comment.replies || []).map((reply) => {
                    var _a2, _b2;
                    return {
                      ...reply,
                      name: ((_a2 = reply.author) == null ? void 0 : _a2.name) || "匿名用户",
                      // 改为 author
                      replyToName: ((_b2 = reply.replyTo) == null ? void 0 : _b2.name) || "匿名用户"
                    };
                  })
                };
              });
            } else if (response.statusCode === 403) {
              handleAuthError();
            } else {
              uni.showToast({
                title: response.data.message || "加载失败",
                icon: "none"
              });
            }
          },
          fail: (error) => {
            formatAppLog("error", "at pages/post/detail.vue:230", "获取评论列表失败：", error);
            uni.showToast({
              title: "网络错误，请稍后重试",
              icon: "none"
            });
          }
        });
      };
      const submitComment = () => {
        var _a;
        if (!commentContent.value.trim()) {
          uni.showToast({
            title: "请输入评论内容",
            icon: "none"
          });
          return;
        }
        const token = uni.getStorageSync("token");
        if (!token) {
          handleAuthError();
          return;
        }
        uni.request({
          url: `http://192.168.100.101:8080/api/posts/${postId.value}/comments`,
          method: "POST",
          header: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Device-Type": "APP",
            "Authorization": `Bearer ${token}`
          },
          data: {
            content: commentContent.value,
            replyTo: (_a = replyTo.value) == null ? void 0 : _a.id
          },
          success: (response) => {
            if (response.statusCode === 200 && response.data.code === 200) {
              uni.showToast({
                title: "评论成功",
                icon: "success"
              });
              commentContent.value = "";
              replyTo.value = null;
              getComments();
              getPostDetail();
            } else if (response.statusCode === 403) {
              handleAuthError();
            } else {
              uni.showToast({
                title: response.data.message || "评论失败",
                icon: "none"
              });
            }
          },
          fail: (error) => {
            formatAppLog("error", "at pages/post/detail.vue:287", "提交评论失败：", error);
            uni.showToast({
              title: "网络错误，请稍后重试",
              icon: "none"
            });
          }
        });
      };
      const handleReply = (comment) => {
        replyTo.value = comment;
      };
      const handleLike = () => {
        const token = uni.getStorageSync("token");
        if (!token) {
          handleAuthError();
          return;
        }
        uni.request({
          url: `http://192.168.100.101:8080/api/posts/${postId.value}/like`,
          method: "POST",
          header: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Device-Type": "APP",
            "Authorization": `Bearer ${token}`
          },
          success: (response) => {
            if (response.statusCode === 200 && response.data.code === 200) {
              post.value.isLiked = !post.value.isLiked;
              post.value.likeCount = post.value.isLiked ? post.value.likeCount + 1 : post.value.likeCount - 1;
            } else if (response.statusCode === 403) {
              handleAuthError();
            } else {
              uni.showToast({
                title: response.data.message || "操作失败",
                icon: "none"
              });
            }
          },
          fail: (error) => {
            formatAppLog("error", "at pages/post/detail.vue:334", "点赞失败：", error);
            uni.showToast({
              title: "网络错误，请稍后重试",
              icon: "none"
            });
          }
        });
      };
      const previewImage = (urls, current) => {
        uni.previewImage({
          urls,
          current: urls[current]
        });
      };
      const formatTime = (timestamp) => {
        if (!timestamp)
          return "";
        const now = (/* @__PURE__ */ new Date()).getTime();
        const diff = now - new Date(timestamp).getTime();
        if (diff < 6e4)
          return "刚刚";
        if (diff < 36e5)
          return `${Math.floor(diff / 6e4)}分钟前`;
        if (diff < 864e5)
          return `${Math.floor(diff / 36e5)}小时前`;
        if (diff < 2592e6)
          return `${Math.floor(diff / 864e5)}天前`;
        const date = new Date(timestamp);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      };
      vue.onMounted(() => {
        getPageParams();
      });
      const __returned__ = { postId, post, comments, commentContent, replyTo, handleAuthError, getPageParams, getPostDetail, getComments, submitComment, handleReply, handleLike, previewImage, formatTime, ref: vue.ref, onMounted: vue.onMounted };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$9(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "detail-container" }, [
      vue.createCommentVNode(" 帖子内容 "),
      vue.createElementVNode("view", { class: "post-content" }, [
        vue.createElementVNode("view", { class: "post-header" }, [
          vue.createElementVNode("image", {
            class: "avatar",
            src: $setup.post.avatar,
            mode: "aspectFill"
          }, null, 8, ["src"]),
          vue.createElementVNode("view", { class: "user-info" }, [
            vue.createElementVNode(
              "text",
              { class: "username" },
              vue.toDisplayString($setup.post.name),
              1
              /* TEXT */
            ),
            vue.createElementVNode(
              "text",
              { class: "time" },
              vue.toDisplayString($setup.formatTime($setup.post.createTime)),
              1
              /* TEXT */
            )
          ])
        ]),
        vue.createElementVNode(
          "view",
          { class: "content-text" },
          vue.toDisplayString($setup.post.content),
          1
          /* TEXT */
        ),
        $setup.post.images && $setup.post.images.length ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "image-list"
        }, [
          vue.createElementVNode(
            "view",
            {
              class: vue.normalizeClass(["image-grid", [`grid-${$setup.post.images.length}`]])
            },
            [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($setup.post.images, (img, index) => {
                  return vue.openBlock(), vue.createElementBlock("image", {
                    key: index,
                    src: img,
                    mode: "aspectFill",
                    onClick: ($event) => $setup.previewImage($setup.post.images, index),
                    class: "grid-image"
                  }, null, 8, ["src", "onClick"]);
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ],
            2
            /* CLASS */
          )
        ])) : vue.createCommentVNode("v-if", true),
        vue.createElementVNode("view", { class: "post-footer" }, [
          vue.createElementVNode("view", {
            class: "action",
            onClick: $setup.handleLike
          }, [
            vue.createElementVNode(
              "text",
              {
                class: vue.normalizeClass(["icon-font", { active: $setup.post.isLiked }])
              },
              "❤",
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "text",
              null,
              vue.toDisplayString($setup.post.likeCount || 0),
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode("view", { class: "action" }, [
            vue.createElementVNode("text", { class: "icon-font" }, "💬"),
            vue.createElementVNode(
              "text",
              null,
              vue.toDisplayString($setup.post.commentCount || 0),
              1
              /* TEXT */
            )
          ])
        ])
      ]),
      vue.createCommentVNode(" 评论列表 "),
      vue.createElementVNode("view", { class: "comment-list" }, [
        vue.createElementVNode(
          "view",
          { class: "comment-title" },
          "评论 " + vue.toDisplayString($setup.post.commentCount || 0),
          1
          /* TEXT */
        ),
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($setup.comments, (comment) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              class: "comment-item",
              key: comment.id
            }, [
              vue.createElementVNode("image", {
                class: "avatar",
                src: comment.avatar,
                mode: "aspectFill"
              }, null, 8, ["src"]),
              vue.createElementVNode("view", { class: "comment-right" }, [
                vue.createElementVNode("view", { class: "comment-info" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "username" },
                    vue.toDisplayString(comment.name),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    { class: "time" },
                    vue.toDisplayString($setup.formatTime(comment.createTime)),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode(
                  "view",
                  { class: "comment-content" },
                  vue.toDisplayString(comment.content),
                  1
                  /* TEXT */
                ),
                vue.createCommentVNode(" 回复列表 "),
                comment.replies && comment.replies.length ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 0,
                  class: "reply-list"
                }, [
                  (vue.openBlock(true), vue.createElementBlock(
                    vue.Fragment,
                    null,
                    vue.renderList(comment.replies, (reply) => {
                      return vue.openBlock(), vue.createElementBlock("view", {
                        class: "reply-item",
                        key: reply.id
                      }, [
                        vue.createElementVNode(
                          "text",
                          { class: "reply-username" },
                          vue.toDisplayString(reply.name),
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode("text", { class: "reply-text" }, "回复"),
                        vue.createElementVNode(
                          "text",
                          { class: "reply-to" },
                          vue.toDisplayString(reply.replyToName) + "：",
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode(
                          "text",
                          { class: "reply-content" },
                          vue.toDisplayString(reply.content),
                          1
                          /* TEXT */
                        )
                      ]);
                    }),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])) : vue.createCommentVNode("v-if", true),
                vue.createElementVNode("view", { class: "comment-actions" }, [
                  vue.createElementVNode("text", {
                    onClick: ($event) => $setup.handleReply(comment)
                  }, "回复", 8, ["onClick"])
                ])
              ])
            ]);
          }),
          128
          /* KEYED_FRAGMENT */
        )),
        !$setup.comments.length ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "no-comment"
        }, "暂无评论")) : vue.createCommentVNode("v-if", true)
      ]),
      vue.createCommentVNode(" 评论输入框 "),
      vue.createElementVNode("view", { class: "comment-input" }, [
        vue.withDirectives(vue.createElementVNode("input", {
          class: "input",
          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.commentContent = $event),
          placeholder: $setup.replyTo ? `回复 ${$setup.replyTo.name}` : "说点什么...",
          onConfirm: $setup.submitComment
        }, null, 40, ["placeholder"]), [
          [vue.vModelText, $setup.commentContent]
        ]),
        vue.createElementVNode("button", {
          class: "send-btn",
          disabled: !$setup.commentContent.trim(),
          onClick: $setup.submitComment
        }, "发送", 8, ["disabled"])
      ])
    ]);
  }
  const PagesPostDetail = /* @__PURE__ */ _export_sfc(_sfc_main$9, [["render", _sfc_render$9], ["__scopeId", "data-v-b14daf57"], ["__file", "C:/Users/m1950/Desktop/apap/pages/post/detail.vue"]]);
  const _sfc_main$8 = {
    __name: "create",
    setup(__props, { expose: __expose }) {
      __expose();
      const postTypes = [
        { id: "love", name: "表白墙" },
        { id: "market", name: "二手交易" },
        { id: "job", name: "兼职信息" }
      ];
      const selectedType = vue.ref({});
      const content = vue.ref("");
      const images = vue.ref([]);
      const isSubmitting = vue.ref(false);
      const handleTypeChange = (e) => {
        selectedType.value = postTypes[e.detail.value];
      };
      const chooseImage = () => {
        uni.chooseImage({
          count: 9 - images.value.length,
          sizeType: ["compressed"],
          sourceType: ["album", "camera"],
          success: (res) => {
            images.value = [...images.value, ...res.tempFilePaths];
          },
          fail: (err) => {
            uni.showToast({
              title: "选择图片失败",
              icon: "none"
            });
          }
        });
      };
      const deleteImage = (index) => {
        images.value.splice(index, 1);
      };
      const validateForm = () => {
        if (!selectedType.value.id) {
          uni.showToast({
            title: "请选择发布类型",
            icon: "none"
          });
          return false;
        }
        if (!content.value.trim()) {
          uni.showToast({
            title: "请输入内容",
            icon: "none"
          });
          return false;
        }
        return true;
      };
      const uploadImage = (filePath) => {
        return new Promise((resolve, reject) => {
          const token = uni.getStorageSync("token");
          if (!token) {
            reject(new Error("请先登录"));
            return;
          }
          uni.uploadFile({
            url: "http://192.168.100.101:8080/api/upload/image",
            // 修改为正确的接口路径
            filePath,
            name: "file",
            header: {
              "Authorization": `Bearer ${token}`
            },
            success: (res) => {
              formatAppLog("log", "at pages/post/create.vue:140", "上传响应：", res);
              try {
                const data = JSON.parse(res.data);
                if (data.code === 200) {
                  resolve(data.data);
                } else {
                  reject(new Error(data.message || "图片上传失败"));
                }
              } catch (e) {
                formatAppLog("error", "at pages/post/create.vue:149", "解析响应失败：", e, res.data);
                reject(new Error("图片上传响应解析失败"));
              }
            },
            fail: (err) => {
              formatAppLog("error", "at pages/post/create.vue:154", "上传失败：", err);
              reject(new Error("图片上传失败：" + err.errMsg));
            }
          });
        });
      };
      const createPost = (postData) => {
        return new Promise((resolve, reject) => {
          const token = uni.getStorageSync("token");
          if (!token) {
            reject(new Error("请先登录"));
            return;
          }
          uni.request({
            url: "http://192.168.100.101:8080/api/posts",
            method: "POST",
            header: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            data: postData,
            success: (response) => {
              if (response.statusCode === 200 && response.data.code === 200) {
                resolve(response.data.data);
              } else if (response.statusCode === 403) {
                reject(new Error(" 403"));
              } else {
                reject(new Error(response.data.message || "发布失败"));
              }
            },
            fail: (error) => reject(new Error("网络错误，请稍后重试"))
          });
        });
      };
      const handleSubmit = async () => {
        if (!validateForm())
          return;
        isSubmitting.value = true;
        uni.showLoading({ title: "发布中..." });
        try {
          const token = uni.getStorageSync("token");
          if (!token) {
            throw new Error("请先登录");
          }
          const uploadedImages = [];
          if (images.value.length > 0) {
            uni.showLoading({ title: "上传图片中..." });
            for (let image of images.value) {
              try {
                const imageUrl = await uploadImage(image);
                uploadedImages.push(imageUrl);
              } catch (error) {
                formatAppLog("error", "at pages/post/create.vue:216", "图片上传失败：", error);
                throw new Error("图片上传失败，请重试");
              }
            }
          }
          const postData = {
            type: selectedType.value.id,
            content: content.value,
            images: uploadedImages
          };
          await createPost(postData);
          uni.hideLoading();
          uni.showToast({
            title: "发布成功",
            icon: "success",
            success: () => {
              uni.$emit("post-created");
              setTimeout(() => {
                uni.navigateBack();
              }, 1500);
            }
          });
        } catch (error) {
          formatAppLog("error", "at pages/post/create.vue:245", "发布失败：", error);
          uni.hideLoading();
          if (error.message.includes("登录")) {
            uni.showToast({
              title: error.message,
              icon: "none",
              success: () => {
                setTimeout(() => {
                  uni.navigateTo({
                    url: "/pages/login/index"
                  });
                }, 1500);
              }
            });
          } else {
            uni.showToast({
              title: error.message || "发布失败，请重试",
              icon: "none"
            });
          }
        } finally {
          isSubmitting.value = false;
        }
      };
      const __returned__ = { postTypes, selectedType, content, images, isSubmitting, handleTypeChange, chooseImage, deleteImage, validateForm, uploadImage, createPost, handleSubmit, ref: vue.ref };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$8(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "post-container" }, [
      vue.createCommentVNode(" 帖子类型选择 "),
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.createElementVNode(
          "picker",
          {
            mode: "selector",
            range: $setup.postTypes,
            "range-key": "name",
            onChange: $setup.handleTypeChange
          },
          [
            vue.createElementVNode("view", { class: "type-picker" }, [
              vue.createElementVNode(
                "text",
                null,
                vue.toDisplayString($setup.selectedType.name || "选择类型"),
                1
                /* TEXT */
              ),
              vue.createElementVNode("text", { class: "arrow" }, ">")
            ])
          ],
          32
          /* NEED_HYDRATION */
        )
      ]),
      vue.createCommentVNode(" 帖子内容 "),
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.withDirectives(vue.createElementVNode(
          "textarea",
          {
            class: "content-input",
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.content = $event),
            placeholder: "说点什么吧...",
            maxlength: "500"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $setup.content]
        ]),
        vue.createElementVNode(
          "view",
          { class: "word-count" },
          vue.toDisplayString($setup.content.length) + "/500",
          1
          /* TEXT */
        )
      ]),
      vue.createCommentVNode(" 图片上传 "),
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.createElementVNode("view", { class: "image-list" }, [
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($setup.images, (image, index) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                class: "image-item",
                key: index
              }, [
                vue.createElementVNode("image", {
                  src: image,
                  mode: "aspectFill"
                }, null, 8, ["src"]),
                vue.createElementVNode("text", {
                  class: "delete-btn",
                  onClick: ($event) => $setup.deleteImage(index)
                }, "×", 8, ["onClick"])
              ]);
            }),
            128
            /* KEYED_FRAGMENT */
          )),
          $setup.images.length < 9 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "upload-btn",
            onClick: $setup.chooseImage
          }, [
            vue.createElementVNode("text", { class: "plus" }, "+")
          ])) : vue.createCommentVNode("v-if", true)
        ])
      ]),
      vue.createCommentVNode(" 发布按钮 "),
      vue.createElementVNode("button", {
        class: "submit-btn",
        onClick: $setup.handleSubmit,
        disabled: $setup.isSubmitting
      }, vue.toDisplayString($setup.isSubmitting ? "发布中..." : "发布"), 9, ["disabled"])
    ]);
  }
  const PagesPostCreate = /* @__PURE__ */ _export_sfc(_sfc_main$8, [["render", _sfc_render$8], ["__scopeId", "data-v-4a9252c8"], ["__file", "C:/Users/m1950/Desktop/apap/pages/post/create.vue"]]);
  const _sfc_main$7 = {
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const posts = vue.ref([]);
      const page = vue.ref(1);
      const loading = vue.ref(false);
      const noMore = vue.ref(false);
      const isRefreshing = vue.ref(false);
      const sortType = vue.ref("time");
      const handleAuthError = () => {
        uni.showToast({
          title: "请重新登录",
          icon: "none"
        });
        uni.removeStorageSync("token");
        setTimeout(() => {
          uni.navigateTo({
            url: "/pages/login/index"
          });
        }, 1500);
      };
      const getPosts = () => {
        if (loading.value)
          return;
        loading.value = true;
        uni.request({
          url: "http://192.168.100.101:8080/api/posts",
          method: "GET",
          header: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Device-Type": "APP",
            "Authorization": `Bearer ${uni.getStorageSync("token")}`
          },
          data: {
            type: "market",
            page: page.value,
            pageSize: 10,
            sortBy: sortType.value
          },
          timeout: 1e4,
          dataType: "json",
          success: (response) => {
            formatAppLog("log", "at pages/market/index.vue:130", "获取帖子列表响应：", response);
            if (response.statusCode === 200 && response.data.code === 200) {
              const { list, total } = response.data.data;
              const processedList = list.map((post) => {
                const user = post.user || {};
                return {
                  ...post,
                  user: {
                    ...user,
                    avatar: user.avatar ? `http://192.168.100.101:8080/api${user.avatar}` : "/static/default-avatar.png",
                    name: user.name || "匿名用户"
                  },
                  content: post.content || "",
                  images: (post.images || []).map((img) => `http://192.168.100.101:8080/api${img}`),
                  likeCount: post.likeCount || 0,
                  commentCount: post.commentCount || 0,
                  isLiked: !!post.isLiked
                };
              });
              if (page.value === 1) {
                posts.value = processedList;
              } else {
                posts.value = [...posts.value, ...processedList];
              }
              noMore.value = posts.value.length >= total;
            } else if (response.statusCode === 403) {
              handleAuthError();
            } else {
              uni.showToast({
                title: response.data.message || "加载失败",
                icon: "none"
              });
            }
          },
          fail: (error) => {
            formatAppLog("error", "at pages/market/index.vue:167", "获取帖子列表失败：", error);
            uni.showToast({
              title: "网络错误，请稍后重试",
              icon: "none"
            });
          },
          complete: () => {
            loading.value = false;
            isRefreshing.value = false;
          }
        });
      };
      const changeSort = (type) => {
        if (sortType.value === type)
          return;
        sortType.value = type;
        page.value = 1;
        noMore.value = false;
        getPosts();
      };
      const refresh = () => {
        page.value = 1;
        noMore.value = false;
        isRefreshing.value = true;
        getPosts();
      };
      const loadMore = () => {
        if (noMore.value || loading.value)
          return;
        page.value++;
        getPosts();
      };
      const goToPost = () => {
        const token = uni.getStorageSync("token");
        if (!token) {
          handleAuthError();
          return;
        }
        uni.navigateTo({
          url: "/pages/post/create?type=market"
        });
      };
      const goToDetail = (id) => {
        uni.navigateTo({
          url: `/pages/post/detail?id=${id}`
        });
      };
      const previewImage = (urls, current) => {
        uni.previewImage({
          urls,
          current: urls[current]
        });
      };
      const handleLike = (post) => {
        const token = uni.getStorageSync("token");
        if (!token) {
          handleAuthError();
          return;
        }
        uni.request({
          url: `http://192.168.100.101:8080/api/posts/${post.id}/like`,
          method: "POST",
          header: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Device-Type": "APP",
            "Authorization": `Bearer ${token}`
          },
          timeout: 1e4,
          dataType: "json",
          success: (response) => {
            formatAppLog("log", "at pages/market/index.vue:252", "点赞响应：", response);
            if (response.statusCode === 200 && response.data.code === 200) {
              post.isLiked = !post.isLiked;
              post.likeCount = post.isLiked ? post.likeCount + 1 : post.likeCount - 1;
            } else if (response.statusCode === 403) {
              handleAuthError();
            } else {
              uni.showToast({
                title: response.data.message || "操作失败",
                icon: "none"
              });
            }
          },
          fail: (error) => {
            formatAppLog("error", "at pages/market/index.vue:268", "点赞失败：", error);
            uni.showToast({
              title: "网络错误，请稍后重试",
              icon: "none"
            });
          }
        });
      };
      const formatTime = (timestamp) => {
        if (!timestamp)
          return "";
        const now = (/* @__PURE__ */ new Date()).getTime();
        const diff = now - new Date(timestamp).getTime();
        if (diff < 6e4)
          return "刚刚";
        if (diff < 36e5)
          return `${Math.floor(diff / 6e4)}分钟前`;
        if (diff < 864e5)
          return `${Math.floor(diff / 36e5)}小时前`;
        if (diff < 2592e6)
          return `${Math.floor(diff / 864e5)}天前`;
        const date = new Date(timestamp);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      };
      vue.onMounted(() => {
        getPosts();
      });
      const __returned__ = { posts, page, loading, noMore, isRefreshing, sortType, handleAuthError, getPosts, changeSort, refresh, loadMore, goToPost, goToDetail, previewImage, handleLike, formatTime, ref: vue.ref, onMounted: vue.onMounted };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$7(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "market-container" }, [
      vue.createCommentVNode(" 排序选项 "),
      vue.createElementVNode("view", { class: "sort-bar" }, [
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["sort-item", { active: $setup.sortType === "time" }]),
            onClick: _cache[0] || (_cache[0] = ($event) => $setup.changeSort("time"))
          },
          " 最新 ",
          2
          /* CLASS */
        ),
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["sort-item", { active: $setup.sortType === "hot" }]),
            onClick: _cache[1] || (_cache[1] = ($event) => $setup.changeSort("hot"))
          },
          " 最热 ",
          2
          /* CLASS */
        )
      ]),
      vue.createCommentVNode(" 帖子列表 "),
      vue.createElementVNode("scroll-view", {
        class: "post-list",
        "scroll-y": "",
        onScrollToLower: $setup.loadMore,
        "refresher-enabled": "",
        "refresher-triggered": $setup.isRefreshing,
        onRefresherRefresh: $setup.refresh
      }, [
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($setup.posts, (post) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              class: "post-item",
              key: post.id,
              onClick: ($event) => $setup.goToDetail(post.id)
            }, [
              vue.createCommentVNode(" 用户信息 "),
              vue.createElementVNode("view", { class: "post-header" }, [
                vue.createElementVNode("image", {
                  class: "avatar",
                  src: post.user && post.user.avatar ? post.user.avatar : "/static/default-avatar.png",
                  mode: "aspectFill"
                }, null, 8, ["src"]),
                vue.createElementVNode("view", { class: "user-info" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "username" },
                    vue.toDisplayString(post.user ? post.user.name : "匿名用户"),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    { class: "time" },
                    vue.toDisplayString($setup.formatTime(post.createTime)),
                    1
                    /* TEXT */
                  )
                ])
              ]),
              vue.createCommentVNode(" 帖子内容 "),
              vue.createElementVNode(
                "view",
                { class: "post-content" },
                vue.toDisplayString(post.content),
                1
                /* TEXT */
              ),
              vue.createCommentVNode(" 图片展示 "),
              post.images && post.images.length ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 0,
                class: "image-list"
              }, [
                (vue.openBlock(true), vue.createElementBlock(
                  vue.Fragment,
                  null,
                  vue.renderList(post.images, (img, index) => {
                    return vue.openBlock(), vue.createElementBlock("image", {
                      key: index,
                      src: img,
                      mode: "widthFix",
                      onClick: vue.withModifiers(($event) => $setup.previewImage(post.images, index), ["stop"])
                    }, null, 8, ["src", "onClick"]);
                  }),
                  128
                  /* KEYED_FRAGMENT */
                ))
              ])) : vue.createCommentVNode("v-if", true),
              vue.createCommentVNode(" 互动信息 "),
              vue.createElementVNode("view", { class: "post-footer" }, [
                vue.createElementVNode("view", {
                  class: "action",
                  onClick: vue.withModifiers(($event) => $setup.handleLike(post), ["stop"])
                }, [
                  vue.createElementVNode(
                    "text",
                    {
                      class: vue.normalizeClass(["icon-font", { active: post.isLiked }])
                    },
                    "❤",
                    2
                    /* CLASS */
                  ),
                  vue.createElementVNode(
                    "text",
                    null,
                    vue.toDisplayString(post.likeCount || 0),
                    1
                    /* TEXT */
                  )
                ], 8, ["onClick"]),
                vue.createElementVNode("view", { class: "action" }, [
                  vue.createElementVNode("text", { class: "icon-font" }, "💬"),
                  vue.createElementVNode(
                    "text",
                    null,
                    vue.toDisplayString(post.commentCount || 0),
                    1
                    /* TEXT */
                  )
                ])
              ])
            ], 8, ["onClick"]);
          }),
          128
          /* KEYED_FRAGMENT */
        )),
        vue.createCommentVNode(" 加载更多 "),
        $setup.loading ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "loading"
        }, "加载中...")) : vue.createCommentVNode("v-if", true),
        $setup.noMore ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 1,
          class: "no-more"
        }, "没有更多了")) : vue.createCommentVNode("v-if", true)
      ], 40, ["refresher-triggered"]),
      vue.createCommentVNode(" 发帖按钮 "),
      vue.createElementVNode("view", {
        class: "post-btn",
        onClick: $setup.goToPost
      }, [
        vue.createElementVNode("text", { class: "icon-font" }, "+")
      ])
    ]);
  }
  const PagesMarketIndex = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["render", _sfc_render$7], ["__scopeId", "data-v-3ddaf6af"], ["__file", "C:/Users/m1950/Desktop/apap/pages/market/index.vue"]]);
  const _sfc_main$6 = {
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const posts = vue.ref([]);
      const page = vue.ref(1);
      const loading = vue.ref(false);
      const noMore = vue.ref(false);
      const isRefreshing = vue.ref(false);
      const sortType = vue.ref("time");
      const handleAuthError = () => {
        uni.showToast({
          title: "请重新登录",
          icon: "none"
        });
        uni.removeStorageSync("token");
        setTimeout(() => {
          uni.navigateTo({
            url: "/pages/login/index"
          });
        }, 1500);
      };
      const getPosts = () => {
        if (loading.value)
          return;
        loading.value = true;
        uni.request({
          url: "http://192.168.100.101:8080/api/posts",
          method: "GET",
          header: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Device-Type": "APP",
            "Authorization": `Bearer ${uni.getStorageSync("token")}`
          },
          data: {
            type: "job",
            page: page.value,
            pageSize: 10,
            sortBy: sortType.value
          },
          timeout: 1e4,
          dataType: "json",
          success: (response) => {
            formatAppLog("log", "at pages/job/index.vue:131", "获取帖子列表响应：", response);
            if (response.statusCode === 200 && response.data.code === 200) {
              const { list, total } = response.data.data;
              const processedList = list.map((post) => ({
                ...post,
                user: post.user || {},
                // 确保 user 对象存在
                content: post.content || "",
                images: post.images || [],
                likeCount: post.likeCount || 0,
                commentCount: post.commentCount || 0
              }));
              if (page.value === 1) {
                posts.value = processedList;
              } else {
                posts.value = [...posts.value, ...processedList];
              }
              noMore.value = posts.value.length >= total;
            } else if (response.statusCode === 403) {
              handleAuthError();
            } else {
              uni.showToast({
                title: response.data.message || "加载失败",
                icon: "none"
              });
            }
          },
          fail: (error) => {
            formatAppLog("error", "at pages/job/index.vue:160", "获取帖子列表失败：", error);
            uni.showToast({
              title: "网络错误，请稍后重试",
              icon: "none"
            });
          },
          complete: () => {
            loading.value = false;
            isRefreshing.value = false;
          }
        });
      };
      const changeSort = (type) => {
        if (sortType.value === type)
          return;
        sortType.value = type;
        page.value = 1;
        noMore.value = false;
        getPosts();
      };
      const refresh = () => {
        page.value = 1;
        noMore.value = false;
        isRefreshing.value = true;
        getPosts();
      };
      const loadMore = () => {
        if (noMore.value || loading.value)
          return;
        page.value++;
        getPosts();
      };
      const goToPost = () => {
        const token = uni.getStorageSync("token");
        if (!token) {
          handleAuthError();
          return;
        }
        uni.navigateTo({
          url: "/pages/post/create?type=job"
        });
      };
      const goToDetail = (id) => {
        uni.navigateTo({
          url: `/pages/post/detail?id=${id}`
        });
      };
      const previewImage = (urls, current) => {
        uni.previewImage({
          urls,
          current: urls[current]
        });
      };
      const handleLike = (post) => {
        const token = uni.getStorageSync("token");
        if (!token) {
          handleAuthError();
          return;
        }
        uni.request({
          url: `http://192.168.100.101:8080/api/posts/${post.id}/like`,
          method: "POST",
          header: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Device-Type": "APP",
            "Authorization": `Bearer ${token}`
          },
          timeout: 1e4,
          dataType: "json",
          success: (response) => {
            formatAppLog("log", "at pages/job/index.vue:245", "点赞响应：", response);
            if (response.statusCode === 200 && response.data.code === 200) {
              post.isLiked = !post.isLiked;
              post.likeCount = post.isLiked ? post.likeCount + 1 : post.likeCount - 1;
            } else if (response.statusCode === 403) {
              handleAuthError();
            } else {
              uni.showToast({
                title: response.data.message || "操作失败",
                icon: "none"
              });
            }
          },
          fail: (error) => {
            formatAppLog("error", "at pages/job/index.vue:261", "点赞失败：", error);
            uni.showToast({
              title: "网络错误，请稍后重试",
              icon: "none"
            });
          }
        });
      };
      const formatTime = (timestamp) => {
        if (!timestamp)
          return "";
        const now = (/* @__PURE__ */ new Date()).getTime();
        const diff = now - new Date(timestamp).getTime();
        if (diff < 6e4)
          return "刚刚";
        if (diff < 36e5)
          return `${Math.floor(diff / 6e4)}分钟前`;
        if (diff < 864e5)
          return `${Math.floor(diff / 36e5)}小时前`;
        if (diff < 2592e6)
          return `${Math.floor(diff / 864e5)}天前`;
        const date = new Date(timestamp);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      };
      vue.onMounted(() => {
        getPosts();
      });
      const __returned__ = { posts, page, loading, noMore, isRefreshing, sortType, handleAuthError, getPosts, changeSort, refresh, loadMore, goToPost, goToDetail, previewImage, handleLike, formatTime, ref: vue.ref, onMounted: vue.onMounted };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$6(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "job-container" }, [
      vue.createCommentVNode(" 排序选项 "),
      vue.createElementVNode("view", { class: "sort-bar" }, [
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["sort-item", { active: $setup.sortType === "time" }]),
            onClick: _cache[0] || (_cache[0] = ($event) => $setup.changeSort("time"))
          },
          " 最新 ",
          2
          /* CLASS */
        ),
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["sort-item", { active: $setup.sortType === "hot" }]),
            onClick: _cache[1] || (_cache[1] = ($event) => $setup.changeSort("hot"))
          },
          " 最热 ",
          2
          /* CLASS */
        )
      ]),
      vue.createCommentVNode(" 帖子列表 "),
      vue.createElementVNode("scroll-view", {
        class: "post-list",
        "scroll-y": "",
        onScrollToLower: $setup.loadMore,
        "refresher-enabled": "",
        "refresher-triggered": $setup.isRefreshing,
        onRefresherRefresh: $setup.refresh
      }, [
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($setup.posts, (post) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              class: "post-item",
              key: post.id,
              onClick: ($event) => $setup.goToDetail(post.id)
            }, [
              vue.createCommentVNode(" 用户信息 "),
              vue.createElementVNode("view", { class: "post-header" }, [
                vue.createElementVNode("image", {
                  class: "avatar",
                  src: post.user && post.user.avatar ? `http://192.168.100.101:8080/api${post.user.avatar}` : "/static/default-avatar.png",
                  mode: "aspectFill"
                }, null, 8, ["src"]),
                vue.createElementVNode("view", { class: "user-info" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "username" },
                    vue.toDisplayString(post.user ? post.user.name : "匿名用户"),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    { class: "time" },
                    vue.toDisplayString($setup.formatTime(post.createTime)),
                    1
                    /* TEXT */
                  )
                ])
              ]),
              vue.createCommentVNode(" 帖子内容 "),
              vue.createElementVNode(
                "view",
                { class: "post-content" },
                vue.toDisplayString(post.content),
                1
                /* TEXT */
              ),
              vue.createCommentVNode(" 图片展示 "),
              post.images && post.images.length ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 0,
                class: "image-list"
              }, [
                (vue.openBlock(true), vue.createElementBlock(
                  vue.Fragment,
                  null,
                  vue.renderList(post.images, (img, index) => {
                    return vue.openBlock(), vue.createElementBlock("image", {
                      key: index,
                      src: `http://192.168.100.101:8080${img}`,
                      mode: "aspectFill",
                      onClick: vue.withModifiers(($event) => $setup.previewImage(post.images.map((img2) => `http://192.168.100.101:8080${img2}`), index), ["stop"])
                    }, null, 8, ["src", "onClick"]);
                  }),
                  128
                  /* KEYED_FRAGMENT */
                ))
              ])) : vue.createCommentVNode("v-if", true),
              vue.createCommentVNode(" 互动信息 "),
              vue.createElementVNode("view", { class: "post-footer" }, [
                vue.createElementVNode("view", {
                  class: "action",
                  onClick: vue.withModifiers(($event) => $setup.handleLike(post), ["stop"])
                }, [
                  vue.createElementVNode(
                    "text",
                    {
                      class: vue.normalizeClass(["icon-font", { active: post.isLiked }])
                    },
                    "❤",
                    2
                    /* CLASS */
                  ),
                  vue.createElementVNode(
                    "text",
                    null,
                    vue.toDisplayString(post.likeCount || 0),
                    1
                    /* TEXT */
                  )
                ], 8, ["onClick"]),
                vue.createElementVNode("view", { class: "action" }, [
                  vue.createElementVNode("text", { class: "icon-font" }, "💬"),
                  vue.createElementVNode(
                    "text",
                    null,
                    vue.toDisplayString(post.commentCount || 0),
                    1
                    /* TEXT */
                  )
                ])
              ])
            ], 8, ["onClick"]);
          }),
          128
          /* KEYED_FRAGMENT */
        )),
        vue.createCommentVNode(" 加载更多 "),
        $setup.loading ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "loading"
        }, "加载中...")) : vue.createCommentVNode("v-if", true),
        $setup.noMore ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 1,
          class: "no-more"
        }, "没有更多了")) : vue.createCommentVNode("v-if", true)
      ], 40, ["refresher-triggered"]),
      vue.createCommentVNode(" 发帖按钮 "),
      vue.createElementVNode("view", {
        class: "post-btn",
        onClick: $setup.goToPost
      }, [
        vue.createElementVNode("text", { class: "icon-font" }, "+")
      ])
    ]);
  }
  const PagesJobIndex = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["render", _sfc_render$6], ["__scopeId", "data-v-a1d081eb"], ["__file", "C:/Users/m1950/Desktop/apap/pages/job/index.vue"]]);
  const _sfc_main$5 = {
    __name: "register",
    setup(__props, { expose: __expose }) {
      __expose();
      const grades = ["2020级", "2021级", "2022级", "2023级", "2024级"];
      const formData = vue.ref({
        studentId: "",
        // 学号
        password: "",
        // 密码
        confirmPassword: "",
        // 确认密码
        name: "",
        // 姓名
        major: "",
        // 专业
        grade: "",
        // 年级
        avatarPath: "",
        // 头像临时路径
        avatarUrl: ""
        // 头像预览URL
      });
      const isSubmitting = vue.ref(false);
      const chooseAvatar = () => {
        uni.chooseImage({
          count: 1,
          // 只选一张
          success: (res) => {
            formData.value.avatarPath = res.tempFilePaths[0];
            formData.value.avatarUrl = res.tempFilePaths[0];
          },
          fail: (err) => {
            formatAppLog("error", "at pages/user/register.vue:122", "选择头像失败：", err);
            uni.showToast({
              title: "选择头像失败",
              icon: "none"
            });
          }
        });
      };
      const handleGradeChange = (e) => {
        formData.value.grade = grades[e.detail.value];
      };
      const handleRegister = () => {
        if (!formData.value.studentId || !formData.value.password || !formData.value.name) {
          uni.showToast({
            title: "请填写必要信息",
            icon: "none"
          });
          return;
        }
        if (!formData.value.avatarPath) {
          uni.showToast({
            title: "请上传头像",
            icon: "none"
          });
          return;
        }
        if (!formData.value.major) {
          uni.showToast({
            title: "请输入专业",
            icon: "none"
          });
          return;
        }
        if (!formData.value.grade) {
          uni.showToast({
            title: "请选择年级",
            icon: "none"
          });
          return;
        }
        if (formData.value.password.length < 6) {
          uni.showToast({
            title: "密码至少6位",
            icon: "none"
          });
          return;
        }
        if (formData.value.password !== formData.value.confirmPassword) {
          uni.showToast({
            title: "两次密码不一致",
            icon: "none"
          });
          return;
        }
        isSubmitting.value = true;
        uni.uploadFile({
          url: "http://192.168.100.101:8080/api/register",
          filePath: formData.value.avatarPath,
          name: "file",
          header: {
            "Content-Type": "multipart/form-data"
            // 设置请求头
          },
          formData: {
            studentId: formData.value.studentId,
            password: formData.value.password,
            name: formData.value.name,
            major: formData.value.major,
            grade: formData.value.grade
          },
          success: (res) => {
            const result = JSON.parse(res.data);
            if (result.code === 200) {
              uni.showToast({
                title: "注册成功",
                icon: "success"
              });
              setTimeout(() => {
                uni.navigateTo({
                  url: "/pages/login/index"
                });
              }, 1500);
            } else {
              uni.showToast({
                title: result.message || "注册失败",
                icon: "none"
              });
            }
          },
          fail: (err) => {
            formatAppLog("error", "at pages/user/register.vue:220", "注册失败：", err);
            uni.showToast({
              title: "注册失败",
              icon: "none"
            });
          },
          complete: () => {
            isSubmitting.value = false;
          }
        });
      };
      const goToLogin = () => {
        uni.navigateTo({
          url: "/pages/login/index"
        });
      };
      const __returned__ = { grades, formData, isSubmitting, chooseAvatar, handleGradeChange, handleRegister, goToLogin, ref: vue.ref };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$5(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "register-container" }, [
      vue.createCommentVNode(" 头像上传 "),
      vue.createElementVNode("view", { class: "avatar-upload" }, [
        vue.createElementVNode("image", {
          class: "avatar",
          src: $setup.formData.avatarUrl || "/static/user_avatar.png",
          mode: "aspectFill",
          onClick: $setup.chooseAvatar
        }, null, 8, ["src"]),
        vue.createElementVNode("text", { class: "upload-text" }, "点击上传头像")
      ]),
      vue.createCommentVNode(" 表单内容 "),
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.createElementVNode("text", { class: "label" }, "学号"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            class: "input",
            type: "number",
            maxlength: "10",
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.formData.studentId = $event),
            placeholder: "请输入学号"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $setup.formData.studentId]
        ])
      ]),
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.createElementVNode("text", { class: "label" }, "姓名"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            class: "input",
            type: "text",
            maxlength: "10",
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $setup.formData.name = $event),
            placeholder: "请输入姓名"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $setup.formData.name]
        ])
      ]),
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.createElementVNode("text", { class: "label" }, "专业"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            class: "input",
            type: "text",
            maxlength: "20",
            "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $setup.formData.major = $event),
            placeholder: "请输入专业"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $setup.formData.major]
        ])
      ]),
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.createElementVNode("text", { class: "label" }, "年级"),
        vue.createElementVNode(
          "picker",
          {
            class: "picker",
            mode: "selector",
            range: $setup.grades,
            onChange: $setup.handleGradeChange
          },
          [
            vue.createElementVNode(
              "view",
              { class: "picker-text" },
              vue.toDisplayString($setup.formData.grade || "请选择年级"),
              1
              /* TEXT */
            )
          ],
          32
          /* NEED_HYDRATION */
        )
      ]),
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.createElementVNode("text", { class: "label" }, "密码"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            class: "input",
            type: "password",
            maxlength: "20",
            "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $setup.formData.password = $event),
            placeholder: "请输入密码（6-20位）"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $setup.formData.password]
        ])
      ]),
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.createElementVNode("text", { class: "label" }, "确认密码"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            class: "input",
            type: "password",
            maxlength: "20",
            "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $setup.formData.confirmPassword = $event),
            placeholder: "请再次输入密码"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $setup.formData.confirmPassword]
        ])
      ]),
      vue.createElementVNode("button", {
        class: "submit-btn",
        onClick: $setup.handleRegister,
        disabled: $setup.isSubmitting
      }, vue.toDisplayString($setup.isSubmitting ? "注册中..." : "注册"), 9, ["disabled"]),
      vue.createElementVNode("view", {
        class: "login-link",
        onClick: $setup.goToLogin
      }, " 已有账号？去登录 ")
    ]);
  }
  const PagesUserRegister = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["render", _sfc_render$5], ["__scopeId", "data-v-fd534bf9"], ["__file", "C:/Users/m1950/Desktop/apap/pages/user/register.vue"]]);
  const _sfc_main$4 = {
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const userInfo = vue.ref({});
      const isLoggedIn = vue.computed(() => {
        return !!userInfo.value.studentId;
      });
      const getUserInfo = () => {
        const token = uni.getStorageSync("token");
        if (!token) {
          userInfo.value = {};
          return;
        }
        const info = uni.getStorageSync("userInfo");
        if (info) {
          userInfo.value = info;
          userInfo.value.avatar = `http://192.168.100.101:8080/api${userInfo.value.avatar}`;
          formatAppLog("log", "at pages/user/index.vue:77", "用户信息:", userInfo.value);
        } else {
          formatAppLog("warn", "at pages/user/index.vue:79", "未找到用户信息");
        }
      };
      const goToMyPosts = (type) => {
        if (!isLoggedIn.value) {
          goToLogin();
          return;
        }
        uni.navigateTo({
          url: `/pages/user/posts?type=${type}`
        });
      };
      const goToMyCollections = () => {
        if (!isLoggedIn.value) {
          goToLogin();
          return;
        }
        uni.navigateTo({
          url: "/pages/user/collections"
        });
      };
      const goToSettings = () => {
        if (!isLoggedIn.value) {
          goToLogin();
          return;
        }
        uni.navigateTo({
          url: "/pages/user/settings"
        });
      };
      const goToLogin = () => {
        uni.navigateTo({
          url: "/pages/login/index"
        });
      };
      const handleLogout = () => {
        uni.showModal({
          title: "提示",
          content: "确定要退出登录吗？",
          success: (res) => {
            if (res.confirm) {
              uni.removeStorageSync("token");
              uni.removeStorageSync("userInfo");
              userInfo.value = {};
              uni.showToast({
                title: "已退出登录",
                icon: "success"
              });
            }
          }
        });
      };
      vue.onMounted(() => {
        getUserInfo();
      });
      const __returned__ = { userInfo, isLoggedIn, getUserInfo, goToMyPosts, goToMyCollections, goToSettings, goToLogin, handleLogout, ref: vue.ref, onMounted: vue.onMounted, computed: vue.computed };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$4(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "user-container" }, [
      vue.createCommentVNode(" 用户信息卡片 "),
      vue.createElementVNode("view", { class: "user-card" }, [
        vue.createElementVNode("view", { class: "user-info" }, [
          vue.createElementVNode("image", {
            class: "avatar",
            src: $setup.userInfo.avatar ? $setup.userInfo.avatar : "/static/user_avatar.png",
            mode: "aspectFill "
          }, null, 8, ["src"]),
          vue.createElementVNode("view", { class: "info-right" }, [
            vue.createElementVNode(
              "text",
              { class: "name" },
              vue.toDisplayString($setup.userInfo.name || "未登录"),
              1
              /* TEXT */
            ),
            vue.createElementVNode(
              "text",
              { class: "student-id" },
              vue.toDisplayString($setup.userInfo.studentId || "点击登录"),
              1
              /* TEXT */
            )
          ])
        ])
      ]),
      vue.createCommentVNode(" 功能列表 "),
      vue.createElementVNode("view", { class: "menu-list" }, [
        vue.createElementVNode("view", { class: "menu-group" }, [
          vue.createElementVNode("view", {
            class: "menu-item",
            onClick: _cache[0] || (_cache[0] = ($event) => $setup.goToMyPosts("love"))
          }, [
            vue.createElementVNode("text", { class: "menu-text" }, "我的表白"),
            vue.createElementVNode("text", { class: "arrow" }, ">")
          ]),
          vue.createElementVNode("view", {
            class: "menu-item",
            onClick: _cache[1] || (_cache[1] = ($event) => $setup.goToMyPosts("market"))
          }, [
            vue.createElementVNode("text", { class: "menu-text" }, "我的二手"),
            vue.createElementVNode("text", { class: "arrow" }, ">")
          ]),
          vue.createElementVNode("view", {
            class: "menu-item",
            onClick: _cache[2] || (_cache[2] = ($event) => $setup.goToMyPosts("job"))
          }, [
            vue.createElementVNode("text", { class: "menu-text" }, "我的兼职"),
            vue.createElementVNode("text", { class: "arrow" }, ">")
          ])
        ]),
        vue.createElementVNode("view", { class: "menu-group" }, [
          vue.createElementVNode("view", {
            class: "menu-item",
            onClick: $setup.goToMyCollections
          }, [
            vue.createElementVNode("text", { class: "menu-text" }, "我的收藏"),
            vue.createElementVNode("text", { class: "arrow" }, ">")
          ]),
          vue.createElementVNode("view", {
            class: "menu-item",
            onClick: $setup.goToSettings
          }, [
            vue.createElementVNode("text", { class: "menu-text" }, "修改资料"),
            vue.createElementVNode("text", { class: "arrow" }, ">")
          ])
        ]),
        vue.createElementVNode("view", { class: "menu-group" }, [
          $setup.isLoggedIn ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "menu-item",
            onClick: $setup.handleLogout
          }, [
            vue.createElementVNode("text", { class: "menu-text logout" }, "退出登录")
          ])) : vue.createCommentVNode("v-if", true)
        ])
      ])
    ]);
  }
  const PagesUserIndex = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["render", _sfc_render$4], ["__scopeId", "data-v-79e6a490"], ["__file", "C:/Users/m1950/Desktop/apap/pages/user/index.vue"]]);
  const _sfc_main$3 = /* @__PURE__ */ vue.defineComponent({
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const formData = vue.ref({
        studentId: "",
        password: ""
      });
      const isSubmitting = vue.ref(false);
      const validateForm = () => {
        if (!formData.value.studentId) {
          uni.showToast({
            title: "请输入学号",
            icon: "none"
          });
          return false;
        }
        if (formData.value.studentId.length !== 10) {
          uni.showToast({
            title: "学号必须是10位",
            icon: "none"
          });
          return false;
        }
        if (!formData.value.password) {
          uni.showToast({
            title: "请输入密码",
            icon: "none"
          });
          return false;
        }
        return true;
      };
      const handleLogin = async () => {
        if (!validateForm())
          return;
        isSubmitting.value = true;
        uni.request({
          url: "http://192.168.100.101:8080/api/login",
          // 使用你的实际IP地址
          method: "POST",
          header: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Device-Type": "APP"
          },
          data: {
            studentId: formData.value.studentId,
            password: formData.value.password
          },
          timeout: 1e4,
          dataType: "json",
          success: (response) => {
            formatAppLog("log", "at pages/login/index.vue:92", "登录响应：", response);
            if (response.statusCode === 200 && response.data.code === 200) {
              const { token, userInfo } = response.data.data;
              uni.setStorageSync("token", token);
              uni.setStorageSync("userInfo", userInfo);
              uni.showToast({
                title: "登录成功",
                icon: "success",
                success: () => {
                  setTimeout(() => {
                    uni.switchTab({
                      url: "/pages/love/index"
                    });
                  }, 1500);
                }
              });
            } else {
              uni.showToast({
                title: response.data.message || "登录失败",
                icon: "none"
              });
            }
          },
          fail: (error) => {
            formatAppLog("error", "at pages/login/index.vue:121", "登录失败：", error);
            uni.showToast({
              title: "网络错误，请稍后重试",
              icon: "none"
            });
          },
          complete: () => {
            isSubmitting.value = false;
          }
        });
      };
      const goToRegister = () => {
        uni.navigateTo({
          url: "/pages/user/register"
        });
      };
      const __returned__ = { formData, isSubmitting, validateForm, handleLogin, goToRegister };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  });
  function _sfc_render$3(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "login-container" }, [
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.createElementVNode("text", { class: "label" }, "学号"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            class: "input",
            type: "number",
            "max-length": "10",
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.formData.studentId = $event),
            placeholder: "请输入学号"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $setup.formData.studentId]
        ])
      ]),
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.createElementVNode("text", { class: "label" }, "密码"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            class: "input",
            type: "password",
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $setup.formData.password = $event),
            placeholder: "请输入密码"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $setup.formData.password]
        ])
      ]),
      vue.createElementVNode("button", {
        class: "submit-btn",
        onClick: $setup.handleLogin,
        disabled: $setup.isSubmitting
      }, vue.toDisplayString($setup.isSubmitting ? "登录中..." : "登录"), 9, ["disabled"]),
      vue.createElementVNode("view", {
        class: "register-link",
        onClick: $setup.goToRegister
      }, " 还没有账号？去注册 ")
    ]);
  }
  const PagesLoginIndex = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["render", _sfc_render$3], ["__scopeId", "data-v-d08ef7d4"], ["__file", "C:/Users/m1950/Desktop/apap/pages/login/index.vue"]]);
  const _sfc_main$2 = {
    __name: "posts",
    setup(__props, { expose: __expose }) {
      __expose();
      const currentType = vue.ref("love");
      const posts = vue.ref([]);
      const page = vue.ref(1);
      const loading = vue.ref(false);
      const noMore = vue.ref(false);
      const isRefreshing = vue.ref(false);
      const handleAuthError = () => {
        uni.showToast({
          title: "请重新登录",
          icon: "none"
        });
        setTimeout(() => {
          uni.navigateTo({
            url: "/pages/login/index"
          });
        }, 1500);
      };
      const getPosts = () => {
        if (loading.value)
          return;
        loading.value = true;
        formatAppLog("log", "at pages/user/posts.vue:112", "1", uni.getStorageSync("token"));
        uni.request({
          url: "http://192.168.100.101:8080/api/posts/user/posts",
          method: "GET",
          header: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Device-Type": "APP",
            "Authorization": `Bearer ${uni.getStorageSync("token")}`
          },
          data: {
            type: currentType.value,
            page: page.value,
            pageSize: 10
          },
          timeout: 1e4,
          dataType: "json",
          success: (response) => {
            formatAppLog("log", "at pages/user/posts.vue:131", "获取帖子列表响应：", response);
            if (response.statusCode === 200 && response.data.code === 200) {
              const { list, total } = response.data.data;
              if (page.value === 1) {
                posts.value = list;
              } else {
                posts.value = [...posts.value, ...list];
              }
              noMore.value = posts.value.length >= total;
            } else if (response.statusCode === 403) {
              handleAuthError();
            } else {
              uni.showToast({
                title: response.data.message || "加载失败",
                icon: "none"
              });
            }
          },
          fail: (error) => {
            formatAppLog("error", "at pages/user/posts.vue:150", "获取帖子列表失败：", error);
            uni.showToast({
              title: "网络错误，请稍后重试",
              icon: "none"
            });
          },
          complete: () => {
            loading.value = false;
            isRefreshing.value = false;
          }
        });
      };
      const changeType = (type) => {
        if (currentType.value === type)
          return;
        currentType.value = type;
        page.value = 1;
        noMore.value = false;
        getPosts();
      };
      const refresh = () => {
        page.value = 1;
        noMore.value = false;
        isRefreshing.value = true;
        getPosts();
      };
      const loadMore = () => {
        if (noMore.value || loading.value)
          return;
        page.value++;
        getPosts();
      };
      const handleDelete = (post) => {
        uni.showModal({
          title: "提示",
          content: "确定要删除这条发布吗？",
          success: (res) => {
            if (res.confirm) {
              uni.request({
                url: `http://192.168.100.101:8080/api/posts/user/${post.id}`,
                method: "DELETE",
                header: {
                  "Content-Type": "application/json",
                  "Accept": "application/json",
                  "Device-Type": "APP",
                  "Authorization": `Bearer ${uni.getStorageSync("token")}`
                },
                timeout: 1e4,
                dataType: "json",
                success: (response) => {
                  if (response.statusCode === 200 && response.data.code === 200) {
                    uni.showToast({
                      title: "删除成功",
                      icon: "success"
                    });
                    page.value = 1;
                    getPosts();
                  } else if (response.statusCode === 403) {
                    handleAuthError();
                  } else {
                    uni.showToast({
                      title: response.data.message || "删除失败",
                      icon: "none"
                    });
                  }
                },
                fail: (error) => {
                  formatAppLog("error", "at pages/user/posts.vue:224", "删除帖子失败：", error);
                  uni.showToast({
                    title: "网络错误，请稍后重试",
                    icon: "none"
                  });
                }
              });
            }
          }
        });
      };
      const goToDetail = (id) => {
        uni.navigateTo({
          url: `/pages/post/detail?id=${id}`
        });
      };
      const previewImage = (urls, current) => {
        uni.previewImage({
          urls,
          current: urls[current]
        });
      };
      const formatTime = (timestamp) => {
        if (!timestamp)
          return "";
        const now = (/* @__PURE__ */ new Date()).getTime();
        const diff = now - new Date(timestamp).getTime();
        if (diff < 6e4)
          return "刚刚";
        if (diff < 36e5)
          return `${Math.floor(diff / 6e4)}分钟前`;
        if (diff < 864e5)
          return `${Math.floor(diff / 36e5)}小时前`;
        if (diff < 2592e6)
          return `${Math.floor(diff / 864e5)}天前`;
        const date = new Date(timestamp);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      };
      vue.onMounted(() => {
        var _a;
        const pages = getCurrentPages();
        if (pages.length > 0) {
          const currentPage = pages[pages.length - 1];
          const options = ((_a = currentPage.$page) == null ? void 0 : _a.options) || {};
          if (options.type) {
            currentType.value = options.type;
          }
        }
        const token = uni.getStorageSync("token");
        if (!token) {
          handleAuthError();
          return;
        }
        getPosts();
      });
      const __returned__ = { currentType, posts, page, loading, noMore, isRefreshing, handleAuthError, getPosts, changeType, refresh, loadMore, handleDelete, goToDetail, previewImage, formatTime, ref: vue.ref, onMounted: vue.onMounted };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$2(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "my-posts-container" }, [
      vue.createCommentVNode(" 类型切换 "),
      vue.createElementVNode("view", { class: "type-bar" }, [
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["type-item", { active: $setup.currentType === "love" }]),
            onClick: _cache[0] || (_cache[0] = ($event) => $setup.changeType("love"))
          },
          " 表白墙 ",
          2
          /* CLASS */
        ),
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["type-item", { active: $setup.currentType === "market" }]),
            onClick: _cache[1] || (_cache[1] = ($event) => $setup.changeType("market"))
          },
          " 二手市场 ",
          2
          /* CLASS */
        ),
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["type-item", { active: $setup.currentType === "job" }]),
            onClick: _cache[2] || (_cache[2] = ($event) => $setup.changeType("job"))
          },
          " 兼职信息 ",
          2
          /* CLASS */
        )
      ]),
      vue.createCommentVNode(" 帖子列表 "),
      vue.createElementVNode("scroll-view", {
        class: "post-list",
        "scroll-y": "",
        onScrollToLower: $setup.loadMore,
        "refresher-enabled": "",
        "refresher-triggered": $setup.isRefreshing,
        onRefresherRefresh: $setup.refresh
      }, [
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($setup.posts, (post) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              class: "post-item",
              key: post.id,
              onClick: ($event) => $setup.goToDetail(post.id)
            }, [
              vue.createCommentVNode(" 帖子内容 "),
              vue.createElementVNode(
                "view",
                { class: "post-content" },
                vue.toDisplayString(post.content),
                1
                /* TEXT */
              ),
              vue.createCommentVNode(" 图片展示 "),
              post.images && post.images.length ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 0,
                class: "image-list"
              }, [
                (vue.openBlock(true), vue.createElementBlock(
                  vue.Fragment,
                  null,
                  vue.renderList(post.images, (img, index) => {
                    return vue.openBlock(), vue.createElementBlock("image", {
                      key: index,
                      src: img,
                      mode: "aspectFill",
                      onClick: vue.withModifiers(($event) => $setup.previewImage(post.images, index), ["stop"])
                    }, null, 8, ["src", "onClick"]);
                  }),
                  128
                  /* KEYED_FRAGMENT */
                ))
              ])) : vue.createCommentVNode("v-if", true),
              vue.createCommentVNode(" 帖子信息 "),
              vue.createElementVNode("view", { class: "post-footer" }, [
                vue.createElementVNode(
                  "text",
                  { class: "time" },
                  vue.toDisplayString($setup.formatTime(post.createTime)),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("view", { class: "stats" }, [
                  vue.createElementVNode("view", { class: "stat-item" }, [
                    vue.createElementVNode("text", { class: "icon-font" }, "❤"),
                    vue.createElementVNode(
                      "text",
                      null,
                      vue.toDisplayString(post.likeCount || 0),
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode("view", { class: "stat-item" }, [
                    vue.createElementVNode("text", { class: "icon-font" }, "💬"),
                    vue.createElementVNode(
                      "text",
                      null,
                      vue.toDisplayString(post.commentCount || 0),
                      1
                      /* TEXT */
                    )
                  ])
                ])
              ]),
              vue.createCommentVNode(" 操作按钮 "),
              vue.createElementVNode("view", { class: "post-actions" }, [
                vue.createElementVNode("view", {
                  class: "action-btn delete",
                  onClick: vue.withModifiers(($event) => $setup.handleDelete(post), ["stop"])
                }, "删除", 8, ["onClick"])
              ])
            ], 8, ["onClick"]);
          }),
          128
          /* KEYED_FRAGMENT */
        )),
        vue.createCommentVNode(" 空状态 "),
        !$setup.loading && $setup.posts.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "empty"
        }, [
          vue.createElementVNode("text", null, "暂无发布内容")
        ])) : vue.createCommentVNode("v-if", true),
        vue.createCommentVNode(" 加载更多 "),
        $setup.loading ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 1,
          class: "loading"
        }, "加载中...")) : vue.createCommentVNode("v-if", true),
        $setup.noMore ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 2,
          class: "no-more"
        }, "没有更多了")) : vue.createCommentVNode("v-if", true)
      ], 40, ["refresher-triggered"])
    ]);
  }
  const PagesUserPosts = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$2], ["__file", "C:/Users/m1950/Desktop/apap/pages/user/posts.vue"]]);
  const baseUrl = "http://192.168.100.101:8080";
  const _sfc_main$1 = {
    __name: "settings",
    setup(__props, { expose: __expose }) {
      __expose();
      const userInfo = vue.ref({
        avatar: "",
        name: "",
        major: "",
        grade: ""
      });
      const passwordForm = vue.ref({
        oldPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      const isSubmitting = vue.ref(false);
      const handleAuthError = () => {
        uni.showToast({
          title: "请重新登录",
          icon: "none"
        });
        uni.removeStorageSync("token");
        uni.removeStorageSync("userInfo");
        setTimeout(() => {
          uni.navigateTo({
            url: "/pages/login/index"
          });
        }, 1500);
      };
      const getUserInfo = () => {
        const token = uni.getStorageSync("token");
        if (!token) {
          handleAuthError();
          return;
        }
        uni.request({
          url: `${baseUrl}/api/user/info`,
          method: "GET",
          header: {
            "Authorization": `Bearer ${token}`
          },
          success: (res) => {
            var _a;
            if (res.data.code === 200) {
              userInfo.value = {
                ...res.data.data,
                avatar: ((_a = res.data.data.avatar) == null ? void 0 : _a.startsWith("http")) ? res.data.data.avatar : res.data.data.avatar
              };
              uni.setStorageSync("userInfo", userInfo.value);
            } else if (res.statusCode === 403) {
              handleAuthError();
            }
          }
        });
      };
      const chooseAvatar = () => {
        uni.chooseImage({
          count: 1,
          sizeType: ["compressed"],
          sourceType: ["album", "camera"],
          success: (res) => {
            formatAppLog("log", "at pages/user/settings.vue:151", "选择图片成功：", res.tempFilePaths[0]);
            const tempFilePath = res.tempFilePaths[0];
            if (tempFilePath) {
              uploadAvatar(tempFilePath);
            }
          }
        });
      };
      const uploadAvatar = (filePath) => {
        const token = uni.getStorageSync("token");
        if (!token) {
          handleAuthError();
          return;
        }
        uni.showLoading({
          title: "上传中..."
        });
        uni.uploadFile({
          url: `${baseUrl}/upload/image`,
          filePath,
          name: "file",
          header: {
            "Accept": "application/json",
            "Authorization": `Bearer ${token}`
          },
          success: (uploadRes) => {
            formatAppLog("log", "at pages/user/settings.vue:180", "上传响应：", uploadRes);
            try {
              const data = JSON.parse(uploadRes.data);
              if (uploadRes.statusCode === 200 && data.code === 200) {
                userInfo.value.avatar = data.data;
                uni.request({
                  url: `${baseUrl}/api/user/update`,
                  method: "POST",
                  header: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${token}`
                  },
                  data: {
                    avatar: data.data,
                    name: userInfo.value.name
                  },
                  success: (updateRes) => {
                    var _a;
                    formatAppLog("log", "at pages/user/settings.vue:201", "更新用户信息响应：", updateRes);
                    if (updateRes.statusCode === 200 && updateRes.data.code === 200) {
                      uni.setStorageSync("userInfo", userInfo.value);
                      uni.showToast({
                        title: "头像更新成功",
                        icon: "success"
                      });
                    } else {
                      uni.showToast({
                        title: ((_a = updateRes.data) == null ? void 0 : _a.message) || "更新失败",
                        icon: "none"
                      });
                    }
                  },
                  fail: (error) => {
                    formatAppLog("error", "at pages/user/settings.vue:216", "更新用户信息失败：", error);
                    uni.showToast({
                      title: "更新失败",
                      icon: "none"
                    });
                  }
                });
              } else {
                uni.showToast({
                  title: data.message || "上传失败",
                  icon: "none"
                });
              }
            } catch (e) {
              formatAppLog("error", "at pages/user/settings.vue:230", "解析响应失败：", e, uploadRes.data);
              uni.showToast({
                title: "上传失败",
                icon: "none"
              });
            }
          },
          fail: (error) => {
            formatAppLog("error", "at pages/user/settings.vue:238", "上传头像失败：", error);
            uni.showToast({
              title: "网络错误，请稍后重试",
              icon: "none"
            });
          },
          complete: () => {
            uni.hideLoading();
          }
        });
      };
      const handleSave = () => {
        if (isSubmitting.value)
          return;
        if (!userInfo.value.name) {
          uni.showToast({
            title: "请输入昵称",
            icon: "none"
          });
          return;
        }
        if (passwordForm.value.oldPassword || passwordForm.value.newPassword || passwordForm.value.confirmPassword) {
          if (!passwordForm.value.oldPassword) {
            uni.showToast({
              title: "请输入原密码",
              icon: "none"
            });
            return;
          }
          if (!passwordForm.value.newPassword) {
            uni.showToast({
              title: "请输入新密码",
              icon: "none"
            });
            return;
          }
          if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
            uni.showToast({
              title: "两次密码输入不一致",
              icon: "none"
            });
            return;
          }
        }
        const token = uni.getStorageSync("token");
        if (!token) {
          handleAuthError();
          return;
        }
        isSubmitting.value = true;
        const updateData = {
          name: userInfo.value.name
        };
        if (passwordForm.value.oldPassword && passwordForm.value.newPassword) {
          updateData.oldPassword = passwordForm.value.oldPassword;
          updateData.newPassword = passwordForm.value.newPassword;
        }
        uni.request({
          url: `${baseUrl}/api/user/update`,
          method: "POST",
          header: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `Bearer ${token}`
          },
          data: updateData,
          success: (response) => {
            var _a;
            if (response.statusCode === 200 && response.data.code === 200) {
              uni.setStorageSync("userInfo", userInfo.value);
              uni.showToast({
                title: "保存成功",
                icon: "success"
              });
              if (passwordForm.value.newPassword) {
                setTimeout(() => {
                  uni.removeStorageSync("token");
                  uni.removeStorageSync("userInfo");
                  uni.reLaunch({
                    url: "/pages/login/index"
                  });
                }, 1500);
              }
            } else if (response.statusCode === 403) {
              handleAuthError();
            } else {
              uni.showToast({
                title: ((_a = response.data) == null ? void 0 : _a.message) || "保存失败",
                icon: "none"
              });
            }
          },
          fail: (error) => {
            formatAppLog("error", "at pages/user/settings.vue:341", "更新用户信息失败：", error);
            uni.showToast({
              title: "网络错误，请稍后重试",
              icon: "none"
            });
          },
          complete: () => {
            isSubmitting.value = false;
          }
        });
      };
      vue.onMounted(() => {
        getUserInfo();
      });
      const __returned__ = { baseUrl, userInfo, passwordForm, isSubmitting, handleAuthError, getUserInfo, chooseAvatar, uploadAvatar, handleSave, ref: vue.ref, onMounted: vue.onMounted };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createCommentVNode(" 头像部分 "),
      vue.createElementVNode("view", {
        class: "avatar-section",
        onClick: $setup.chooseAvatar
      }, [
        vue.createElementVNode("image", {
          class: "avatar",
          src: $setup.userInfo.avatar ? $setup.baseUrl + $setup.userInfo.avatar : "/static/default-avatar.png",
          mode: "aspectFill"
        }, null, 8, ["src"]),
        vue.createElementVNode("text", { class: "tip" }, "点击更换头像")
      ]),
      vue.createCommentVNode(" 基本信息表单 "),
      vue.createElementVNode("view", { class: "form-section" }, [
        vue.createElementVNode("view", { class: "section-title" }, "基本信息"),
        vue.createElementVNode("view", { class: "form-item" }, [
          vue.createElementVNode("text", { class: "label" }, "昵称"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input",
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.userInfo.name = $event),
              placeholder: "请输入昵称"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.userInfo.name]
          ])
        ]),
        vue.createElementVNode("view", { class: "form-item" }, [
          vue.createElementVNode("text", { class: "label" }, "专业"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input",
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $setup.userInfo.major = $event),
              placeholder: "请输入专业",
              disabled: ""
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.userInfo.major]
          ])
        ]),
        vue.createElementVNode("view", { class: "form-item" }, [
          vue.createElementVNode("text", { class: "label" }, "年级"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input",
              "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $setup.userInfo.grade = $event),
              placeholder: "请输入年级",
              disabled: ""
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.userInfo.grade]
          ])
        ])
      ]),
      vue.createCommentVNode(" 修改密码表单 "),
      vue.createElementVNode("view", { class: "form-section" }, [
        vue.createElementVNode("view", { class: "section-title" }, "修改密码"),
        vue.createElementVNode("view", { class: "form-item" }, [
          vue.createElementVNode("text", { class: "label" }, "原密码"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input",
              "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $setup.passwordForm.oldPassword = $event),
              type: "password",
              placeholder: "请输入原密码"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.passwordForm.oldPassword]
          ])
        ]),
        vue.createElementVNode("view", { class: "form-item" }, [
          vue.createElementVNode("text", { class: "label" }, "新密码"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input",
              "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $setup.passwordForm.newPassword = $event),
              type: "password",
              placeholder: "请输入新密码"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.passwordForm.newPassword]
          ])
        ]),
        vue.createElementVNode("view", { class: "form-item" }, [
          vue.createElementVNode("text", { class: "label" }, "确认密码"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input",
              "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $setup.passwordForm.confirmPassword = $event),
              type: "password",
              placeholder: "请再次输入新密码"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.passwordForm.confirmPassword]
          ])
        ])
      ]),
      vue.createCommentVNode(" 保存按钮 "),
      vue.createElementVNode("view", { class: "button-section" }, [
        vue.createElementVNode("button", {
          class: vue.normalizeClass(["save-button", { "loading": $setup.isSubmitting }]),
          onClick: $setup.handleSave,
          disabled: $setup.isSubmitting
        }, vue.toDisplayString($setup.isSubmitting ? "保存中..." : "保存修改"), 11, ["disabled"])
      ])
    ]);
  }
  const PagesUserSettings = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render$1], ["__scopeId", "data-v-ce914230"], ["__file", "C:/Users/m1950/Desktop/apap/pages/user/settings.vue"]]);
  __definePage("pages/love/index", PagesLoveIndex);
  __definePage("pages/post/detail", PagesPostDetail);
  __definePage("pages/post/create", PagesPostCreate);
  __definePage("pages/market/index", PagesMarketIndex);
  __definePage("pages/job/index", PagesJobIndex);
  __definePage("pages/user/register", PagesUserRegister);
  __definePage("pages/user/index", PagesUserIndex);
  __definePage("pages/login/index", PagesLoginIndex);
  __definePage("pages/user/posts", PagesUserPosts);
  __definePage("pages/user/settings", PagesUserSettings);
  const _sfc_main = {
    __name: "App",
    setup(__props, { expose: __expose }) {
      let firstBackTime = 0;
      const checkUpdate = () => {
        const currentVersion = "1.0.0";
        uni.request({
          url: "http://192.168.100.101:8080/api/app/version",
          method: "GET",
          success: (res) => {
            if (res.statusCode === 200 && res.data.code === 200) {
              const serverVersion = res.data.data.version;
              const forceUpdate = res.data.data.forceUpdate;
              const downloadUrl = res.data.data.downloadUrl;
              const updateContent = res.data.data.updateContent;
              if (serverVersion > currentVersion) {
                uni.showModal({
                  title: "发现新版本",
                  content: updateContent || "有新版本可用，是否立即更新？",
                  confirmText: "立即更新",
                  cancelText: forceUpdate ? "退出应用" : "暂不更新",
                  success: (result) => {
                    if (result.confirm) {
                      plus.runtime.openURL(downloadUrl);
                    } else if (forceUpdate) {
                      plus.runtime.quit();
                    }
                  }
                });
              }
            }
          },
          fail: (err) => {
            formatAppLog("error", "at App.vue:49", "检查更新失败：", err);
          }
        });
      };
      const refreshToken = () => {
        return new Promise((resolve, reject) => {
          const token = uni.getStorageSync("token");
          if (!token) {
            reject(new Error("无token"));
            return;
          }
          uni.request({
            url: "http://192.168.100.101:8080/api/auth/refresh",
            method: "POST",
            header: {
              "Authorization": `Bearer ${token}`,
              "Accept": "application/json",
              "Device-Type": "APP"
            },
            success: (response) => {
              if (response.statusCode === 200 && response.data.code === 200) {
                uni.setStorageSync("token", response.data.data.token);
                resolve(response.data.data.token);
              } else {
                reject(new Error("刷新token失败"));
              }
            },
            fail: () => reject(new Error("网络请求失败"))
          });
        });
      };
      const checkLoginStatus = async () => {
        var _a;
        const pages = getCurrentPages();
        const currentPage = ((_a = pages[pages.length - 1]) == null ? void 0 : _a.route) || "";
        if (currentPage === "pages/login/index" || currentPage === "pages/user/register") {
          return;
        }
        const token = uni.getStorageSync("token");
        const userInfo = uni.getStorageSync("userInfo");
        if (!token || !userInfo) {
          return false;
        }
        try {
          const response = await uni.request({
            url: "http://192.168.100.101:8080/api/auth/verify",
            method: "GET",
            header: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              "Device-Type": "APP",
              "Authorization": `Bearer ${token}`
            }
          });
          if (response.statusCode === 200 && response.data.code === 200) {
            return true;
          }
          if (response.statusCode === 403 || response.data.code === 403) {
            try {
              await refreshToken();
              return true;
            } catch (error) {
              formatAppLog("error", "at App.vue:124", "刷新token失败：", error);
              uni.showToast({
                title: "登录已过期，请重新登录",
                icon: "none"
              });
              setTimeout(() => {
                uni.reLaunch({
                  url: "/pages/login/index"
                });
              }, 1500);
              return false;
            }
          }
          return false;
        } catch (error) {
          formatAppLog("error", "at App.vue:140", "验证token失败：", error);
          uni.showToast({
            title: "网络异常，请检查网络设置",
            icon: "none"
          });
          return false;
        }
      };
      onLaunch(() => {
        formatAppLog("log", "at App.vue:151", "App Launch");
        checkUpdate();
      });
      onShow(() => {
        formatAppLog("log", "at App.vue:159", "App Show");
      });
      onHide(() => {
        formatAppLog("log", "at App.vue:165", "App Hide");
      });
      const onMemoryWarning = () => {
        formatAppLog("log", "at App.vue:170", "App MemoryWarning");
      };
      const onLastPageBackPress = () => {
        if (firstBackTime === 0) {
          formatAppLog("log", "at App.vue:176", "App LastPageBackPress");
          uni.showToast({
            title: "再按一次退出应用",
            position: "bottom"
          });
          firstBackTime = Date.now();
          setTimeout(() => {
            firstBackTime = 0;
          }, 2e3);
        } else if (Date.now() - firstBackTime < 2e3) {
          firstBackTime = Date.now();
          uni.exit();
        }
      };
      const onExit = () => {
        formatAppLog("log", "at App.vue:193", "App Exit");
      };
      __expose({
        onMemoryWarning,
        onLastPageBackPress,
        onExit
      });
      const __returned__ = { get firstBackTime() {
        return firstBackTime;
      }, set firstBackTime(v) {
        firstBackTime = v;
      }, checkUpdate, refreshToken, checkLoginStatus, onMemoryWarning, onLastPageBackPress, onExit, get onLaunch() {
        return onLaunch;
      }, get onShow() {
        return onShow;
      }, get onHide() {
        return onHide;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_page = vue.resolveComponent("page");
    return vue.openBlock(), vue.createElementBlock("view", null, [
      vue.createVNode(_component_page)
    ]);
  }
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "C:/Users/m1950/Desktop/apap/App.vue"]]);
  uni.addInterceptor({
    returnValue(res) {
      if (!(!!res && (typeof res === "object" || typeof res === "function") && typeof res.then === "function")) {
        return res;
      }
      return new Promise((resolve, reject) => {
        res.then((res2) => {
          if (!res2)
            return resolve(res2);
          return res2[0] ? reject(res2[0]) : resolve(res2[1]);
        });
      });
    }
  });
  function createApp() {
    const app = vue.createVueApp(App);
    return {
      app
    };
  }
  const { app: __app__, Vuex: __Vuex__, Pinia: __Pinia__ } = createApp();
  uni.Vuex = __Vuex__;
  uni.Pinia = __Pinia__;
  __app__.provide("__globalStyles", __uniConfig.styles);
  __app__._component.mpType = "app";
  __app__._component.render = () => {
  };
  __app__.mount("#app");
})(Vue);
