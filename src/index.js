import {YtCommentFetcher} from './yt-comment-fetcher.mjs';

function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.download = file.name;
  anchor.href = url;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function onSubmit(event) {
  event.preventDefault();

  const apiKey = document.getElementById('apiKey').value.trim();
  const videoUrl = document.getElementById('videoUrl').value.trim();
  const maxResults = document.getElementById('maxResults').valueAsNumber || undefined;
  const order = document.getElementById('order').value;
  const format = document.getElementById('format').value;

  const resultsWrapper = document.getElementById('video-comment-fetcher-results');
  resultsWrapper.textContent = '擷取中...';

  try {
    const fetcher = new YtCommentFetcher({apiKey, order, maxResults});
    const videoId = fetcher.parseVideoId(videoUrl);

    const comments = [];
    for await (const commentsChunk of fetcher.fetch(videoId)) {
      comments.push(...commentsChunk);
      resultsWrapper.textContent = `已擷取 ${comments.length} 則留言...`;
    };

    const file = fetcher.dump(comments, format, {
      filename: `youtube_comments_${videoId}`,
    });
    resultsWrapper.textContent = `✔️ 已擷取 ${comments.length} 則留言`;
    downloadFile(file);
  } catch (ex) {
    console.error(ex);
    resultsWrapper.textContent = `❌ 發生錯誤：${ex.message}`;
  }
}

document.getElementById('video-comment-fetcher').addEventListener('submit', onSubmit);
