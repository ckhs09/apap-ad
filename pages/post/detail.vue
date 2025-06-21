<template>
  <view class="detail-container">
    <!-- 帖子内容 -->
    <view class="post-content">
      <view class="post-header">
        <image class="avatar" :src="post.avatar" mode="aspectFill"></image>
        <view class="user-info">
          <text class="username">{{ post.name }}</text>
          <text class="time">{{ formatTime(post.createTime) }}</text>
        </view>
      </view>

      <view class="content-text">{{ post.content }}</view>

      <view class="image-list" v-if="post.images && post.images.length">
        <view 
          class="image-grid"
          :class="[`grid-${post.images.length}`]"
        >
          <image 
            v-for="(img, index) in post.images" 
            :key="index" 
            :src="img" 
            mode="aspectFill"
            @tap="previewImage(post.images, index)"
            class="grid-image"
          ></image>
        </view>
      </view>

      <view class="post-footer">
        <view class="action" @tap="handleLike">
          <text class="icon-font" :class="{ active: post.isLiked }">❤</text>
          <text>{{ post.likeCount || 0 }}</text>
        </view>
        <view class="action">
          <text class="icon-font">💬</text>
          <text>{{ post.commentCount || 0 }}</text>
        </view>
      </view>
    </view>

    <!-- 评论列表 -->
    <view class="comment-list">
      <view class="comment-title">评论 {{ post.commentCount || 0 }}</view>
      
      <view 
        class="comment-item" 
        v-for="comment in comments" 
        :key="comment.id"
      >
        <image class="avatar" :src="comment.avatar" mode="aspectFill"></image>
        <view class="comment-right">
          <view class="comment-info">
            <text class="username">{{ comment.name }}</text>
            <text class="time">{{ formatTime(comment.createTime) }}</text>
          </view>
          <view class="comment-content">{{ comment.content }}</view>
          
          <!-- 回复列表 -->
          <view class="reply-list" v-if="comment.replies && comment.replies.length">
            <view 
              class="reply-item"
              v-for="reply in comment.replies"
              :key="reply.id"
            >
              <text class="reply-username">{{ reply.name }}</text>
              <text class="reply-text">回复</text>
              <text class="reply-to">{{ reply.replyToName }}：</text>
              <text class="reply-content">{{ reply.content }}</text>
            </view>
          </view>

          <view class="comment-actions">
            <text @tap="handleReply(comment)">回复</text>
          </view>
        </view>
      </view>

      <view class="no-comment" v-if="!comments.length">暂无评论</view>
    </view>

    <!-- 评论输入框 -->
    <view class="comment-input">
      <input 
        class="input" 
        v-model="commentContent"
        :placeholder="replyTo ? `回复 ${replyTo.name}` : '说点什么...'"
        @confirm="submitComment"
      />
      <button 
        class="send-btn" 
        :disabled="!commentContent.trim()" 
        @tap="submitComment"
      >发送</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const postId = ref('')
const post = ref({})
const comments = ref([])
const commentContent = ref('')
const replyTo = ref(null)

// 处理认证错误
const handleAuthError = () => {
  uni.showToast({
    title: '请重新登录',
    icon: 'none'
  })
  uni.removeStorageSync('token')
  setTimeout(() => {
    uni.navigateTo({
      url: '/pages/login/index'
    })
  }, 1500)
}

// 获取页面参数
const getPageParams = () => {
  const pages = getCurrentPages()
  if (pages.length > 0) {
    const currentPage = pages[pages.length - 1]
    const options = currentPage.$page?.options || currentPage.options
    if (options && options.id) {
      postId.value = options.id
      getPostDetail()
      getComments()
    } else {
      uni.showToast({
        title: '参数错误',
        icon: 'none'
      })
      setTimeout(() => {
        uni.navigateBack()
      }, 1500)
    }
  }
}

// 获取帖子详情
const getPostDetail = () => {
  const token = uni.getStorageSync('token')
  if (!token) {
    handleAuthError()
    return
  }

  uni.request({
    url: `http://192.168.100.101:8080/api/posts/${postId.value}`,
    method: 'GET',
    header: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Device-Type': 'APP',
      'Authorization': `Bearer ${token}`
    },
    success: (response) => {
      if (response.statusCode === 200 && response.data.code === 200) {
        const postData = response.data.data
        post.value = {
          ...postData,
          name: postData.user?.name || '匿名用户',
          avatar: postData.user?.avatar ? `http://192.168.100.101:8080/api${postData.user.avatar}` : '/static/default-avatar.png',
          images: (postData.images || []).map(img => `http://192.168.100.101:8080/api${img}`)
        }
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
      console.error('获取帖子详情失败：', error)
      uni.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none'
      })
    }
  })
}

