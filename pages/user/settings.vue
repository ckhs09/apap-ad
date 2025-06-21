<template>
  <view class="container">
    <!-- 头像部分 -->
    <view class="avatar-section" @click="chooseAvatar">
      <image 
        class="avatar" 
        :src="userInfo.avatar ? baseUrl + userInfo.avatar : '/static/default-avatar.png'" 
        mode="aspectFill"
      ></image>
      <text class="tip">点击更换头像</text>
    </view>
    
    <!-- 基本信息表单 -->
    <view class="form-section">
      <view class="section-title">基本信息</view>
      <view class="form-item">
        <text class="label">昵称</text>
        <input class="input" v-model="userInfo.name" placeholder="请输入昵称" />
      </view>
      
      <view class="form-item">
        <text class="label">专业</text>
        <input class="input" v-model="userInfo.major" placeholder="请输入专业" disabled />
      </view>
      
      <view class="form-item">
        <text class="label">年级</text>
        <input class="input" v-model="userInfo.grade" placeholder="请输入年级" disabled />
      </view>
    </view>
 
    <!-- 修改密码表单 -->
    <view class="form-section">
      <view class="section-title">修改密码</view>
      
      <view class="form-item">
        <text class="label">原密码</text>
        <input 
          class="input" 
          v-model="passwordForm.oldPassword" 
          type="password" 
          placeholder="请输入原密码" 
        />
      </view>
      
      <view class="form-item">
        <text class="label">新密码</text>
        <input 
          class="input" 
          v-model="passwordForm.newPassword" 
          type="password" 
          placeholder="请输入新密码" 
        />
      </view>
      
      <view class="form-item">
        <text class="label">确认密码</text>
        <input 
          class="input" 
          v-model="passwordForm.confirmPassword" 
          type="password" 
          placeholder="请再次输入新密码" 
        />
      </view>
    </view>
 
    <!-- 保存按钮 -->
    <view class="button-section">
      <button 
        class="save-button" 
        :class="{'loading': isSubmitting}"
        @click="handleSave"
        :disabled="isSubmitting"
      >
        {{ isSubmitting ? '保存中...' : '保存修改' }}
      </button>
    </view>
  </view>
 </template>
 
 <script setup>
 import { ref, onMounted } from 'vue'
 // 基础URL
 const baseUrl = 'http://192.168.100.101:8080'
 // 表单数据
 const userInfo = ref({
  avatar: '',
  name: '',
  major: '',
  grade: ''
 })
 const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
 })
 // 提交状态
 const isSubmitting = ref(false)
 
 // 处理认证错误
 const handleAuthError = () => {
  uni.showToast({
    title: '请重新登录',
    icon: 'none'
  })
  uni.removeStorageSync('token')
  uni.removeStorageSync('userInfo')
  setTimeout(() => {
    uni.navigateTo({
      url: '/pages/login/index'
    })
  }, 1500)
 }
 
 // 获取用户信息
 const getUserInfo = () => {
  const token = uni.getStorageSync('token')
  if (!token) {
    handleAuthError()
    return
  }
   uni.request({
    url: `${baseUrl}/api/user/info`,
    method: 'GET',
    header: {
      'Authorization': `Bearer ${token}`
    },
    success: (res) => {
      if (res.data.code === 200) {
        userInfo.value = {
          ...res.data.data,
          avatar: res.data.data.avatar?.startsWith('http') 
            ? res.data.data.avatar 
            : res.data.data.avatar
        }
        uni.setStorageSync('userInfo', userInfo.value)
      } else if (res.statusCode === 403) {
        handleAuthError()
      }
    }
  })
 }
 
 // 选择头像
 const chooseAvatar = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      console.log('选择图片成功：', res.tempFilePaths[0])
      const tempFilePath = res.tempFilePaths[0]
      if (tempFilePath) {
        uploadAvatar(tempFilePath)
      }
    }
 })
}
 // 上传头像
 const uploadAvatar = (filePath) => {
  const token = uni.getStorageSync('token')
  if (!token) {
    handleAuthError()
    return
  }
  
  uni.showLoading({
    title: '上传中...'
  })

  uni.uploadFile({
    url: `${baseUrl}/upload/image`,
    filePath: filePath,
    name: 'file',
    header: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    success: (uploadRes) => {
      console.log('上传响应：', uploadRes)
      try {
        const data = JSON.parse(uploadRes.data)
        if (uploadRes.statusCode === 200 && data.code === 200) {
          // 更新头像URL
          userInfo.value.avatar = data.data
 
          // 调用更新用户信息接口
          uni.request({
            url: `${baseUrl}/api/user/update`,
            method: 'POST',
            header: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            data: {
              avatar: data.data,
              name: userInfo.value.name
            },
            success: (updateRes) => {
              console.log('更新用户信息响应：', updateRes)
              if (updateRes.statusCode === 200 && updateRes.data.code === 200) {
                uni.setStorageSync('userInfo', userInfo.value)
                uni.showToast({
                  title: '头像更新成功',
                  icon: 'success'
                })
              } else {
                uni.showToast({
                  title: updateRes.data?.message || '更新失败',
                  icon: 'none'
                })
              }
            },
            fail: (error) => {
              console.error('更新用户信息失败：', error)
              uni.showToast({
                title: '更新失败',
                icon: 'none'
              })
            }
          })
        } else {
          uni.showToast({
            title: data.message || '上传失败',
            icon: 'none'
          })
        }
      } catch (e) {
        console.error('解析响应失败：', e, uploadRes.data)
        uni.showToast({
          title: '上传失败',
          icon: 'none'
        })
      }
    },
    fail: (error) => {
      console.error('上传头像失败：', error)
      uni.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none'
      })
    },
    complete: () => {
      uni.hideLoading()
    }
  })
}
 // 保存修改
 const handleSave = () => {
  if (isSubmitting.value) return
 
  // 验证表单
  if (!userInfo.value.name) {
    uni.showToast({
      title: '请输入昵称',
      icon: 'none'
    })
    return
  }
 
  // 如果填写了密码，则验证密码
  if (passwordForm.value.oldPassword || passwordForm.value.newPassword || passwordForm.value.confirmPassword) {
    if (!passwordForm.value.oldPassword) {
      uni.showToast({
        title: '请输入原密码',
        icon: 'none'
      })
      return
    }
    if (!passwordForm.value.newPassword) {
      uni.showToast({
        title: '请输入新密码',
        icon: 'none'
      })
      return
    }
    if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
      uni.showToast({
        title: '两次密码输入不一致',
        icon: 'none'
      })
      return
    }
  }
 
  const token = uni.getStorageSync('token')
  if (!token) {
    handleAuthError()
    return
  }
 
  isSubmitting.value = true
 
  // 构建更新数据
  const updateData = {
    name: userInfo.value.name
  }
 
  // 如果有修改密码，添加密码相关字段
  if (passwordForm.value.oldPassword && passwordForm.value.newPassword) {
    updateData.oldPassword = passwordForm.value.oldPassword
    updateData.newPassword = passwordForm.value.newPassword
  }
 
  uni.request({
    url: `${baseUrl}/api/user/update`,
    method: 'POST',
    header: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    data: updateData,
    success: (response) => {
      if (response.statusCode === 200 && response.data.code === 200) {
        uni.setStorageSync('userInfo', userInfo.value)
        uni.showToast({
          title: '保存成功',
          icon: 'success'
        })
        if (passwordForm.value.newPassword) {
          setTimeout(() => {
            uni.removeStorageSync('token')
            uni.removeStorageSync('userInfo')
            uni.reLaunch({
              url: '/pages/login/index'
            })
          }, 1500)
        }
      } else if (response.statusCode === 403) {
        handleAuthError()
      } else {
        uni.showToast({
          title: response.data?.message || '保存失败',
          icon: 'none'
        })
      }
    },
    fail: (error) => {
      console.error('更新用户信息失败：', error)
      uni.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none'
      })
    },
    complete: () => {
      isSubmitting.value = false
    }
  })
 }

 // 页面加载时获取用户信息
 onMounted(() => {
  getUserInfo()
  })

 </script>
 
 <style scoped>
 .container {
  padding: 30rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
 }
 
 .avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 40rpx 0;
  background-color: #fff;
  padding: 40rpx;
  border-radius: 16rpx;
 }
 
 .avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  margin-bottom: 20rpx;
  border: 2rpx solid #eee;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
 }
 
 .tip {
  font-size: 28rpx;
  color: #666;
 }
 
 .form-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
 }
 
 .section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 30rpx;
  padding-bottom: 20rpx;
  border-bottom: 2rpx solid #f0f0f0;
 }
 
 .form-item {
  margin-bottom: 30rpx;
 }
 
 .label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 16rpx;
 }
 
 .input {
  width: 100%;
  height: 80rpx;
  background-color: #f8f8f8;
  border-radius: 8rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
  border: 2rpx solid #f0f0f0;
 }
 
 .input:disabled {
  background-color: #f5f5f5;
  color: #999;
 }
 
 .button-section {
  margin: 60rpx 0;
  padding: 0 30rpx;
 }
 
 .save-button {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(to right, #007AFF, #0056b3);
  color: #fff;
  font-size: 32rpx;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  box-shadow: 0 6rpx 16rpx rgba(0, 122, 255, 0.3);
  transition: all 0.3s ease;
 }
 
 .save-button:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 12rpx rgba(0, 122, 255, 0.2);
 }
 
 .save-button.loading {
  opacity: 0.8;
  background: #999;
 }
 
 .save-button[disabled] {
  background: #ccc;
  box-shadow: none;
 }
 </style>
 