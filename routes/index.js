var express = require('express');
var router = express.Router();
const md5 = require('blueimp-md5');
const UserModel = require('../db/models').UserModel; // 一个一个引入的
const filter = {password: 0, __v: 0}; // 查询时过滤出指定的属性

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

// 注册
router.post('/register', function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  // 读取请求参数
  const { loginname, password} = req.body;
  // 处理: 判断用户是否存在
  // 查询(根据username)
  UserModel.findOne({loginname}, function (err, user) {
    if (user) {
      res.send({success: false, msg: '此用户已存在'})
    } else {
      new UserModel({loginname, password:md5(password)}).save(function (err, usr) {
        // 生成一个cookie(userid: user.id), 并交给浏览器保存
        res.cookie('userid', usr._id, {maxAge: 1000*60*60*24*7}); // 维持一天
        const data = {
          avatar_url: "https://avatars2.githubusercontent.com/u/40653619?v=4&s=120",
          id: usr._id,
          loginname,
          success: true
        };
        res.send(data)
      });
    }
  })

  // 返回响应数据
});

// 登陆
router.post('/login', function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  const {loginname, password} = req.body;
  UserModel.findOne({loginname, password: md5(password)}, filter, function (err, usr) {
    if(usr) {
      // 生成一个cookie(userid: user.id), 并交给浏览器保存
      res.cookie('userid', usr._id, {maxAge: 1000*60*60*24*7}); // 维持一天
      const data = {
        avatar_url: "https://avatars2.githubusercontent.com/u/40653619?v=4&s=120",
        id: usr._id,
        loginname,
        success: true
      };
      res.send(data)
    } else {
      res.send({success: false, msg: '很遗憾，登录信息不正确!'});
    }
  })
});


// 获取用户信息
router.get('/user',function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  res.send({success: true, data: []})
});

module.exports = router;
