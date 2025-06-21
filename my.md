# 用户信息相关 API 更新文档

## 新增字段
用户信息新增以下字段：
- `avatar`: 头像URL
- `coverImage`: 封面图URL
- `bio`: 个人简介
- `tags`: 标签

## 新增接口

### 1. 上传头像

http
POST /user/avatar
Header:
Authorization: Bearer <token>
Body: FormData
file: (图片文件)
Response:
{
"code": 200,
"data": {
"avatar": "/uploads/avatars/xxx.jpg"
}
}



### 2. 上传封面图

http
POST /user/cover
Header:
Authorization: Bearer <token>
Body: FormData
file: (图片文件)
Response:
{
"code": 200,
"data": {
"coverImage": "/uploads/covers/xxx.jpg"
}
}



### 3. 获取用户信息 (新增字段)

http
GET /user/info
Header:
Authorization: Bearer <token>
Response:
{
"code": 200,
"data": {
"id": "2021001",
"name": "张三",
"major": "计算机",
"grade": "2021",
"avatar": "/uploads/avatars/xxx.jpg",
"coverImage": "/uploads/covers/xxx.jpg",
"bio": "这是我的简介",
"tags": "Java,Spring"
}
}
