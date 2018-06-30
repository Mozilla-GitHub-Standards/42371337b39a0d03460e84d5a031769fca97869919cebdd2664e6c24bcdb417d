/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */
// Test that IMAP over a SOCKS proxy works.

ChromeUtils.import("resource://testing-common/mailnews/NetworkTestUtils.jsm");
ChromeUtils.import("resource://testing-common/mailnews/PromiseTestUtils.jsm");
load("../../../resources/messageGenerator.js");

var server, daemon, incomingServer;

const PORT = 143;

add_task(async function setup() {
  // Disable new mail notifications
  Services.prefs.setBoolPref("mail.biff.play_sound", false);
  Services.prefs.setBoolPref("mail.biff.show_alert", false);
  Services.prefs.setBoolPref("mail.biff.show_tray_icon", false);
  Services.prefs.setBoolPref("mail.biff.animate_dock_icon", false);

  let daemon = new imapDaemon();
  server = makeServer(daemon, "");

  let messages = [];
  let messageGenerator = new MessageGenerator();
  messages = messages.concat(messageGenerator.makeMessage());
  let dataUri = Services.io.newURI("data:text/plain;base64," +
                                   btoa(messages[0].toMessageString()));
  let imapMsg = new imapMessage(dataUri.spec, daemon.inbox.uidnext++, []);
  daemon.inbox.addMessage(imapMsg);


  NetworkTestUtils.configureProxy("imap.tinderbox.invalid", PORT, server.port);

  // Set up the basic accounts and folders
  incomingServer = createLocalIMAPServer(PORT, "imap.tinderbox.invalid");
  let identity = MailServices.accounts.createIdentity();
  let imapAccount = MailServices.accounts.createAccount();
  imapAccount.addIdentity(identity);
  imapAccount.defaultIdentity = identity;
  imapAccount.incomingServer = incomingServer;
});

add_task(async function downloadEmail() {
  let inboxFolder = incomingServer.rootFolder.getChildNamed("INBOX");

  // Check that we haven't got any messages in the folder, if we have its a test
  // setup issue.
  Assert.equal(inboxFolder.getTotalMessages(false), 0);

  // Now get the mail
  let asyncUrlListener = new PromiseTestUtils.PromiseUrlListener();
  inboxFolder.getNewMessages(null, asyncUrlListener);
  await asyncUrlListener.promise;

  // We downloaded a message, so it works!
  Assert.equal(inboxFolder.getTotalMessages(false), 1);
});

add_task(async function cleanUp() {
  NetworkTestUtils.shutdownServers();
  incomingServer.closeCachedConnections();
  server.stop();
});

function run_test() {
  run_next_test();
}