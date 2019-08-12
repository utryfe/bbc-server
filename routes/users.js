var express = require('express');
var router = express.Router();
var md5 = require('blueimp-md5');
var async = require('async');
const UserModel = require('../db/models').UserModel; // 一个一个引入的
const CollectModel = require('../db/models').CollectModel;
const TopicModel = require('../db/models').TopicModel;
const MessageModel = require('../db/models').MessageModel;
const filter = {password: 0, __v: 0}; // 查询时过滤出指定的属性
/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

// 【用户】用户注册
router.post('/register', function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  // 读取请求参数
  const { loginname, password, avatar_url} = req.body;
  // 处理: 判断用户是否存在
  // 查询(根据username)
  UserModel.findOne({loginname}, function (err, user) {
    if (user) {
      res.send({success: false, msg: '此用户已存在'})
    } else {

      // 用户注册成功
      const c = function (callback) {
        new UserModel({
          create_at: new Date(), // 注册时间
          loginname, // 昵称
          password: md5(password), // 密码
          recent_topics: [],
          recent_replies: [],
          avatar_url, // 头像
        }).save(function (err, usr) {
          // 生成一个cookie(userid: user.id), 并交给浏览器保存
          res.cookie('userid', usr._id, {maxAge: 1000*60*60*24*7}); // 维持一天
          const {avatar_url, loginname} = usr;
          const data = {
            avatar_url,
            loginname,
            id: usr._id,
            success: true
          };
          callback(null, data);
        });
      };

      // 默认存一个空的收藏合辑
      const a = function (callback) {
        new CollectModel({
          loginname,
          collected_topics: []
        }).save(function (err) {
          callback(null, 'a')
        })
      };

      // 默认存一个空的消息合辑
      const b = function (callback) {
        new MessageModel({
          loginname,
          has_read_messages: [],
          hasnot_read_messages: []
        }).save(function (err) {
          callback(null, 'b')
        })
      };

      async.series([c,a,b], function (err, result) {
        res.send(result[0])
      })


    }
  })
});

// 【用户】用户登陆
router.post('/login', function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  const {loginname, password } = req.body;
  UserModel.findOne({loginname, password: md5(password)}, filter, function (err, usr) {
    if(usr) {
      // 生成一个cookie(userid: user.id), 并交给浏览器保存
      res.cookie('userid', usr._id, {maxAge: 1000*60*60*24*7}); // 维持一天
      const {avatar_url} = usr;
      const data = {
        avatar_url,
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

// 【用户】获取用户信息
router.get('/user/:loginname',function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  const { loginname } = req.params;
  UserModel.findOne({loginname}, filter, function (err, user) {
    if(!user) {
      return res.send({success: false, msg: '获取用户信息失败'})
    } else {
      const {avatar_url, loginname, create_at, recent_replies, recent_topics} = user;
      const data = {
        data: {
          avatar_url,
          create_at,
          loginname,
          recent_replies,
          recent_topics,
          id: user._id
        }, success: true
      };
      return res.send(data)
    }
  })
});

// 【文章】评论文章
router.post('/topic/:topicId/replies', function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  const {topicId} = req.params;
  const {loginname, content} = req.body; // 评论者的名字和内容
  var author = {};
  var topic_author = {};
  var title;
  UserModel.findOne({loginname}, function (err, usr) {
    if(!usr) {
      console.log(err)
    } else {
      // a. 拿到评论者的loginname & avatar_url
      const a = function(callback) {
        author.loginname = usr.loginname;
        author.avatar_url = usr.avatar_url;
        callback(null, author)
      };
      // b. TopicModel中对replies的推入
      const b = function(callback) {
        TopicModel.findById({_id:topicId}, function (err, doc) {
          if(!doc) {
            console.log(err)
          } else {
            topic_author = doc.author;
            title = doc.title;
            doc.replies.unshift({
              author,
              content,
              create_at: new Date(),
              is_uped: false,
              reply_id: null,
              ups: [],
            });
            doc.reply_count = doc.replies.length;
            doc.save(function (err) {
              console.log(err);
              callback(null, 'save')
            })
          }
        })
      };
      // c. MessageModel中评论内容的推入
      const c = function(callback) {
        MessageModel.findOne({loginname: topic_author.loginname}, function (err, doc) {
          doc.hasnot_read_messages.unshift({
            type: 'reply',
            has_read: false,
            author, //评论者
            topic: {
              id: topicId,
              title,
              last_reply_at: new Date(),
            }, // 文章作者
            reply: {
              content,
              ups: [],
              create_at: new Date(),
            }
          });
          doc.save(function (err) {
            callback(null, 'c')
          })
        })

      };

      async.series([a,b,c], function (err, result) {
        // UserModel中对最近参与话题的推入
        const data = {
          author: topic_author,
          id: topicId,
          title
        };
        if(Number(usr.recent_replies.length) !== 0){
          usr.recent_replies.forEach(item => {
            if(String(item.id) === String(topicId)) { // 不需要重复添加
              usr.save()
            } else {
              usr.recent_replies.unshift(data);
              usr.save()
            }
          })
        } else {
          usr.recent_replies.unshift(data);
          usr.save()
        }
        return res.send({success: true})
      })
    }
  })

});

// 【文章】点赞文章
router.post('/reply/:replyId/ups', function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  const { replyId } = req.params;
  const { loginname } = req.body;
  // 找到topics中这篇文章，ups[]添加loginname找到的点赞人id
  UserModel.findOne({loginname}, function (err, usr) {
    const { _id } = usr;
    var action;
    TopicModel.findOne({'replies._id': replyId}, function (err, doc) {
      doc.replies.forEach(item => {
        if(String(item._id) === String(replyId)) {
          item.is_uped = !item.is_uped;
          const idx = item.ups.indexOf(_id);
          if((item.ups.length > 0 && idx === -1 )|| Number(item.ups.length) === 0) {
            item.ups.unshift(_id);
            action = 'up'
          } else {
            item.ups.splice(idx, 1);
            action = 'down'
          }
        }
      });
      doc.save(function (err) {
        res.send({ action, success: true})
      });
    })
  })


});

module.exports = router;
