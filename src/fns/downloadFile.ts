import http from "node:http";
import https from "node:https";

type ProgressCallback = (chunkLength: number, downloaded: number, total: number) => any;

async function downloadFile(url: string, progressCallback: ProgressCallback): Promise<Buffer> {
  const urlProtocol = new URL(url).protocol;
  const request = urlProtocol === "https:" ? https : http;

  return new Promise((resolve) => {
    let downloaded = 0;
    const data: Uint8Array[] = [];

    request.get(url, (res) => {
      res.on("data", (chunk) => {
        const chunkLength = chunk.length;
        downloaded += chunkLength;
        const total = Number(res.headers["content-length"]);
        progressCallback(chunkLength, downloaded, total);
        data.push(chunk);
      });
      res.on("end", () => {
        const buffer = Buffer.concat(data);
        resolve(buffer);
      });
    });
  });
}

export default downloadFile;
