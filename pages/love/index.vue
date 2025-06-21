<template>
  <view class="love-container">
    <!-- 排序选项 -->
    <view class="sort-bar">
      <view 
        class="sort-item" 
        :class="{ active: sortType === 'time' }"
        @tap="changeSort('time')"
      >
        最新
      </view>
      <view 
        class="sort-item" 
        :class="{ active: sortType === 'hot' }"
        @tap="changeSort('hot')"
      >
        最热
      </view>
    </view>

    <!-- 帖子列表 -->
    <scroll-view 
      class="post-list" 
      scroll-y 
      @scroll-to-lower="loadMore"
      refresher-enabled
      :refresher-triggered="isRefreshing"
      @refresher-refresh="refresh"
    >
      <view class="post-item" v-for="post in posts" :key="post.id" @tap="goToDetail(post.id)">
        <!-- 用户信息 -->
        <view class="post-header">
          <image 
            class="avatar" 
            :src="post.user && post.user.avatar ? `http://192.168.100.101:8080${post.user.avatar}` : '/static/default-avatar.png'" 
            mode="aspectFill"
          ></image>
          <view class="user-info">
            <text class="username">{{ post.user ? post.user.name : '匿名用户' }}</text>
            <text class="time">{{ formatTime(post.createTime) }}</text>
          </view>
          <!-- 管理按钮 -->
          <view class="admin-actions" v-if="isAdmin">
            <text class="edit-btn" @tap.stop="editPost(post.id)">编辑</text>
            <text class="delete-btn" @tap.stop="deletePost(post.id)">删除</text>
          </view>
        </view>

        <!-- 帖子内容 -->
        <view class="post-content">{{ post.content }}</view>

        <!-- 图片展示 -->
        <view class="image-list" v-if="post.images && post.images.length">
          <image 
            v-for="(img, index) in post.images" 
            :key="index" 
            :src="img"
            mode="aspectFill"
            @tap.stop="previewImage(post.images, index)"
          ></image>
        </view>

        <!-- 互动信息 -->
        <view class="post-footer">
          <view class="action" @tap.stop="handleLike(post)">
            <text :class="{ active: post.isLiked }">❤</text>
            <text>{{ post.likeCount || 0 }}</text>
          </view>
          <view class="action">
            <text>💬</text>
            <text>{{ post.commentCount || 0 }}</text>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view class="loading" v-if="loading">加载中...</view>
      <view class="no-more" v-if="noMore">没有更多了</view>
    </scroll-view>

    <!-- 发帖按钮 -->
    <view class="post-btn" @tap="goToPost">
      <text>＋</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
declare const uni: any  

interface User {
  id: string
  name: string
  avatar?: string
}

interface Post {
  id: number
  content: string
  user: User
  createTime: string
  images?: string[]
  likeCount: number
  commentCount: number
  isLiked: boolean
}

const posts = ref<Post[]>([])
const page = ref(1)
const loading = ref(false)
const noMore = ref(false)
const isRefreshing = ref(false)
const sortType = ref('time')
const isAdmin = ref(true) // 管理员状态

// 格式化时间
const formatTime = (timestamp) => {
  const now = new Date().getTime()
  const diff = now - new Date(timestamp).getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 2592000000) return `${Math.floor(diff / 86400000)}天前`
  
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 获取帖子列表
const getPosts = async () => {
  if (loading.value) return
  loading.value = true

  const token = uni.getStorageSync('token')
  if (!token) {
    loading.value = false
    uni.showToast({
      title: '请先登录',
      icon: 'none',
      success: () => {
        setTimeout(() => {
          uni.navigateTo({
            url: '/pages/login/index'
          })
        }, 1500)
      }
    })
    return
  }

  uni.request({
    url: 'http://192.168.100.101:8080/api/posts',
    method: 'GET',
    header: {
      'Accept': 'application/json',
      'Device-Type': 'APP',
      'Authorization': `Bearer ${token}`
    },
    data: {
      type: 'love',
      page: page.value,
      pageSize: 10,
      sortBy: sortType.value
    },
    success: (response) => {
      console.log('获取帖子响应：', response)
      
      if (response.statusCode === 200 && response.data.code === 200) {
        const { list, total } = response.data.data
        // 处理每个帖子的数据
        const processedList = list.map(post => {
          const user = post.user || {}
          return {
            ...post,
            user: {
              ...user,
              avatar: user.avatar ? `/api${user.avatar}` : null,
              name: user.name || '匿名用户'
            },
            content: post.content || '',
            images: (post.images || []).map(img => `http://192.168.100.101:8080/api${img}`),
            likeCount: post.likeCount || 0,
            commentCount: post.commentCount || 0,
            isLiked: !!post.isLiked
          }
        })
        
        if (page.value === 1) {
          posts.value = processedList
        } else {
          posts.value = [...posts.value, ...processedList]
        }
        noMore.value = posts.value.length >= total
        
        if (isRefreshing.value) {
          uni.showToast({
            title: '刷新成功',
            icon: 'success'
          })
        }
      } else if (response.statusCode === 403) {
        uni.removeStorageSync('token')
        uni.removeStorageSync('userInfo')
        uni.showToast({
          title: '登录已过期，请重新登录',
          icon: 'none',
          success: () => {
            setTimeout(() => {
              uni.navigateTo({
                url: '/pages/login/index'
              })
            }, 1500)
          }
        })
      } else {
        uni.showToast({
          title: response.data.message || '加载失败',
          icon: 'none'
        })
      }
    },
    fail: (error) => {
      console.error('获取帖子失败：', error)
      uni.showToast({
        title: '网络错误，请下拉刷新',
        icon: 'none'
      })
    },
    complete: () => {
      loading.value = false
      isRefreshing.value = false
      uni.stopPullDownRefresh()
    }
  })
}

