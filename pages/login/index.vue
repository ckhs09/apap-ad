<template>
  <view class="login-container">
    <view class="form-item">
      <text class="label">学号</text>
      <input 
        class="input" 
        type="number" 
        max-length="10"
        v-model="formData.studentId" 
        placeholder="请输入学号"
      />
    </view>

    <view class="form-item">
      <text class="label">密码</text>
      <input 
        class="input" 
        type="password" 
        v-model="formData.password" 
        placeholder="请输入密码"
      />
    </view>

    <button class="submit-btn" @tap="handleLogin" :disabled="isSubmitting">
      {{ isSubmitting ? '登录中...' : '登录' }}
    </button>

    <view class="register-link" @tap="goToRegister">
      还没有账号？去注册
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
declare const uni: any
const formData = ref({
  studentId: '',
  password: ''
})

const isSubmitting = ref(false)

// 表单验证
const validateForm = () => {
  if (!formData.value.studentId) {
    uni.showToast({
      title: '请输入学号',
      icon: 'none'
    })
    return false
  }
  if (formData.value.studentId.length !== 10) {
    uni.showToast({
      title: '学号必须是10位',
      icon: 'none'
    })
    return false
  }
  if (!formData.value.password) {
    uni.showToast({
      title: '请输入密码',
      icon: 'none'
    })
    return false
  }
  return true
}
// 登录处理
const handleLogin = async () => {
  // 表单验证
  if (!validateForm()) return
  
  // 设置加载状态
  isSubmitting.value = true

  uni.request({
    url: 'http://192.168.100.101:8080/api/login',  // 使用你的实际IP地址
    method: 'POST',
    header: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Device-Type': 'APP'
    },
    data: {
      studentId: formData.value.studentId,
      password: formData.value.password
    },
    timeout: 10000,
    dataType: 'json',
    success: (response) => {
      console.log('登录响应：', response)
      
      if (response.statusCode === 200 && response.data.code === 200) {
        // 保存登录信息
        const { token, userInfo } = response.data.data
        uni.setStorageSync('token', token)
        uni.setStorageSync('userInfo', userInfo)
        
        // 显示成功提示并跳转
        uni.showToast({
          title: '登录成功',
          icon: 'success',
          success: () => {
            setTimeout(() => {
              uni.switchTab({
                url: '/pages/love/index'
              })
            }, 1500)
          }
        })
      } else {
        // 处理登录失败
        uni.showToast({
          title: response.data.message || '登录失败',
          icon: 'none'
        })
      }
    },
    fail: (error) => {
      console.error('登录失败：', error)
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

// 跳转到注册页
const goToRegister = () => {
  uni.navigateTo({
    url: '/pages/user/register'
  })
}
</script>

<style scoped>
.login-container {
  padding: 40rpx;
}

.form-item {
  margin-bottom: 30rpx;
}

.label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 10rpx;
}

.input {
  width: 100%;
  height: 80rpx;
  background-color: #f8f8f8;
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.submit-btn {
  margin-top: 60rpx;
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background-color: #ff5500;
  color: #fff;
  font-size: 32rpx;
  border-radius: 44rpx;
}

.submit-btn[disabled] {
  background-color: #ffa07a;
  opacity: 0.7;
}

.submit-btn:active {
  opacity: 0.8;
}

.register-link {
  text-align: center;
  font-size: 28rpx;
  color: #666;
  margin-top: 30rpx;
}

.register-link:active {
  opacity: 0.7;
}
</style>