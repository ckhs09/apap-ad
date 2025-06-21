<template>
  <view class="my-posts-container">
    <!-- 类型切换 -->
    <view class="type-bar">
      <view 
        class="type-item" 
        :class="{ active: currentType === 'love' }"
        @tap="changeType('love')"
      >
        表白墙
      </view>
      <view 
        class="type-item" 
        :class="{ active: currentType === 'market' }"
        @tap="changeType('market')"
      >
        二手市场
      </view>
      <view 
        class="type-item" 
        :class="{ active: currentType === 'job' }"
        @tap="changeType('job')"
      >
        兼职信息
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

        <!-- 帖子信息 -->
        <view class="post-footer">
          <text class="time">{{ formatTime(post.createTime) }}</text>
          <view class="stats">
            <view class="stat-item">
              <text class="icon-font">❤</text>
              <text>{{ post.likeCount || 0 }}</text>
            </view>
            <view class="stat-item">
              <text class="icon-font">💬</text>
              <text>{{ post.commentCount || 0 }}</text>
            </view>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="post-actions">
          <view class="action-btn delete" @tap.stop="handleDelete(post)">删除</view>
        </view>
      </view>

      <!-- 空状态 -->
      <view class="empty" v-if="!loading && posts.length === 0">
        <text>暂无发布内容</text>
      </view>

      <!-- 加载更多 -->
      <view class="loading" v-if="loading">加载中...</view>
      <view class="no-more" v-if="noMore">没有更多了</view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const currentType = ref('love')
const posts = ref([])
const page = ref(1)
const loading = ref(false)
const noMore = ref(false)
const isRefreshing = ref(false)

// 处理认证错误
const handleAuthError = () => {
  uni.showToast({
    title: '请重新登录',
    icon: 'none'
  })
  setTimeout(() => {
    uni.navigateTo({
      url: '/pages/login/index'
    })
  }, 1500)
}

// 获取帖子列表
const getPosts = () => {
  if (loading.value) return
  loading.value = true
  console.log(  '1',uni.getStorageSync('token'))
  uni.request({
    url: 'http://192.168.100.101:8080/api/posts/user/posts',
    method: 'GET',
    header: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Device-Type': 'APP',
      'Authorization': `Bearer ${uni.getStorageSync('token')}`
    },
    data: {
      type: currentType.value,
      page: page.value,
      pageSize: 10
    },
    timeout: 10000,
    dataType: 'json',

    success: (response) => {
      console.log('获取帖子列表响应：', response)
      if (response.statusCode === 200 && response.data.code === 200) {
        const { list, total } = response.data.data
        if (page.value === 1) {
          posts.value = list
        } else {
          posts.value = [...posts.value, ...list]
        }
        noMore.value = posts.value.length >= total
      } else if (response.statusCode === 403) {
        handleAuthError()
      } else {
        uni.showToast({
          title: response.data.message || '加载失败',
          icon: 'none'
        })
      }
    },
    fail: (error) => {
      console.error('获取帖子列表失败：', error)
      uni.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none'
      })
    },
    complete: () => {
      loading.value = false
      isRefreshing.value = false
    }
  })
}

// 切换类型
const changeType = (type) => {
  if (currentType.value === type) return
  currentType.value = type
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

// 删除帖子
const handleDelete = (post) => {
  uni.showModal({
    title: '提示',
    content: '确定要删除这条发布吗？',
    success: (res) => {
      if (res.confirm) {
        uni.request({
          url: `http://192.168.100.101:8080/api/posts/user/${post.id}`,
          method: 'DELETE',
          header: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Device-Type': 'APP',
            'Authorization': `Bearer ${uni.getStorageSync('token')}`
          },
          timeout: 10000,
          dataType: 'json',
          success: (response) => {
            if (response.statusCode === 200 && response.data.code === 200) {
              uni.showToast({
                title: '删除成功',
                icon: 'success'
              })
              // 重新加载列表
              page.value = 1
              getPosts()
            } else if (response.statusCode === 403) {
              handleAuthError()
            } else {
              uni.showToast({
                title: response.data.message || '删除失败',
                icon: 'none'
              })
            }
          },
          fail: (error) => {
            console.error('删除帖子失败：', error)
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

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  
  const now = new Date().getTime()
  const diff = now - new Date(timestamp).getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 2592000000) return `${Math.floor(diff / 86400000)}天前`
  
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

onMounted(() => {
  // 获取页面参数中的类型
  const pages = getCurrentPages()
  if (pages.length > 0) {
    const currentPage = pages[pages.length - 1]
    const options = currentPage.$page?.options || {}
    if (options.type) {
      currentType.value = options.type
    }
  }
  
  // 检查登录状态并获取数据
  const token = uni.getStorageSync('token')
  if (!token) {
    handleAuthError()
    return
  }
  
  getPosts()
})
</script>

<style>
.my-posts-container {
  min-height: 100vh;
  background-color: #f8f8f8;
}

.type-bar {
  display: flex;
  padding: 20rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #eee;
  position: sticky;
  top: 0;
  z-index: 10;
}

.type-item {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  font-size: 28rpx;
  color: #666;
  position: relative;
}

.type-item.active {
  color: #ff5500;
}

.type-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40rpx;
  height: 4rpx;
  background-color: #ff5500;
  border-radius: 2rpx;
}

.post-list {
  height: calc(100vh - 100rpx);
  padding: 20rpx;
}

.post-item {
  background-color: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
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
  justify-content: space-between;
  align-items: center;
  padding-top: 20rpx;
  border-top: 1rpx solid #eee;
}

.time {
  font-size: 24rpx;
  color: #999;
}

.stats {
  display: flex;
}

.stat-item {
  display: flex;
  align-items: center;
  margin-left: 30rpx;
  font-size: 24rpx;
  color: #666;
}

.stat-item .icon-font {
  margin-right: 6rpx;
}

.post-actions {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #eee;
  display: flex;
  justify-content: flex-end;
}

.action-btn {
  padding: 10rpx 30rpx;
  font-size: 24rpx;
  border-radius: 30rpx;
}

.action-btn.delete {
  color: #ff5500;
  border: 1rpx solid #ff5500;
}

.empty {
  text-align: center;
  padding: 100rpx 0;
  color: #999;
  font-size: 28rpx;
}

.loading, .no-more {
  text-align: center;
  font-size: 24rpx;
  color: #999;
  padding: 20rpx 0;
}
</style>