// 切换排序方式
const changeSort = (type) => {
  if (sortType.value === type) return
  sortType.value = type
  page.value = 1
  noMore.value = false
  getPosts()
}

// 下拉刷新
const refresh = () => {
  page.value = 1
  noMore.value = false
  isRefreshing.value = true
  getPosts()
}

// 加载更多
const loadMore = () => {
  if (noMore.value || loading.value) return
  page.value++
  getPosts()
}

// 跳转到发帖页
const goToPost = () => {
  const token = uni.getStorageSync('token')
  if (!token) {
    uni.showToast({
      title: '请先登录',
      icon: 'none'
    })
    setTimeout(() => {
      uni.navigateTo({
        url: '/pages/login/index'
      })
    }, 1500)
    return
  }
  
  uni.navigateTo({
    url: '/pages/post/create?type=love'
  })
}

// 跳转到详情页
const goToDetail = (id) => {
  uni.navigateTo({
    url: `/pages/post/detail?id=${id}`
  })
}

// 预览图片
const previewImage = (urls, current) => {
  uni.previewImage({
    urls,
    current: urls[current]
  })
}

// 点赞
const handleLike = (post) => {
  const token = uni.getStorageSync('token')
  if (!token) {
    uni.showToast({
      title: '请先登录',
      icon: 'none'
    })
    return
  }

  uni.request({
    url: `http://192.168.100.101:8080/api/posts/${post.id}/like`,
    method: 'POST',
    header: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Device-Type': 'APP',
      'Authorization': `Bearer ${token}`
    },
    success: (response) => {
      console.log('点赞响应：', response)
      
      if (response.statusCode === 200 && response.data.code === 200) {
        post.isLiked = !post.isLiked
        post.likeCount = post.isLiked ? (post.likeCount + 1) : (post.likeCount - 1)
      } else {
        uni.showToast({
          title: response.data.message || '操作失败',
          icon: 'none'
        })
      }
    },
    fail: (error) => {
      console.error('点赞失败：', error)
      uni.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none'
      })
    }
  })
}

// 编辑帖子
const editPost = (id) => {
  uni.navigateTo({
    url: `/pages/post/create?id=${id}&type=love`
  })
}

// 删除帖子
const deletePost = (id) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条帖子吗？',
    success: (res) => {
      if (res.confirm) {
        const token = uni.getStorageSync('token')
        uni.request({
          url: `http://192.168.100.101:8080/api/posts/${id}`,
          method: 'DELETE',
          header: {
            'Authorization': `Bearer ${token}`
          },
          success: (response) => {
            if (response.statusCode === 200 && response.data.code === 200) {
              posts.value = posts.value.filter(post => post.id !== id)
              uni.showToast({
                title: '删除成功',
                icon: 'success'
              })
            } else {
              uni.showToast({
                title: response.data.message || '删除失败',
                icon: 'none'
              })
            }
          },
          fail: (error) => {
            console.error('删除失败：', error)
            uni.showToast({
              title: '网络错误，请稍后重试',
              icon: 'none'
            })
          }
        })
      }
    }
  })
}

onMounted(() => {
  getPosts()
})
</script>

<style scoped>
.love-container {
  height: 100vh;
  background-color: #f8f8f8;
}

.sort-bar {
  display: flex;
  padding: 20rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #eee;
  position: sticky;
  top: 0;
  z-index: 10;
}

.sort-item {
  padding: 10rpx 30rpx;
  font-size: 28rpx;
  color: #666;
  margin-right: 20rpx;
  border-radius: 30rpx;
  background-color: #f8f8f8;
}

.sort-item.active {
  color: #fff;
  background-color: #ff5500;
}

.post-list {
  height: calc(100% - 100rpx);
  padding: 20rpx;
  box-sizing: border-box;
}

.post-item {
  background-color: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.post-header {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-right: 20rpx;
}

.user-info {
  flex: 1;
}

.username {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.time {
  font-size: 24rpx;
  color: #999;
  display: block;
}

.post-content {
  font-size: 28rpx;
  color: #333;
  line-height: 1.6;
  margin-bottom: 20rpx;
}

.image-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10rpx;
  margin-bottom: 20rpx;
}

.image-list image {
  width: 100%;

  border-radius: 8rpx;
}

.post-footer {
  display: flex;
  border-top: 1rpx solid #eee;
  padding-top: 20rpx;
}

.action {
  display: flex;
  align-items: center;
  margin-right: 40rpx;
  font-size: 24rpx;
  color: #666;
}

.action text:first-child {
  margin-right: 10rpx;
}

.action .active {
  color: #ff5500;
}

.post-btn {
  position: fixed;
  right: 30rpx;
  bottom: 100rpx;
  width: 100rpx;
  height: 100rpx;
  background-color: #ff5500;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 60rpx;
  z-index: 100;
  box-shadow: 0 4rpx 16rpx #ff550066;
}

.loading, .no-more {
  text-align: center;
  font-size: 24rpx;
  color: #999;
  padding: 20rpx 0;
}
</style>