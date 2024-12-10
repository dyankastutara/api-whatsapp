"use strict";
require("dotenv").config();
const { Mutex } = require("async-mutex");
const { CronJob } = require("cron");
const { initializeSocket } = require("../connection");
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
    // await socket.waitForConnectionUpdate(
    //   ({ connection }) => connection === "open"
    // );
    // const jid = message.receiver + "@s.whatsapp.net";
    // if (message.mimetype) {
    //   const file_type = message.mimetype.split("/")[0];
    //   if (file_type === "image") {
    //     await socket.sendMessage(
    //       jid,
    //       {
    //         image: { url: message.url },
    //         fileName: message.filename,
    //         mimetype: message.mimetype,
    //         caption: message.message,
    //       },
    //       {
    //         broadcast: true,
    //       }
    //     );
    //   } else {
    //     await socket.sendMessage(
    //       jid,
    //       {
    //         document: { url: message.url },
    //         fileName: message.fileName,
    //         mimetype: message.mimetype,
    //         caption: message.message,
    //       },
    //       {
    //         broadcast: true,
    //       }
    //     );
    //   }
    // } else {
    //   await socket.sendMessage(
    //     jid,
    //     {
    //       text: message.message,
    //     },
    //     {
    //       broadcast: true,
    //     }
    //   );
    // }
    await Message.findOneAndUpdate(
      {
        _id: message._id,
      },
      {
        sender: sender.account._id,
        sent: true,
        sent_at: moment().tz("Asia/Jakarta"),
      }
    );
  } catch (e) {
    return e;
  }
}
const funcMessage = async (broadcast) => {
  try {
    console.log("func message ke panggil");
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
        console.log("Chat terkirim last message");
        await funcMessage(broadcast);
        break;
      } else {
        if (broadcast.delay.wait) {
          const now = moment.tz("Asia/Jakarta");
          const sentTime = moment.tz(lastMessage.sent_at, "Asia/Jakarta");
          const diff = now.diff(sentTime, "seconds");
          if (diff > broadcast.delay.wait) {
            await sendMessage(messages[i], senders[senderIndex]);
            console.log(
              "Chat terkirim else last message diff > broadcast.delay.wait"
            );
          } else {
            await new Promise((resolve) =>
              setTimeout(async () => {
                await funcMessage(broadcast);
                console.log(
                  "Chat terkirim else last message else diff > broadcast.delay.wait"
                );
                resolve();
              }, broadcast.delay.wait * 1000)
            );
            break;
          }
        } else {
          console.log(
            "Chat terkirim else last message else broadcast.delay.wait"
          );
          await sendMessage(messages[i], senders[senderIndex]);
        }
      }
      if (broadcast.rest_mode.stop_sending_after) {
        const count_sent = await Message.countDocuments({
          broadcast: broadcast._id,
          sent: true,
        });
        const stopped = count_sent % broadcast.rest_mode.stop_sending_after;
        console.log("stop sending after", count_sent, stopped);
        if (stopped === 0) {
          console.log(
            `Rest Mode Aktif, Delay ${broadcast.rest_mode.and_rest_for} Detik`
          );
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
      console.log("cronjob run setiap 1 menit dengan sebelum mutex");
      const release = await mutex.acquire();
      try {
        const broadcasts = await funcBroadcast();
        console.log(
          "cronjob run setiap 1 menit dengan setelah mutex",
          broadcasts.length
        );
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
