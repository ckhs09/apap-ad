<template>
  <view class="register-container">
    <!-- 头像上传 -->
    <view class="avatar-upload">
      <image 
        class="avatar" 
        :src="formData.avatarUrl || '/static/user_avatar.png'" 
        mode="aspectFill"
        @tap="chooseAvatar"
      ></image>
      <text class="upload-text">点击上传头像</text>
    </view>
    
    <!-- 表单内容 -->
    <view class="form-item">
      <text class="label">学号</text>
      <input 
        class="input" 
        type="number" 
        maxlength="10"
        v-model="formData.studentId" 
        placeholder="请输入学号"
      />
    </view>
    
    <view class="form-item">
      <text class="label">姓名</text>
      <input 
        class="input" 
        type="text" 
        maxlength="10"
        v-model="formData.name" 
        placeholder="请输入姓名"
      />
    </view>
    
    <view class="form-item">
      <text class="label">专业</text>
      <input 
        class="input" 
        type="text" 
        maxlength="20"
        v-model="formData.major" 
        placeholder="请输入专业"
      />
    </view>
    
    <view class="form-item">
      <text class="label">年级</text>
      <picker 
        class="picker" 
        mode="selector" 
        :range="grades" 
        @change="handleGradeChange"
      >
        <view class="picker-text">{{ formData.grade || '请选择年级' }}</view>
      </picker>
    </view>
    
    <view class="form-item">
      <text class="label">密码</text>
      <input 
        class="input" 
        type="password" 
        maxlength="20"
        v-model="formData.password" 
        placeholder="请输入密码（6-20位）"
      />
    </view>
    
    <view class="form-item">
      <text class="label">确认密码</text>
      <input 
        class="input" 
        type="password" 
        maxlength="20"
        v-model="formData.confirmPassword" 
        placeholder="请再次输入密码"
      />
    </view>
    
    <button class="submit-btn" @tap="handleRegister" :disabled="isSubmitting">
      {{ isSubmitting ? '注册中...' : '注册' }}
    </button>
    
    <view class="login-link" @tap="goToLogin">
      已有账号？去登录
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

// 年级列表
const grades = ['2020级', '2021级', '2022级', '2023级','2024级']

// 表单数据
const formData = ref({
  studentId: '',    // 学号
  password: '',     // 密码
  confirmPassword: '', // 确认密码
  name: '',         // 姓名
  major: '',        // 专业
  grade: '',        // 年级
  avatarPath: '',   // 头像临时路径
  avatarUrl: ''     // 头像预览URL
})

// 提交状态
const isSubmitting = ref(false)

// 选择头像
const chooseAvatar = () => {
  uni.chooseImage({
    count: 1,  // 只选一张
    success: (res) => {
      formData.value.avatarPath = res.tempFilePaths[0];
      formData.value.avatarUrl = res.tempFilePaths[0];  // 用于预览显示
    },
    fail: (err) => {
      console.error('选择头像失败：', err);
      uni.showToast({
        title: '选择头像失败',
        icon: 'none'
      });
    }
  });
};

// 年级选择处理
const handleGradeChange = (e) => {
  formData.value.grade = grades[e.detail.value];
}

// 注册处理
const handleRegister = () => {
  // 表单验证
  if (!formData.value.studentId || !formData.value.password || !formData.value.name) {
    uni.showToast({
      title: '请填写必要信息',
      icon: 'none'
    });
    return;
  }
  if (!formData.value.avatarPath) {
    uni.showToast({
      title: '请上传头像',
      icon: 'none'
    });
    return;
  }
  if (!formData.value.major) {
    uni.showToast({
      title: '请输入专业',
      icon: 'none'
    });
    return;
  }
  if (!formData.value.grade) {
    uni.showToast({
      title: '请选择年级',
      icon: 'none'
    });
    return;
  }
  if (formData.value.password.length < 6) {
    uni.showToast({
      title: '密码至少6位',
      icon: 'none'
    });
    return;
  }
  if (formData.value.password !== formData.value.confirmPassword) {
    uni.showToast({
      title: '两次密码不一致',
      icon: 'none'
    });
    return;
  }

  isSubmitting.value = true;

  // 发送请求
  uni.uploadFile({
    url: 'http://192.168.100.101:8080/api/register',
    filePath: formData.value.avatarPath,
    name: 'file',
    header: {
      'Content-Type': 'multipart/form-data', // 设置请求头
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
          title: '注册成功',
          icon: 'success'
        });
        // 跳转到登录页
        setTimeout(() => {
          uni.navigateTo({
            url: '/pages/login/index'
          });
        }, 1500);
      } else {
        uni.showToast({
          title: result.message || '注册失败',
          icon: 'none'
        });
      }
    },
    fail: (err) => {
      console.error('注册失败：', err);
      uni.showToast({
        title: '注册失败',
        icon: 'none'
      });
    },
    complete: () => {
      isSubmitting.value = false;
    }
  });
};

// 跳转到登录页
const goToLogin = () => {
  uni.navigateTo({
    url: '/pages/login/index'
  });
};
</script>

<style scoped>
.register-container {
  padding: 40rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.avatar-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40rpx;
}

.avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  margin-bottom: 20rpx;
  border: 2rpx solid #eee;
}

.upload-text {
  font-size: 24rpx;
  color: #666;
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

.picker {
  width: 100%;
  height: 80rpx;
  background-color: #f8f8f8;
  border-radius: 8rpx;
  padding: 0 20rpx;
}

.picker-text {
  line-height: 80rpx;
  font-size: 28rpx;
  color: #333;
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

.login-link {
  text-align: center;
  font-size: 28rpx;
  color: #666;
  margin-top: 30rpx;
}

.login-link:active {
  opacity: 0.7;
}
</style>