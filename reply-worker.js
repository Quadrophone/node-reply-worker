var MailParser   = require("mailparser").MailParser;
var Imap         = require('imap');
var EventEmitter = require( "events" ).EventEmitter;

var stripPatterns = [

  // Lines started with >
  "^>",

  // lines starting and ending with -
  "^-.*-$",

  // lines starting and ending with =
  "^=.*=$",

  // lines started with ---
  "^---",

  // lines started with ===
  "^===",

  // 3 or more white lines
  "([ \\t]*\\r?\\n){3,}",

  // lines started with From:
  "^From:",

  // lines started with De:
  "^De:",

  // lines like "On Tue, Jan 27, 2015 at 4:43 PM, Hugo Pires wrote:"
  "^On( \\w+,?)? \\w+ \\d+,? \\d+,?.*[\\S\\s]?.*wrote:",

  // lines started with a data and ending with :
  "^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2} [.\\S\\s]*:[\\S\\s]*$"

];

var stripPatternsRe = new RegExp(stripPatterns.join('|'), 'm');

function getMailRegEx(email, idFormat) {
  var parts = email.split('@');
  return new RegExp('^' + parts[0] + '\\+(' + idFormat + ')@' + parts[1] + '$', 'i');
}

function readMessage(stream, info) {
  var self = this;
  var mailRe = getMailRegEx(this.mailAddress, this.idFormat);
  var mp = new MailParser();

  mp.on('end', function(obj) {
    var email = obj.to.filter(function(mail) {
      return mailRe.test(mail.address);
    });

    if (email.length > 0) {
      var text = obj.text;

      if (self.stripMessages) {
        var stripPos = stripPatternsRe.exec(text);
        if (stripPos) text = text.substring(0, stripPos.index).trim();
      }

      var res = {
        id: email[0].address.match(mailRe)[1],
        from: obj.from[0].address,
        text: text
      };

      self.emit('reply', res);
    }
  });

  stream.pipe(mp);
}

function readUnseen(err, results) {
  var self = this;

  if (err || results.length == 0) {
    if (err) console.log(err);
    self.emit('fetchend');
    return;
  }

  var f = this.imap.fetch(results, {
    bodies: [''],
    markSeen: true,
    struct: true
  });

  f.on('message', function(msg, seqno) {
    msg.on('body', readMessage.bind(self));
  });

  f.on('end', function() {
    self.emit('fetchend');
  });
}

function readInbox () {
  this.imap.openBox('INBOX', false, function() {
    this.imap.search([ 'UNSEEN' ], readUnseen.bind(this));
  }.bind(this));
}

function ReplyWorker(opts) {

  EventEmitter.call(this);

  this.idFormat = opts.idFormat || "[\\w-]+";
  this.mailAddress = opts.mailAddress;
  this.stripMessages = "stripMessages" in opts ? opts.stripMessages : true;
  this.checkInterval = "checkInterval" in opts ? opts.checkInterval : 10;
  this.imap = new Imap({
    user: opts.mailAddress,
    password: opts.mailPassword,
    host: opts.imapConnection.host,
    port: opts.imapConnection.port || 993,
    tls: "tls" in opts.imapConnection ? opts.imapConnection.tls : true
  });

}

ReplyWorker.prototype = Object.create(EventEmitter.prototype);

ReplyWorker.prototype.start = function() {
  var self = this;

  this.on('fetchend', function () {
    setTimeout(readInbox.bind(self), self.checkInterval * 60 * 1000);
  });

  this.imap.once('ready', function() {
    readInbox.apply(self);
  });

  this.imap.once('error', function(err) {
    console.log(err);
  });

  this.imap.once('end', function() {
    console.log('Connection ended');
  });

  this.imap.connect();
}

module.exports = ReplyWorker;
