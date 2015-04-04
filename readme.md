# node-reply-worker

An email reply worker that listens to new emails and emits an event every time an email with an id arrives.

This works with plus addressing, for example, if you have the email address `jonh@example.com`, you can add `+<something>` before the @ sign, like `jonh+123@example.com`. Most mail servers support this feature, but if you are not sure, you can check by sending and email as described.

## Usage

```javascript
var ReplyWorker = require('node-reply-worker');
var inspect     = require('util').inspect;

var worker = new ReplyWorker({
  mailAddress: /* Your email address */,
  mailPassword: /* Your email password */,
  stripMessages: /* Removes replied messages and signatures */,
  checknterval: /* Interval in minutes to check for new messages, default: 10 */,
  imapConnection: {
    host: /* Server address */,
    port: /* Server port, default: 993 */,
    tls: /* Use tls, default: true */
  }
});

worker.on('reply', function(res) {
  /**
   * res format:
   * - id: <the part between + and @ of the email address>,
   * - from: <from email address>,
   * - text: <the mail text>
   */
  console.log(inspect(res));
});

worker.start();
```
