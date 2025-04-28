class CsvHandler {
  constructor({sep = ',', linefeed = '\n', quote = '"', fields = null} = {}) {
    this.sep = sep;
    this.linefeed = linefeed;
    this.quote = quote;
    this.fields = fields;
  }

  dump(data) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Input data should be a non-empty array.");
    }

    const headerLine = this.fields?.map(header => this._escapeCell(header)).join(this.sep);

    const rows = data.map(row => {
      return row.map(cell => this._escapeCell(cell)).join(this.sep);
    });

    return [...(headerLine ? [headerLine] : []), ...rows].join(this.linefeed);
  }

  _escapeCell(cell) {
    if (cell == null) {
      return '';
    }

    cell = String(cell);

    if (this.quote) {
      if (cell.includes(this.sep) || cell.includes(this.linefeed) || cell.includes(this.quote)) {
        cell = `${this.quote}${cell.replace(new RegExp(this.quote, 'g'), `${this.quote}${this.quote}`)}${this.quote}`;
      }
    } else {
      if (cell.includes(this.sep) || cell.includes(this.linefeed)) {
        throw new Error(`Text contains invalid char: ${JSON.stringify(cell)}`);
      }
    }

    return cell;
  }
}

class YtCommentFetcher {
  constructor({
    apiPrefix = 'https://www.googleapis.com/youtube/v3/commentThreads',
    apiKey,
    order = 'time',
    maxRequestResults = 100,
    maxResults = Infinity,
  }) {
    this.apiPrefix = apiPrefix;
    this.apiKey = apiKey;
    this.order = order;
    this.maxRequestResults = maxRequestResults;
    this.maxResults = maxResults;
  }

  async* fetch(videoId) {
    const {apiPrefix, apiKey, order, maxRequestResults, maxResults} = this;

    let fetched = 0;
    let nextPageToken = '';

    while (fetched < maxResults) {
      const fetchCount = Math.min(maxRequestResults, maxResults - fetched);
      const url = new URL(apiPrefix);
      const params = new URLSearchParams({
        part: 'snippet,replies',
        videoId,
        maxResults: fetchCount,
        order,
        pageToken: nextPageToken,
        key: apiKey,
      });
      url.search = params.toString();

      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      if (!data.items) {
        break;
      }

      const comments = [];
      for (const item of data.items) {
        const {
          id: commentId,
          snippet: {
            topLevelComment: {
              snippet: {
                authorChannelId: {value: commentAuthorChannel},
                authorDisplayName: commentAuthor,
                publishedAt: commentDate,
                updatedAt: commentUpdated,
                textOriginal: commentText,
                textDisplay: commentHtml,
                likeCount: commentLiked,
                videoId,
              },
            },
          },
        } = item;

        comments.push({
          videoId,
          isTopLevel: true,
          commentId,
          commentDate,
          commentUpdated,
          commentAuthor,
          commentAuthorChannel,
          commentText,
          commentHtml,
          commentLiked,
        });

        if (item.replies) {
          for (const replyItem of item.replies.comments) {
            const {
              id: commentId,
              snippet: {
                authorChannelId: {value: commentAuthorChannel},
                authorDisplayName: commentAuthor,
                publishedAt: commentDate,
                updatedAt: commentUpdated,
                textOriginal: commentText,
                textDisplay: commentHtml,
                likeCount: commentLiked,
                videoId,
              },
            } = replyItem;

            comments.push({
              videoId,
              isTopLevel: false,
              commentId,
              commentDate,
              commentUpdated,
              commentAuthor,
              commentAuthorChannel,
              commentText,
              commentHtml,
              commentLiked,
            });
          }
        }
      }

      const cancled = yield comments;
      if (cancled) {
        break;
      }

      fetched += data.items.length;
      nextPageToken = data.nextPageToken;
      if (!nextPageToken) {
        break;
      }
    }
  }