// 获取评论列表
const getComments = () => {
  const token = uni.getStorageSync('token')
  if (!token) {
    handleAuthError()
    return
  }

  uni.request({
    url: `http://192.168.100.101:8080/api/posts/${postId.value}/comments`,
    method: 'GET',
    header: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Device-Type': 'APP',
      'Authorization': `Bearer ${token}`
    },
    success: (response) => {
      console.log('评论数据：', response.data) // 添加日志查看返回数据结构
      if (response.statusCode === 200 && response.data.code === 200) {
        comments.value = response.data.data.map(comment => ({
          ...comment,
          name: comment.author?.name || '匿名用户',  // 改为 author
          avatar: comment.author?.avatar ? `http://192.168.100.101:8080/api${comment.author.avatar}` : '/static/default-avatar.png',  // 改为 author
          replies: (comment.replies || []).map(reply => ({
            ...reply,
            name: reply.author?.name || '匿名用户',  // 改为 author
            replyToName: reply.replyTo?.name || '匿名用户'
          }))
        }))
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
      console.error('获取评论列表失败：', error)
      uni.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none'
      })
    }
  })
}
// 提交评论
const submitComment = () => {
  if (!commentContent.value.trim()) {
    uni.showToast({
      title: '请输入评论内容',
      icon: 'none'
    })
    return
  }
  
  const token = uni.getStorageSync('token')
  if (!token) {
    handleAuthError()
    return
  }

  uni.request({
    url: `http://192.168.100.101:8080/api/posts/${postId.value}/comments`,
    method: 'POST',
    header: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Device-Type': 'APP',
      'Authorization': `Bearer ${token}`
    },
    data: {
      content: commentContent.value,
      replyTo: replyTo.value?.id
    },
    success: (response) => {
      if (response.statusCode === 200 && response.data.code === 200) {
        uni.showToast({
          title: '评论成功',
          icon: 'success'
        })
        commentContent.value = ''
        replyTo.value = null
        getComments()
        getPostDetail() // 刷新帖子信息以更新评论数
      } else if (response.statusCode === 403) {
        handleAuthError()
      } else {
        uni.showToast({
          title: response.data.message || '评论失败',
          icon: 'none'
        })
      }
    },
    fail: (error) => {
      console.error('提交评论失败：', error)
      uni.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none'
      })
    }
  })
}

// 回复评论
const handleReply = (comment) => {
  replyTo.value = comment
}

// 点赞
const handleLike = () => {
  const token = uni.getStorageSync('token')
  if (!token) {
    handleAuthError()
    return
  }

  uni.request({
    url: `http://192.168.100.101:8080/api/posts/${postId.value}/like`,
    method: 'POST',
    header: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Device-Type': 'APP',
      'Authorization': `Bearer ${token}`
    },
    success: (response) => {
      if (response.statusCode === 200 && response.data.code === 200) {
        post.value.isLiked = !post.value.isLiked
        post.value.likeCount = post.value.isLiked ? 
          (post.value.likeCount + 1) : 
          (post.value.likeCount - 1)
      } else if (response.statusCode === 403) {
        handleAuthError()
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
  getPageParams()
})
</script>

<style scoped>
.detail-container {
  min-height: 100vh;
  background-color: #f8f8f8;
  padding-bottom: 120rpx;
  box-sizing: border-box;
}

.post-content {
  background-color: #fff;
  padding: 30rpx;
  margin-bottom: 20rpx;
  overflow: visible;
}

.post-header {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
  overflow: visible;
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

.content-text {
  font-size: 30rpx;
  color: #333;
  line-height: 1.6;
  margin-bottom: 20rpx;
}

.image-list {
  margin-bottom: 20rpx;
  overflow: visible;
}

.image-grid {
  display: grid;
  gap: 6rpx;
  grid-template-columns: repeat(3, 1fr);
  overflow: visible;
}

.grid-image {
  width: 100%;
  
  border-radius: 8rpx;
  object-fit: cover;
  overflow: visible;
}

/* 单张图片 */
.grid-1 {
  grid-template-columns: 1fr;
}

.grid-1 .grid-image {
 
  width: 400rpx;
  margin: 0 auto;
}

/* 两张图片 */
.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

.grid-2 .grid-image {
  height: 360rpx;
}

/* 四张图片 */
.grid-4 {
  grid-template-columns: repeat(2, 1fr);
}

/* 其他数量的图片保持 3 列布局 */
.grid-3, .grid-5, .grid-6, .grid-7, .grid-8, .grid-9 {
  grid-template-columns: repeat(3, 1fr);
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

.action .icon-font {
  margin-right: 10rpx;
}

.action .active {
  color: #ff5500;
}

.comment-list {
  background-color: #fff;
  padding: 30rpx;
  margin-bottom: 200rpx;
}

.comment-title {
  font-size: 30rpx;
  font-weight: bold;
  margin-bottom: 30rpx;
}

.comment-item {
  display: flex;
  margin-bottom: 30rpx;
}

.comment-right {
  flex: 1;
  margin-left: 20rpx;
}

.comment-info {
  margin-bottom: 10rpx;
}

.comment-content {
  font-size: 28rpx;
  color: #333;
  line-height: 1.5;
}

.reply-list {
  background-color: #f8f8f8;
  padding: 20rpx;
  margin-top: 10rpx;
  border-radius: 8rpx;
}

.reply-item {
  font-size: 26rpx;
  margin-bottom: 10rpx;
}

.reply-username {
  color: #576b95;
}

.reply-text {
  color: #999;
  margin: 0 10rpx;
}

.reply-to {
  color: #576b95;
}

.comment-actions {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #576b95;
}

.no-comment {
  text-align: center;
  color: #999;
  font-size: 28rpx;
  padding: 40rpx 0;
}

.comment-input {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #fff;
  padding: 20rpx;
  display: flex;
  align-items: center;
  border-top: 1rpx solid #eee;
  z-index: 100;
}

.input {
  flex: 1;
  height: 72rpx;
  background-color: #f8f8f8;
  border-radius: 36rpx;
  padding: 0 30rpx;
  font-size: 28rpx;
  margin-right: 20rpx;
}

.send-btn {
  width: 120rpx;
  height: 72rpx;
  line-height: 72rpx;
  background-color: #ff5500;
  color: #fff;
  font-size: 28rpx;
  border-radius: 36rpx;
  padding: 0;
}

.send-btn[disabled] {
  background-color: #ffa07a;
  opacity: 0.7;
}
</style>