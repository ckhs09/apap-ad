<template>
  <view class="user-container">
    <!-- 用户信息卡片 -->
    <view class="user-card">
      <view class="user-info">
        <image 
          class="avatar" 
          :src="userInfo.avatar ?  userInfo.avatar : '/static/user_avatar.png' " 
          mode="aspectFill "
        ></image>
        <view class="info-right">
          <text class="name">{{ userInfo.name || '未登录' }}</text>
          <text class="student-id">{{ userInfo.studentId || '点击登录' }}</text>
        </view>
      </view>
    </view>

    <!-- 功能列表 -->
    <view class="menu-list">
      <view class="menu-group">
        <view class="menu-item" @tap="goToMyPosts('love')">
          <text class="menu-text">我的表白</text>
          <text class="arrow">></text>
        </view>
        <view class="menu-item" @tap="goToMyPosts('market')">
          <text class="menu-text">我的二手</text>
          <text class="arrow">></text>
        </view>
        <view class="menu-item" @tap="goToMyPosts('job')">
          <text class="menu-text">我的兼职</text>
          <text class="arrow">></text>
        </view>
      </view>

      <view class="menu-group">
        <view class="menu-item" @tap="goToMyCollections">
          <text class="menu-text">我的收藏</text>
          <text class="arrow">></text>
        </view>
        <view class="menu-item" @tap="goToSettings">
          <text class="menu-text">修改资料</text>
          <text class="arrow">></text>
        </view>
      </view>

      <view class="menu-group">
        <view class="menu-item" @tap="handleLogout" v-if="isLoggedIn">
          <text class="menu-text logout">退出登录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

const userInfo = ref({})

// 判断是否登录
const isLoggedIn = computed(() => {
  return !!userInfo.value.studentId
})

// 获取用户信息
const getUserInfo = () => {
  const token = uni.getStorageSync('token')
  if (!token) {
    userInfo.value = {}
    return
  }

  const info = uni.getStorageSync('userInfo')
  if (info) {
    userInfo.value = info
    userInfo.value.avatar = `http://192.168.100.101:8080/api${userInfo.value.avatar}`
    console.log('用户信息:', userInfo.value); // 添加调试信息
  } else {
    console.warn('未找到用户信息');
  }
}

// 跳转到我的帖子
const goToMyPosts = (type) => {
  if (!isLoggedIn.value) {
    goToLogin()
    return
  }
  uni.navigateTo({
    url: `/pages/user/posts?type=${type}`
  })
}

// 跳转到我的收藏
const goToMyCollections = () => {
  if (!isLoggedIn.value) {
    goToLogin()
    return
  }
  uni.navigateTo({
    url: '/pages/user/collections'
  })
}

// 跳转到设置页面
const goToSettings = () => {
  if (!isLoggedIn.value) {
    goToLogin()
    return
  }
  uni.navigateTo({
    url: '/pages/user/settings'
  })
}

// 跳转到登录页
const goToLogin = () => {
  uni.navigateTo({
    url: '/pages/login/index'
  })
}

// 退出登录
const handleLogout = () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        uni.removeStorageSync('token')
        uni.removeStorageSync('userInfo')
        userInfo.value = {}
        uni.showToast({
          title: '已退出登录',
          icon: 'success'
        })
      }
    }
  })
}

// 页面加载时获取用户信息
onMounted(() => {
  getUserInfo()
})
</script>

<style scoped>
.user-container {
  min-height: 100vh;
  background-color: #f8f8f8;
  padding: 20rpx;
}

.user-card {
  background-color: #fff;
  border-radius: 12rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.user-info {
  display: flex;
  align-items: center;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  margin-right: 30rpx;
}

.info-right {
  flex: 1;
}

.name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
  display: block;
}

.student-id {
  font-size: 28rpx;
  color: #666;
}

.menu-list {
  background-color: #fff;
  border-radius: 12rpx;
}

.menu-group {
  margin-bottom: 20rpx;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  border-bottom: 1rpx solid #eee;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-text {
  font-size: 28rpx;
  color: #333;
}

.arrow {
  font-size: 28rpx;
  color: #999;
}

.logout {
  color: #ff5500;
}
</style>