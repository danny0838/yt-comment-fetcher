import {API_KEY} from './common.mjs';
import {YtCommentFetcher} from '../src/yt-comment-fetcher.mjs';

import {assert} from 'chai';

describe('YtCommentFetcher', function () {
  it('.fetch', async function () {
    const fetcher = new YtCommentFetcher({
      apiKey: API_KEY,
      maxResults: 5,
    });
    const gen = fetcher.fetch('2lAe1cqCOXo');

    const {value, done} = await gen.next();
    assert.isFalse(done);
    assert.isArray(value);
    assert.isAtLeast(value.length, 5);

    const comment = value[0];
    assert.isString(comment.videoId);
    assert.isBoolean(comment.isTopLevel);
    assert.isString(comment.commentId);
    assert.isString(comment.commentDate);
    assert.isString(comment.commentUpdated);
    assert.isString(comment.commentAuthor);
    assert.isString(comment.commentAuthorChannel);
    assert.isString(comment.commentText);
    assert.isString(comment.commentHtml);
    assert.isNumber(comment.commentLiked);
  });
});
