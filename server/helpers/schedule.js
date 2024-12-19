"use strict";
require("dotenv").config();
const { Mutex } = require("async-mutex");
const { CronJob } = require("cron");
const { initializeSocket } = require("../wa-connection");
const Broadcast = require("../models/mongodb/broadcast");
const Message = require("../models/mongodb/message");
const moment = require("moment-timezone");

const mutex = new Mutex();

async function sendMessage(message, sender) {
  try {
    const sessionId = sender.account.sessions?.session_id;
    const socket = await initializeSocket(sessionId);
    if (socket.error) {
      const error = new Error(socket.message);
      throw error;
    }
    await socket.waitForConnectionUpdate(
      ({ connection }) => connection === "open",
      90000
    );
    const jid = message.receiver + "@s.whatsapp.net";
    const isValid = await socket.onWhatsApp(jid);
    if (isValid[0]?.exists) {
      let msgId = "";
      if (message.mimetype) {
        const file_type = message.mimetype.split("/")[0];
        if (file_type === "image") {
          const sendMsg = await socket.sendMessage(
            jid,
            {
              image: { url: message.url },
              fileName: message.filename,
              mimetype: message.mimetype,
              caption: message.message,
            },
            {
              broadcast: true,
            }
          );
          msgId = sendMsg?.key?.id;
        } else {
          const sendMsg = await socket.sendMessage(
            jid,
            {
              document: { url: message.url },
              fileName: message.fileName,
              mimetype: message.mimetype,
              caption: message.message,
            },
            {
              broadcast: true,
            }
          );
          msgId = sendMsg?.key?.id;
        }
      } else {
        const sendMsg = await socket.sendMessage(
          jid,
          {
            text: message.message,
          },
          {
            broadcast: true,
          }
        );
        msgId = sendMsg?.key?.id;
      }
      await Message.findOneAndUpdate(
        {
          _id: message._id,
        },
        {
          mid: msgId,
          sender: sender.account._id,
          status: msgId ? "sent" : "failed",
          sent: msgId ? true : false,
          sent_at: msgId ? moment().tz("Asia/Jakarta") : null,
        }
      );
    } else {
      await Message.findOneAndUpdate(
        {
          _id: message._id,
        },
        {
          sender: sender.account._id,
          status: "invalid",
        }
      );
    }
  } catch (e) {
    return e;
  }
}
const funcMessage = async (broadcast, val) => {
  try {
    const senders = broadcast.senders;
    const messages = await Message.find({
      broadcast: broadcast._id,
      sent: false,
    });
    for (let i = 0; i < messages.length; i++) {
      const senderIndex = Math.floor(Math.random() * senders.length);
      const lastMessage = await Message.findOne({
        broadcast: broadcast._id,
        sent: true,
      }).sort({ sent_at: -1 });
      if (!lastMessage) {
        await sendMessage(messages[i], senders[senderIndex]);
        // await funcMessage(broadcast);
        console.log("kepanggil func send message inner !lastMessage");
        break;
      } else {
        if (broadcast.delay.wait) {
          const now = moment.tz("Asia/Jakarta");
          const sentTime = moment.tz(lastMessage.sent_at, "Asia/Jakarta");
          const diff = now.diff(sentTime, "seconds");
          const delay =
            Math.floor(
              Math.random() * (broadcast.delay.to - broadcast.delay.wait + 1)
            ) + broadcast.delay.wait;
          if (diff > delay) {
            await sendMessage(messages[i], senders[senderIndex]);
          } else {
            await new Promise((resolve) =>
              setTimeout(async () => {
                await funcMessage(broadcast);
                resolve();
              }, delay * 1000)
            );
            break;
          }
        } else {
          await sendMessage(messages[i], senders[senderIndex]);
        }
      }
      if (broadcast.rest_mode.stop_sending_after) {
        const count_sent = await Message.countDocuments({
          broadcast: broadcast._id,
          sent: true,
        });
        const stopped = count_sent % broadcast.rest_mode.stop_sending_after;
        if (stopped === 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, broadcast.rest_mode.and_rest_for * 1000)
          );
        }
      }
    }
  } catch (e) {}
};
const funcBroadcast = async () => {
  const data = await Broadcast.find({
    status: "running",
    "time_to_send.time": { $lte: moment().tz("Asia/Jakarta") },
  })
    .populate({
      path: "messages",
    })
    .populate({
      path: "senders.account",
      populate: {
        path: "sessions",
        select: "session_id last_active",
      },
    });
  return data || [];
};
module.exports = {
  send_broadcast: (done) => {
    const actionFunction = async () => {
      const release = await mutex.acquire();
      try {
        const broadcasts = await funcBroadcast();
        for (let broadcast of broadcasts) {
          const check_messages = broadcast.messages.filter(
            (message) => !message.sent
          );
          if (check_messages.length > 0) {
            await funcMessage(broadcast);
          } else {
            broadcast.status = "completed";
            await broadcast.save();
          }
        }
      } catch (e) {
      } finally {
        release();
      }
    };
    const job = new CronJob(
      "*/1 * * * *",
      actionFunction,
      null,
      true,
      "Asia/Jakarta"
    );
    job.start();
    done();
  },
};
