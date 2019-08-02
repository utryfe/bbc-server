
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

// 连接数据库
conn.on('connected', function () {

  console.log('连接成功，YE~')
});

// 定义用户数据模型 Schema
const userSchema = mongoose.Schema({
  loginname: {type: String, required: true}, // 昵称
  password: {type: String, required: true},
  avatar_url: {type: String}, // 头像地址
  create_at: {type: Date, default: Date.now}, // 注册时间
  recent_topics: {type: Array},
  recent_replies: {type: Array},

});

// 定义用户收藏数据模型 Schema
const collectSchema = mongoose.Schema({
  loginname: {type: String, required: true},
  collected_topics: {type: Array, required: true}
});

// 定义所有文章的数据模型 Schema
const topicSchema = mongoose.Schema({
  author: {type: Object, required: true },
  author_id: {type: String, required: true },
  content: {type: String, required: true },
  create_at: {type: Date, default: Date.now},
  good: {type: Boolean },
  is_collect: { type: Boolean },
  last_reply_at: {type: Date, default: Date.now},
  replies: {type: Array},
  reply_count: { type: Number },
  tab: { type: String, required: true },
  title: { type: String, required: true },
  top: { type: Boolean },
  visit_count: {type: Number}
});

// 定义 Model
const UserModel = mongoose.model('user', userSchema); // 集合为 users
const CollectModel = mongoose.model('collect', collectSchema); // collects
const TopicModel = mongoose.model('topic', topicSchema); // topics

function test() {
  // user 数据对象
  const collect = {
    loginname: '借月色行凶',
    collected_topics: []
  };
  const collectModel = new CollectModel(collect); // 保存到数据库
  collectModel.save(function (err, user) {
    console.log('save', err, user) })
}
 //test();

function test1() {
  // user 数据对象
  const collect = {
    author: {
      loginname: 'abc',
      avatar_url: "https://avatars2.githubusercontent.com/u/40653619?v=4&s=120",
    },
    author_id: '5d429bbdfd0f3ae9a8290d11',
    content: "# 测试",
    create_at: new Date(),
    tab: 'all',
    title: '这是一个测试文章'
  };
  const topicModel = new TopicModel(collect); // 保存到数据库
  topicModel.save(function (err, user) {
    console.log('save', err, user) })
}
//test1();

// 向外暴露 Model
// module.exports = xxx 只能暴露一次
// exports.xxx = value exports.yyy = value2 可暴露多次
exports.UserModel = UserModel;
exports.CollectModel = CollectModel;
exports.TopicModel = TopicModel;
