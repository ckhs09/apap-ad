<template>
  <view class="post-container">
    <!-- 帖子类型选择 -->
    <view class="form-item">
      <picker 
        mode="selector" 
        :range="postTypes" 
        :range-key="'name'"
        @change="handleTypeChange"
      >
        <view class="type-picker">
          <text>{{ selectedType.name || '选择类型' }}</text>
          <text class="arrow">></text>
        </view>
      </picker>
    </view>

    <!-- 帖子内容 -->
    <view class="form-item">
      <textarea 
        class="content-input"
        v-model="content"
        placeholder="说点什么吧..."  
        maxlength="500"
      />
      <view class="word-count">{{ content.length }}/500</view>
    </view>

    <!-- 图片上传 -->
    <view class="form-item">
      <view class="image-list">
        <view 
          class="image-item" 
          v-for="(image, index) in images" 
          :key="index"
        >
          <image :src="image" mode="aspectFill"></image>
          <text class="delete-btn" @tap="deleteImage(index)">×</text>
        </view>
        <view 
          class="upload-btn" 
          @tap="chooseImage" 
          v-if="images.length < 9"
        >
          <text class="plus">+</text>
        </view>
      </view>
    </view>

    <!-- 发布按钮 -->
    <button 
      class="submit-btn" 
      @tap="handleSubmit" 
      :disabled="isSubmitting"
    >
      {{ isSubmitting ? '发布中...' : '发布' }}
    </button>
  </view>
</template>

<script setup>
import { ref } from 'vue'
 
// 帖子类型列表
const postTypes = [
  { id: 'love', name: '表白墙' },
  { id: 'market', name: '二手交易' },
  { id: 'job', name: '兼职信息' }
]

const selectedType = ref({})
const content = ref('')
const images = ref([])
const isSubmitting = ref(false)

// 选择帖子类型
const handleTypeChange = (e) => {
  selectedType.value = postTypes[e.detail.value]
}

// 选择图片
const chooseImage = () => {
  uni.chooseImage({
    count: 9 - images.value.length,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      images.value = [...images.value, ...res.tempFilePaths]
    },
    fail: (err) => {
      uni.showToast({
        title: '选择图片失败',
        icon: 'none'
      })
    }
  })
}

// 删除图片
const deleteImage = (index) => {
  images.value.splice(index, 1)
}

// 表单验证
const validateForm = () => {
  if (!selectedType.value.id) {
    uni.showToast({
      title: '请选择发布类型',
      icon: 'none' 
    })
    return false
  }
  if (!content.value.trim()) {
    uni.showToast({
      title: '请输入内容',
      icon: 'none'
    })
    return false
  }
  return true
}

// 图片上传函数
const uploadImage = (filePath) => {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token')
    if (!token) {
      reject(new Error('请先登录'))
      return
    }

    uni.uploadFile({
      url: 'http://192.168.100.101:8080/api/upload/image',  // 修改为正确的接口路径
      filePath,
      name: 'file',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        console.log('上传响应：', res)
        try {
          const data = JSON.parse(res.data)
          if (data.code === 200) {
            resolve(data.data)  // 后端返回的完整URL路径
          } else {
            reject(new Error(data.message || '图片上传失败'))
          }
        } catch (e) {
          console.error('解析响应失败：', e, res.data)
          reject(new Error('图片上传响应解析失败'))
        }
      },
      fail: (err) => {
        console.error('上传失败：', err)
        reject(new Error('图片上传失败：' + err.errMsg))
      }
    })
  })
}

// 发布帖子函数
const createPost = (postData) => {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token')
    if (!token) {
      reject(new Error('请先登录'))
      return
    }

    uni.request({
      url: 'http://192.168.100.101:8080/api/posts',
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      data: postData,
      success: (response) => {
        if (response.statusCode === 200 && response.data.code === 200) {
          resolve(response.data.data)
        } else if (response.statusCode === 403) {
     
          reject(new Error(' 403'))
        } else {
          reject(new Error(response.data.message || '发布失败'))
        }
      },
      fail: (error) => reject(new Error('网络错误，请稍后重试'))
    })
  })
}

// 主提交函数
const handleSubmit = async () => {
  if (!validateForm()) return
  
  isSubmitting.value = true
  uni.showLoading({ title: '发布中...' })

  try {
    //检查登录状态
    const token = uni.getStorageSync('token')
    if (!token) {
      throw new Error('请先登录')
    }

    // 上传图片
    const uploadedImages = []
    if (images.value.length > 0) {
      uni.showLoading({ title: '上传图片中...' })
      for (let image of images.value) {
        try {
          const imageUrl = await uploadImage(image)
          uploadedImages.push(imageUrl)
        } catch (error) {
          console.error('图片上传失败：', error)
          throw new Error('图片上传失败，请重试')
        }
      }
    }

    // 发布帖子
    const postData = {
      type: selectedType.value.id,
      content: content.value,
      images: uploadedImages
    }
    
    await createPost(postData)
    
    // 发布成功
    uni.hideLoading()
    uni.showToast({
      title: '发布成功',
      icon: 'success',
      success: () => {
        uni.$emit('post-created')
        setTimeout(() => {
          uni.navigateBack()
        }, 1500)
      }
    })

  } catch (error) {
    console.error('发布失败：', error)
    uni.hideLoading()
    
    if (error.message.includes('登录')) {
      uni.showToast({
        title: error.message,
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
        title: error.message || '发布失败，请重试',
        icon: 'none'
      })
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.post-container {
  padding: 30rpx;
}

.form-item {
  margin-bottom: 30rpx;
}

.type-picker {
  height: 80rpx;
  background-color: #f8f8f8;
  border-radius: 8rpx;
  padding: 0 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.arrow {
  color: #999;
}

.content-input {
  width: 100%;
  height: 300rpx;
  background-color: #f8f8f8;
  border-radius: 8rpx;
  padding: 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.word-count {
  text-align: right;
  font-size: 24rpx;
  color: #999;
  margin-top: 10rpx;
}

.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.image-item, .upload-btn {
  width: 200rpx;
  height: 200rpx;
  background-color: #f8f8f8;
  border-radius: 8rpx;
  position: relative;
}

.image-item image {
  width: 100%;
  height: 100%;
  border-radius: 8rpx;
}

.delete-btn {
  position: absolute;
  right: -16rpx;
  top: -16rpx;
  width: 40rpx;
  height: 40rpx;
  line-height: 40rpx;
  text-align: center;
  background-color: rgba(0, 0, 0, 0.5);
  color: #fff;
  border-radius: 50%;
}

.upload-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}

.plus {
  font-size: 60rpx;
  color: #999;
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
</style>