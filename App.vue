<template>
	<view>
	  <page></page>
	</view>
  </template>
	
  <script setup>
  import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
  
  let firstBackTime = 0
  
  // 检查更新
  const checkUpdate = () => {
	// 获取当前应用版本
	const currentVersion = '1.0.0' // 当前版本号
  
	uni.request({
	  url: 'http://192.168.100.101:8080/api/app/version',
	  method: 'GET',
	  success: (res) => {
		if (res.statusCode === 200 && res.data.code === 200) {
		  const serverVersion = res.data.data.version
		  const forceUpdate = res.data.data.forceUpdate
		  const downloadUrl = res.data.data.downloadUrl
		  const updateContent = res.data.data.updateContent
  
		  if (serverVersion > currentVersion) {
			uni.showModal({
			  title: '发现新版本',
			  content: updateContent || '有新版本可用，是否立即更新？',
			  confirmText: '立即更新',
			  cancelText: forceUpdate ? '退出应用' : '暂不更新',
			  success: (result) => {
				if (result.confirm) {
				  // #ifdef APP-PLUS
				  plus.runtime.openURL(downloadUrl)
				  // #endif
				} else if (forceUpdate) {
				  // #ifdef APP-PLUS
				  plus.runtime.quit()
				  // #endif
				}
			  }
			})
		  }
		}
	  },
	  fail: (err) => {
		console.error('检查更新失败：', err)
	  }
	})
  }
  
  // 刷新 token
  const refreshToken = () => {
	return new Promise((resolve, reject) => {
	  const token = uni.getStorageSync('token')
	  if (!token) {
		reject(new Error('无token'))
		return
	  }
  
	  uni.request({
		url: 'http://192.168.100.101:8080/api/auth/refresh',
		method: 'POST',
		header: {
		  'Authorization': `Bearer ${token}`,
		  'Accept': 'application/json',
		  'Device-Type': 'APP'
		},
		success: (response) => {
		  if (response.statusCode === 200 && response.data.code === 200) {
			uni.setStorageSync('token', response.data.data.token)
			resolve(response.data.data.token)
		  } else {
			reject(new Error('刷新token失败'))
		  }
		},
		fail: () => reject(new Error('网络请求失败'))
	  })
	})
  }
  
  // 检查登录状态
  const checkLoginStatus = async () => {
	// 获取当前页面路径
	const pages = getCurrentPages()
	const currentPage = pages[pages.length - 1]?.route || ''
	
	// 如果当前在登录页或注册页，不需要检查
	if (currentPage === 'pages/login/index' || currentPage === 'pages/user/register') {
	  return
	}
  
	const token = uni.getStorageSync('token')
	const userInfo = uni.getStorageSync('userInfo')
	
	if (!token || !userInfo) {
	  return false
	}
  
	try {
	  const response = await uni.request({
		url: 'http://192.168.100.101:8080/api/auth/verify',
		method: 'GET',
		header: {
		  'Content-Type': 'application/json',
		  'Accept': 'application/json',
		  'Device-Type': 'APP',
		  'Authorization': `Bearer ${token}`
		}
	  })
  
	  if (response.statusCode === 200 && response.data.code === 200) {
		return true
	  }
  
	  // token 过期，尝试刷新
	  if (response.statusCode === 403 || response.data.code === 403) {
		try {
		  await refreshToken()
		  return true
		} catch (error) {
		  console.error('刷新token失败：', error)
		  uni.showToast({
			title: '登录已过期，请重新登录',
			icon: 'none'
		  })
		  setTimeout(() => {
			uni.reLaunch({
			  url: '/pages/login/index'
			})
		  }, 1500)
		  return false
		}
	  }
  
	  return false
	} catch (error) {
	  console.error('验证token失败：', error)
	  uni.showToast({
		title: '网络异常，请检查网络设置',
		icon: 'none'
	  })
	  return false
	}
  }
  
  // 应用启动时
  onLaunch(() => {
	console.log('App Launch')
	// #ifdef APP-PLUS
	checkUpdate() // 检查更新
	// #endif
  })
  
  // 从后台恢复时
  onShow(() => {
	console.log('App Show')
	// 不在恢复时检查登录状态
  })
  
  // 进入后台时
  onHide(() => {
	console.log('App Hide')
  })
  
  // 内存警告
  const onMemoryWarning = () => {
	console.log('App MemoryWarning')
  }
  
  // 最后一页返回
  const onLastPageBackPress = () => {
	if (firstBackTime === 0) {
	  console.log('App LastPageBackPress')
	  uni.showToast({
		title: '再按一次退出应用',
		position: 'bottom',
	  })
	  firstBackTime = Date.now()
	  setTimeout(() => {
		firstBackTime = 0
	  }, 2000)
	} else if (Date.now() - firstBackTime < 2000) {
	  firstBackTime = Date.now()
	  uni.exit()
	}
  }
  
  // 退出应用
  const onExit = () => {
	console.log('App Exit')
  }
  
  // 导出生命周期函数
  defineExpose({
	onMemoryWarning,
	onLastPageBackPress,
	onExit
  })
  </script>
  
  <style>
  .uni-row {
	flex-direction: row;
  }
  
  .uni-column {
	flex-direction: column;
  }
  
  /* 可以添加一些全局样式 */
  page {
	background-color: #f8f8f8;
	font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif;
  }
  </style>