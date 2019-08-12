var express = require('express');
var router = express.Router();
var async = require('async');
const UserModel = require('../db/models').UserModel; // 一个一个引入的
const CollectModel = require('../db/models').CollectModel;
const TopicModel = require('../db/models').TopicModel;
const filter = {password: 0, __v: 0}; // 查询时过滤出指定的属性

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
        if(loginname) {
          CollectModel.findOne({loginname}, function (err, usr) {
            if(usr.collected_topics.length > 0) {
              usr.collected_topics.forEach(topic => {
                is_collect = String(topic._id) === String(articleId);
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
        usr.recent_topics.unshift(topic);
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

module.exports = router;
