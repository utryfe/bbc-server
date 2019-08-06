var express = require('express');
var router = express.Router();
var async = require('async');
const md5 = require('blueimp-md5');
const UserModel = require('../db/models').UserModel; // 一个一个引入的
const CollectModel = require('../db/models').CollectModel;
const TopicModel = require('../db/models').TopicModel;
const MessageModel = require('../db/models').MessageModel;
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

      // 用户注册成功
      const c = function (callback) {
        new UserModel({
          create_at: new Date(), // 注册时间
          loginname, // 昵称
          password: md5(password), // 密码
          recent_topics: [],
          recent_replies: [],
          avatar_url: "https://avatars2.githubusercontent.com/u/40653619?v=4&s=120", // 头像
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

// 【用户】获取用户收藏的文章
router.get('/topic_collect/:loginname',function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  const { loginname } = req.params;
  CollectModel.findOne({loginname}, filter, function (err, user) {
    if(!user) {
      return res.send({success: false, msg: '获取用户收藏文章失败'})
    } else {
      const { collected_topics } = user;
      const data = { data: collected_topics, success: true};
      return res.send(data)
    }
  })
});

// 【用户】获取用户的未读消息数
router.get('/message/count', function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  MessageModel.find({}, function (err, doc) {
    const count = doc[0].hasnot_read_messages.length;
    res.send({data: count})
  })
});

// 【用户】获取用户的已读/未读消息
router.get('/messages', function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  MessageModel.find({}, function (err, doc) {
    const {has_read_messages, hasnot_read_messages } = doc[0];
    res.send({data: {has_read_messages, hasnot_read_messages}, success: true})
  })
});

// 【文章】获取所有文章
router.get('/topics', function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  const { page, limit, tab} = req.query;
  var query;
  if(tab === 'all') {
    query = {}
  } else {
    query= {tab}
  }
  TopicModel.find(query, function (err, doc) {
    if(!doc) {
      res.send({success: false})
    } else {
      res.send({data: doc, success: true})
    }
  })

});

// 【文章】获取文章详情
router.get('/topic/:articleId', function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  const {articleId} = req.params;
  const { loginname } = req.query;
  var is_collect = false;
  var data;
  TopicModel.findOne({_id: articleId}, filter, function (err, user) {
    if (!user) {
      res.send({success: false, msg: '获取文章详情失败'})
    } else {
      const a = function(callback) {
        // 查询自己是否收藏过这篇文章
        if(loginname != undefined) {
          CollectModel.findOne({loginname}, function (err, usr) {
            if(usr.collected_topics.length > 0) {
              usr.collected_topics.forEach(topic => {
                if (topic._id == articleId) {  //ps: 不能强制转换
                  is_collect = true
                } else {
                  is_collect = false
                }
              });
            }
            callback(null, 'aaa')
          });
        } else {
          callback(null, 'aaa')
        }
      };
      const b = function(callback) {
        if(is_collect) {
          data = Object.assign(user, {is_collect});
        } else {
          data = user
        }

        callback(null, 'bbb')
      };
      async.series([a, b], function (err, result) {
        res.send({success: true, data})
      });
    }
  })
});

// 【文章】发布文章
router.post('/topics', function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  const {loginname, title, tab, content} = req.body;
  var doc_id;
  UserModel.findOne({loginname}, function (err, usr) {
    if (!usr) {
      res.send({success: false, msg: "获取信息失败"})
    } else {
      const author_id = usr._id;
      const avatar_url = usr.avatar_url;
      const a = function (callback) {
        // 存进文档的数据库中
        new TopicModel({
          author: {
            loginname,
            avatar_url
          },
          author_id,
          good: false,
          is_collect: false,
          replies: [],
          reply_count: 0,
          content,
          create_at: new Date(),
          last_reply_at: new Date(),
          tab,
          title,
          top: false,
          visit_count: 0,
        }).save(function (err, doc) {
          doc_id = doc._id;
          callback(null, doc._id)
        });
      };
      const b = function (callback) {
        topic = {
          author: {
            loginname,
            avatar_url,
          },
          id: doc_id,
          title
        };
        callback(null, 'test')
      };

      // 异步作同步处理
      async.series([a,b], function (err, result) {
        usr.recent_topics.push(topic);
        usr.save(function (err) {
          res.send({success: true, topic_id: doc_id})
        })
      });
    }
  })
});

// 【文章】修改文章
router.post('/topics/update', function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  const {topic_id, loginname, title, tab, content} = req.body;

  TopicModel.findById({_id: topic_id}, function (err, topic) {
    if(err){
      return res.send({success: false});
    } else {
      topic = Object.assign(topic, {title, tab, content});
      topic.save(function (err) {
        console.log('存进TopicModel');
      })
    }
  });
  UserModel.update({loginname, 'recent_topics.id': topic_id},
    {'$set': {
        'recent_topics.$.title': title
      }},
    function (err, doc) {
      res.send({success: true})
    });

});

// 【文章】收藏文章
router.post('/topic_collect/collect', function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  const { loginname, topic_id } = req.body;
  TopicModel.findOne( {_id: topic_id}, filter, function (err, user) {
    if(!user) {
      return res.send({success: false, msg: '收藏失败'})
    } else {
      const collected = Object.assign(user, {is_collect: true});
      CollectModel.findOne({loginname}, filter, function (err, usr) {
        if(!usr) {
          return res.send({success: false})
        } else {
          usr.collected_topics.push(collected);
          usr.save(function (err) {
            return res.send({success: true})
          })
        }
      });

    }
  })
});

// 【文章】取消收藏
router.post('/topic_collect/de_collect', function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  const { loginname, topic_id} = req.body;
  CollectModel.findOne({loginname}, function (err, usr) {
    if(!usr) {
      res.send({success: false})
    } else {
      usr.collected_topics = usr.collected_topics.filter(topic => {
        return topic._id != topic_id
      });
      usr.save(function (err) {
        return res.send({success: true})
      })
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
      const a = function(callback) {
        author.loginname = usr.loginname;
        author.avatar_url = usr.avatar_url;
        callback(null, author)
      };
      const b = function(callback) {
        TopicModel.findById({_id:topicId}, function (err, doc) {
          if(!doc) {
            console.log(err)
          } else {
            topic_author = doc.author;
            title = doc.title;
            doc.replies.push({
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
      async.series([a,b], function (err, result) {
        const data = {
          author: topic_author,
          id: topicId,
          title
        };
        if(usr.recent_replies.length != 0){
          usr.recent_replies.forEach(item => {
            if(item.id == topicId) { // 不需要重复添加
              return false
            } else {
              usr.recent_replies.push(data);
              usr.save()
            }
          })
        } else {
          usr.recent_replies.push(data);
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
        if(item._id == replyId) {
          item.is_uped = !item.is_uped;
          const idx = item.ups.indexOf(_id);
          if((item.ups.length > 0 && idx == '-1' )|| item.ups.length == 0) {
            item.ups.push(_id);
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
