var express = require('express');
var router = express.Router();
const MessageModel = require('../db/models').MessageModel;

// 【用户】获取用户的未读消息数
router.get('/message/count', function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  const {loginname} = req.query;
  MessageModel.findOne({loginname}, function (err, doc) {
    const count = doc.hasnot_read_messages.length;
    res.send({data: count})
  })
});

// 【用户】获取用户的已读/未读消息
router.get('/messages', function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  const {loginname} = req.query;
  MessageModel.findOne({loginname}, function (err, doc) {
    const {has_read_messages, hasnot_read_messages } = doc;
    res.send({data: {has_read_messages, hasnot_read_messages}, success: true})
  })
});

// 【操作】将多条消息标为已读
router.post('/message/mark_all', function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  const {loginname } = req.body;
  MessageModel.findOne({loginname}, function (err, doc) {
    doc.has_read_messages = doc.has_read_messages.concat(doc.hasnot_read_messages);
    doc.hasnot_read_messages = [];
    doc.has_read_messages.forEach(item => {
      item.has_read = true
    });
    doc.save(function (err) {
      res.send({
        data: {
          has_read_messages: doc.has_read_messages,
          hasnot_read_messages: doc.hasnot_read_messages
        },
        success: true
      })
    })
  })

});

// 【操作】将单条消息标为已读
router.post('/message/mark_one/:msgId',function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  const {msgId} = req.params; // 未读消息中的_id
  const {loginname} = req.body;
  var msg;
  MessageModel.findOne({loginname}, function (err, doc) {
    doc.hasnot_read_messages = doc.hasnot_read_messages.filter(item => {
      if(String(item._id) === String(msgId)) {
        msg = item
      }
      return String(item._id) !== String(msgId)
    });
    const { type, author, topic, reply} = msg;
    doc.has_read_messages.unshift({
      type,
      has_read: true,
      author,
      topic,
      reply
    });
    doc.save(function(err) {
      res.send({
        data: {
          has_read_messages: doc.has_read_messages,
          hasnot_read_messages: doc.hasnot_read_messages
        },
        success: true
      })
    })
  })
});

module.exports = router;
