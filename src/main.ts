import { rmSync } from "node:fs";
import { Telegraf, Input, deunionize, TelegramError } from "telegraf";
import { code, fmt, FmtString } from "telegraf/format";
import express from "express";
import spotifyds from "spotifyds-core";
import { Audio } from "telegraf/types";
import getPayload from "./fns/getPayload.js";
import { Message } from "telegraf/typings/core/types/typegram.js";
import modifySong from "./fns/modifySong.js";
import sendProgress from "./fns/sendProgress.js";
import "dotenv/config";
import getCommand from "./fns/getCommand.js";
import getMatchedMusic from "./fns/getMatchedMusic.js";

const env = process.env;
const token = env.BOT_TOKEN;

if (!token) {
  throw Error("Please provide BOT_TOKEN");
}
function editMessageText(message: Message.TextMessage, newText: string | FmtString) {
  return app.telegram.editMessageText(message.chat.id, message.message_id, undefined, newText);
}
interface ModifyTask {
  type: "modify";
  name: "changetitle" | "changepicture" | "changeartist";
  audio: Audio;
}
interface TaskManager {
  [userId: number]: ModifyTask;
}
const app = new Telegraf(token);
const taskManager: TaskManager = {};
const startTime = Date.now();
const server = express();
const port = env.PORT || 8080;

