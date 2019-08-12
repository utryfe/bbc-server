var express = require('express');
var router = express.Router();
const CollectModel = require('../db/models').CollectModel;
const TopicModel = require('../db/models').TopicModel;
const filter = {password: 0, __v: 0}; // 查询时过滤出指定的属性

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
          usr.collected_topics.unshift(collected);
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

module.exports = router;