  static parseVideoId(url) {
    let u;
    try {
      u = new URL(url);
    } catch {
      // treat invalid URL as ID
      return url;
    }
    if (u.origin !== 'https://www.youtube.com') {
      throw new Error(`Unsupported origin for the provided video URL.`);
    }
    if (!u.searchParams.has('v')) {
      throw new Error(`Missing required param for the provided video URL.`);
    }
    return u.searchParams.get('v');
  }

  parseVideoId(...args) {
    return this.constructor.parseVideoId(...args);
  }

  static dump(comments, format, options) {
    switch (format) {
      case 'json': {
        return this.dumpJson(comments, options);
      }
      case 'html': {
        return this.dumpHtml(comments, options);
      }
      case 'csv':
      default: {
        return this.dumpCsv(comments, options);
      }
    }
  }

  dump(...args) {
    return this.constructor.dump(...args);
  }

  static dumpCsv(comments, {
    fields = ["留言ID", "留言時間", "作者", "留言內容", "點讚數"],
    filename = 'youtube_comments',
  } = {}) {
    comments = comments.map((comment) => {
      const {
        commentId,
        commentDate,
        commentAuthor,
        commentText,
        commentLiked,
      } = comment;

      return [
        commentId,
        this.formatLocalDate(commentDate),
        commentAuthor,
        commentText,
        commentLiked,
      ];
    });

    const handler = new CsvHandler({fields});
    const text = handler.dump(comments);
    return new File([text], `${filename}.csv`, {type: 'text/csv'});
  }

  dumpCsv(...args) {
    return this.constructor.dumpCsv(...args);
  }

  static dumpHtml(comments, {
    filename = 'youtube_comments',
  } = {}) {
    comments = comments.map((comment) => {
      const {
        videoId,
        isTopLevel,
        commentId,
        commentDate,
        commentUpdated,
        commentAuthor,
        commentHtml,
        commentLiked,
      } = comment;

      const datetimeEdited = commentUpdated !== commentDate ?
        ` <time datetime="${this.formatLocalDate(commentUpdated)}" title="${new Date(commentUpdated).toLocaleString()}">(已編輯)</time>` :
        '';

      return `\
${isTopLevel ? '<blockquote>' : '<blockquote><blockquote>'}
  <header>
    <a href="https://www.youtube.com/${encodeURIComponent(commentAuthor)}" target="_blank" rel="external"><b>${commentAuthor}</b></a>
    <a href="https://www.youtube.com/watch?v=${videoId}&lc=${commentId}" target="_blank" rel="external"><time datetime="${this.formatLocalDate(commentDate)}">${new Date(commentDate).toLocaleString()}</time>${datetimeEdited}</a>
    <span>👍${commentLiked}</span>
  </header>
  <div>${commentHtml}</div>
${isTopLevel ? '</blockquote>' : '</blockquote></blockquote>'}`;
    });

    const text = `\
<!DOCTYPE html>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
` + comments.join('\n\n');
    return new File([text], `${filename}.html`, {type: 'text/html'});
  }

  dumpHtml(...args) {
    return this.constructor.dumpHtml(...args);
  }

  static dumpJson(comments, {
    filename = 'youtube_comments',
  } = {}) {
    const text = JSON.stringify(comments, null, 2);
    return new File([text], `${filename}.json`, {type: 'application/json'});
  }

  dumpJson(...args) {
    return this.constructor.dumpJson(...args);
  }

  static formatLocalDate(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    const timezoneOffset = date.getTimezoneOffset();
    const tzSign = timezoneOffset > 0 ? '-' : '+';
    const tzHours = String(Math.floor(Math.abs(timezoneOffset) / 60)).padStart(2, '0');
    const tzMinutes = String(Math.abs(timezoneOffset) % 60).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${tzSign}${tzHours}${tzMinutes}`;
  }

  formatLocalDate(...args) {
    return this.constructor.formatLocalDate(...args);
  }
}

export {
  YtCommentFetcher,
};