app.telegram.setMyCommands([
  { command: "r", description: "download song by title (shortcut)" },
  { command: "download", description: "download song by title" },
  { command: "changetitle", description: "change song title" },
  { command: "changepicture", description: "change song picture" },
  { command: "changeartist", description: "change artist name" },
  { command: "uptime", description: "check bot alive time" },
  { command: "leave", description: "cancel the current task" },
]);
app.use((ctx, next) => {
  if (ctx.from) {
    let userName = ctx.from.first_name;

    if (ctx.from.last_name) {
      userName += " " + ctx.from.last_name;
    }
    console.log(new Date(), userName, deunionize(ctx.message)?.text);
  }
  next();
});
app.start(async (ctx) => {
  setTimeout(() => ctx.reply("Hai"), 2000);
});
app.command(["r", "download"], async (ctx) => {
  try {
    const text = ctx.message.text;
    const command = getCommand(text);
    const query = getPayload(text);
    if (!query) return ctx.reply(fmt`Provide song name\nFor example: ${code`${command} Chris James The Reminder`}`);
    const r = await ctx.reply(code`Nice`);

    await editMessageText(r, code`Searching ${query}..`);

    const result = await spotifyds.searchTrack(query);
    const track = getMatchedMusic(result, query);
    const artists = track.artists.items.map((artist) => artist.profile.name);
    const thumbnailUrl = track.albumOfTrack.coverArt.sources[0].url;

    await editMessageText(r, code`Ok wait a sec`);

    const filePath = await spotifyds.downloadTrack(track, (chunkLength, downloaded, total) => {
      sendProgress(ctx.telegram, r, chunkLength, downloaded, total, artists[0], track.name);
    });
    await editMessageText(r, code`Sending ${artists[0]} - ${track.name}`);

    await app.telegram.sendAudio(ctx.chat.id, Input.fromLocalFile(filePath), {
      performer: artists[0],
      title: track.name,
      thumb: { url: thumbnailUrl },
      duration: track.duration.totalMilliseconds / 1000,
    });
    await app.telegram.deleteMessage(r.chat.id, r.message_id);
  } catch (err) {
    console.log(err);
    return ctx.reply((err as any).message);
  }
});
app.command("changetitle", async (ctx) => {
  const message = deunionize(ctx.message);
  const userId = message.from.id;

  if (message.reply_to_message && "audio" in message.reply_to_message) {
    const audio = message.reply_to_message.audio;

    taskManager[userId] = {
      type: "modify",
      name: "changetitle",
      audio,
    };
    return ctx.reply("Send me a new title");
  } else {
    return ctx.reply("Reply to the song you want to edit");
  }
});
app.command("changepicture", async (ctx) => {
  const message = deunionize(ctx.message);
  const userId = message.from.id;

  if (message.reply_to_message && "audio" in message.reply_to_message) {
    const audio = message.reply_to_message.audio;

    taskManager[userId] = {
      type: "modify",
      name: "changepicture",
      audio,
    };
    return ctx.reply("Send me a picture");
  } else {
    return ctx.reply("Reply to the song you want to edit");
  }
});
app.command("changeartist", async (ctx) => {
  const message = deunionize(ctx.message);
  const userId = message.from.id;

  if (message.reply_to_message && "audio" in message.reply_to_message) {
    const audio = message.reply_to_message.audio;

    taskManager[userId] = {
      type: "modify",
      name: "changeartist",
      audio,
    };
    return ctx.reply("Send me a new artist name");
  } else {
    return ctx.reply("Reply to the song you want to edit");
  }
});
app.command("leave", async (ctx) => {
  const userId = ctx.message.from.id;
  delete taskManager[userId];
  return ctx.replyWithSticker("CAACAgUAAxkBAAEMf59kBzfOYBDYlZPZ0ux5HATmYnvligACqQIAAqyPiFXqD9zrFfqzNy4E");
});
app.command("clean", async (ctx) => {
  rmSync("./musics/", { recursive: true, force: true });
  await ctx.reply("Done!!");
});
app.command("uptime", async (ctx) => {
  try {
    let uptimeTotal = Math.abs(+new Date() - startTime) / 1000;
    const uptimeHours = Math.floor(uptimeTotal / 3600);
    uptimeTotal -= uptimeHours * 3600;
    const uptimeMinutes = Math.floor(uptimeTotal / 60) % 60;
    uptimeTotal -= uptimeMinutes * 60;
    const uptimeSeconds = (uptimeTotal % 60).toFixed();

    if (uptimeHours !== 0 && uptimeMinutes !== 0)
      await ctx.reply(`${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s`);
    else if (uptimeHours === 0 && uptimeMinutes !== 0) {
      await ctx.reply(`${uptimeMinutes}m ${uptimeSeconds}s`);
    } else {
      await ctx.reply(`${uptimeSeconds}s`);
    }
  } catch (err) {
    console.log(err);
    return ctx.reply((err as any).message);
  }
});
app.on("message", async (ctx) => {
  const message = deunionize(ctx.message);
  const userId = message.from.id;
  const userTask = taskManager[userId];

  if (userTask) {
    if (userTask.name === "changepicture") {
      if (message.photo) {
        const replyMessage = await ctx.reply(code`Nice`);
        const audio = userTask.audio;
        const newThumbFileId = message.photo[0].file_id;
        const newThumbUrl = (await ctx.telegram.getFileLink(newThumbFileId)).href;

        modifySong(ctx.telegram, audio, replyMessage, ctx.chat.id, userId, {
          performer: audio.performer,
          title: audio.title,
          thumb: { url: newThumbUrl },
          duration: audio.duration,
        });
        delete taskManager[userId];
      } else {
        return ctx.reply("Send me a picture or type /leave to cancel");
      }
    } else if (userTask.name === "changetitle") {
      if (message.text) {
        const replyMessage = await ctx.reply(code`Nice`);
        const audio = userTask.audio;
        const newTitle = message.text;
        const thumbFileId = audio.thumb?.file_id;
        const thumbUrl = thumbFileId && (await ctx.telegram.getFileLink(thumbFileId)).href;

        modifySong(ctx.telegram, audio, replyMessage, ctx.chat.id, userId, {
          performer: audio.performer,
          title: newTitle,
          thumb: thumbUrl ? { url: thumbUrl } : undefined,
          duration: audio.duration,
        });
      } else {
        return ctx.reply("Send me a new title or type /leave to cancel");
      }
    } else if (userTask.name === "changeartist") {
      if (message.text) {
        const replyMessage = await ctx.reply(code`Nice`);
        const audio = userTask.audio;
        const newArtistName = message.text;
        const thumbFileId = audio.thumb?.file_id;
        const thumbUrl = thumbFileId && (await ctx.telegram.getFileLink(thumbFileId)).href;

        modifySong(ctx.telegram, audio, replyMessage, ctx.chat.id, userId, {
          performer: newArtistName,
          title: audio.title,
          thumb: thumbUrl ? { url: thumbUrl } : undefined,
          duration: audio.duration,
        });
      } else {
        return ctx.reply("Send me a new artist name or type /leave to cancel");
      }
    } else {
      return ctx.replyWithSticker("CAACAgUAAxkBAAEMjghkDE3J8Kb1UJmp1lhhuhwXZ0OOOQAC6AQAAvB1mFYmM6DD0xMNtC8E");
    }
  }
});
if (env.DEVELOPMENT) {
  app.telegram.getMe().then((me) => {
    console.log(`Successfully logged in as ${me.username}`);
  });
  app.launch();
} else {
  const domain = env.WEBHOOK_DOMAIN;

  if (!domain) {
    throw Error("Please provide WEBHOOK_DOMAIN");
  }
  server.use(await app.createWebhook({ domain }));
  server.listen(port, () => console.log(`Server listening on ${port}`));
}

process.once("SIGINT", () => app.stop("SIGINT"));
process.once("SIGTERM", () => app.stop("SIGTERM"));
