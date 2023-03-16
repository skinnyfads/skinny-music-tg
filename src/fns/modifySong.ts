import { Input, Telegram, TelegramError } from "telegraf";
import { code } from "telegraf/format";
import { Audio, Message } from "telegraf/types";
import downloadFile from "./downloadFile.js";
import sendProgress from "./sendProgress.js";

interface Extra {
  performer?: string;
  title?: string;
  thumb?: { url: string };
  duration?: number;
}
async function modifySong(
  telegram: Telegram,
  audio: Audio,
  replyMessage: Message.TextMessage,
  chatId: number,
  userId: number,
  extra: Extra
) {
  try {
    const audioUrl = await telegram.getFileLink(audio.file_id);
    const audioBuffer = await downloadFile(audioUrl.href, async (chunkLength, downloaded, total) => {
      await sendProgress(telegram, replyMessage, chunkLength, downloaded, total, audio.performer, audio.title);
    });
    await telegram.editMessageText(replyMessage.chat.id, replyMessage.message_id, undefined, code`Ok wait a sec`);
    await telegram.sendAudio(chatId, Input.fromBuffer(audioBuffer), extra);
    await telegram.deleteMessage(replyMessage.chat.id, replyMessage.message_id);
  } catch (err) {
    console.log(err);

    if (err instanceof TelegramError) {
      return telegram.sendMessage(chatId, err.message);
    }
  }
}

export default modifySong;
