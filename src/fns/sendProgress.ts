import { Telegram } from "telegraf";
import { bold, code, fmt } from "telegraf/format";
import { Message } from "telegraf/types";
import formatBytes from "./formatBytes.js";
import throttle from "./throttle.js";

const sendProgress = throttle(
  async (
    telegram: Telegram,
    message: Message,
    chunkLength: number,
    downloaded: number,
    total: number,
    artistName?: string,
    songName?: string
  ) => {
    try {
      const formatDownloaded = formatBytes(downloaded);
      const formatTotal = formatBytes(total);
      const progressText = fmt`${bold`Skinny Music`}\n\n${bold`Song Name:`} ${code`${
        songName || "-"
      }`}\n${bold`Artist Name:`} ${code`${artistName || "-"}`}\n\n${code`${formatDownloaded} / ${formatTotal}`}`;
      await telegram.editMessageText(message.chat.id, message.message_id, undefined, progressText);
    } catch {}
  }
);

export default sendProgress;
