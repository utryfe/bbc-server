
/*
包含 n 个能操作 mongodb 数据库集合的 model 的模块
1. 连接数据库
  1.1. 引入 mongoose
  1.2. 连接指定数据库(URL 只有数据库是变化的)
  1.3. 获取连接对象
  1.4. 绑定连接完成的监听(用来提示连接成功)
2. 定义出对应特定集合的 Model 并向外暴露
  2.1. 字义 Schema(描述文档结构)
  2.2. 定义 Model(与集合对应, 可以操作集合)
  2.3. 向外暴露 Model
*/

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/bbc', { useNewUrlParser: true });

const conn = mongoose.connection;

conn.on('connected', function () {

  console.log('连接成功，YE~')
});

// 定义字义 Schema
const userSchema = mongoose.Schema({
  loginname: {type: String, required: true}, // 昵称
  password: {type: String, required: true},
  avatar_url: {type: String}, // 头像地址
  create_at: {type: String}, // 入职时间
  recent_topic: {type: Array},
  recent_replies: {type: Array},

});

// 定义 Model
const UserModel = mongoose.model('user', userSchema); // 集合为Users

function testSave() {
// user 数据对象
const user = {
  email: 'duanyuting@utry.cn'
};
const userModel = new UserModel(user); // 保存到数据库
userModel.save(function (err, user) {
  console.log('save', err, user) })
}

// testSave();
// 向外暴露 Model
// module.exports = xxx 只能暴露一次
// exports.xxx = value exports.yyy = value2 可暴露多次
exports.UserModel = UserModel;
